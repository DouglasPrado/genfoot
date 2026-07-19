/**
 * A incerteza do olheiro sobre um alvo (R-04).
 *
 * O clube nunca vê o potencial exato — vê uma FAIXA, e essa faixa aperta com a
 * qualidade do olheiro e com o tempo de observação. Os números são RATIFICADOS
 * pela R-04 (não são calibração minha): olheiro ruim → ±10 e confiança ≤ 40;
 * olheiro bom → ±3 e confiança ≥ 80; a faixa estreita ~30% a cada ciclo de
 * observação continuada. Informação incompleta nunca vira zero — a faixa aperta,
 * mas mantém uma margem mínima.
 *
 * Puro e determinístico: a mesma verdade + mesmo olheiro + mesmos ciclos dão a
 * mesma faixa. A "verdade" (potencial real) entra aqui mas NÃO é exposta — só a
 * faixa sai.
 */
export interface ScoutBand {
  readonly min: number;
  readonly max: number;
  readonly confidence: number;
}

/** ±10 no pior olheiro, ±3 no melhor (R-04). */
const WORST_HALF_WIDTH = 10;
const BEST_HALF_WIDTH = 3;
/** Confiança 40 no pior, 80+ no melhor (R-04). */
const WORST_CONFIDENCE = 40;
const BEST_CONFIDENCE = 80;
/** A faixa estreita ~30% por ciclo (R-04): fica com 70% da largura. */
const NARROW_PER_CYCLE = 0.7;
/** Margem mínima: o olheiro nunca crava o valor exato. */
const MIN_HALF_WIDTH = 1;

const clamp01to100 = (v: number): number => Math.max(0, Math.min(100, v));

export function scoutPotentialBand(input: {
  readonly truePotential: number;
  /** Qualidade do olheiro, 0..100. */
  readonly scoutQuality: number;
  /** Ciclos de observação continuada (≥1). */
  readonly cycles: number;
}): ScoutBand {
  const q = Math.max(0, Math.min(100, input.scoutQuality)) / 100;
  const cycles = Math.max(1, Math.floor(input.cycles));

  // Meia-largura interpola do pior (±10) ao melhor (±3) pela qualidade, depois
  // estreita 30% a cada ciclo além do primeiro, com piso na margem mínima.
  const baseHalf = WORST_HALF_WIDTH - q * (WORST_HALF_WIDTH - BEST_HALF_WIDTH);
  const narrowed = baseHalf * Math.pow(NARROW_PER_CYCLE, cycles - 1);
  const halfWidth = Math.max(MIN_HALF_WIDTH, Math.round(narrowed));

  const confidence = Math.round(
    WORST_CONFIDENCE + q * (BEST_CONFIDENCE - WORST_CONFIDENCE),
  );

  return {
    min: clamp01to100(input.truePotential - halfWidth),
    max: clamp01to100(input.truePotential + halfWidth),
    confidence,
  };
}
