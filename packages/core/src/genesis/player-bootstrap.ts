import type { PlayerAggregateSnapshot } from "../players/player-repository.js";
import { SquadCategory, type SquadSnapshot } from "../clubs/club-types.js";
import type { GameWorldSnapshot } from "../world/world-types.js";

import type { WorldGenesisSnapshot } from "./genesis-types.js";

/**
 * Os jogadores iniciais do mundo, como AGREGADOS (pessoa + jogador), a partir da
 * gênese.
 *
 * Puro: os ids já vêm do seed (o gerador os derivou), e nada aqui usa relógio. A
 * `lastProcessedOn` e a data da pessoa nascem em `world.startDate` — o dia zero
 * do mundo.
 *
 * O dinheiro e o vínculo NÃO nascem aqui: `marketValueMinor`/`wageExpectationMinor`
 * ficam nulos até C9 (R-189), e o vínculo com o clube é o ELENCO (abaixo), não uma
 * coluna no jogador.
 */
export function buildPlayersFromGenesis(
  world: GameWorldSnapshot,
  genesis: WorldGenesisSnapshot,
): readonly PlayerAggregateSnapshot[] {
  const personById = new Map(genesis.persons.map((person) => [person.id, person]));
  return genesis.players.map((player) => {
    const person = personById.get(player.personId);
    if (person === undefined) {
      throw new Error(
        `Gênese inconsistente: jogador ${player.id} sem pessoa ${player.personId}.`,
      );
    }
    return {
      person: {
        id: person.id,
        gameWorldId: world.id,
        firstName: person.firstName,
        lastName: person.lastName,
        birthDate: person.birthDate,
        nationality: person.primaryNationality,
        version: 1,
      },
      player: {
        id: player.id,
        gameWorldId: world.id,
        personId: player.personId,
        primaryPosition: player.primaryPosition,
        ...(player.secondaryPosition === undefined
          ? {}
          : { secondaryPosition: player.secondaryPosition }),
        dominantFoot: player.dominantFoot,
        careerStatus: "ACTIVE",
        availability: "AVAILABLE",
        generationSource: player.generationSource,
        generatedAtSeasonNumber: 1,
        attributes: player.attributes,
        // Derivado na gravação (R-09); aqui só semeia o snapshot.
        currentAbility: 0,
        baselineAbility: 0,
        lastAgedSeasonId: null,
        potentialAbility: player.potentialAbility,
        dynamicState: {
          morale: 50,
          confidence: 50,
          happiness: 50,
          fatigue: 0,
          matchSharpness: 50,
        },
        lastProcessedOn: world.startDate,
        version: 1,
      },
    };
  });
}

/**
 * Os elencos iniciais (R-190): a primeira equipe de cada clube, com os 23
 * jogadores da gênese e número de camisa por ordem do template de posições.
 *
 * O número da camisa é o slot (R-190): sequencial 1..23 na ordem em que o
 * gerador dispôs o elenco — determinístico, e a unicidade por elenco é
 * respeitada. Números "de verdade" (o 10 do craque, o 1 do goleiro) são decisão
 * de gestão, não da largada.
 */
export function buildSquadsFromGenesis(
  world: GameWorldSnapshot,
  genesis: WorldGenesisSnapshot,
): readonly SquadSnapshot[] {
  const clubName = new Map(genesis.clubs.map((club) => [club.id, club.name]));
  return genesis.squads.map((squad) => ({
    id: squad.id,
    gameWorldId: world.id,
    clubId: squad.clubId,
    name: `Elenco ${clubName.get(squad.clubId) ?? ""}`.trim(),
    category: SquadCategory.FIRST_TEAM,
    seasonNumber: 1,
    version: 1,
    memberships: squad.playerIds.map((playerId, index) => ({
      playerId,
      shirtNumber: index + 1,
      role: null,
      effectiveFrom: world.startDate,
    })),
  }));
}
