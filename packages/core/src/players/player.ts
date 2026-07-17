import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import type { GeneratedPlayer } from "../genesis/genesis-types.js";

import { derivePlayerOverall } from "./player-attributes.js";
import {
  PlayerAvailability,
  PlayerCareerStatus,
  type PlayerAttributeCode,
  type PlayerDevelopmentHistoryEntry,
  type PlayerDevelopmentHistoryId,
  type PlayerLifecycleSnapshot,
} from "./player-lifecycle-types.js";

export class Player {
  private constructor(private state: PlayerLifecycleSnapshot) {}

  public static fromGenesis(
    gameWorldId: PlayerLifecycleSnapshot["gameWorldId"],
    player: GeneratedPlayer,
    worldDate: string,
  ): Result<Player, DomainError> {
    const parsedDate = WorldDate.parse(worldDate);
    if (!parsedDate.ok) return parsedDate;
    return succeed(
      new Player({
        id: player.id,
        gameWorldId,
        personId: player.personId,
        primaryPosition: player.primaryPosition,
        ...(player.secondaryPosition === undefined
          ? {}
          : { secondaryPosition: player.secondaryPosition }),
        dominantFoot: player.dominantFoot,
        careerStatus: PlayerCareerStatus.ACTIVE,
        availability: PlayerAvailability.AVAILABLE,
        generationSource: player.generationSource,
        generatedAtSeasonNumber: 1,
        attributes: player.attributes,
        currentAbility: derivePlayerOverall(player.primaryPosition, player.attributes),
        potentialAbility: player.potentialAbility,
        dynamicState: {
          morale: 50,
          confidence: 50,
          happiness: 50,
          fatigue: 0,
          matchSharpness: 50,
        },
        lastProcessedOn: worldDate,
        version: 1,
      }),
    );
  }

  public static fromSnapshot(
    snapshot: PlayerLifecycleSnapshot,
  ): Result<Player, DomainError> {
    const date = WorldDate.parse(snapshot.lastProcessedOn);
    if (!date.ok) return date;
    if (
      !validScore(snapshot.currentAbility) ||
      !validScore(snapshot.potentialAbility) ||
      snapshot.currentAbility > snapshot.potentialAbility ||
      // `null` é legítimo aqui, e só aqui: é o grid de goleiro em quem não é
      // goleiro. Não é "atributo zero" — é "não se aplica" (R-188).
      !Object.values(snapshot.attributes)
        .filter((value) => value !== null)
        .every(validScore) ||
      !Object.values(snapshot.dynamicState).every(validScore) ||
      !Number.isSafeInteger(snapshot.version) ||
      snapshot.version < 1
    ) {
      return fail(
        new DomainError(
          "INVALID_PLAYER_SNAPSHOT",
          "O snapshot do jogador viola as escalas ou o potencial.",
          { playerId: snapshot.id },
        ),
      );
    }
    return succeed(new Player(snapshot));
  }

  public processUntil(on: WorldDate): Result<boolean, DomainError> {
    const target = on.toString();
    if (target < this.state.lastProcessedOn) {
      return fail(
        new DomainError(
          "PLAYER_DAY_OUT_OF_ORDER",
          "O jogador não pode ser processado em uma data anterior.",
          {
            playerId: this.state.id,
            target,
            lastProcessedOn: this.state.lastProcessedOn,
          },
        ),
      );
    }
    if (target === this.state.lastProcessedOn) return succeed(false);

    const days = dayDifference(this.state.lastProcessedOn, target);
    let dynamicState = this.state.dynamicState;
    for (let index = 0; index < days; index += 1) {
      dynamicState = {
        morale: approach(dynamicState.morale, 50, 1),
        confidence: approach(dynamicState.confidence, 50, 1),
        happiness: approach(dynamicState.happiness, 50, 1),
        fatigue: Math.max(0, dynamicState.fatigue - 2),
        matchSharpness: Math.max(0, dynamicState.matchSharpness - 1),
      };
    }
    this.state = {
      ...this.state,
      dynamicState,
      lastProcessedOn: target,
      version: this.state.version + 1,
    };
    return succeed(true);
  }

  public applyAttributeChange(
    input: Readonly<{
      historyId: PlayerDevelopmentHistoryId;
      attributeCode: PlayerAttributeCode;
      requestedValue: number;
      cause: string;
      worldDate: string;
      rulesetVersion: RulesetVersion;
    }>,
  ): Result<PlayerDevelopmentHistoryEntry | null, DomainError> {
    if (!validScore(input.requestedValue) || input.cause.trim() === "") {
      return fail(
        new DomainError(
          "INVALID_PLAYER_DEVELOPMENT",
          "Valor e causa da evolução devem ser válidos.",
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;

    const previousValue = this.state.attributes[input.attributeCode];
    // Uma regra que os 4 grupos não conseguiam nem enunciar: treinar reflexo de
    // goleiro num atacante. O atributo é `null` nele — "não se aplica" —, e
    // isso é recusa, não um treino que rende zero.
    if (previousValue === null) {
      return fail(
        new DomainError(
          "ATTRIBUTE_NOT_APPLICABLE",
          "Esse atributo não se aplica à posição do jogador.",
          { playerId: this.state.id, attributeCode: input.attributeCode },
        ),
      );
    }

    let nextValue = Math.max(
      previousValue - 6,
      Math.min(previousValue + 6, input.requestedValue),
    );
    if (
      nextValue > previousValue &&
      this.state.currentAbility >= this.state.potentialAbility
    ) {
      nextValue = previousValue;
    }
    while (
      nextValue > previousValue &&
      this.overallWith(input.attributeCode, nextValue) >
        this.state.potentialAbility
    ) {
      nextValue -= 1;
    }
    if (nextValue === previousValue) return succeed(null);
    const attributes = {
      ...this.state.attributes,
      [input.attributeCode]: nextValue,
    };
    const currentAbility = this.overallWith(input.attributeCode, nextValue);
    this.state = {
      ...this.state,
      attributes,
      currentAbility,
      version: this.state.version + 1,
    };
    return succeed({
      id: input.historyId,
      gameWorldId: this.state.gameWorldId,
      playerId: this.state.id,
      attributeCode: input.attributeCode,
      previousValue,
      nextValue,
      cause: input.cause.trim(),
      worldDate: input.worldDate,
      rulesetVersion: input.rulesetVersion,
    });
  }

  public snapshot(): PlayerLifecycleSnapshot {
    return this.state;
  }

  /**
   * A nota do jogador com UM atributo trocado — sem materializar a troca.
   *
   * Isto montava um `GeneratedPlayer` inteiro e falso só para chamar o cálculo
   * do gerador, com um `clubId` de UUID zerado no meio. A nota nunca dependeu
   * de clube: ela é `(posição, atributos)`, e é essa a assinatura de
   * `derivePlayerOverall`.
   */
  private overallWith(code: PlayerAttributeCode, value: number): number {
    return derivePlayerOverall(this.state.primaryPosition, {
      ...this.state.attributes,
      [code]: value,
    });
  }
}

function validScore(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= 100;
}

function dayDifference(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

function approach(value: number, target: number, step: number): number {
  if (value === target) return value;
  return value < target
    ? Math.min(target, value + step)
    : Math.max(target, value - step);
}
