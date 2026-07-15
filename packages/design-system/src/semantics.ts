import { color } from "./tokens.js";

function channelLuminance(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

/** Razão de contraste WCAG entre duas cores hex (1..21). FR-011/SC-004. */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

export type RiskLevel = "low" | "medium" | "high";

/** Cor do badge de risco (protótipo do mercado: RISCO DE SAÍDA). */
export function riskColor(level: RiskLevel): string {
  switch (level) {
    case "low":
      return color.success;
    case "medium":
      return color.warning;
    case "high":
      return color.danger;
  }
}

/** Deriva o nível de risco a partir de um percentual (0–100). */
export function riskLevel(percent: number): RiskLevel {
  if (percent < 30) return "low";
  if (percent < 55) return "medium";
  return "high";
}

export type CommandRisk = "low" | "medium" | "high" | "irreversible";

const IRREVERSIBLE = [
  ":homologate",
  ":finalize",
  ":approve-",
  ":close-",
  ":retire",
  ":compensate",
  ":settle-",
  ":place-quarantine",
  ":start-transfer",
  ":exercise-loan-option",
  ":revoke-",
  ":abort",
];
const HIGH = [
  "admin:",
  ":post-transaction",
  ":record-result",
  ":accrue-debt",
  ":propose-sanction",
  ":decide-appeal",
  ":publish-listing",
];
const MEDIUM = [
  ":advance-",
  ":initialize",
  ":process-day",
  ":open-",
  ":submit-",
  ":assign",
];

/**
 * Risco de um command para modular a confirmação na UI (T017). A UI é
 * proporcional ao risco; a autoridade permanece no backend. Irreversível e
 * high exigem confirmação explícita.
 */
export function commandRisk(commandType: string): CommandRisk {
  if (IRREVERSIBLE.some((needle) => commandType.includes(needle))) {
    return "irreversible";
  }
  if (HIGH.some((needle) => commandType.startsWith(needle) || commandType.includes(needle))) {
    return "high";
  }
  if (MEDIUM.some((needle) => commandType.includes(needle))) return "medium";
  return "low";
}

/** Se o command exige confirmação explícita antes de disparar. */
export function requiresConfirmation(commandType: string): boolean {
  const risk = commandRisk(commandType);
  return risk === "high" || risk === "irreversible";
}

/** Cor de estado de command tracking (cliente não-autoritativo). */
export function commandStatusColor(
  status: "DRAFT" | "SUBMITTING" | "ACCEPTED" | "APPLIED" | "REJECTED" | "UNKNOWN_RECOVERING",
): string {
  switch (status) {
    case "APPLIED":
      return color.success;
    case "ACCEPTED":
    case "SUBMITTING":
      return color.info;
    case "REJECTED":
      return color.danger;
    case "UNKNOWN_RECOVERING":
      return color.warning;
    case "DRAFT":
      return color.textMuted;
  }
}
