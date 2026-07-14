import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

export type IdentityAccountRef = EntityId<"Account">;
export type IdentityClubRef = EntityId<"Club">;
export type ClubReservationId = EntityId<"ClubReservation">;
export type ClubControlId = EntityId<"ClubControl">;
export type SessionFamilyId = EntityId<"SessionFamily">;
export type IdentityEventId = EntityId<"IdentityEvent">;

export const ClubReservationStatus = {
  HELD: "HELD",
  CONFIRMED: "CONFIRMED",
  EXPIRED: "EXPIRED",
  RELEASED: "RELEASED",
} as const;

export type ClubReservationStatus =
  (typeof ClubReservationStatus)[keyof typeof ClubReservationStatus];

export const ControlStatus = {
  ACTIVE: "ACTIVE",
  ENDED: "ENDED",
} as const;

export type ControlStatus =
  (typeof ControlStatus)[keyof typeof ControlStatus];

export const ParticipationStatus = {
  ACTIVE: "ACTIVE",
  ENDED: "ENDED",
} as const;

export type ParticipationStatus =
  (typeof ParticipationStatus)[keyof typeof ParticipationStatus];

export const SessionFamilyStatus = {
  ACTIVE: "ACTIVE",
  REVOKED: "REVOKED",
} as const;

export type SessionFamilyStatus =
  (typeof SessionFamilyStatus)[keyof typeof SessionFamilyStatus];

export interface ClubReservationSnapshot {
  readonly id: ClubReservationId;
  readonly gameWorldId: GameWorldId;
  readonly clubId: IdentityClubRef;
  readonly accountId: IdentityAccountRef;
  readonly status: ClubReservationStatus;
  readonly heldOn: string;
  readonly expiresOn: string;
  readonly idempotencyKey: string;
  readonly version: number;
}

export interface ClubControlSnapshot {
  readonly id: ClubControlId;
  readonly gameWorldId: GameWorldId;
  readonly clubId: IdentityClubRef;
  readonly accountId: IdentityAccountRef;
  readonly status: ControlStatus;
  readonly activeFrom: string;
  readonly endedOn: string | null;
  readonly endedReason: string | null;
  readonly version: number;
}

export interface WorldParticipationSnapshot {
  readonly accountId: IdentityAccountRef;
  readonly gameWorldId: GameWorldId;
  readonly status: ParticipationStatus;
  readonly activatedOn: string;
}

export interface CooldownSnapshot {
  readonly accountId: IdentityAccountRef;
  readonly gameWorldId: GameWorldId;
  readonly untilOn: string;
}

export interface SessionFamilySnapshot {
  readonly id: SessionFamilyId;
  readonly accountId: IdentityAccountRef;
  readonly currentTokenHash: string;
  readonly status: SessionFamilyStatus;
}

export interface ClubReservedEvent {
  readonly id: IdentityEventId;
  readonly type: "ClubReserved";
  readonly gameWorldId: GameWorldId;
  readonly reservationId: ClubReservationId;
  readonly clubId: IdentityClubRef;
  readonly accountId: IdentityAccountRef;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface ClubControlActivatedEvent {
  readonly id: IdentityEventId;
  readonly type: "ClubControlActivated";
  readonly gameWorldId: GameWorldId;
  readonly controlId: ClubControlId;
  readonly clubId: IdentityClubRef;
  readonly accountId: IdentityAccountRef;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface ClubControlEndedEvent {
  readonly id: IdentityEventId;
  readonly type: "ClubControlEnded";
  readonly gameWorldId: GameWorldId;
  readonly controlId: ClubControlId;
  readonly reason: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface CooldownStartedEvent {
  readonly id: IdentityEventId;
  readonly type: "CooldownStarted";
  readonly gameWorldId: GameWorldId;
  readonly accountId: IdentityAccountRef;
  readonly untilOn: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface SessionFamilyRevokedEvent {
  readonly id: IdentityEventId;
  readonly type: "SessionFamilyRevoked";
  readonly gameWorldId: GameWorldId;
  readonly familyId: SessionFamilyId;
  readonly reason: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export type IdentityDomainEvent =
  | ClubReservedEvent
  | ClubControlActivatedEvent
  | ClubControlEndedEvent
  | CooldownStartedEvent
  | SessionFamilyRevokedEvent;

export interface WorldIdentitySnapshot {
  readonly gameWorldId: GameWorldId;
  readonly rulesetVersion: RulesetVersion;
  readonly cooldownDays: number;
  readonly reservations: readonly ClubReservationSnapshot[];
  readonly controls: readonly ClubControlSnapshot[];
  readonly participations: readonly WorldParticipationSnapshot[];
  readonly cooldowns: readonly CooldownSnapshot[];
  readonly sessionFamilies: readonly SessionFamilySnapshot[];
  readonly events: readonly IdentityDomainEvent[];
  readonly revision: number;
}

export interface IdentitySummary {
  readonly activeReservationCount: number;
  readonly activeControlCount: number;
  readonly activeParticipationCount: number;
  readonly activeSessionFamilyCount: number;
}
