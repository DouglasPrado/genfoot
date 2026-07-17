/**
 * Estimadores de custo de manutenção — primeira passada (calibração, não canon).
 *
 * A §5 da economia (R-41) ratifica coeficientes para valor de mercado, público,
 * salário e patrocínio, mas **não** para manutenção de infraestrutura/estádio —
 * não há fórmula canônica. Estes números são, portanto, ESTIMATIVA declarada:
 * derivam de dado estrutural real (nível, capacidade, condição), nunca de seed,
 * mas jamais devem ser apresentados como custo "contratado". Voltam a ser
 * calibrados no lote de simulações econômicas.
 *
 * Padrão de `player-value.ts`: calcula em float, arredonda, volta a `bigint`. O
 * valor cabe com folga em número seguro (milhões de minor << 2^53).
 */

/** R$ 200 por (nível × lugar) do departamento, por temporada. */
const INFRA_PER_LEVEL_CAPACITY_MINOR = 20_000;

/** R$ 20 por lugar do estádio, por temporada. */
const STADIUM_PER_SEAT_MINOR = 2_000;

/**
 * Condição pior encarece a manutenção: negligência custa mais. Condição 100 →
 * fator 1.0 (nada a recuperar); condição 0 → fator 1.5 (50% a mais de reparo).
 */
function conditionFactor(condition: number): number {
  const clamped = Math.min(100, Math.max(0, condition));
  return 1 + ((100 - clamped) / 100) * 0.5;
}

/** Manutenção anual de um departamento, em unidade mínima. */
export function estimateInfraMaintenanceMinor(
  level: number,
  capacity: number,
  condition: number,
): bigint {
  const raw =
    Math.max(0, level) * Math.max(0, capacity) * INFRA_PER_LEVEL_CAPACITY_MINOR;
  return BigInt(Math.round(raw * conditionFactor(condition)));
}

/** Manutenção anual do estádio, em unidade mínima. */
export function estimateStadiumMaintenanceMinor(
  capacity: number,
  condition: number,
): bigint {
  const raw = Math.max(0, capacity) * STADIUM_PER_SEAT_MINOR;
  return BigInt(Math.round(raw * conditionFactor(condition)));
}
