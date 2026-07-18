/**
 * Valor de mercado estimado de um jogador — R-41 (primeira passada).
 *
 * `valor = C · (overall/100)^3.5 · fatorIdade`. A potência 3.5 faz o craque valer
 * desproporcionalmente mais que o mediano; o fator de idade desconta o veterano e
 * valoriza quem ainda tem carreira.
 *
 * **Calibração, não canon.** A R-41 chama isto de "fórmula conceitual a calibrar".
 * `C` e a curva de idade são de primeira passada, ancorados na economia da Liga
 * Inicial (caixa de R$5M, R-43): um titular de 60 de overall no auge vale ~R$1M,
 * um craque de 80 vale ~R$3M — caro, mas dentro do que um clube pequeno alcança.
 *
 * É ESTIMATIVA de exibição enquanto C9 não materializa o valor de verdade dentro
 * da economia fechada. Quando materializar, o preço real vem de lá (idade,
 * overall, potencial, oferta/demanda, dinheiro circulando — GDD §00); isto é o
 * que o scout mostra até então.
 */

/** Base da fórmula, em unidade mínima (R$6.000.000). Valor de balanceamento. */
const BASE_VALUE_MINOR = 600_000_000n;

/**
 * O desconto por idade. Auge 24–28; jovem vale mais (carreira pela frente),
 * veterano vale menos. Primeira passada — a curva fina é balanceamento.
 */
function ageFactor(age: number): number {
  if (age <= 21) return 1.15;
  if (age <= 23) return 1.1;
  if (age <= 28) return 1.0;
  if (age <= 31) return 0.7;
  if (age <= 33) return 0.45;
  return 0.25;
}

export function estimatePlayerValueMinor(overall: number, age: number): bigint {
  const ratio = Math.max(0, overall) / 100;
  const skill = Math.pow(ratio, 3.5);
  // bigint não faz float: calcula em float, arredonda, e volta a bigint. O valor
  // cabe com folga em número seguro (bilhões de minor << 2^53).
  const value = Number(BASE_VALUE_MINOR) * skill * ageFactor(age);
  return BigInt(Math.round(value));
}

/**
 * Salário por temporada estimado — calibração de primeira passada (R-192).
 *
 * Uma fração do valor de mercado: um jogador de R$2M ganha ~R$100k por temporada.
 * É o número que o contrato grava até a economia ter a fórmula fina de folha. Não
 * é pago na transferência — é a obrigação futura que o ralo de salários consome
 * por temporada quando o ciclo econômico existir.
 */
export function estimateSalaryPerSeasonMinor(valueMinor: bigint): bigint {
  return valueMinor / 20n;
}

/** A taxa de transferência é válida em [40%, 250%] do valor de mercado — R-26. */
export function isTransferFeeInRange(feeMinor: bigint, valueMinor: bigint): boolean {
  const floor = (valueMinor * 40n) / 100n;
  const ceiling = (valueMinor * 250n) / 100n;
  return feeMinor >= floor && feeMinor <= ceiling;
}
