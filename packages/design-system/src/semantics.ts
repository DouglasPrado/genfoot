import { color } from "./tokens.js";

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
