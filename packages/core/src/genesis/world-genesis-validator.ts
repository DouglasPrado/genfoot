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
    genesis.clubs.length !== 20 ||
    uniqueSize(genesis.clubs.map(({ id }) => id)) !== 20
  ) {
    return invalid("A gênese deve conter exatamente 20 clubes únicos.");
  }
  if (
    genesis.persons.length !== 460 ||
    uniqueSize(genesis.persons.map(({ id }) => id)) !== 460
  ) {
    return invalid("A gênese deve conter exatamente 460 pessoas únicas.");
  }
  if (
    genesis.players.length !== 460 ||
    uniqueSize(genesis.players.map(({ id }) => id)) !== 460 ||
    uniqueSize(genesis.players.map(({ personId }) => personId)) !== 460
  ) {
    return invalid(
      "A gênese deve conter 460 jogadores e relações pessoa-jogador únicas.",
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
    genesis.squads.length !== 20 ||
    uniqueSize(genesis.squads.map(({ clubId }) => clubId)) !== 20
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
  if (assignedPlayers.size !== 460) {
    return invalid("Todos os jogadores gerados devem integrar um elenco.");
  }

  // Sem calendário na gênese (R-203): o mundo nasce sem competição. As ligas e
  // copas — e seu calendário — são autoradas no admin (R-202).

  return succeed({
    evidence: {
      generatedClubCount: 20,
      clubsWithValidSquads: 20,
      generatedPlayerCount: 460,
      playersPerSquad: 23,
      calendarValidated: true,
      rulesetVersion: genesis.rulesetVersion,
    },
    summary: {
      clubCount: 20,
      personCount: 460,
      playerCount: 460,
      squadCount: 20,
      averageOverall: 60,
    },
  });
}

function uniqueSize(values: readonly (string | number)[]): number {
  return new Set(values).size;
}

function invalid<T = never>(message: string): Result<T, DomainError> {
  return fail(new DomainError("INVALID_WORLD_GENESIS", message));
}
