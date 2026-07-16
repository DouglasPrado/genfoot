import { DomainError, WorldDate, fail, succeed, type Result } from "@grinta/shared";
import type { GameWorldId } from "@grinta/shared";

import { deterministicUuidV7, timestampOf } from "../foundation/deterministic-uuid.js";

import {
  ClubReservationStatus,
  type ClubReservationId,
  type IdentityClubRef,
} from "./identity-types.js";
import type { WorldParticipantId } from "./world-participant.js";

/**
 * Retenção temporária da vaga num clube, com TTL (R-25). Um agregado por
 * reserva.
 *
 * Root canônico que **não tinha tabela nenhuma** — 9 campos sem destino. E não
 * é detalhe de gravação: expirar reserva varrendo um blob JSON não é o mesmo
 * produto que expirar por índice em `expiresOn`.
 *
 * Aponta para `worldParticipantId`, não para a conta, pela mesma razão do
 * `ClubControl`: a conta é global (R-172) e não sabe de mundo. O fluxo é entrar
 * no mundo → reservar → confirmar, então a participação já existe — e como
 * confirmar vira controle, guardá-la aqui torna a conversão direta.
 *
 * `idempotencyKey` NÃO mora aqui. Por R-176 a idempotência de command é linha
 * na `IdempotencyKey`, não campo espalhado por entidade com varredura O(n) —
 * que é como `world-identity.ts:192` a resolvia.
 */
export interface ClubEntryReservationSnapshot {
  readonly id: ClubReservationId;
  readonly gameWorldId: GameWorldId;
  readonly clubId: IdentityClubRef;
  readonly worldParticipantId: WorldParticipantId;
  readonly status: ClubReservationStatus;
  /** Datas do mundo (R-177). */
  readonly heldOn: string;
  readonly expiresOn: string;
  readonly version: number;
}

export interface HoldClubEntryInput {
  readonly gameWorldId: GameWorldId | string;
  readonly clubId: IdentityClubRef | string;
  readonly worldParticipantId: WorldParticipantId | string;
  readonly worldSeed: string;
  readonly occurredOn: string;
  readonly expiresOn: string;
}

export class ClubEntryReservation {
  private constructor(private state: ClubEntryReservationSnapshot) {}

  public static hold(
    input: HoldClubEntryInput,
  ): Result<ClubEntryReservation, DomainError> {
    const heldOn = WorldDate.parse(input.occurredOn);
    if (!heldOn.ok) return heldOn;
    const expiresOn = WorldDate.parse(input.expiresOn);
    if (!expiresOn.ok) return expiresOn;
    if (expiresOn.value.toString() < heldOn.value.toString()) {
      return fail(invalid("o prazo não pode anteceder a retenção."));
    }

    // "1 reserva HELD por clube" e "clube sem controle ativo" não se decidem
    // aqui: a primeira é índice único parcial no Postgres; a segunda cruza
    // agregados e é do caso de uso — com o índice do ClubControl como árbitro
    // final. Este agregado não enxerga os vizinhos, e é isso que R-175 quer.
    return succeed(
      new ClubEntryReservation({
        id: deterministicUuidV7<"ClubReservation">({
          worldSeed: input.worldSeed,
          context: `club-reservation:${input.gameWorldId}:${input.clubId}:${input.worldParticipantId}`,
          timestampMilliseconds: timestampOf(heldOn.value.toString()),
        }),
        gameWorldId: input.gameWorldId as GameWorldId,
        clubId: input.clubId as IdentityClubRef,
        worldParticipantId: input.worldParticipantId as WorldParticipantId,
        status: ClubReservationStatus.HELD,
        heldOn: heldOn.value.toString(),
        expiresOn: expiresOn.value.toString(),
        version: 1,
      }),
    );
  }

  public static fromSnapshot(
    snapshot: ClubEntryReservationSnapshot,
  ): Result<ClubEntryReservation, DomainError> {
    if (snapshot.version < 1) return fail(invalid("versão inválida."));
    if (snapshot.expiresOn < snapshot.heldOn) {
      return fail(invalid("o prazo não pode anteceder a retenção."));
    }
    return succeed(new ClubEntryReservation(snapshot));
  }

  public confirm(): Result<ClubEntryReservationSnapshot, DomainError> {
    return this.settle(ClubReservationStatus.CONFIRMED);
  }

  public release(): Result<ClubEntryReservationSnapshot, DomainError> {
    return this.settle(ClubReservationStatus.RELEASED);
  }

  /** Só depois do prazo: expirar antes tiraria a vaga de quem ainda o tem. */
  public expire(occurredOn: string): Result<ClubEntryReservationSnapshot, DomainError> {
    const date = WorldDate.parse(occurredOn);
    if (!date.ok) return date;
    if (
      this.state.status === ClubReservationStatus.HELD &&
      date.value.toString() <= this.state.expiresOn
    ) {
      // O prazo vale até o fim do dia: expirar em `expiresOn` cortaria um dia.
      return fail(invalid("a reserva ainda está no prazo."));
    }
    return this.settle(ClubReservationStatus.EXPIRED);
  }

  /**
   * HELD é o único estado de onde se sai. Repetir o mesmo destino é idempotente;
   * pedir outro depois de resolvida é erro — a vaga já foi para alguém, e
   * "desconfirmar" a daria duas vezes.
   */
  private settle(
    target: ClubReservationStatus,
  ): Result<ClubEntryReservationSnapshot, DomainError> {
    if (this.state.status === target) return succeed(this.state);
    if (this.state.status !== ClubReservationStatus.HELD) {
      return fail(
        new DomainError(
          "RESERVA_TERMINAL",
          `A reserva já está em ${this.state.status} e não volta para ${target}.`,
          { reservationId: this.state.id },
        ),
      );
    }
    this.state = { ...this.state, status: target, version: this.state.version + 1 };
    return succeed(this.state);
  }

  public snapshot(): ClubEntryReservationSnapshot {
    return this.state;
  }
}

function invalid(message: string): DomainError {
  return new DomainError("RESERVA_INVALIDA", message);
}
