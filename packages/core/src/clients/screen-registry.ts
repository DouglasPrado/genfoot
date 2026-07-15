/**
 * Registro canônico das 138 telas do X-003 (114 mobile + 24 admin), fixando o
 * arquétipo de layout de cada ID conforme docs/04-ui-ux/24-layouts-canonicos.
 * FR-010 (mapear arquétipo/layout/golden path) e SC-003 (100% das telas com
 * layout e estados rastreados) são satisfeitos por estes dados testáveis — a
 * ausência de wireframes exclusivos não é lacuna (doc 24 §8).
 */

export type ClientKind = "mobile" | "admin";

export type MobileArchetype =
  | "L-M01"
  | "L-M02"
  | "L-M03"
  | "L-M04"
  | "L-M05"
  | "L-M06"
  | "L-M07"
  | "L-M08"
  | "L-M09";

export type AdminArchetype = "L-A01" | "L-A02" | "L-A03" | "L-A04" | "L-A05";

export type Archetype = MobileArchetype | AdminArchetype;

/** Estados globais obrigatórios em toda tela (doc 24 §5, FR-007). */
export const MANDATORY_SCREEN_STATES = [
  "initial-loading",
  "empty",
  "partial/stale",
  "offline",
  "processing",
  "success",
  "domain-error",
  "technical-error",
  "forbidden/read-only",
  "conflict",
  "expired",
  "maintenance/unavailable",
] as const;

export type ScreenState = (typeof MANDATORY_SCREEN_STATES)[number];

export type RiskTier = "low" | "medium" | "high" | "irreversible";

/** Confirmação proporcional por arquétipo/risco (doc 24 §6, FR-008). */
const ARCHETYPE_RISK: Record<Archetype, RiskTier> = {
  "L-M01": "medium",
  "L-M02": "low",
  "L-M03": "low",
  "L-M04": "medium",
  "L-M05": "high",
  "L-M06": "irreversible",
  "L-M07": "low",
  "L-M08": "low",
  "L-M09": "medium",
  "L-A01": "low",
  "L-A02": "low",
  "L-A03": "high",
  "L-A04": "high",
  "L-A05": "irreversible",
};

export interface ScreenSpec {
  readonly id: string;
  readonly client: ClientKind;
  readonly archetype: Archetype;
  readonly risk: RiskTier;
  /** Todas as telas herdam os estados obrigatórios (doc 24 §5). */
  readonly states: readonly ScreenState[];
}

const MOBILE_BY_ARCHETYPE: Record<MobileArchetype, readonly string[]> = {
  "L-M01": ["M-SPLASH", "M-LOGIN", "M-SIGNUP", "M-RECOVER", "M-WORLD-PICK", "M-CLUB-PICK", "M-CLUB-CREATE", "M-REGION-PICK", "M-CLUB-PREVIEW", "M-SLOT-RESERVE", "M-CONTROL-ACTIVATE", "M-ONBOARD-REVIEW", "M-RETURN", "M-TUTORIAL"],
  "L-M02": ["M-DECISIONS", "M-SQUAD", "M-MEDICAL", "M-ACADEMY", "M-COMPETITIONS", "M-CALENDAR", "M-MARKET", "M-SCOUTING", "M-STAFF", "M-NOTIFS", "M-MY-WORLDS", "M-SEARCH", "M-MESSAGES", "M-REPORTS"],
  "L-M03": ["M-HOME", "M-DECISION-DETAIL", "M-PLAYER", "M-PLAYER-ATTRS", "M-PLAYER-DEV", "M-ROLES", "M-TRAINING", "M-MEDICAL-CASE", "M-YOUTH-PLAYER", "M-NEXTMATCH", "M-SCOUT-OPP", "M-PREMATCH", "M-POSTMATCH", "M-COMPETITION", "M-CALENDAR-DAY", "M-NATIONAL", "M-AGENT", "M-FINANCE", "M-COMMERCIAL", "M-DEPARTMENT", "M-STAFF-HIRE", "M-STADIUM", "M-BOARD", "M-MORALE", "M-FANS", "M-RIVALRIES", "M-REPUTATION", "M-SPONSORS-IMAGE", "M-CLUB-PROFILE", "M-CLUB-VIEW", "M-MANAGER-PROFILE", "M-WORLD-STRUCTURE", "M-TEAMBALANCE", "M-MEMBERSHIP", "M-PRODUCTS", "M-ROUND"],
  "L-M04": ["M-AUTOMATIONS", "M-AUTOMATION-EDIT", "M-LINEUP", "M-TACTICS", "M-GAMEPLAN", "M-TRAINING-INDIV", "M-CAREER-PLAN", "M-MENTORING", "M-REGISTRATION", "M-TRANSFER-STRATEGY", "M-BUDGET", "M-STRUCTURE", "M-RETRAIN", "M-COMPARE"],
  "L-M05": ["M-LIVE", "M-DECISION-POINT", "M-HALFTIME", "M-PENALTIES", "M-LIVE-WORLD"],
  "L-M06": ["M-CLUB-LEAVE", "M-PROMISES", "M-YOUTH-INTAKE", "M-PROMOTE", "M-SEASON-CLOSE", "M-NEGOTIATION", "M-CONTRACT", "M-LOAN", "M-DEBT", "M-MATCHDAY-REVENUE", "M-STADIUM-WORKS", "M-LICENSING", "M-PRESS", "M-CONVO", "M-PUBLIC-PROMISES", "M-IDENTITY", "M-CLAUSES", "M-FRIENDLIES"],
  "L-M07": ["M-AWARDS", "M-HISTORY", "M-RANKINGS", "M-ACCOUNTING"],
  "L-M08": ["M-PLAYER-MEMORY", "M-FEED"],
  "L-M09": ["M-ACCOUNT", "M-SETTINGS", "M-STORE", "M-SEASON-PASS", "M-INTEGRITY", "M-BUG-REPORT", "M-SUPPORT"],
};

const ADMIN_BY_ARCHETYPE: Record<AdminArchetype, readonly string[]> = {
  "L-A01": ["A-WORLDS", "A-COMPETITIONS", "A-MATCHES", "A-CLUBS", "A-AUDIT", "A-IAM", "A-BUGS"],
  "L-A02": ["A-WORLD", "A-ECONOMY", "A-BALANCE", "A-OPS"],
  "L-A03": ["A-MODERATION", "A-WO-SANCTIONS", "A-QUEUES", "A-CORRECTIONS", "A-SUPPORT", "A-PRIVACY"],
  "L-A04": ["A-RULES", "A-FLAGS", "A-BROADCAST"],
  "L-A05": ["A-LOGIN", "A-INCIDENTS", "A-BACKUPS", "A-MAINTENANCE"],
};

function build(): readonly ScreenSpec[] {
  const screens: ScreenSpec[] = [];
  for (const [archetype, ids] of Object.entries(MOBILE_BY_ARCHETYPE)) {
    for (const id of ids) {
      screens.push({
        id,
        client: "mobile",
        archetype: archetype as MobileArchetype,
        risk: ARCHETYPE_RISK[archetype as MobileArchetype],
        states: MANDATORY_SCREEN_STATES,
      });
    }
  }
  for (const [archetype, ids] of Object.entries(ADMIN_BY_ARCHETYPE)) {
    for (const id of ids) {
      screens.push({
        id,
        client: "admin",
        archetype: archetype as AdminArchetype,
        risk: ARCHETYPE_RISK[archetype as AdminArchetype],
        states: MANDATORY_SCREEN_STATES,
      });
    }
  }
  return screens;
}

export const SCREEN_REGISTRY: readonly ScreenSpec[] = build();

export function screensFor(client: ClientKind): readonly ScreenSpec[] {
  return SCREEN_REGISTRY.filter((screen) => screen.client === client);
}

export function screenById(id: string): ScreenSpec | undefined {
  return SCREEN_REGISTRY.find((screen) => screen.id === id);
}
