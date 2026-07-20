import type { PlayerDevelopmentView } from "@grinta/core";

/**
 * Modelo puro do painel de desenvolvimento (M-PLAYER-DEV, R-221). Deriva do
 * `PlayerDevelopmentView` que a query `player-development` serve: a habilidade
 * EFETIVA e sua decomposição em NÚCLEO (permanente, treino) + FORMA (± transiente,
 * partida/decisão, decai), as camadas de potencial e os ganhos pendentes. O
 * componente só renderiza; toda a leitura vive e é testada aqui.
 */
export type FormaTone = "up" | "down" | "neutral";

export interface FormaBadge {
  /** ex.: "+4 em alta", "−3 em baixa", "em forma neutra". */
  readonly label: string;
  readonly tone: FormaTone;
  readonly value: number;
}

export interface LayerRow {
  readonly key: "natural" | "usable" | "functional";
  readonly label: string;
  readonly value: number;
}

export interface PlayerDevView {
  /** O que a partida/mercado leem: núcleo + forma, 0..100. */
  readonly effectiveAbility: number;
  /** O núcleo permanente (sobe por treino, não cai sozinho). */
  readonly core: number;
  readonly forma: FormaBadge;
  /** Quanto o núcleo ainda pode crescer até o teto aproveitável (≥0). */
  readonly headroom: number;
  readonly atCeiling: boolean;
  readonly layers: readonly LayerRow[];
  readonly pendingGains: readonly { readonly attributeCode: string; readonly projectedPoints: number }[];
}

function formaBadge(forma: number): FormaBadge {
  if (forma > 0) return { label: `+${forma} em alta`, tone: "up", value: forma };
  if (forma < 0) return { label: `${forma} em baixa`, tone: "down", value: forma };
  return { label: "em forma neutra", tone: "neutral", value: 0 };
}

export function derivePlayerDevView(v: PlayerDevelopmentView): PlayerDevView {
  const headroom = Math.max(0, v.potential.usable - v.currentAbility);
  return {
    effectiveAbility: v.effectiveAbility,
    core: v.currentAbility,
    forma: formaBadge(v.formaModifier),
    headroom,
    atCeiling: headroom === 0,
    layers: [
      { key: "natural", label: "Potencial natural", value: v.potential.natural },
      { key: "usable", label: "Aproveitável (estrutura)", value: v.potential.usable },
      { key: "functional", label: "Funcional (posição)", value: v.potential.functional },
    ],
    pendingGains: v.pendingGains.map((g) => ({
      attributeCode: g.attributeCode,
      projectedPoints: g.projectedPoints,
    })),
  };
}
