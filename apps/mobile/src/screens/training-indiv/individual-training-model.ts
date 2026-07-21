/**
 * Modelo puro do PLANO INDIVIDUAL de treino (M-TRAINING-INDIV).
 *
 * A tela escolhe um ALVO (um atributo ou uma posição) e uma intensidade; este
 * módulo monta o payload do `training:set-individual-plan` e recusa, antes de
 * sair do aparelho, o que o domínio recusaria. O alvo espelha a discriminated
 * union do core.
 */

import { attributeLabelPt } from "@grinta/core";

import { clampIntensity } from "../training-plan/training-plan-model";

export type IndividualTarget =
  | { readonly kind: "ATTRIBUTE"; readonly attributeCode: string }
  | { readonly kind: "POSITION"; readonly position: string };

/** As 15 posições do domínio (`PlayerPosition`), com rótulo para a tela. */
export const POSITION_OPTIONS = [
  { position: "GK", label: "Goleiro" },
  { position: "CB", label: "Zagueiro" },
  { position: "LB", label: "Lateral E" },
  { position: "RB", label: "Lateral D" },
  { position: "LWB", label: "Ala E" },
  { position: "RWB", label: "Ala D" },
  { position: "CDM", label: "Volante" },
  { position: "CM", label: "Meio-campo" },
  { position: "CAM", label: "Meia ofensivo" },
  { position: "LM", label: "Meia E" },
  { position: "RM", label: "Meia D" },
  { position: "LW", label: "Ponta E" },
  { position: "RW", label: "Ponta D" },
  { position: "ST", label: "Centroavante" },
  { position: "CF", label: "Segundo atacante" },
] as const;

export function positionLabel(position: string): string {
  return POSITION_OPTIONS.find((o) => o.position === position)?.label ?? position;
}

export interface AttributeOption {
  readonly attributeCode: string;
  readonly label: string;
  readonly value: number;
}

/**
 * Os atributos que o jogador TEM (não-nulos) para escolher como alvo, com o
 * rótulo PT do card. Goleiro só mostra os de goleiro que ele tem; jogador de
 * linha nunca vê os de goleiro (são null para ele).
 */
export function targetAttributeOptions(
  attributes: Readonly<Record<string, number | null>>,
): readonly AttributeOption[] {
  return Object.entries(attributes)
    .filter((e): e is [string, number] => e[1] !== null)
    .map(([attributeCode, value]) => ({
      attributeCode,
      label: attributeLabelPt(attributeCode),
      value,
    }));
}

/** O trade-off do alvo, em palavras — o que ele concentra ou espalha. */
export function tradeoffHint(target: IndividualTarget): string {
  return target.kind === "ATTRIBUTE"
    ? "Ganho CONCENTRADO: o orçamento diário inteiro vai neste atributo."
    : "Ganho ESPALHADO: sobe as habilidades recomendadas da posição, as mais fracas primeiro.";
}

export interface SetIndividualPlanPayload {
  readonly clubId: string;
  readonly playerId: string;
  readonly target: IndividualTarget;
  readonly intensity: number;
  readonly expectedVersion: number | null;
}

export type SetIndividualPlanResult =
  | SetIndividualPlanPayload
  | { readonly error: "NO_TARGET" };

export function buildSetIndividualPlanPayload(input: {
  readonly clubId: string;
  readonly playerId: string;
  readonly target: IndividualTarget | null;
  readonly intensity: number;
  readonly expectedVersion: number | null;
}): SetIndividualPlanResult {
  if (input.target === null) return { error: "NO_TARGET" };
  if (input.target.kind === "ATTRIBUTE" && input.target.attributeCode === "") {
    return { error: "NO_TARGET" };
  }
  if (input.target.kind === "POSITION" && input.target.position === "") {
    return { error: "NO_TARGET" };
  }
  return {
    clubId: input.clubId,
    playerId: input.playerId,
    target: input.target,
    intensity: clampIntensity(input.intensity),
    expectedVersion: input.expectedVersion,
  };
}
