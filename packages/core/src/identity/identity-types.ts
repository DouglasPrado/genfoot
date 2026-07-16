import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

export type IdentityAccountRef = EntityId<"Account">;
export type IdentityClubRef = EntityId<"Club">;
export type ClubReservationId = EntityId<"ClubReservation">;
export type ClubControlId = EntityId<"ClubControl">;
export type SessionFamilyId = EntityId<"SessionFamily">;
export type SessionId = EntityId<"Session">;
export type IdentityEventId = EntityId<"IdentityEvent">;

export const AccountStatus = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

export type AccountStatus =
  (typeof AccountStatus)[keyof typeof AccountStatus];

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

/*
 * ─── Tipos `Legacy*`: condenados, não copie ──────────────────────────────────
 *
 * São as coleções de dentro do mega-agregado `WorldIdentity`, que a R-175
 * aposenta. Cada um já tem substituto como agregado próprio:
 *
 *   LegacyWorldParticipationSnapshot → world-participant.ts   (tem `id`)
 *   LegacyClubControlSnapshot        → club-control.ts        (aponta para a participação)
 *   LegacyClubReservationSnapshot    → (a fazer)
 *   LegacyCooldownSnapshot           → (a fazer)
 *
 * O prefixo existe só para os dois modelos conviverem enquanto os quatro roots
 * saem um a um: sem ele, `export *` no index colide. Somem junto com o
 * `WorldIdentity`; se você está lendo isto e eles ainda existem, a migração de
 * C1 não terminou.
 */

export interface LegacyClubReservationSnapshot {
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

export interface LegacyClubControlSnapshot {
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

export interface LegacyWorldParticipationSnapshot {
  readonly accountId: IdentityAccountRef;
  readonly gameWorldId: GameWorldId;
  readonly status: ParticipationStatus;
  readonly activatedOn: string;
}

export interface LegacyCooldownSnapshot {
  readonly accountId: IdentityAccountRef;
  readonly gameWorldId: GameWorldId;
  readonly untilOn: string;
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

export interface AccountRegisteredEvent {
  readonly id: IdentityEventId;
  readonly type: "AccountRegistered";
  readonly gameWorldId: GameWorldId;
  readonly accountId: IdentityAccountRef;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export interface WorldParticipationActivatedEvent {
  readonly id: IdentityEventId;
  readonly type: "WorldParticipationActivated";
  readonly gameWorldId: GameWorldId;
  readonly accountId: IdentityAccountRef;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly idempotencyKey: string;
}

export type IdentityDomainEvent =
  | AccountRegisteredEvent
  | WorldParticipationActivatedEvent
  | ClubReservedEvent
  | ClubControlActivatedEvent
  | ClubControlEndedEvent
  | CooldownStartedEvent
  | SessionFamilyRevokedEvent;

/**
 * Estado da identidade DENTRO de um mundo (R-172/R-174).
 *
 * Contas, credenciais e sessões saíram: são de plataforma. A conta global é
 * `UserAccount`; o ciclo de token é do Clerk (R-171). Aqui fica só o que
 * pertence ao mundo — e é exatamente o que `WorldParticipant` e `ClubControl`
 * do modelo físico esperam.
 */
export interface WorldIdentitySnapshot {
  readonly gameWorldId: GameWorldId;
  readonly rulesetVersion: RulesetVersion;
  readonly cooldownDays: number;
  readonly reservations: readonly LegacyClubReservationSnapshot[];
  readonly controls: readonly LegacyClubControlSnapshot[];
  readonly participations: readonly LegacyWorldParticipationSnapshot[];
  readonly cooldowns: readonly LegacyCooldownSnapshot[];
  readonly events: readonly IdentityDomainEvent[];
  readonly revision: number;
}

/** Resumo da identidade NO MUNDO. Conta e sessão são de plataforma (R-172/R-174). */
export interface IdentitySummary {
  readonly activeReservationCount: number;
  readonly activeControlCount: number;
  readonly activeParticipationCount: number;
}
