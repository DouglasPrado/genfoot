/**
 * Gatilho MED-1 pelo TREINO — a virada do dia sorteia lesão por carga.
 *
 * Sem isto o departamento médico é uma tela permanentemente vazia: a máquina
 * MED-1..MED-9 existe, mas nada a inicia. E é justamente o laço que a regra
 * pede — "uma lesão não é um evento totalmente independente das decisões
 * anteriores; sobrecarga e uso de jogador fatigado elevam a probabilidade"
 * (`02-jogadores §16`, PLY-014).
 *
 * Determinístico: o sorteio sai de `SeededRandom` com contexto
 * `(mundo, dia, jogador)`, então rodar a virada duas vezes dá o mesmo mundo.
 */

import { succeed, type Result } from "@grinta/shared";
import type { DomainError } from "@grinta/shared";

import { SeededRandom } from "../foundation/seeded-random.js";

import {
  InjuryCause,
  type InjuryEpisodeSnapshot,
  type InjuryType,
} from "./injury-episode-types.js";
import { injuryProbability, rollInjuryType } from "./injury-risk.js";
import type { OpenInjuryEpisode } from "./medical-use-cases.js";

/**
 * Quantos "ticks" de risco vale um dia de treino.
 *
 * ⚠️ **Calibração VAL-MED-002, não ratificada.** R-21 fixa `p_lesão` por tick
 * de PARTIDA (90 ticks); não há decisão sobre o dia de treino.
 *
 * O primeiro valor tentado foi 30 (um terço de um jogo) e **provou-se errado
 * contra a API real**: 40 dias de mundo lesionaram 260 dos 700 jogadores — 37%
 * do mundo. O erro é de razão, não de fórmula: treina-se TODO dia e joga-se uma
 * vez por semana, então o risco diário do treino tem de ser uma fração pequena
 * do de um jogo. Com 3, um jogador acumula ≈4% de chance de lesão em 40 dias,
 * o que dá da ordem de UM caso por elenco no período.
 */
export const TRAINING_DAY_RISK_TICKS = 3;

/** Regiões possíveis do sorteio — a região alimenta o `recorrente ×3` (R-21). */
export const INJURY_REGIONS = [
  "coxa-direita",
  "coxa-esquerda",
  "panturrilha-direita",
  "panturrilha-esquerda",
  "joelho-direito",
  "joelho-esquerdo",
  "tornozelo-direito",
  "tornozelo-esquerdo",
  "virilha",
  "lombar",
  "ombro",
] as const;

/**
 * Sorteia tipo e região de uma lesão a partir de um gerador do mundo.
 *
 * Compartilhado pelo gatilho da virada e pela abertura MANUAL de caso: nos dois
 * a verdade clínica já existe no mundo — o que muda é quem a descobre. Consome
 * dois números do gerador (tipo, região), nesta ordem.
 */
export function rollInjuryNature(
  random: SeededRandom,
  context: {
    readonly fatigue: number;
    readonly age: number;
    readonly contact: boolean;
    readonly injuredRegionHistory: readonly string[];
  },
): { readonly injuryType: InjuryType; readonly region: string } {
  const injuryType = rollInjuryType(
    {
      fatigue: context.fatigue,
      contact: context.contact,
      recurrentHistory: context.injuredRegionHistory.length > 0,
      age: context.age,
    },
    random.nextFloat(),
  );
  // Recorrente reincide onde já doeu; o resto sorteia região nova.
  const region =
    injuryType === "RECURRENT" && context.injuredRegionHistory.length > 0
      ? (context.injuredRegionHistory[
          random.nextInt(0, context.injuredRegionHistory.length)
        ] as string)
      : (INJURY_REGIONS[random.nextInt(0, INJURY_REGIONS.length)] as string);
  return { injuryType, region };
}

export interface TrainingLoadEntry {
  readonly playerId: string;
  readonly clubId: string;
  /** Fadiga acumulada 0–100 (R-16). */
  readonly fatigue: number;
  readonly age: number;
  /** Intensidade da carga do dia, 0–100. */
  readonly intensity: number;
  /**
   * O jogador está sob plano de treino dirigido?
   *
   * Sem plano ele ainda acumula DESGASTE — o clube treina de todo jeito, e §16
   * lista desgaste como causa ao lado de partida e treino. Tratar "sem plano"
   * como risco zero deixaria o departamento médico permanentemente vazio em
   * qualquer clube que nunca abriu a tela de treino.
   */
  readonly underPlan: boolean;
  /** Regiões com histórico de lesão — pesam no tipo `recorrente`. */
  readonly injuredRegionHistory: readonly string[];
}

export interface TrainingLoadReader {
  /**
   * Quem levou carga no dia. Não inclui quem já está sob restrição médica —
   * lesionado não treina, então não sorteia lesão nova.
   */
  playersUnderLoad(
    gameWorldId: string,
    worldDate: string,
  ): Promise<readonly TrainingLoadEntry[]>;
}

export interface SettleTrainingInjuriesInput {
  readonly gameWorldId: string;
  readonly worldSeed: string;
  readonly worldDate: string;
}

export interface SettleTrainingInjuriesResult {
  readonly evaluatedCount: number;
  readonly openedEpisodes: readonly InjuryEpisodeSnapshot[];
}

/**
 * `riscoScore` 0–100 de R-21, com as parcelas que o treino conhece: idade,
 * intensidade e histórico. Fadiga NÃO entra aqui — ela já multiplica por fora,
 * via `riskMult_F2`, e contá-la duas vezes inflaria o risco.
 *
 * ⚠️ Pesos: calibração VAL-MED-002.
 */
export function trainingRiskScore(entry: TrainingLoadEntry): number {
  const fromIntensity = (entry.intensity - 50) * 0.6;
  const fromAge = Math.max(0, entry.age - 30) * 3;
  const fromHistory = Math.min(15, entry.injuredRegionHistory.length * 5);
  return Math.max(0, Math.min(100, 50 + fromIntensity + fromAge + fromHistory));
}

/** Probabilidade de o jogador se lesionar NO DIA de treino. */
export function trainingInjuryProbability(entry: TrainingLoadEntry): number {
  const perTick = injuryProbability({
    fatigue: entry.fatigue,
    riskScore: trainingRiskScore(entry),
  });
  return 1 - (1 - perTick) ** TRAINING_DAY_RISK_TICKS;
}

export class SettleTrainingInjuries {
  public constructor(
    private readonly loads: TrainingLoadReader,
    private readonly open: OpenInjuryEpisode,
  ) {}

  public async execute(
    input: SettleTrainingInjuriesInput,
  ): Promise<Result<SettleTrainingInjuriesResult, DomainError>> {
    const entries = await this.loads.playersUnderLoad(
      input.gameWorldId,
      input.worldDate,
    );
    const opened: InjuryEpisodeSnapshot[] = [];

    for (const entry of entries) {
      // Um gerador POR jogador/dia: o resultado de um jogador não pode depender
      // da ordem em que a lista veio do banco.
      const random = new SeededRandom({
        worldSeed: input.worldSeed,
        context: `injury:${input.gameWorldId}:${input.worldDate}:${entry.playerId}`,
      });

      if (random.nextFloat() >= trainingInjuryProbability(entry)) continue;

      const { injuryType, region } = rollInjuryNature(random, {
        fatigue: entry.fatigue,
        age: entry.age,
        contact: false, // treino não é duelo de partida
        injuredRegionHistory: entry.injuredRegionHistory,
      });

      const result = await this.open.execute({
        gameWorldId: input.gameWorldId,
        clubId: entry.clubId,
        playerId: entry.playerId,
        worldSeed: input.worldSeed,
        occurredOn: input.worldDate,
        injuryType,
        cause: entry.underPlan ? InjuryCause.TRAINING : InjuryCause.WEAR,
        region,
      });
      // Um episódio que falha é PULADO, não derruba a virada — mesma política
      // do settle de treino.
      if (result.ok) opened.push(result.value.episode);
    }

    return succeed({ evaluatedCount: entries.length, openedEpisodes: opened });
  }
}
