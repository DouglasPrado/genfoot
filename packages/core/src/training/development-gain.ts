import { DomainError } from "@grinta/shared";

/**
 * A fórmula canônica de evolução por treino
 * (`02-sistema-de-jogadores.md:305-322`).
 *
 * ```
 * Ganho = baseLearningRate × potencialRestante × focoDoTreino
 *       × qualidadeDoTreino × compatibilidade × minutosCompetitivos
 *       × idadeFactor × moral
 *       − fadiga − lesão − pressãoNegativa
 * ```
 *
 * Produto de fatores MENOS penalidades — e a distinção entre as duas metades é
 * a regra, não detalhe de implementação. Fator zerado zera o ganho: um jogador
 * que aprende rápido num treino sem foco naquele atributo não evolui nele.
 * Penalidade SUBTRAI: fadiga alta consegue anular um treino bom, o que um fator
 * multiplicativo nunca faria.
 *
 * O ganho é **por atributo** (R-212/R-188), nunca por grupo — é o que permite
 * "ganha finalização, perde marcação" (§6:297-303) existir.
 */

/** Escala interna em pontos-base (R-82). O accrual guarda BigInt. */
export const GAIN_SCALE = 10_000;

/**
 * Multiplicador por faixa etária (§5:232-245).
 *
 * O doc não publica números — publica a forma: 18–21 é "explosão de potencial",
 * e aos 33 o mesmo treino "serve mais para manutenção do que para ganho real".
 * Estes valores são a calibração inicial dessa forma, e são **candidatos a
 * ajuste na calibração** (VAL-001), não constantes sagradas.
 */
export const AGE_BANDS = {
  "14-17": 0.9,
  "18-21": 1,
  "22-25": 0.75,
  "26-29": 0.5,
  "30-33": 0.25,
  "34+": 0.1,
} as const;

export type AgeBand = keyof typeof AGE_BANDS;

export function ageBandFor(age: number): AgeBand {
  if (age <= 17) return "14-17";
  if (age <= 21) return "18-21";
  if (age <= 25) return "22-25";
  if (age <= 29) return "26-29";
  if (age <= 33) return "30-33";
  return "34+";
}

export interface DevelopmentGainInput {
  /** Capacidade de aprendizado do jogador (0..1). */
  readonly baseLearningRate: number;
  /** Quanto do teto ainda falta alcançar (0..1). */
  readonly remainingPotential: number;
  /** O quanto o treino aponta para ESTE atributo (0..1). */
  readonly trainingFocus: number;
  /** Qualidade da comissão/estrutura (0..1). */
  readonly trainingQuality: number;
  /** Compatibilidade jogador-clube (R-02, 0..1). */
  readonly compatibility: number;
  /** Minutos em função adequada (0..1). */
  readonly competitiveMinutes: number;
  readonly age: number;
  /** Moral (0..1). */
  readonly morale: number;
  readonly fatigue: number;
  readonly injury: number;
  readonly negativePressure: number;
}

const FACTORS = [
  "baseLearningRate",
  "remainingPotential",
  "trainingFocus",
  "trainingQuality",
  "compatibility",
  "competitiveMinutes",
  "morale",
  "fatigue",
  "injury",
  "negativePressure",
] as const;

export function computeDevelopmentGain(input: DevelopmentGainInput): number {
  for (const campo of FACTORS) {
    const valor = input[campo];
    if (!Number.isFinite(valor) || valor < 0 || valor > 1) {
      throw new DomainError(
        "INVALID_DEVELOPMENT_FACTOR",
        `${campo} deve estar entre 0 e 1.`,
        { campo, valor },
      );
    }
  }
  if (!Number.isFinite(input.age) || input.age < 10 || input.age > 60) {
    throw new DomainError(
      "INVALID_PLAYER_AGE",
      "Idade fora do intervalo plausível para desenvolvimento.",
      { age: input.age },
    );
  }

  const produto =
    input.baseLearningRate *
    input.remainingPotential *
    input.trainingFocus *
    input.trainingQuality *
    input.compatibility *
    input.competitiveMinutes *
    AGE_BANDS[ageBandFor(input.age)] *
    input.morale;

  const penalidades = input.fatigue + input.injury + input.negativePressure;

  // Piso em zero: treino ruim ESTAGNA, não desfaz o jogador. A perda por
  // trade-off (§6:297-303) é outra regra, com caminho próprio — misturá-la aqui
  // faria fadiga virar regressão, que o doc não diz.
  const bruto = produto - penalidades;
  return bruto <= 0 ? 0 : Math.round(bruto * GAIN_SCALE);
}
