import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import type { SquadMembershipSnapshot, SquadSnapshot } from "./club-types.js";

export class Squad {
  private constructor(private state: SquadSnapshot) {}

  public static fromSnapshot(
    snapshot: SquadSnapshot,
  ): Result<Squad, DomainError> {
    const players = new Set(
      snapshot.memberships.map(({ playerId }) => playerId),
    );
    const slots = new Set(snapshot.memberships.map(({ slot }) => slot));
    if (
      snapshot.version < 1 ||
      snapshot.capacity < 1 ||
      snapshot.memberships.length > snapshot.capacity ||
      players.size !== snapshot.memberships.length ||
      slots.size !== snapshot.memberships.length
    ) {
      return fail(new DomainError("INVALID_SQUAD", "Elenco inválido."));
    }
    return succeed(new Squad(snapshot));
  }

  public assign(
    membership: SquadMembershipSnapshot,
  ): Result<void, DomainError> {
    if (this.state.memberships.length >= this.state.capacity) {
      return fail(
        new DomainError(
          "SQUAD_CAPACITY_EXCEEDED",
          "O elenco atingiu a capacidade.",
        ),
      );
    }
    if (
      this.state.memberships.some(
        ({ playerId }) => playerId === membership.playerId,
      )
    ) {
      return fail(
        new DomainError(
          "PLAYER_ALREADY_ASSIGNED",
          "O jogador já pertence ao elenco.",
        ),
      );
    }
    if (this.state.memberships.some(({ slot }) => slot === membership.slot)) {
      return fail(
        new DomainError("SQUAD_SLOT_OCCUPIED", "O slot já está ocupado."),
      );
    }
    if (membership.slot.trim() === "") {
      return fail(
        new DomainError("INVALID_SQUAD_SLOT", "O slot é obrigatório."),
      );
    }
    this.state = {
      ...this.state,
      memberships: [...this.state.memberships, membership],
      version: this.state.version + 1,
    };
    return succeed(undefined);
  }

  public remove(playerId: string): Result<void, DomainError> {
    const memberships = this.state.memberships.filter(
      (membership) => membership.playerId !== playerId,
    );
    if (memberships.length === this.state.memberships.length) {
      return fail(
        new DomainError("SQUAD_MEMBER_NOT_FOUND", "Membro não encontrado."),
      );
    }
    this.state = {
      ...this.state,
      memberships,
      version: this.state.version + 1,
    };
    return succeed(undefined);
  }

  public snapshot(): SquadSnapshot {
    return this.state;
  }
}
