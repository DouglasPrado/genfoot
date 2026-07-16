import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import { deterministicUuidV7, timestampOf } from "../foundation/deterministic-uuid.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import {
  ControlStatus,
  ParticipationStatus,
  ClubReservationStatus,
  type ClubControlActivatedEvent,
  type ClubControlEndedEvent,
  type ClubControlSnapshot,
  type ClubReservationSnapshot,
  type ClubReservedEvent,
  type CooldownStartedEvent,
  type IdentityAccountRef,
  type IdentityClubRef,
  type IdentityDomainEvent,
  type IdentitySummary,
  type WorldIdentitySnapshot,
  type WorldParticipationActivatedEvent,
  type WorldParticipationSnapshot,
} from "./identity-types.js";

const DEFAULT_COOLDOWN_DAYS = 30;

export class WorldIdentity {
  private constructor(private state: WorldIdentitySnapshot) {}

  public static initialize(
    world: GameWorldSnapshot,
    cooldownDays: number = DEFAULT_COOLDOWN_DAYS,
  ): Result<WorldIdentity, DomainError> {
    return WorldIdentity.fromSnapshot({
      gameWorldId: world.id,
      rulesetVersion: world.rulesetVersion,
      cooldownDays,
      reservations: [],
      controls: [],
      participations: [],
      cooldowns: [],
      events: [],
      revision: 1,
    });
  }

  public static fromSnapshot(
    snapshot: WorldIdentitySnapshot,
  ): Result<WorldIdentity, DomainError> {
    if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) {
      return fail(invalidIdentity("A revisão da identidade é inválida."));
    }
    if (
      !Number.isSafeInteger(snapshot.cooldownDays) ||
      snapshot.cooldownDays < 0
    ) {
      return fail(invalidIdentity("cooldownDays inválido."));
    }
    const activeControlsByClub = new Map<string, number>();
    for (const control of snapshot.controls) {
      if (control.gameWorldId !== snapshot.gameWorldId) {
        return fail(invalidIdentity("Controle inválido."));
      }
      if (control.status === ControlStatus.ACTIVE) {
        const count = (activeControlsByClub.get(control.clubId) ?? 0) + 1;
        activeControlsByClub.set(control.clubId, count);
        if (count > 1) {
          return fail(
            new DomainError(
              "CONTROL_CONFLICT",
              "Há mais de um controle ativo para o clube.",
              { clubId: control.clubId },
            ),
          );
        }
      }
    }
    for (const reservation of snapshot.reservations) {
      if (
        reservation.gameWorldId !== snapshot.gameWorldId ||
        reservation.heldOn > reservation.expiresOn
      ) {
        return fail(invalidIdentity("Reserva inválida."));
      }
    }
    for (const event of snapshot.events) {
      if (event.gameWorldId !== snapshot.gameWorldId) {
        return fail(invalidIdentity("Evento de identidade inválido."));
      }
    }
    return succeed(new WorldIdentity(snapshot));
  }

  public joinWorld(
    input: Readonly<{
      accountId: IdentityAccountRef;
      gameWorldId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<WorldParticipationSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    if (input.gameWorldId !== this.state.gameWorldId) {
      return fail(
        new DomainError(
          "WORLD_FORBIDDEN",
          "A conta não pode ingressar em outro mundo por esta identidade.",
          { gameWorldId: input.gameWorldId },
        ),
      );
    }
    const replay = this.findEvent(
      "WorldParticipationActivated",
      input.idempotencyKey,
    );
    if (replay !== undefined) {
      const participation = this.state.participations.find(
        (current) =>
          current.accountId === replay.accountId &&
          current.status === ParticipationStatus.ACTIVE,
      );
      if (participation !== undefined) return succeed(participation);
    }
    // A conta é global (R-172): quem prova que ela existe é o caso de uso, que
    // enxerga a porta de plataforma. O agregado do mundo não tem como saber.
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const existingActive = this.state.participations.find(
      (current) =>
        current.accountId === input.accountId &&
        current.status === ParticipationStatus.ACTIVE,
    );
    if (existingActive !== undefined) return succeed(existingActive);
    const participation: WorldParticipationSnapshot = {
      accountId: input.accountId,
      gameWorldId: this.state.gameWorldId,
      status: ParticipationStatus.ACTIVE,
      activatedOn: date.value.toString(),
    };
    const participations = [
      ...this.state.participations.filter(
        (current) => current.accountId !== input.accountId,
      ),
      participation,
    ];
    const event: WorldParticipationActivatedEvent = {
      id: this.eventId(
        input.worldSeed,
        `participation-activated:${input.idempotencyKey}`,
        date.value.toString(),
      ),
      type: "WorldParticipationActivated",
      gameWorldId: this.state.gameWorldId,
      accountId: input.accountId,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      participations,
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(participation);
  }

  public reserveClub(
    input: Readonly<{
      clubId: IdentityClubRef;
      accountId: IdentityAccountRef;
      expiresOn: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<ClubReservationSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const existing = this.state.reservations.find(
      (reservation) => reservation.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    if (this.clubIsTaken(input.clubId)) {
      return fail(
        new DomainError(
          "CLUB_ALREADY_RESERVED",
          "O clube já está reservado ou controlado.",
          { clubId: input.clubId },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const expiresOn = WorldDate.parse(input.expiresOn);
    if (!expiresOn.ok) return expiresOn;
    if (expiresOn.value.toString() < date.value.toString()) {
      return fail(
        new DomainError("INVALID_RESERVATION", "Validade da reserva inválida."),
      );
    }
    const reservationId = deterministicUuidV7<"ClubReservation">({
      worldSeed: input.worldSeed,
      context: `club-reservation:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const reservation: ClubReservationSnapshot = {
      id: reservationId,
      gameWorldId: this.state.gameWorldId,
      clubId: input.clubId,
      accountId: input.accountId,
      status: ClubReservationStatus.HELD,
      heldOn: date.value.toString(),
      expiresOn: expiresOn.value.toString(),
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    const event: ClubReservedEvent = {
      id: this.eventId(
        input.worldSeed,
        `club-reserved:${input.idempotencyKey}`,
        date.value.toString(),
      ),
      type: "ClubReserved",
      gameWorldId: this.state.gameWorldId,
      reservationId,
      clubId: input.clubId,
      accountId: input.accountId,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      reservations: [...this.state.reservations, reservation],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(reservation);
  }

  public confirmOnboarding(
    input: Readonly<{
      reservationId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<ClubControlSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("ClubControlActivated", input.idempotencyKey);
    if (replay !== undefined) {
      const control = this.state.controls.find(
        ({ id }) => id === replay.controlId,
      );
      if (control !== undefined) return succeed(control);
    }
    const index = this.state.reservations.findIndex(
      ({ id }) => id === input.reservationId,
    );
    if (index < 0) return fail(reservationNotFound(input.reservationId));
    const reservation = this.state.reservations[index]!;
    if (reservation.status !== ClubReservationStatus.HELD) {
      return fail(
        new DomainError(
          "RESERVATION_TERMINAL",
          "A reserva não está mais disponível para onboarding.",
          { reservationId: reservation.id },
        ),
      );
    }
    if (this.hasActiveControl(reservation.clubId)) {
      return fail(
        new DomainError(
          "CONTROL_CONFLICT",
          "O clube já possui controle ativo.",
          {
            clubId: reservation.clubId,
          },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const controlId = deterministicUuidV7<"ClubControl">({
      worldSeed: input.worldSeed,
      context: `club-control:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const reservations = [...this.state.reservations];
    reservations[index] = {
      ...reservation,
      status: ClubReservationStatus.CONFIRMED,
      version: reservation.version + 1,
    };
    const control: ClubControlSnapshot = {
      id: controlId,
      gameWorldId: this.state.gameWorldId,
      clubId: reservation.clubId,
      accountId: reservation.accountId,
      status: ControlStatus.ACTIVE,
      activeFrom: date.value.toString(),
      endedOn: null,
      endedReason: null,
      version: 1,
    };
    const participation: WorldParticipationSnapshot = {
      accountId: reservation.accountId,
      gameWorldId: this.state.gameWorldId,
      status: ParticipationStatus.ACTIVE,
      activatedOn: date.value.toString(),
    };
    const participations = [
      ...this.state.participations.filter(
        (current) => current.accountId !== reservation.accountId,
      ),
      participation,
    ];
    const event: ClubControlActivatedEvent = {
      id: this.eventId(
        input.worldSeed,
        `control-activated:${input.idempotencyKey}`,
        date.value.toString(),
      ),
      type: "ClubControlActivated",
      gameWorldId: this.state.gameWorldId,
      controlId,
      clubId: reservation.clubId,
      accountId: reservation.accountId,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      reservations,
      controls: [...this.state.controls, control],
      participations,
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(control);
  }

  public releaseReservation(
    input: Readonly<{
      reservationId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<ClubReservationSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const index = this.state.reservations.findIndex(
      ({ id }) => id === input.reservationId,
    );
    if (index < 0) return fail(reservationNotFound(input.reservationId));
    const reservation = this.state.reservations[index]!;
    if (reservation.status === ClubReservationStatus.RELEASED) {
      return succeed(reservation);
    }
    if (reservation.status !== ClubReservationStatus.HELD) {
      return fail(
        new DomainError(
          "RESERVATION_TERMINAL",
          "Somente reservas retidas podem ser liberadas.",
          { reservationId: reservation.id },
        ),
      );
    }
    const released: ClubReservationSnapshot = {
      ...reservation,
      status: ClubReservationStatus.RELEASED,
      version: reservation.version + 1,
    };
    const reservations = [...this.state.reservations];
    reservations[index] = released;
    this.state = {
      ...this.state,
      reservations,
      revision: this.state.revision + 1,
    };
    return succeed(released);
  }

  public endClubControl(
    input: Readonly<{
      controlId: string;
      reason: string;
      endedOn: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<ClubControlSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("ClubControlEnded", input.idempotencyKey);
    if (replay !== undefined) {
      const control = this.state.controls.find(
        ({ id }) => id === replay.controlId,
      );
      if (control !== undefined) return succeed(control);
    }
    const index = this.state.controls.findIndex(
      ({ id }) => id === input.controlId,
    );
    if (index < 0) return fail(controlNotFound(input.controlId));
    const control = this.state.controls[index]!;
    if (control.status !== ControlStatus.ACTIVE) {
      return fail(
        new DomainError("CONTROL_TERMINAL", "O controle já foi encerrado.", {
          controlId: control.id,
        }),
      );
    }
    const endedOn = WorldDate.parse(input.endedOn);
    if (!endedOn.ok) return endedOn;
    const untilOn = endedOn.value.addDays(this.state.cooldownDays).toString();
    const ended: ClubControlSnapshot = {
      ...control,
      status: ControlStatus.ENDED,
      endedOn: endedOn.value.toString(),
      endedReason: input.reason.trim() === "" ? "ENDED" : input.reason.trim(),
      version: control.version + 1,
    };
    const controls = [...this.state.controls];
    controls[index] = ended;
    const participations = this.state.participations.map((participation) =>
      participation.accountId === control.accountId
        ? { ...participation, status: ParticipationStatus.ENDED }
        : participation,
    );
    const cooldowns = [
      ...this.state.cooldowns.filter(
        (cooldown) => cooldown.accountId !== control.accountId,
      ),
      {
        accountId: control.accountId,
        gameWorldId: this.state.gameWorldId,
        untilOn,
      },
    ];
    const endedEvent: ClubControlEndedEvent = {
      id: this.eventId(
        input.worldSeed,
        `control-ended:${input.idempotencyKey}`,
        endedOn.value.toString(),
      ),
      type: "ClubControlEnded",
      gameWorldId: this.state.gameWorldId,
      controlId: control.id,
      reason: ended.endedReason ?? "ENDED",
      worldDate: endedOn.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    const cooldownEvent: CooldownStartedEvent = {
      id: this.eventId(
        input.worldSeed,
        `cooldown-started:${input.idempotencyKey}`,
        endedOn.value.toString(),
      ),
      type: "CooldownStarted",
      gameWorldId: this.state.gameWorldId,
      accountId: control.accountId,
      untilOn,
      worldDate: endedOn.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      controls,
      participations,
      cooldowns,
      events: [...this.state.events, endedEvent, cooldownEvent],
      revision: this.state.revision + 1,
    };
    return succeed(ended);
  }

  public requestClubSwitch(
    input: Readonly<{
      accountId: IdentityAccountRef;
      targetClubId: IdentityClubRef;
      expiresOn: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<ClubReservationSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const cooldown = this.state.cooldowns.find(
      (current) => current.accountId === input.accountId,
    );
    if (cooldown !== undefined && date.value.toString() < cooldown.untilOn) {
      return fail(
        new DomainError(
          "COOLDOWN_ACTIVE",
          "Troca bloqueada durante o cooldown.",
          {
            accountId: input.accountId,
            untilOn: cooldown.untilOn,
          },
        ),
      );
    }
    return this.reserveClub({
      clubId: input.targetClubId,
      accountId: input.accountId,
      expiresOn: input.expiresOn,
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
      worldSeed: input.worldSeed,
      worldDate: input.worldDate,
    });
  }

  public activeControlForClub(clubId: string): ClubControlSnapshot | null {
    return (
      this.state.controls.find(
        (control) =>
          control.clubId === clubId && control.status === ControlStatus.ACTIVE,
      ) ?? null
    );
  }

  public summary(): IdentitySummary {
    return {
      activeReservationCount: this.state.reservations.filter(
        ({ status }) => status === ClubReservationStatus.HELD,
      ).length,
      activeControlCount: this.state.controls.filter(
        ({ status }) => status === ControlStatus.ACTIVE,
      ).length,
      activeParticipationCount: this.state.participations.filter(
        ({ status }) => status === ParticipationStatus.ACTIVE,
      ).length,
    };
  }

  public snapshot(): WorldIdentitySnapshot {
    return this.state;
  }


  private clubIsTaken(clubId: string): boolean {
    // A vaga está ocupada por uma reserva ainda retida (HELD) ou por um controle
    // ativo. Uma reserva CONFIRMED cujo controle já encerrou não bloqueia — a saída
    // libera a vaga para handover.
    const held = this.state.reservations.some(
      (reservation) =>
        reservation.clubId === clubId &&
        reservation.status === ClubReservationStatus.HELD,
    );
    return held || this.hasActiveControl(clubId);
  }

  private hasActiveControl(clubId: string): boolean {
    return this.state.controls.some(
      (control) =>
        control.clubId === clubId && control.status === ControlStatus.ACTIVE,
    );
  }

  private eventId(
    worldSeed: string,
    context: string,
    worldDate: string,
  ): IdentityDomainEvent["id"] {
    return deterministicUuidV7<"IdentityEvent">({
      worldSeed,
      context,
      timestampMilliseconds: timestampOf(worldDate),
    });
  }

  private findEvent<T extends IdentityDomainEvent["type"]>(
    type: T,
    idempotencyKey: string,
  ): Extract<IdentityDomainEvent, { type: T }> | undefined {
    return this.state.events.find(
      (event): event is Extract<IdentityDomainEvent, { type: T }> =>
        event.type === type && event.idempotencyKey === idempotencyKey,
    );
  }
}

function invalidIdentity(message: string): DomainError {
  return new DomainError("INVALID_IDENTITY_STATE", message);
}

function rulesetMismatch(): DomainError {
  return new DomainError(
    "RULESET_VERSION_MISMATCH",
    "O command usa um ruleset diferente da identidade.",
  );
}

function reservationNotFound(reservationId: string): DomainError {
  return new DomainError("RESERVATION_NOT_FOUND", "Reserva não encontrada.", {
    reservationId,
  });
}

function controlNotFound(controlId: string): DomainError {
  return new DomainError("CONTROL_NOT_FOUND", "Controle não encontrado.", {
    controlId,
  });
}


