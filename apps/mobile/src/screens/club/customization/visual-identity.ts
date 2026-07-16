/**
 * Identidade visual do clube no cliente (espelha o catálogo do domínio C3 em
 * `@grinta/core`: os ids de camisa/escudo são os mesmos — o core valida, o mobile
 * renderiza). Cores em hex `#RRGGBB`; a terciária só é exigida por modelos de 3
 * cores.
 */
export interface VisualIdentity {
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly tertiaryColor: string | null;
  readonly homeKitTemplateId: string;
  readonly awayKitTemplateId: string;
  readonly crestTemplateId: string;
}

export interface VisualTemplate {
  readonly id: string;
  readonly name: string;
  readonly colorSlots: 2 | 3;
}

export const KIT_TEMPLATES: readonly VisualTemplate[] = [
  { id: "kit-solid", name: "Sólida", colorSlots: 2 },
  { id: "kit-stripes", name: "Listras", colorSlots: 2 },
  { id: "kit-hoops", name: "Faixas", colorSlots: 2 },
  { id: "kit-sash", name: "Banda", colorSlots: 2 },
  { id: "kit-halves", name: "Metades", colorSlots: 2 },
  { id: "kit-tricolor", name: "Tricolor", colorSlots: 3 },
  { id: "kit-quarters", name: "Quadrantes", colorSlots: 3 },
];

export const CREST_TEMPLATES: readonly VisualTemplate[] = [
  { id: "crest-shield", name: "Escudo", colorSlots: 2 },
  { id: "crest-round", name: "Circular", colorSlots: 2 },
  { id: "crest-banner", name: "Estandarte", colorSlots: 3 },
  { id: "crest-classic", name: "Brasão", colorSlots: 3 },
];

/** Paleta curada de cores de time para os seletores. */
export const SWATCHES: readonly string[] = [
  "#C2F74A",
  "#E11D2E",
  "#1D4ED8",
  "#0EA5A4",
  "#16A34A",
  "#F59E0B",
  "#7C3AED",
  "#DB2777",
  "#EA580C",
  "#0A0B0D",
  "#F8FAFC",
  "#64748B",
  "#84CC16",
  "#06B6D4",
  "#9A3412",
  "#FACC15",
];

export function kitTemplate(id: string): VisualTemplate {
  return KIT_TEMPLATES.find((template) => template.id === id) ?? KIT_TEMPLATES[0]!;
}

export function crestTemplate(id: string): VisualTemplate {
  return (
    CREST_TEMPLATES.find((template) => template.id === id) ?? CREST_TEMPLATES[0]!
  );
}

const HEX = /^#[0-9A-Fa-f]{6}$/u;

export function isHexColor(value: string): boolean {
  return HEX.test(value);
}

/** A cor terciária é obrigatória se algum modelo escolhido usa 3 cores. */
export function requiresTertiary(identity: VisualIdentity): boolean {
  return (
    kitTemplate(identity.homeKitTemplateId).colorSlots === 3 ||
    kitTemplate(identity.awayKitTemplateId).colorSlots === 3 ||
    crestTemplate(identity.crestTemplateId).colorSlots === 3
  );
}

/** Valida a identidade visual localmente (espelha `validateVisualIdentity` do core). */
export function validateVisualIdentity(identity: VisualIdentity): string | null {
  if (!isHexColor(identity.primaryColor)) return "Cor primária inválida.";
  if (!isHexColor(identity.secondaryColor)) return "Cor secundária inválida.";
  if (requiresTertiary(identity)) {
    if (identity.tertiaryColor === null || !isHexColor(identity.tertiaryColor)) {
      return "Escolha a 3ª cor para os modelos selecionados.";
    }
  }
  return null;
}

const PRESETS: readonly Omit<VisualIdentity, "awayKitTemplateId">[] = [
  {
    primaryColor: "#E11D2E",
    secondaryColor: "#0A0B0D",
    tertiaryColor: "#F8FAFC",
    homeKitTemplateId: "kit-stripes",
    crestTemplateId: "crest-shield",
  },
  {
    primaryColor: "#1D4ED8",
    secondaryColor: "#F8FAFC",
    tertiaryColor: "#FACC15",
    homeKitTemplateId: "kit-solid",
    crestTemplateId: "crest-round",
  },
  {
    primaryColor: "#16A34A",
    secondaryColor: "#F8FAFC",
    tertiaryColor: "#0A0B0D",
    homeKitTemplateId: "kit-hoops",
    crestTemplateId: "crest-shield",
  },
  {
    primaryColor: "#0A0B0D",
    secondaryColor: "#C2F74A",
    tertiaryColor: "#F8FAFC",
    homeKitTemplateId: "kit-sash",
    crestTemplateId: "crest-banner",
  },
  {
    primaryColor: "#7C3AED",
    secondaryColor: "#FACC15",
    tertiaryColor: "#F8FAFC",
    homeKitTemplateId: "kit-halves",
    crestTemplateId: "crest-classic",
  },
  {
    primaryColor: "#0EA5A4",
    secondaryColor: "#0A0B0D",
    tertiaryColor: "#F8FAFC",
    homeKitTemplateId: "kit-solid",
    crestTemplateId: "crest-round",
  },
];

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Identidade visual default determinística para clubes que ainda não
 * personalizaram — deriva do id/nome para que cada clube pareça distinto.
 */
export function defaultVisualIdentity(seed: string): VisualIdentity {
  const preset = PRESETS[hashString(seed) % PRESETS.length]!;
  return {
    ...preset,
    awayKitTemplateId: "kit-solid",
  };
}
