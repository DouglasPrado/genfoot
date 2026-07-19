/**
 * Declínio físico por idade (R-217, forma do §5:232-245).
 *
 * O §5 dá a forma — auge até 29, "perda física gradual" 30-33, "queda física"
 * 34+ — e não os números. A curva abaixo é CALIBRAÇÃO minha, candidata a
 * VAL-001. Aplicada na virada de temporada (passo 7, INV-29) sobre os atributos
 * físicos, via `Player.applyAttributeChange` com delta negativo.
 *
 * Convive com o ganho de treino no mesmo passo: um veterano em treino físico
 * pode ganhar pouco e perder mais — a idade vencendo o esforço, como o §5 diz
 * ("aos 33 o mesmo treino serve mais para manutenção do que para ganho").
 */

/**
 * Perda física por temporada, por faixa etária. Pontos de atributo inteiros.
 * Vazio ≤29 (auge não regride). Candidata a VAL-001.
 */
export const PHYSICAL_DECLINE: Record<string, number> = {
  "30-31": 1,
  "32-33": 2,
  "34-35": 3,
  "36-37": 4,
  "38+": 6,
};

/**
 * Piso do declínio: um veterano perde vigor, não vira amador. Nenhum atributo
 * físico afunda abaixo disto por envelhecimento (lesão/dispensa são outra regra).
 */
export const DECLINE_FLOOR = 30;

function bandLoss(age: number): number {
  if (age <= 29) return 0;
  if (age <= 31) return PHYSICAL_DECLINE["30-31"]!;
  if (age <= 33) return PHYSICAL_DECLINE["32-33"]!;
  if (age <= 35) return PHYSICAL_DECLINE["34-35"]!;
  if (age <= 37) return PHYSICAL_DECLINE["36-37"]!;
  return PHYSICAL_DECLINE["38+"]!;
}

/**
 * Quanto UM atributo físico perde nesta virada, dado a idade e o valor atual.
 *
 * A perda da curva é limitada pelo espaço até o piso: um atributo perto do piso
 * perde só o que falta para chegar nele, e um atributo no piso (ou abaixo) não
 * perde nada.
 */
export function physicalDeclineFor(age: number, currentValue: number): number {
  const raw = bandLoss(age);
  if (raw === 0) return 0;
  const room = Math.max(0, currentValue - DECLINE_FLOOR);
  return Math.min(raw, room);
}
