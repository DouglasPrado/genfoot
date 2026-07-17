import type { NewDomainEvent } from "../foundation/domain-event-log.js";

/**
 * Eventos de C1 (R-176). União discriminada com payload TIPADO — não
 * `type: string` + `payload: Record<string, unknown>`, que era o estilo de
 * `ClubDomainEvent` e que quebra o replay determinístico: um payload opaco não
 * se valida nem se reconstrói.
 *
 * O que cada um carrega e o antigo `IdentityDomainEvent` não tinha:
 * `aggregateType`/`aggregateId`/`aggregateVersion` (ordem por agregado) e
 * `sequence` (ordem por mundo, atribuída no append). Sem os quatro, o
 * `@@unique([gameWorldId, aggregateType, aggregateId, aggregateVersion])` do
 * DomainEventLog era insatisfazível — que é por que os eventos ficaram presos
 * dentro do snapshot.
 */
export const IdentityEventType = {
  WORLD_PARTICIPATION_ACTIVATED: "WorldParticipationActivated",
  WORLD_PARTICIPATION_ENDED: "WorldParticipationEnded",
  CLUB_RESERVED: "ClubReserved",
  CLUB_RESERVATION_RELEASED: "ClubReservationReleased",
  CLUB_RESERVATION_EXPIRED: "ClubReservationExpired",
  CLUB_CONTROL_ACTIVATED: "ClubControlActivated",
  CLUB_CONTROL_ENDED: "ClubControlEnded",
  COOLDOWN_STARTED: "CooldownStarted",
} as const;

export type IdentityEventType =
  (typeof IdentityEventType)[keyof typeof IdentityEventType];

export const AggregateType = {
  WORLD_PARTICIPANT: "WorldParticipant",
  CLUB_ENTRY_RESERVATION: "ClubEntryReservation",
  CLUB_CONTROL: "ClubControl",
} as const;

export type AggregateType = (typeof AggregateType)[keyof typeof AggregateType];

export interface IdentityEventInput {
  readonly eventId: string;
  readonly gameWorldId: string;
  readonly aggregateType: AggregateType;
  readonly aggregateId: string;
  readonly aggregateVersion: number;
  readonly eventType: IdentityEventType;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly occurredOn: string;
  readonly actorId: string | null;
  readonly correlationId: string | null;
  readonly causationId: string | null;
}

/**
 * Monta o envelope que o log espera. `aggregateVersion` vem do agregado — é a
 * versão DEPOIS do comando, e é ela que o unique do log usa para recusar duas
 * histórias na mesma versão.
 */
export function identityEvent(input: IdentityEventInput): NewDomainEvent {
  return {
    eventId: input.eventId,
    gameWorldId: input.gameWorldId,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    aggregateVersion: BigInt(input.aggregateVersion),
    eventType: input.eventType,
    eventVersion: 1,
    payload: input.payload,
    actorType: input.actorId === null ? "SYSTEM" : "USER",
    actorId: input.actorId,
    correlationId: input.correlationId,
    causationId: input.causationId,
    occurredOn: input.occurredOn,
  };
}
