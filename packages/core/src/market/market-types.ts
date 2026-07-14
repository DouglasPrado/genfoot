import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

export type ScoutingReportId = EntityId<"ScoutingReport">;
export type NegotiationId = EntityId<"Negotiation">;
export type PlayerContractId = EntityId<"PlayerContract">;
export type MarketListingId = EntityId<"MarketListing">;
export type TransferAgreementId = EntityId<"TransferAgreement">;
export type LoanAgreementId = EntityId<"LoanAgreement">;
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

export const ListingStatus = {
  ACTIVE: "ACTIVE",
  WITHDRAWN: "WITHDRAWN",
  MATCHED: "MATCHED",
} as const;

export type ListingStatus =
  (typeof ListingStatus)[keyof typeof ListingStatus];

export const TransferStatus = {
  DRAFT: "DRAFT",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  COMPENSATING: "COMPENSATING",
  COMPENSATED: "COMPENSATED",
  FAILED: "FAILED",
} as const;

export type TransferStatus =
  (typeof TransferStatus)[keyof typeof TransferStatus];

export const TransferStepStatus = {
  PENDING: "PENDING",
  DONE: "DONE",
  COMPENSATED: "COMPENSATED",
} as const;

export type TransferStepStatus =
  (typeof TransferStepStatus)[keyof typeof TransferStepStatus];

export const LoanStatus = {
  AGREED: "AGREED",
  ACTIVE: "ACTIVE",
  RETURNED: "RETURNED",
  PURCHASED: "PURCHASED",
  TERMINATED: "TERMINATED",
} as const;

export type LoanStatus = (typeof LoanStatus)[keyof typeof LoanStatus];

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

export interface MarketListingSnapshot {
  readonly id: MarketListingId;
  readonly gameWorldId: GameWorldId;
  readonly playerId: MarketPlayerRef;
  readonly sellerClubId: MarketClubRef;
  readonly askingFeeMinor: number;
  readonly status: ListingStatus;
  readonly idempotencyKey: string;
  readonly version: number;
}

export interface TransferStepSnapshot {
  readonly index: number;
  readonly name: string;
  readonly status: TransferStepStatus;
  readonly checkpointHash: string | null;
}

export interface TransferAgreementSnapshot {
  readonly id: TransferAgreementId;
  readonly gameWorldId: GameWorldId;
  readonly negotiationId: NegotiationId;
  readonly sagaId: string;
  readonly playerId: MarketPlayerRef;
  readonly personId: MarketPersonRef;
  readonly fromClubId: MarketClubRef;
  readonly toClubId: MarketClubRef;
  readonly feeMinor: number;
  readonly wageMinor: number;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly status: TransferStatus;
  readonly currentStep: number;
  readonly steps: readonly TransferStepSnapshot[];
  readonly fencingToken: number;
  readonly contractId: PlayerContractId | null;
  readonly processedStepKeys: readonly string[];
  readonly idempotencyKey: string;
  readonly version: number;
}

export interface LoanAgreementSnapshot {
  readonly id: LoanAgreementId;
  readonly gameWorldId: GameWorldId;
  readonly playerId: MarketPlayerRef;
  readonly personId: MarketPersonRef;
  readonly originClubId: MarketClubRef;
  readonly destinationClubId: MarketClubRef;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly optionFeeMinor: number | null;
  readonly status: LoanStatus;
  readonly contractId: PlayerContractId;
  readonly idempotencyKey: string;
  readonly version: number;
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

export interface NegotiationExpiredEvent {
  readonly id: MarketEventId;
  readonly type: "NegotiationExpired";
  readonly gameWorldId: GameWorldId;
  readonly negotiationId: NegotiationId;
  readonly outcome: "EXPIRED" | "CANCELLED";
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface TransferStartedEvent {
  readonly id: MarketEventId;
  readonly type: "TransferStarted";
  readonly gameWorldId: GameWorldId;
  readonly transferId: TransferAgreementId;
  readonly negotiationId: NegotiationId;
  readonly playerId: MarketPlayerRef;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface TransferCompletedEvent {
  readonly id: MarketEventId;
  readonly type: "TransferCompleted";
  readonly gameWorldId: GameWorldId;
  readonly transferId: TransferAgreementId;
  readonly playerId: MarketPlayerRef;
  readonly toClubId: MarketClubRef;
  readonly contractId: PlayerContractId;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface TransferCompensatedEvent {
  readonly id: MarketEventId;
  readonly type: "TransferCompensated";
  readonly gameWorldId: GameWorldId;
  readonly transferId: TransferAgreementId;
  readonly reason: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface LoanActivatedEvent {
  readonly id: MarketEventId;
  readonly type: "LoanActivated";
  readonly gameWorldId: GameWorldId;
  readonly loanId: LoanAgreementId;
  readonly playerId: MarketPlayerRef;
  readonly destinationClubId: MarketClubRef;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface LoanReturnedEvent {
  readonly id: MarketEventId;
  readonly type: "LoanReturned";
  readonly gameWorldId: GameWorldId;
  readonly loanId: LoanAgreementId;
  readonly playerId: MarketPlayerRef;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface LoanPurchasedEvent {
  readonly id: MarketEventId;
  readonly type: "LoanPurchased";
  readonly gameWorldId: GameWorldId;
  readonly loanId: LoanAgreementId;
  readonly playerId: MarketPlayerRef;
  readonly destinationClubId: MarketClubRef;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export type MarketDomainEvent =
  | ScoutingReportProducedEvent
  | OfferSubmittedEvent
  | OfferAcceptedEvent
  | NegotiationExpiredEvent
  | PlayerContractActivatedEvent
  | PlayerClubLinkChangedEvent
  | TransferStartedEvent
  | TransferCompletedEvent
  | TransferCompensatedEvent
  | LoanActivatedEvent
  | LoanReturnedEvent
  | LoanPurchasedEvent;

export interface WorldMarketSnapshot {
  readonly gameWorldId: GameWorldId;
  readonly rulesetVersion: RulesetVersion;
  readonly scoutingReports: readonly ScoutingReportSnapshot[];
  readonly negotiations: readonly NegotiationSnapshot[];
  readonly contracts: readonly PlayerContractSnapshot[];
  readonly links: readonly PlayerClubLinkSnapshot[];
  readonly listings?: readonly MarketListingSnapshot[];
  readonly transfers?: readonly TransferAgreementSnapshot[];
  readonly loans?: readonly LoanAgreementSnapshot[];
  readonly events: readonly MarketDomainEvent[];
  readonly revision: number;
}

export interface MarketSummary {
  readonly scoutingReportCount: number;
  readonly openNegotiationCount: number;
  readonly activeContractCount: number;
  readonly activeLinkCount: number;
  readonly activeListingCount: number;
  readonly completedTransferCount: number;
  readonly activeLoanCount: number;
}
