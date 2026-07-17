import {
  DomainError,
  fail,
  succeed,
  type GameWorldId,
  type Result,
} from "@grinta/shared";

import { buildClubsFromGenesis } from "../clubs/club-bootstrap.js";
import type { ClubRepository } from "../clubs/club-repository.js";
import { Club } from "../clubs/club.js";
import { Squad } from "../clubs/squad.js";
import { buildCompetitionGenesis } from "../competitions/competition-bootstrap.js";
import { buildFanbaseGenesis } from "../fanbase/fanbase-bootstrap.js";
import { buildLedgerGenesis } from "../finance/ledger-bootstrap.js";
import { Player } from "../players/player.js";
import {
  ActivateWorld,
  type WorldMutationResult,
} from "../world/world-use-cases.js";
import type { WorldRepository } from "../world/world-repository.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import { WorldStatus } from "../world/world-types.js";
import type { GenesisRepositories, GenesisUnitOfWork } from "./genesis-unit-of-work.js";
import type { WorldGenesisSnapshot, WorldGenesisSummary } from "./genesis-types.js";
import {
  buildPlayersFromGenesis,
  buildSquadsFromGenesis,
} from "./player-bootstrap.js";
import { WorldGenesisGenerator } from "./world-genesis-generator.js";
import { validateWorldGenesis } from "./world-genesis-validator.js";

/**
 * Gênese do mundo, depois do extermínio da arquitetura morta (R-175).
 *
 * **A gênese deixou de ser guardada (R-185).** Ela é uma função pura do `seed`,
 * que R-182 tornou coluna: `generate(world)` devolve sempre o mesmo mundo. O
 * `WorldGenesisRepository` — que a serializava inteira num blob — era hábito do
 * JSON, não necessidade. O que persiste é o EFEITO dela: as linhas de `Club`.
 *
 * O que saiu junto: `InitializePlayerLifecycle`, `BootstrapWorldScheduler` e
 * `ScheduleWorldTasks` eram mega-agregados sobre o adapter JSON. Não foram
 * adiados por conveniência — foram apagados, e voltam já em agregado por
 * entidade quando uma vertical viva os exigir. Hoje a vertical é o admin:
 * criar mundo → gerar clubes → ativar.
 *
 * Os clubes agora nascem como LINHAS. Era isto que faltava para
 * `identity:reserve-club` parar de falhar com
 * `ClubEntryReservation_gameWorldId_clubId_fkey`: a reserva já vivia no
 * Postgres e pendurava em `Club` por FK, enquanto o clube só existia no blob.
 */

export interface GenerateWorldGenesisResult {
  readonly created: boolean;
  readonly summary: WorldGenesisSummary;
}

export class GenerateWorldGenesis {
  public constructor(
    private readonly worldRepository: WorldRepository,
    private readonly unitOfWork: GenesisUnitOfWork,
    private readonly generator = new WorldGenesisGenerator(),
  ) {}

  public async execute(
    gameWorldId: GameWorldId,
  ): Promise<Result<GenerateWorldGenesisResult, DomainError>> {
    const world = await this.worldRepository.findById(gameWorldId);
    if (world === null) {
      return fail(
        new DomainError("WORLD_NOT_FOUND", "Mundo não encontrado.", {
          gameWorldId,
        }),
      );
    }
    if (world.status !== WorldStatus.CREATING) {
      return fail(
        new DomainError(
          "WORLD_GENESIS_NOT_ALLOWED",
          "A gênese só pode ser executada enquanto o mundo está CREATING.",
          { status: world.status },
        ),
      );
    }

    const genesis = this.generator.generate(world);
    const validated = validateWorldGenesis(world, genesis);
    if (!validated.ok) return validated;

    // Tudo numa transação (o UoW): 16 clubes, 368 jogadores, 16 elencos. Um
    // mundo com clubes e sem jogadores parece pronto e não é.
    const materialized = await this.materialize(world, genesis);
    if (!materialized.ok) return materialized;
    return succeed({
      created: materialized.value,
      summary: validated.value.summary,
    });
  }

  /**
   * Idempotente por agregado: reexecutar a gênese não duplica nem explode. Quem
   * arbitra é o `find*` — o que já existe é PULADO, não sobrescrito, porque a
   * esta altura o clube pode já ter sido renomeado pelo dono (BC-003), e a
   * gênese não tem o direito de desfazer isso.
   *
   * A ordem importa: clubes antes de elencos (a FK do elenco aponta para o
   * clube), e jogadores antes de elencos (a FK do membro aponta para o jogador).
   */
  private async materialize(
    world: GameWorldSnapshot,
    genesis: WorldGenesisSnapshot,
  ): Promise<Result<boolean, DomainError>> {
    const clubs = buildClubsFromGenesis(world, genesis);
    const players = buildPlayersFromGenesis(world, genesis);
    const squads = buildSquadsFromGenesis(world, genesis);
    const ledger = buildLedgerGenesis(world, genesis);
    const competition = buildCompetitionGenesis(world, genesis);
    const fanbases = buildFanbaseGenesis(world, genesis);

    // Reidrata tudo ANTES de abrir a transação: um snapshot inválido é erro de
    // gênese, não de banco, e não deve deixar uma transação meio aberta.
    for (const club of clubs) {
      const loaded = Club.fromSnapshot(club);
      if (!loaded.ok) return loaded;
    }
    for (const { player } of players) {
      const loaded = Player.fromSnapshot(player);
      if (!loaded.ok) return loaded;
    }
    for (const squad of squads) {
      const loaded = Squad.fromSnapshot(squad);
      if (!loaded.ok) return loaded;
    }

    const created = await this.unitOfWork.run(async (repositories) => {
      let any = false;
      any = (await materializeClubs(repositories, clubs)) || any;
      any = (await materializePlayers(repositories, world, players)) || any;
      any = (await materializeSquads(repositories, squads)) || any;
      // A torcida depois dos clubes: ela mora em colunas do `Club` (a FK do
      // seed é o próprio clube). Idempotente por clube (só semeia quem está zerado).
      await repositories.fanbase.seedFanbases(world.id, fanbases);
      // O razão por último: a conta de caixa e a dotação de cada clube dependem
      // de o clube já existir (a FK da conta aponta para o clube).
      any = (await materializeLedger(repositories, ledger)) || any;
      // A competição por último: as partidas referenciam os clubes.
      any = (await repositories.competitions.materializeGenesis(competition)) || any;
      return any;
    });
    return succeed(created);
  }
}

async function materializeLedger(
  repositories: GenesisRepositories,
  ledger: ReturnType<typeof buildLedgerGenesis>,
): Promise<boolean> {
  let created = false;
  // As contas primeiro (o lançamento referencia a conta). Idempotente: a que já
  // existe é pulada.
  for (const account of ledger.accounts) {
    const existing = await repositories.ledger.findAccount(
      account.gameWorldId,
      account.ownerScope,
      account.accountCode,
    );
    if (existing !== null) continue;
    await repositories.ledger.saveAccount(account, null);
    created = true;
  }
  // Os lançamentos são idempotentes por `sourceEventId` no próprio adapter:
  // reexecutar a gênese não credita a dotação duas vezes.
  for (const entry of ledger.entries) {
    if (await repositories.ledger.appendJournalEntry(entry)) created = true;
  }
  return created;
}

async function materializeClubs(
  repositories: GenesisRepositories,
  clubs: readonly Awaited<ReturnType<typeof buildClubsFromGenesis>>[number][],
): Promise<boolean> {
  let created = false;
  for (const club of clubs) {
    const existing = await repositories.clubs.findClubById(
      club.gameWorldId,
      club.id,
    );
    if (existing !== null) continue;
    await repositories.clubs.saveClub(club, null);
    created = true;
  }
  return created;
}

async function materializePlayers(
  repositories: GenesisRepositories,
  world: GameWorldSnapshot,
  players: readonly Awaited<ReturnType<typeof buildPlayersFromGenesis>>[number][],
): Promise<boolean> {
  let created = false;
  for (const aggregate of players) {
    const existing = await repositories.players.findPlayerById(
      world.id,
      aggregate.player.id,
    );
    if (existing !== null) continue;
    await repositories.players.savePlayer(aggregate, null);
    created = true;
  }
  return created;
}

async function materializeSquads(
  repositories: GenesisRepositories,
  squads: readonly Awaited<ReturnType<typeof buildSquadsFromGenesis>>[number][],
): Promise<boolean> {
  let created = false;
  for (const squad of squads) {
    const existing = await repositories.squads.findFirstTeamSquad(
      squad.gameWorldId,
      squad.clubId,
    );
    if (existing !== null) continue;
    await repositories.squads.saveSquad(squad, null);
    created = true;
  }
  return created;
}

export class ActivateProvisionedWorld {
  public constructor(
    private readonly worldRepository: WorldRepository,
    private readonly clubRepository: ClubRepository,
    private readonly generator = new WorldGenesisGenerator(),
  ) {}

  public async execute(
    gameWorldId: GameWorldId,
  ): Promise<Result<WorldMutationResult, DomainError>> {
    const world = await this.worldRepository.findById(gameWorldId);
    if (world === null) {
      return fail(
        new DomainError("WORLD_NOT_FOUND", "Mundo não encontrado.", {
          gameWorldId,
        }),
      );
    }

    const genesis = this.generator.generate(world);
    const validated = validateWorldGenesis(world, genesis);
    if (!validated.ok) return validated;

    // "A gênese rodou?" não se pergunta mais a um blob: pergunta-se ao EFEITO
    // dela. Se o primeiro clube do mundo não tem linha, a gênese não foi
    // materializada — e ativar um mundo sem clubes entregaria ao jogador um
    // mundo vazio.
    const first = genesis.clubs[0];
    if (first === undefined) {
      return fail(
        new DomainError("WORLD_GENESIS_EMPTY", "A gênese não produziu clubes."),
      );
    }
    const materialized = await this.clubRepository.findClubById(
      world.id,
      first.id,
    );
    if (materialized === null) {
      return fail(
        new DomainError(
          "WORLD_GENESIS_NOT_FOUND",
          "Execute world:genesis antes de ativar o mundo.",
          { gameWorldId },
        ),
      );
    }

    return new ActivateWorld(this.worldRepository).execute(
      gameWorldId,
      validated.value.evidence,
    );
  }
}
