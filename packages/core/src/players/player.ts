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
import { derivePotentialLayers } from "./potential-layers.js";
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
        // Jogador nasce com a base igual ao que ele é: a margem daqui para
        // frente é o que a estrutura do clube vai render (R-216).
        baselineAbility: derivePlayerOverall(player.primaryPosition, player.attributes),
        lastAgedSeasonId: null,
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
    /**
     * O teto é o potencial APROVEITÁVEL (R-213), medido da LINHA DE BASE
     * (R-216) — e é a linha de base que faz a R-12 travar de verdade.
     *
     * Medindo da habilidade atual, o teto subia a cada ganho e convergia para o
     * natural: o clamp parecia cumprir a R-12 e não travava nada (trava B-07).
     * Da base fixa, um jovem de potencial 85 e base 35 para em 55 numa
     * estrutura nível 1, como manda `04-estrutura-do-clube-e-staff.md:258-264`.
     *
     * A base é reescrita na virada de temporada: estrutura ruim ATRASA o
     * jogador, não o limita para sempre.
     *
     * `structureLevel` ainda não é conhecido aqui e cai no provisório da R-213
     * (nível 3) — dívida declarada: hoje clube nível 1 e nível 5 rendem igual.
     */
    const ceiling = derivePotentialLayers({
      natural: this.state.potentialAbility,
      baselineAbility: this.state.baselineAbility,
      currentAbility: this.state.currentAbility,
    }).usable;
    if (nextValue > previousValue && this.state.currentAbility >= ceiling) {
      nextValue = previousValue;
    }
    while (
      nextValue > previousValue &&
      this.overallWith(input.attributeCode, nextValue) > ceiling
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

  /** O valor atual de um atributo (para o accrual somar seu delta). */
  public attributeValue(code: PlayerAttributeCode): number | null {
    return this.state.attributes[code];
  }

  /**
   * Fixa a linha de base na habilidade atual (R-216).
   *
   * Chamada UMA vez na virada de temporada, depois de aplicado o accrual: a
   * margem de crescimento da próxima temporada passa a ser medida daqui. É o que
   * faz a estrutura ruim ATRASAR em vez de limitar para sempre — a cada virada o
   * jogador recomeça a corrida do ponto a que chegou.
   */
  public rebaseline(): void {
    this.state = {
      ...this.state,
      baselineAbility: this.state.currentAbility,
      version: this.state.version + 1,
    };
  }

  /**
   * Encerra a carreira (R-217): `careerStatus` → `RETIRED`.
   *
   * Idempotente: aposentar quem já está aposentado é no-op, não incrementa
   * versão à toa. Chamado na virada de temporada quando o roll de aposentadoria
   * decide. A "pessoa persistente vira funcionário" (§17/PLY-018) é outro passo,
   * fora daqui.
   */
  public retire(): void {
    if (this.state.careerStatus === PlayerCareerStatus.RETIRED) return;
    this.state = {
      ...this.state,
      careerStatus: PlayerCareerStatus.RETIRED,
      version: this.state.version + 1,
    };
  }

  /** Já envelhecido nesta temporada? A virada pula quem já foi (R-217, INV-29). */
  public wasAgedIn(seasonId: string): boolean {
    return this.state.lastAgedSeasonId === seasonId;
  }

  /** Marca a temporada envelhecida — a trava de idempotência da virada. */
  public markAged(seasonId: string): void {
    this.state = {
      ...this.state,
      lastAgedSeasonId: seasonId,
      version: this.state.version + 1,
    };
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
