import { SeededRandom } from "../foundation/seeded-random.js";

/**
 * Decisão de aposentadoria por idade (R-217, §17).
 *
 * O §17 quer aposentadoria contextual; este é o NÚCLEO por idade + probabilidade
 * (os fatores de lesão/motivação/contrato entram depois como modificadores). A
 * curva é CALIBRAÇÃO minha, candidata a VAL-001, alinhada à forma do §5 (auge
 * até ~29, veterania 30-33, fim 34+).
 *
 * O sorteio é DETERMINÍSTICO (R-182): `SeededRandom` chaveado por
 * `(worldSeed, playerId, seasonId)`. A mesma virada, reprocessada, aposenta os
 * mesmos jogadores — e dois jogadores da mesma idade decidem diferente porque a
 * chave inclui o `playerId` (o §17 pede essa variação).
 */

/**
 * Idade em que a carreira acaba com CERTEZA. Ninguém joga além disso — a
 * probabilidade satura em 1,0 aqui, senão um veterano poderia, por azar do roll,
 * seguir ativo para sempre. Candidata a VAL-001.
 */
export const CERTAIN_RETIREMENT_AGE = 42;

/** Probabilidade de aposentadoria por faixa etária. Candidata a VAL-001. */
export const RETIREMENT_CURVE: Record<string, number> = {
  "≤32": 0,
  "33": 0.05,
  "34": 0.1,
  "35": 0.2,
  "36": 0.35,
  "37": 0.5,
  "38": 0.68,
  "39": 0.82,
  "40": 0.9,
  "41": 0.96,
  "42+": 1,
};

export function retirementProbability(age: number): number {
  if (age <= 32) return 0;
  if (age >= CERTAIN_RETIREMENT_AGE) return 1;
  if (age === 33) return RETIREMENT_CURVE["33"]!;
  if (age === 34) return RETIREMENT_CURVE["34"]!;
  if (age === 35) return RETIREMENT_CURVE["35"]!;
  if (age === 36) return RETIREMENT_CURVE["36"]!;
  if (age === 37) return RETIREMENT_CURVE["37"]!;
  if (age === 38) return RETIREMENT_CURVE["38"]!;
  if (age === 39) return RETIREMENT_CURVE["39"]!;
  if (age === 40) return RETIREMENT_CURVE["40"]!;
  return RETIREMENT_CURVE["41"]!;
}

export interface RetirementRoll {
  readonly worldSeed: string;
  readonly playerId: string;
  readonly seasonId: string;
  readonly age: number;
}

export function decidesToRetire(input: RetirementRoll): boolean {
  const p = retirementProbability(input.age);
  if (p <= 0) return false;
  if (p >= 1) return true;
  // Uma amostra da stream determinística desta (temporada, jogador). `nextFloat`
  // em [0,1): aposenta quando cai abaixo da probabilidade.
  const random = new SeededRandom({
    worldSeed: input.worldSeed,
    context: `retirement:${input.seasonId}:${input.playerId}`,
  });
  return random.nextFloat() < p;
}
