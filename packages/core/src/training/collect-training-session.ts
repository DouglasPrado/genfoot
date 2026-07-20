import { DomainError, fail, succeed, type Result } from "@grinta/shared";
import type { RulesetVersion } from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import { Player } from "../players/player.js";
import type { PlayerAttributeCode } from "../players/player-lifecycle-types.js";
import { derivePotentialLayers } from "../players/potential-layers.js";

import { computeDevelopmentGain, GAIN_SCALE } from "./development-gain.js";
import { sessionElapsedDays, sessionGainMilli } from "./training-session.js";
import type {
  TrainingSessionSnapshot,
  TrainingSessionUnitOfWork,
} from "./training-session-types.js";

/**
 * Coleta/encerra a sessão e APLICA o ganho NA HORA (R-221 Fase 2a,
 * `training:collect-session`).
 *
 * O ganho é o diário (fórmula canônica) pelos dias efetivamente treinados,
 * tetado na duração — coletar antes do fim rende PARCIAL. Aplica direto no
 * atributo (não bufferiza até a virada), respeitando o teto do potencial
 * aproveitável (R-216). O jogador volta a ficar disponível e sai cansado
 * (o treino fatiga).
 *
 * Calibração minha (VAL-001), não constante de doc: os fatores fixos da sessão,
 * o intervalo de headroom e a fadiga por dia.
 */
const BASE_LEARNING_RATE = 0.6;
const FOCUSED_QUALITY = 1;
const COMPETITIVE_MINUTES = 0.6;
/** Headroom (teto − atual) que satura o fator de potencial restante em 1. */
const MAX_HEADROOM = 40;
const TRAINING_FATIGUE_PER_DAY = 3;
/**
 * Concentração da sessão (R-221): a fórmula canônica (`development-gain`) foi
 * calibrada para accrual de TEMPORADA — por dia ela rende migalhas, e uma sessão
 * de dias renderia < 1 ponto, invisível. O treino de sessão é uma atividade
 * concentrada e o progresso é INSTANTÂNEO e VISÍVEL (R-221), então o ganho da
 * sessão é multiplicado por este fator. O clamp ±6 de `applyAttributeChange`
 * ainda teta o salto de uma sessão. Calibração minha (VAL-001).
 */
const SESSION_INTENSITY = 12;

export interface CollectTrainingSessionInput {
  readonly gameWorldId: string;
  readonly playerId: string;
  readonly worldSeed: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
}

export interface CollectTrainingSessionResult {
  readonly attributeCode: string;
  readonly gainPoints: number;
  readonly elapsedDays: number;
  readonly complete: boolean;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** Idade em anos cheios de uma data de nascimento até a data corrente. */
function ageOn(birthDate: string, worldDate: string): number {
  const b = birthDate.slice(0, 10);
  const d = worldDate.slice(0, 10);
  let age = Number(d.slice(0, 4)) - Number(b.slice(0, 4));
  if (d.slice(5) < b.slice(5)) age -= 1;
  return age;
}

export class CollectTrainingSession {
  public constructor(private readonly uow: TrainingSessionUnitOfWork) {}

  public async execute(
    input: CollectTrainingSessionInput,
  ): Promise<Result<CollectTrainingSessionResult, DomainError>> {
    return this.uow.run(async ({ sessions, players }) => {
      const session = await sessions.findActiveByPlayer(
        input.gameWorldId,
        input.playerId,
      );
      if (session === null) {
        return fail(
          new DomainError(
            "NO_ACTIVE_TRAINING_SESSION",
            "O jogador não tem sessão de treino ativa.",
            { playerId: input.playerId },
          ),
        );
      }

      const snapshot = await players.findPlayerById(
        input.gameWorldId as never,
        input.playerId as never,
      );
      if (snapshot === null) {
        return fail(
          new DomainError("PLAYER_NOT_FOUND", "Jogador não encontrado.", {
            playerId: input.playerId,
          }),
        );
      }
      const loaded = Player.fromSnapshot(snapshot.player);
      if (!loaded.ok) return loaded;
      const player = loaded.value;

      const code = session.attributeCode as PlayerAttributeCode;
      const current = player.attributeValue(code);
      const elapsedDays = sessionElapsedDays(session.startDate, input.worldDate);

      let gainPoints = 0;
      if (current !== null) {
        const ceiling = derivePotentialLayers({
          natural: snapshot.player.potentialAbility,
          baselineAbility: snapshot.player.baselineAbility,
          currentAbility: snapshot.player.currentAbility,
        }).usable;
        const remainingPotential = clamp01(
          (ceiling - snapshot.player.currentAbility) / MAX_HEADROOM,
        );
        const dailyGainMilli = computeDevelopmentGain({
          baseLearningRate: BASE_LEARNING_RATE,
          remainingPotential,
          trainingFocus: FOCUSED_QUALITY,
          trainingQuality: FOCUSED_QUALITY,
          compatibility: FOCUSED_QUALITY,
          competitiveMinutes: COMPETITIVE_MINUTES,
          age: ageOn(snapshot.person.birthDate, input.worldDate),
          morale: clamp01(snapshot.player.dynamicState.morale / 100),
          fatigue: clamp01(snapshot.player.dynamicState.fatigue / 100),
          injury: 0,
          negativePressure: 0,
        });
        const gainMilli =
          sessionGainMilli({
            dailyGainMilli,
            elapsedDays,
            durationDays: session.durationDays,
          }) * SESSION_INTENSITY;
        gainPoints = Math.round(gainMilli / GAIN_SCALE);
        if (gainPoints > 0) {
          const applied = player.applyAttributeChange({
            historyId: deterministicUuidV7({
              worldSeed: input.worldSeed,
              context: `training-session:${session.id}`,
              timestampMilliseconds: 0,
            }),
            attributeCode: code,
            requestedValue: current + gainPoints,
            cause: "training-session",
            worldDate: input.worldDate,
            rulesetVersion: input.rulesetVersion,
          });
          if (!applied.ok) return applied;
          // O clamp/teto pode ter aparado o ganho: reporta o efetivo.
          gainPoints = applied.value === null ? 0 : applied.value.nextValue - current;
        }
      }

      // O jogador volta ao elenco e sai cansado — o treino fatiga.
      player.endTraining();
      const effectiveDays = Math.min(elapsedDays, session.durationDays);
      player.addFatigue(effectiveDays * TRAINING_FATIGUE_PER_DAY);

      const closed: TrainingSessionSnapshot = {
        ...session,
        active: false,
        version: session.version + 1,
      };
      await sessions.save(closed, session.version);
      await players.savePlayer(
        { player: player.snapshot(), person: snapshot.person },
        snapshot.player.version,
      );

      return succeed({
        attributeCode: session.attributeCode,
        gainPoints,
        elapsedDays,
        complete: elapsedDays >= session.durationDays,
      });
    });
  }
}
