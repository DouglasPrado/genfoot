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
