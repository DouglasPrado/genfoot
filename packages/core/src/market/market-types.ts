import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

export type ScoutingReportId = EntityId<"ScoutingReport">;
export type NegotiationId = EntityId<"Negotiation">;
export type PlayerContractId = EntityId<"PlayerContract">;
export type MarketEventId = EntityId<"MarketEvent">;
export type MarketPlayerRef = EntityId<"Player">;
export type MarketPersonRef = EntityId<"Person">;
export type MarketClubRef = EntityId<"Club">;

export const NegotiationStatus = {
  OPEN: "OPEN",
  OFFERED: "OFFERED",
  COUNTERED: "COUNTERED",
  ACCEPTED: "ACCEPTED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;

export type NegotiationStatus =
  (typeof NegotiationStatus)[keyof typeof NegotiationStatus];

export const PlayerLinkKind = {
  PERMANENT: "PERMANENT",
  LOAN: "LOAN",
} as const;

export type PlayerLinkKind =
  (typeof PlayerLinkKind)[keyof typeof PlayerLinkKind];

export const ContractStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  TERMINATED: "TERMINATED",
} as const;

export type ContractStatus =
  (typeof ContractStatus)[keyof typeof ContractStatus];

export const LinkStatus = {
  ACTIVE: "ACTIVE",
  ENDED: "ENDED",
} as const;

export type LinkStatus = (typeof LinkStatus)[keyof typeof LinkStatus];

export interface ScoutingReportSnapshot {
  readonly id: ScoutingReportId;
  readonly gameWorldId: GameWorldId;
  readonly playerId: MarketPlayerRef;
  readonly observerClubId: MarketClubRef;
  readonly observations: readonly string[];
  readonly confidence: number;
  readonly validUntil: string;
  readonly idempotencyKey: string;
}

export interface OfferTerms {
  readonly feeMinor: number;
  readonly wageMinor: number;
  readonly contractYears: number;
}

export interface OfferSnapshot {
  readonly version: number;
  readonly createdByClubId: MarketClubRef;
  readonly terms: OfferTerms;
  readonly expiresOn: string;
}

export interface NegotiationSnapshot {
  readonly id: NegotiationId;
  readonly gameWorldId: GameWorldId;
  readonly playerId: MarketPlayerRef;
  readonly buyerClubId: MarketClubRef;
  readonly sellerClubId: MarketClubRef;
  readonly status: NegotiationStatus;
  readonly currentVersion: number;
  readonly offers: readonly OfferSnapshot[];
  readonly idempotencyKey: string;
}

export interface PlayerContractSnapshot {
  readonly id: PlayerContractId;
  readonly gameWorldId: GameWorldId;
  readonly personId: MarketPersonRef;
  readonly playerId: MarketPlayerRef;
  readonly clubId: MarketClubRef;
  readonly feeMinor: number;
  readonly wageMinor: number;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly kind: PlayerLinkKind;
  readonly status: ContractStatus;
  readonly idempotencyKey: string;
  readonly version: number;
}

export interface PlayerClubLinkSnapshot {
  readonly playerId: MarketPlayerRef;
  readonly clubId: MarketClubRef;
  readonly kind: PlayerLinkKind;
  readonly contractId: PlayerContractId;
  readonly effectiveStart: string;
  readonly effectiveEnd: string;
  readonly status: LinkStatus;
}

export interface ScoutingReportProducedEvent {
  readonly id: MarketEventId;
  readonly type: "ScoutingReportProduced";
  readonly gameWorldId: GameWorldId;
  readonly reportId: ScoutingReportId;
  readonly playerId: MarketPlayerRef;
  readonly confidence: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface OfferSubmittedEvent {
  readonly id: MarketEventId;
  readonly type: "OfferSubmitted";
  readonly gameWorldId: GameWorldId;
  readonly negotiationId: NegotiationId;
  readonly version: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface OfferAcceptedEvent {
  readonly id: MarketEventId;
  readonly type: "OfferAccepted";
  readonly gameWorldId: GameWorldId;
  readonly negotiationId: NegotiationId;
  readonly version: number;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface PlayerContractActivatedEvent {
  readonly id: MarketEventId;
  readonly type: "PlayerContractActivated";
  readonly gameWorldId: GameWorldId;
  readonly contractId: PlayerContractId;
  readonly playerId: MarketPlayerRef;
  readonly clubId: MarketClubRef;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface PlayerClubLinkChangedEvent {
  readonly id: MarketEventId;
  readonly type: "PlayerClubLinkChanged";
  readonly gameWorldId: GameWorldId;
  readonly playerId: MarketPlayerRef;
  readonly clubId: MarketClubRef;
  readonly status: LinkStatus;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export type MarketDomainEvent =
  | ScoutingReportProducedEvent
  | OfferSubmittedEvent
  | OfferAcceptedEvent
  | PlayerContractActivatedEvent
  | PlayerClubLinkChangedEvent;

export interface WorldMarketSnapshot {
  readonly gameWorldId: GameWorldId;
  readonly rulesetVersion: RulesetVersion;
  readonly scoutingReports: readonly ScoutingReportSnapshot[];
  readonly negotiations: readonly NegotiationSnapshot[];
  readonly contracts: readonly PlayerContractSnapshot[];
  readonly links: readonly PlayerClubLinkSnapshot[];
  readonly events: readonly MarketDomainEvent[];
  readonly revision: number;
}

export interface MarketSummary {
  readonly scoutingReportCount: number;
  readonly openNegotiationCount: number;
  readonly activeContractCount: number;
  readonly activeLinkCount: number;
}
