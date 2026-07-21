/**
 * Plano de treino INDIVIDUAL (M-TRAINING-INDIV) — tipos e portas.
 *
 * Enquanto o plano COLETIVO (`training-types.ts`) é do clube e dá um foco ao
 * grupo, o individual é de UM jogador e mira um alvo específico: um atributo
 * (ganho concentrado) ou uma posição (espalha nas recomendadas). É a diretiva
 * permanente que a virada do dia aplica — o motor de desenvolvimento, não um
 * dado inerte.
 *
 * Um plano por jogador (chave `gameWorldId`+`playerId`); `version` para a
 * concorrência otimista, como o coletivo.
 */

import { MAX_INTENSITY, MIN_INTENSITY } from "./training-types.js";

export { MAX_INTENSITY, MIN_INTENSITY };

/** Quantas habilidades o alvo ATRIBUTO pode mirar (igual à sessão). */
export const MAX_INDIVIDUAL_PLAN_ATTRIBUTES = 5;

/** Os tipos de alvo do plano individual construídos hoje. */
export const IndividualTrainingTargetKind = {
  /** Até 5 habilidades escolhidas — o ganho é DIVIDIDO entre elas (como a sessão). */
  ATTRIBUTE: "ATTRIBUTE",
  /** Espalha o ganho nas habilidades recomendadas da posição. */
  POSITION: "POSITION",
  /** Espalha nos atributos de GOLEIRO de um arquétipo (clássico/líbero/shot-stopper). */
  GK_ARCHETYPE: "GK_ARCHETYPE",
} as const;

export type IndividualTrainingTargetKind =
  (typeof IndividualTrainingTargetKind)[keyof typeof IndividualTrainingTargetKind];

export type IndividualTrainingTarget =
  | { readonly kind: "ATTRIBUTE"; readonly attributeCodes: readonly string[] }
  | { readonly kind: "POSITION"; readonly position: string }
  | { readonly kind: "GK_ARCHETYPE"; readonly archetype: string };

export interface IndividualTrainingPlanSnapshot {
  readonly id: string;
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly playerId: string;
  readonly target: IndividualTrainingTarget;
  readonly intensity: number;
  readonly version: number;
}

export interface IndividualTrainingPlanRepository {
  /** O plano ativo do jogador, ou null se ele não tem um. */
  findByPlayer(
    gameWorldId: string,
    clubId: string,
    playerId: string,
  ): Promise<IndividualTrainingPlanSnapshot | null>;
  save(
    plan: IndividualTrainingPlanSnapshot,
    expectedVersion: number | null,
  ): Promise<void>;
  /** Todos os planos individuais do mundo — o settle da virada percorre. */
  findAllActive(
    gameWorldId: string,
  ): Promise<readonly IndividualTrainingPlanSnapshot[]>;
  /**
   * O orçamento diário de desenvolvimento do jogador (`sessionRawGainPoints`,
   * 0..6) — o que a tela precisa para PROJETAR o ganho do alvo com a mesma régua
   * da virada. `null` se o jogador não existe. Encapsula moral/fadiga/idade/teto,
   * que o cliente não tem.
   */
  dailyBudget(
    gameWorldId: string,
    playerId: string,
  ): Promise<number | null>;
}
