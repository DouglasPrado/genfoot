import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import type {
  GameWorldSnapshot,
  WorldProvisioningEvidence,
} from "../world/world-types.js";
import { derivePlayerOverall } from "../players/player-attributes.js";
import type {
  ClubId,
  PlayerId,
  WorldGenesisSnapshot,
  WorldGenesisSummary,
} from "./genesis-types.js";

export interface ValidatedWorldGenesis {
  readonly evidence: WorldProvisioningEvidence;
  readonly summary: WorldGenesisSummary;
}

export function validateWorldGenesis(
  world: GameWorldSnapshot,
  genesis: WorldGenesisSnapshot,
): Result<ValidatedWorldGenesis, DomainError> {
  if (genesis.gameWorldId !== world.id) {
    return invalid("A gênese pertence a outro mundo.");
  }
  if (genesis.rulesetVersion !== world.rulesetVersion) {
    return invalid("A gênese usa um ruleset diferente do mundo.");
  }
  if (
    genesis.clubs.length !== 16 ||
    uniqueSize(genesis.clubs.map(({ id }) => id)) !== 16
  ) {
    return invalid("A gênese deve conter exatamente 16 clubes únicos.");
  }
  if (
    genesis.persons.length !== 368 ||
    uniqueSize(genesis.persons.map(({ id }) => id)) !== 368
  ) {
    return invalid("A gênese deve conter exatamente 368 pessoas únicas.");
  }
  if (
    genesis.players.length !== 368 ||
    uniqueSize(genesis.players.map(({ id }) => id)) !== 368 ||
    uniqueSize(genesis.players.map(({ personId }) => personId)) !== 368
  ) {
    return invalid(
      "A gênese deve conter 368 jogadores e relações pessoa-jogador únicas.",
    );
  }

  const clubIds = new Set<ClubId>(genesis.clubs.map(({ id }) => id));
  const personIds = new Set(genesis.persons.map(({ id }) => id));
  const playersById = new Map<PlayerId, (typeof genesis.players)[number]>();
  for (const player of genesis.players) {
    if (!clubIds.has(player.clubId) || !personIds.has(player.personId)) {
      return invalid(
        "Todo jogador deve apontar para clube e pessoa da mesma gênese.",
      );
    }
    // NÃO se exige `overall === 60` por jogador, e a exigência anterior era um
    // erro que contradizia a própria R-57: "os pontos podem ser distribuídos de
    // formas diferentes entre goleiros, defesa, meio e ataque". Com todo mundo
    // em 60 não há distribuição diferente possível — o validador proibia o que
    // a decisão exige. O que vale é o TETO do elenco, checado abaixo.
    playersById.set(player.id, player);
  }

  if (
    genesis.squads.length !== 16 ||
    uniqueSize(genesis.squads.map(({ clubId }) => clubId)) !== 16
  ) {
    return invalid("Deve existir exatamente um elenco para cada clube.");
  }

  const assignedPlayers = new Set<PlayerId>();
  for (const squad of genesis.squads) {
    if (!clubIds.has(squad.clubId) || squad.playerIds.length !== 23) {
      return invalid(
        "Cada clube deve possuir um elenco válido de 23 jogadores.",
      );
    }
    if (uniqueSize(squad.playerIds) !== 23) {
      return invalid(
        "Um jogador não pode aparecer duas vezes no mesmo elenco.",
      );
    }

    let totalOverall = 0;
    for (const playerId of squad.playerIds) {
      const player = playersById.get(playerId);
      if (
        player === undefined ||
        player.clubId !== squad.clubId ||
        assignedPlayers.has(playerId)
      ) {
        return invalid(
          "Cada jogador deve pertencer a exatamente um elenco e ao clube correto.",
        );
      }
      assignedPlayers.add(playerId);
      totalOverall += derivePlayerOverall(player.primaryPosition, player.attributes);
    }
    if (totalOverall !== 1_380) {
      return invalid("A força total de cada elenco deve ser exatamente 1.380.");
    }
  }
  if (assignedPlayers.size !== 368) {
    return invalid("Todos os jogadores gerados devem integrar um elenco.");
  }

  const calendarValidation = validateCalendar(genesis, clubIds);
  if (!calendarValidation.ok) return calendarValidation;

  return succeed({
    evidence: {
      generatedClubCount: 16,
      clubsWithValidSquads: 16,
      generatedPlayerCount: 368,
      playersPerSquad: 23,
      calendarValidated: true,
      rulesetVersion: genesis.rulesetVersion,
    },
    summary: {
      clubCount: 16,
      personCount: 368,
      playerCount: 368,
      squadCount: 16,
      fixtureCount: 240,
      roundCount: 30,
      averageOverall: 60,
    },
  });
}

function validateCalendar(
  genesis: WorldGenesisSnapshot,
  clubIds: ReadonlySet<ClubId>,
): Result<void, DomainError> {
  if (
    genesis.competition.rounds !== 30 ||
    genesis.competition.clubIds.length !== 16 ||
    genesis.fixtures.length !== 240
  ) {
    return invalid(
      "A Liga Inicial deve conter 16 clubes, 30 rodadas e 240 partidas.",
    );
  }

  const fixturesByRound = new Map<
    number,
    (typeof genesis.fixtures)[number][]
  >();
  const pairings = new Map<string, (typeof genesis.fixtures)[number][]>();
  const matchesByClub = new Map<ClubId, number>();

  for (const fixture of genesis.fixtures) {
    if (
      !clubIds.has(fixture.homeClubId) ||
      !clubIds.has(fixture.awayClubId) ||
      fixture.homeClubId === fixture.awayClubId ||
      fixture.round < 1 ||
      fixture.round > 30
    ) {
      return invalid("O calendário contém uma partida inválida.");
    }
    const round = fixturesByRound.get(fixture.round) ?? [];
    round.push(fixture);
    fixturesByRound.set(fixture.round, round);

    const pairKey = [fixture.homeClubId, fixture.awayClubId].sort().join(":");
    const pair = pairings.get(pairKey) ?? [];
    pair.push(fixture);
    pairings.set(pairKey, pair);

    matchesByClub.set(
      fixture.homeClubId,
      (matchesByClub.get(fixture.homeClubId) ?? 0) + 1,
    );
    matchesByClub.set(
      fixture.awayClubId,
      (matchesByClub.get(fixture.awayClubId) ?? 0) + 1,
    );
  }

  for (let roundNumber = 1; roundNumber <= 30; roundNumber += 1) {
    const round = fixturesByRound.get(roundNumber);
    if (round?.length !== 8)
      return invalid("Cada rodada deve conter exatamente 8 partidas.");
    const participants = round.flatMap(({ homeClubId, awayClubId }) => [
      homeClubId,
      awayClubId,
    ]);
    if (uniqueSize(participants) !== 16) {
      return invalid("Um clube não pode jogar duas vezes na mesma rodada.");
    }
  }

  if (pairings.size !== 120)
    return invalid("Todos os pares de clubes devem se enfrentar.");
  for (const pair of pairings.values()) {
    if (
      pair.length !== 2 ||
      pair[0]!.homeClubId !== pair[1]!.awayClubId ||
      pair[0]!.awayClubId !== pair[1]!.homeClubId
    ) {
      return invalid(
        "Cada confronto deve possuir ida e volta com mandos invertidos.",
      );
    }
  }
  if ([...clubIds].some((clubId) => matchesByClub.get(clubId) !== 30)) {
    return invalid("Cada clube deve disputar exatamente 30 partidas.");
  }

  return succeed(undefined);
}

function uniqueSize(values: readonly (string | number)[]): number {
  return new Set(values).size;
}

function invalid<T = never>(message: string): Result<T, DomainError> {
  return fail(new DomainError("INVALID_WORLD_GENESIS", message));
}
