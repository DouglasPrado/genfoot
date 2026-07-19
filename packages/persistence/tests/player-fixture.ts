import {
  derivePlayerOverall,
  type GeneratedSquadPlayer,
  type PlayerAggregateSnapshot,
} from "@grinta/core";

import { WORLD_ID } from "./fixtures.js";

/**
 * Monta o agregado de um jogador a partir de um `GeneratedSquadPlayer` real do
 * gerador — não de um grid inventado à mão, que poderia violar invariantes que
 * o gerador respeita.
 *
 * O `personId` é derivado do `playerId` para ser único e determinístico sem
 * depender do relógio.
 */
export function playerAggregate(
  playerId: string,
  generated: GeneratedSquadPlayer,
): PlayerAggregateSnapshot {
  const personId = `019b76da-a800-7ccc-9462-${playerId.slice(-12)}`;
  return {
    person: {
      id: personId as never,
      gameWorldId: WORLD_ID as never,
      firstName: "Jogador",
      lastName: playerId.slice(-4),
      birthDate: "1994-03-11",
      nationality: "BR",
      version: 1,
    },
    player: {
      id: playerId as never,
      gameWorldId: WORLD_ID as never,
      personId: personId as never,
      primaryPosition: generated.position,
      dominantFoot: "RIGHT",
      careerStatus: "ACTIVE",
      availability: "AVAILABLE",
      generationSource: "INITIAL_WORLD",
      generatedAtSeasonNumber: 1,
      attributes: generated.attributes,
      currentAbility: derivePlayerOverall(generated.position, generated.attributes),
      baselineAbility: derivePlayerOverall(generated.position, generated.attributes),
      potentialAbility: generated.potentialAbility,
      dynamicState: {
        morale: 50,
        confidence: 50,
        happiness: 50,
        fatigue: 0,
        matchSharpness: 50,
      },
      lastProcessedOn: "2026-01-02",
      version: 1,
    },
  };
}
