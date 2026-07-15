import type { VisualIdentitySnapshot } from "./club-types.js";

/**
 * Catálogo canônico (ruleset) dos modelos de camisa e escudo que a identidade
 * visual do clube pode referenciar. É a fonte da verdade dos `templateId`s: o
 * domínio valida contra esta lista, enquanto os clientes (mobile) renderizam o
 * SVG correspondente pelo mesmo id. `colorSlots` define quantas cores da paleta
 * o desenho usa — os grupos de "2 ou 3 cores" pedidos pela feature.
 */
export interface VisualTemplate {
  readonly id: string;
  readonly name: string;
  readonly colorSlots: 2 | 3;
}

export const KIT_TEMPLATES: readonly VisualTemplate[] = [
  { id: "kit-solid", name: "Sólida", colorSlots: 2 },
  { id: "kit-stripes", name: "Listras verticais", colorSlots: 2 },
  { id: "kit-hoops", name: "Listras horizontais", colorSlots: 2 },
  { id: "kit-sash", name: "Faixa diagonal", colorSlots: 2 },
  { id: "kit-halves", name: "Metades", colorSlots: 2 },
  { id: "kit-tricolor", name: "Tricolor", colorSlots: 3 },
  { id: "kit-quarters", name: "Quadrantes", colorSlots: 3 },
] as const;

export const CREST_TEMPLATES: readonly VisualTemplate[] = [
  { id: "crest-shield", name: "Escudo clássico", colorSlots: 2 },
  { id: "crest-round", name: "Circular", colorSlots: 2 },
  { id: "crest-banner", name: "Estandarte", colorSlots: 3 },
  { id: "crest-classic", name: "Brasão", colorSlots: 3 },
] as const;

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/u;

export function findKitTemplate(id: string): VisualTemplate | undefined {
  return KIT_TEMPLATES.find((template) => template.id === id);
}

export function findCrestTemplate(id: string): VisualTemplate | undefined {
  return CREST_TEMPLATES.find((template) => template.id === id);
}

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

/**
 * Valida uma identidade visual contra o catálogo e o formato das cores.
 * Retorna `null` quando válida ou uma mensagem estável quando inválida.
 * A cor terciária é obrigatória se — e somente se — algum dos modelos
 * escolhidos usa 3 cores; caso contrário deve ser `null`.
 */
export function validateVisualIdentity(
  visual: VisualIdentitySnapshot,
): string | null {
  if (!isHexColor(visual.primaryColor)) {
    return "Cor primária inválida (use #RRGGBB).";
  }
  if (!isHexColor(visual.secondaryColor)) {
    return "Cor secundária inválida (use #RRGGBB).";
  }
  const home = findKitTemplate(visual.homeKitTemplateId);
  if (home === undefined) {
    return "Modelo de camisa 1 desconhecido.";
  }
  const away = findKitTemplate(visual.awayKitTemplateId);
  if (away === undefined) {
    return "Modelo de camisa 2 desconhecido.";
  }
  const crest = findCrestTemplate(visual.crestTemplateId);
  if (crest === undefined) {
    return "Modelo de escudo desconhecido.";
  }
  const requiresTertiary =
    home.colorSlots === 3 || away.colorSlots === 3 || crest.colorSlots === 3;
  if (requiresTertiary) {
    if (visual.tertiaryColor === null || !isHexColor(visual.tertiaryColor)) {
      return "Cor terciária é obrigatória para os modelos escolhidos.";
    }
  } else if (
    visual.tertiaryColor !== null &&
    !isHexColor(visual.tertiaryColor)
  ) {
    return "Cor terciária inválida (use #RRGGBB).";
  }
  return null;
}
