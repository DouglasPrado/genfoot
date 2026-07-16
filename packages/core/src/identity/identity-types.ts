import type { EntityId } from "@grinta/shared";

/**
 * Tipos compartilhados pelos agregados de C1 (R-175).
 *
 * O que sumiu daqui, e por quê:
 *
 * - **`WorldIdentitySnapshot`** e as coleções `Legacy*` — o mega-agregado por
 *   mundo acabou. Cada root é carregável e salvável sozinho, com `version` por
 *   linha; o `revision` do mundo inteiro não existe mais e nunca teve tabela.
 * - **`IdentityDomainEvent`** e a união de 7 eventos — os eventos saíram do
 *   estado (R-176). O envelope agora está em `identity-events.ts` e carrega o
 *   que o `DomainEventLog` exige e estes não tinham: `aggregateType`,
 *   `aggregateId`, `aggregateVersion`, `sequence`, `correlationId`,
 *   `causationId`.
 * - **`SessionFamilyId`/`SessionFamilyStatus`/`SessionFamilyRevokedEvent`** —
 *   código morto desde R-172/R-174: importados e nunca construídos. O ciclo de
 *   token é do Clerk (R-171).
 * - **`AccountRegisteredEvent`** — a conta é global (R-172) e não é fato de
 *   mundo.
 */

export type IdentityAccountRef = EntityId<"Account">;
export type IdentityClubRef = EntityId<"Club">;
export type ClubReservationId = EntityId<"ClubReservation">;
export type ClubControlId = EntityId<"ClubControl">;

export const AccountStatus = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

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

export type ControlStatus = (typeof ControlStatus)[keyof typeof ControlStatus];

export const ParticipationStatus = {
  ACTIVE: "ACTIVE",
  ENDED: "ENDED",
} as const;

export type ParticipationStatus =
  (typeof ParticipationStatus)[keyof typeof ParticipationStatus];
