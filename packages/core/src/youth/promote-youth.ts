import { DomainError, fail, succeed, type Result } from "@grinta/shared";
import type { RulesetVersion } from "@grinta/shared";

import { Squad } from "../clubs/squad.js";
import type { SquadRepository } from "../clubs/squad-repository.js";
import { MAX_SQUAD_SIZE } from "../genesis/player-generation.js";
import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import type { YouthPromotedEvent } from "../players/player-lifecycle-types.js";

/**
 * O UnitOfWork da promoção (C8): os dois elencos — base e profissional — no MESMO
 * commit. Meio efeito é corrupção (o jovem sumido da base e não chegado ao
 * profissional, ou nos dois ao mesmo tempo). O tipo do repositório (sem
 * `$transaction`) impede meio efeito escapar.
 */
export interface PromoteYouthRepositories {
  readonly squads: SquadRepository;
}

export interface PromoteYouthUnitOfWork {
  run<T>(
    work: (repositories: PromoteYouthRepositories) => Promise<T>,
  ): Promise<T>;
}

export interface PromoteYouthInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly playerId: string;
  readonly occurredOn: string;
  /** Versão do ruleset no momento — carimbada no evento. Default de dev. */
  readonly rulesetVersion?: RulesetVersion;
}

export interface PromoteYouthResult {
  readonly playerId: string;
  readonly event: YouthPromotedEvent;
}

/**
 * Sobe um jovem da base para o elenco profissional — dentro do mesmo clube, sem
 * dinheiro (não é transferência: é o clube usando o que formou). Move a
 * `SquadMembership` do YOUTH_ACADEMY para o FIRST_TEAM, atômico.
 */
export class PromoteYouthPlayer {
  public constructor(private readonly unitOfWork: PromoteYouthUnitOfWork) {}

  public execute(
    input: PromoteYouthInput,
  ): Promise<Result<PromoteYouthResult, DomainError>> {
    return run(this.unitOfWork, async (repos) => {
      const worldId = input.gameWorldId as never;
      const clubId = input.clubId as never;
      const youthSquad = await repos.squads.findYouthSquad(worldId, clubId);
      const firstTeam = await repos.squads.findFirstTeamSquad(worldId, clubId);
      if (youthSquad === null || firstTeam === null) {
        return fail(
          new DomainError("SQUAD_NOT_FOUND", "Elenco de base ou profissional não encontrado."),
        );
      }

      const inYouth = youthSquad.memberships.some(
        (m) => m.playerId === input.playerId,
      );
      if (!inYouth) {
        return fail(
          new DomainError(
            "PLAYER_NOT_IN_YOUTH",
            "O jogador não está na base deste clube.",
          ),
        );
      }

      // Gate específico da rastreabilidade §30, checado ANTES de mexer nos
      // elencos: o agregado recusaria com `SQUAD_CAPACITY_EXCEEDED` genérico,
      // mas a tela (M-PROMOTE) precisa do código próprio para orientar o gestor
      // a abrir vaga antes (vender/emprestar).
      //
      // Gateia no teto TOTAL (MAX_SQUAD_SIZE=250, R-193). Um limite de elenco
      // PRINCIPAL menor — o que de fato apertaria a promoção — não está definido
      // no domínio; é decisão de produto pendente. Enquanto isso o gate existe e
      // é correto, só raramente dispara.
      if (firstTeam.memberships.length >= MAX_SQUAD_SIZE) {
        return fail(
          new DomainError(
            "SQUAD_SIZE_LIMIT_EXCEEDED",
            "O elenco profissional está cheio; abra vaga antes de promover.",
            { limit: MAX_SQUAD_SIZE },
          ),
        );
      }

      // ── Base: sai da categoria de base.
      const loadedYouth = Squad.fromSnapshot(youthSquad);
      if (!loadedYouth.ok) return loadedYouth;
      const removed = loadedYouth.value.remove(input.playerId);
      if (!removed.ok) return removed;

      // ── Profissional: entra, com a próxima camisa livre.
      const loadedFirst = Squad.fromSnapshot(firstTeam);
      if (!loadedFirst.ok) return loadedFirst;
      const shirt = nextFreeShirt(
        firstTeam.memberships.map((m) => m.shirtNumber),
      );
      const assigned = loadedFirst.value.assign({
        playerId: input.playerId as never,
        shirtNumber: shirt,
        role: null,
        effectiveFrom: input.occurredOn,
      });
      if (!assigned.ok) return assigned;

      await repos.squads.saveSquad(loadedYouth.value.snapshot(), youthSquad.version);
      await repos.squads.saveSquad(loadedFirst.value.snapshot(), firstTeam.version);

      // Idempotência por (jogador, data): promover o mesmo jovem no mesmo dia do
      // mundo dá a mesma chave, então o efeito oficial não duplica (INV-37).
      const idempotencyKey = `youth-promote:${input.playerId}:${input.occurredOn}`;
      const event: YouthPromotedEvent = {
        id: deterministicUuidV7({
          worldSeed: input.gameWorldId,
          context: idempotencyKey,
          timestampMilliseconds: 0,
        }) as never,
        type: "YouthPromoted",
        gameWorldId: input.gameWorldId as never,
        playerId: input.playerId as never,
        worldDate: input.occurredOn,
        rulesetVersion: (input.rulesetVersion ?? "1.0.0") as RulesetVersion,
        idempotencyKey,
      };

      return succeed({ playerId: input.playerId, event });
    });
  }
}

/** A próxima camisa livre (1..MAX_SQUAD_SIZE) no elenco profissional. */
function nextFreeShirt(taken: readonly number[]): number {
  const used = new Set(taken);
  for (let n = 1; n <= MAX_SQUAD_SIZE; n += 1) if (!used.has(n)) return n;
  return MAX_SQUAD_SIZE;
}

class Rollback extends Error {
  public constructor(public readonly domainError: DomainError) {
    super(domainError.message);
  }
}

/** Falha de domínio desfaz a transação inteira (o mesmo padrão da transferência). */
async function run<T>(
  unitOfWork: PromoteYouthUnitOfWork,
  work: (repositories: PromoteYouthRepositories) => Promise<Result<T, DomainError>>,
): Promise<Result<T, DomainError>> {
  try {
    return await unitOfWork.run(async (repositories) => {
      const result = await work(repositories);
      if (!result.ok) throw new Rollback(result.error);
      return result;
    });
  } catch (error) {
    if (error instanceof Rollback) return fail(error.domainError);
    throw error;
  }
}
