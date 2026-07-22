import { recommendedAttributes } from "../players/position-attributes.js";

import { archetypeAttributes } from "./gk-archetypes.js";
import type { IndividualTrainingTarget } from "./individual-training-plan-types.js";
import { perAttributeGain } from "./session-gain.js";

/**
 * A projeção do plano individual — o que a virada VAI mexer, atributo a atributo.
 *
 * É a fonte ÚNICA: o `settle` aplica exatamente estas mudanças, e a tela mostra
 * exatamente estas mudanças. Reusar a mesma função nos dois lados é o que garante
 * que "vai de 54 pra 55" seja verdade, não estimativa (o mesmo princípio da
 * projeção de sessão em `training-sessions`).
 *
 * `rawGainPoints` é o orçamento diário do jogador (`sessionRawGainPoints`).
 *  - **ATRIBUTO**: o orçamento inteiro (÷1) no atributo-alvo — ganho concentrado.
 *  - **POSIÇÃO**: +1 nas recomendadas mais fracas, gastando o orçamento — espalha.
 */
export interface IndividualPlanChange {
  readonly attributeCode: string;
  readonly before: number;
  readonly after: number;
  readonly gain: number;
}

/**
 * Gasta `rawGainPoints` como +1 nos atributos mais fracos da lista (com folga
 * até 100). É a régua de ESPALHAR — reusada por posição, arquétipo de goleiro
 * (projeção individual) e foco do plano coletivo (settle coletivo).
 */
export function spreadBudget(
  codes: readonly string[],
  rawGainPoints: number,
  attributeValueOf: (code: string) => number | null,
): readonly IndividualPlanChange[] {
  if (rawGainPoints <= 0) return [];
  const weakestFirst = codes
    .map((code) => ({ code, value: attributeValueOf(code) }))
    .filter((c): c is { code: string; value: number } => c.value !== null && c.value < 100)
    .sort((a, b) => a.value - b.value);
  const changes: IndividualPlanChange[] = [];
  for (const { code, value } of weakestFirst) {
    if (changes.length >= rawGainPoints) break;
    changes.push({ attributeCode: code, before: value, after: value + 1, gain: 1 });
  }
  return changes;
}

export function projectIndividualPlan(input: {
  readonly target: IndividualTrainingTarget;
  readonly rawGainPoints: number;
  readonly attributeValueOf: (code: string) => number | null;
}): readonly IndividualPlanChange[] {
  if (input.rawGainPoints <= 0) return [];

  if (input.target.kind === "ATTRIBUTE") {
    // Até 5 habilidades: o orçamento é DIVIDIDO entre elas (÷N, arredonda p/ baixo)
    // — a MESMA régua da sessão (`perAttributeGain`).
    const codes = input.target.attributeCodes;
    const changes: IndividualPlanChange[] = [];
    for (const attributeCode of codes) {
      const before = input.attributeValueOf(attributeCode);
      if (before === null || before >= 100) continue;
      const gain = perAttributeGain({
        rawGain: input.rawGainPoints,
        attributeCount: codes.length,
        attributeCurrentValue: before,
      });
      if (gain > 0) changes.push({ attributeCode, before, after: before + gain, gain });
    }
    return changes;
  }

  // POSIÇÃO e ARQUÉTIPO DE GOLEIRO: ambos são um CONJUNTO de atributos que o
  // orçamento espalha (+1 nos mais fracos primeiro).
  const spreadCodes =
    input.target.kind === "POSITION"
      ? recommendedAttributes(input.target.position)
      : archetypeAttributes(input.target.archetype);
  return spreadBudget(spreadCodes, input.rawGainPoints, input.attributeValueOf);
}
