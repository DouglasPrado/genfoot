import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

import type {
  PlayerAttributeCode,
  PlayerAttributeRollup,
  PlayerAttributes,
} from "./player-attributes.js";

import type {
  DominantFoot,
  PlayerId,
  PlayerPosition,
} from "../genesis/genesis-types.js";

export type PlayerGenerationEventId = EntityId<"PlayerGenerationEvent">;
export type PlayerDevelopmentHistoryId = EntityId<"PlayerDevelopmentHistory">;
export type MedicalCaseId = EntityId<"MedicalCase">;
export type PlayerLifecycleEventId = EntityId<"PlayerLifecycleEvent">;

export const PlayerCareerStatus = {
  ACTIVE: "ACTIVE",
  FREE_AGENT: "FREE_AGENT",
  RETIRED: "RETIRED",
} as const;

export type PlayerCareerStatus =
  (typeof PlayerCareerStatus)[keyof typeof PlayerCareerStatus];

export const PlayerAvailability = {
  AVAILABLE: "AVAILABLE",
  INJURED: "INJURED",
  SUSPENDED: "SUSPENDED",
  CONVENED: "CONVENED",
  UNAVAILABLE: "UNAVAILABLE",
} as const;

export type PlayerAvailability =
  (typeof PlayerAvailability)[keyof typeof PlayerAvailability];

export const PlayerGenerationSource = {
  INITIAL_WORLD: "INITIAL_WORLD",
  SCOUT_FOUND: "SCOUT_FOUND",
  YOUTH_ACADEMY: "YOUTH_ACADEMY",
  REGEN_AFTER_RETIREMENT: "REGEN_AFTER_RETIREMENT",
  MARKET_BALANCE: "MARKET_BALANCE",
} as const;

export type PlayerGenerationSource =
  (typeof PlayerGenerationSource)[keyof typeof PlayerGenerationSource];

export interface PersonLifecycleSnapshot {
  readonly id: EntityId<"Person">;
  readonly gameWorldId: GameWorldId;
  readonly firstName: string;
  readonly lastName: string;
  readonly birthDate: string;
  readonly nationality: string;
  readonly version: number;
}

/**
 * Os 4 grupos — **rollup derivado para exibição** (R-179), nunca fonte.
 *
 * Reexportado de `player-attributes.ts`, que é onde o grid de 39 vive. Quem
 * decide qualquer coisa lê os 39; isto é o que a tela mostra no card.
 */
export type PlayerAttributeGroups = PlayerAttributeRollup;

export interface PlayerDynamicState {
  readonly morale: number;
  readonly confidence: number;
  readonly happiness: number;
  readonly fatigue: number;
  readonly matchSharpness: number;
}

export interface PlayerLifecycleSnapshot {
  readonly id: PlayerId;
  readonly gameWorldId: GameWorldId;
  readonly personId: EntityId<"Person">;
  readonly primaryPosition: PlayerPosition;
  readonly secondaryPosition?: PlayerPosition;
  readonly dominantFoot: DominantFoot;
  readonly careerStatus: PlayerCareerStatus;
  readonly availability: PlayerAvailability;
  readonly generationSource: PlayerGenerationSource;
  readonly generatedAtSeasonNumber: number;
  readonly attributes: PlayerAttributes;
  readonly currentAbility: number;
  readonly potentialAbility: number;
  /** Habilidade de onde a margem de crescimento é medida (R-216). */
  readonly baselineAbility: number;
  /** Última temporada envelhecida — trava de idempotência da virada (R-217). */
  readonly lastAgedSeasonId: string | null;
  readonly dynamicState: PlayerDynamicState;
  readonly trainingFocus?: PlayerAttributeCode;
  readonly youthProspect?: boolean;
  readonly lastProcessedOn: string;
  readonly version: number;
}

export interface PlayerGeneratedEvent {
  readonly id: PlayerGenerationEventId;
  readonly type: "PlayerGenerated";
  readonly gameWorldId: GameWorldId;
  readonly playerId: PlayerId;
  readonly personId: EntityId<"Person">;
  readonly source: PlayerGenerationSource;
  readonly seasonNumber: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

/**
 * O código de um atributo — agora um dos 39 do GDD §2 (R-188), não uma das 4
 * chaves do rollup. É o que `applyAttributeChange` e o histórico de evolução
 * endereçam: treinar "mental" não é treinar nada, treinar `composure` é.
 */
export type { PlayerAttributeCode };

export interface PlayerDevelopmentHistoryEntry {
  readonly id: PlayerDevelopmentHistoryId;
  readonly gameWorldId: GameWorldId;
  readonly playerId: PlayerId;
  readonly attributeCode: PlayerAttributeCode;
  readonly previousValue: number;
  readonly nextValue: number;
  readonly cause: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
}

export const MedicalCaseSeverity = {
  MINOR: "MINOR",
  MODERATE: "MODERATE",
  SEVERE: "SEVERE",
} as const;

export type MedicalCaseSeverity =
  (typeof MedicalCaseSeverity)[keyof typeof MedicalCaseSeverity];

export const MedicalCaseStatus = {
  OPEN: "OPEN",
  RECOVERING: "RECOVERING",
  CLEARED: "CLEARED",
} as const;

export type MedicalCaseStatus =
  (typeof MedicalCaseStatus)[keyof typeof MedicalCaseStatus];

export interface MedicalCaseSnapshot {
  readonly id: MedicalCaseId;
  readonly gameWorldId: GameWorldId;
  readonly playerId: PlayerId;
  readonly diagnosis: string;
  readonly severity: MedicalCaseSeverity;
  readonly status: MedicalCaseStatus;
  readonly openedOn: string;
  readonly expectedReturnOn: string;
  readonly clearedOn: string | null;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
  readonly lastReassessmentKey?: string;
  readonly version: number;
}

export interface PlayerInjuredEvent {
  readonly id: PlayerLifecycleEventId;
  readonly type: "PlayerInjured";
  readonly gameWorldId: GameWorldId;
  readonly playerId: PlayerId;
  readonly medicalCaseId: MedicalCaseId;
  readonly severity: MedicalCaseSeverity;
  readonly diagnosis: string;
  readonly worldDate: string;
  readonly expectedReturnOn: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface PlayerClearedEvent {
  readonly id: PlayerLifecycleEventId;
  readonly type: "PlayerCleared";
  readonly gameWorldId: GameWorldId;
  readonly playerId: PlayerId;
  readonly medicalCaseId: MedicalCaseId;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface PlayerRetiredEvent {
  readonly id: PlayerLifecycleEventId;
  readonly type: "PlayerRetired";
  readonly gameWorldId: GameWorldId;
  readonly playerId: PlayerId;
  readonly reason: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface PlayerDevelopedEvent {
  readonly id: PlayerLifecycleEventId;
  readonly type: "PlayerDeveloped";
  readonly gameWorldId: GameWorldId;
  readonly playerId: PlayerId;
  readonly attributeCode: PlayerAttributeCode;
  readonly previousValue: number;
  readonly nextValue: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface YouthPromotedEvent {
  readonly id: PlayerLifecycleEventId;
  readonly type: "YouthPromoted";
  readonly gameWorldId: GameWorldId;
  readonly playerId: PlayerId;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export type PlayerLifecycleEvent =
  | PlayerInjuredEvent
  | PlayerClearedEvent
  | PlayerRetiredEvent
  | PlayerDevelopedEvent
  | YouthPromotedEvent;

export interface WorldPlayerLifecycleSnapshot {
  readonly gameWorldId: GameWorldId;
  readonly rulesetVersion: RulesetVersion;
  readonly persons: readonly PersonLifecycleSnapshot[];
  readonly players: readonly PlayerLifecycleSnapshot[];
  readonly generationEvents: readonly PlayerGeneratedEvent[];
  readonly developmentHistory: readonly PlayerDevelopmentHistoryEntry[];
  readonly processedDayKeys: readonly string[];
  readonly revision: number;
  readonly medicalCases?: readonly MedicalCaseSnapshot[];
  readonly lifecycleEvents?: readonly PlayerLifecycleEvent[];
}

export interface PlayerLifecycleSummary {
  readonly personCount: number;
  readonly playerCount: number;
  readonly generationEventCount: number;
  readonly developmentHistoryCount: number;
  readonly openMedicalCaseCount: number;
  readonly retiredPlayerCount: number;
  readonly lastProcessedOn: string | null;
}

export interface PlayerInspection {
  readonly player: PlayerLifecycleSnapshot;
  readonly person: PersonLifecycleSnapshot;
  readonly age: number;
}
