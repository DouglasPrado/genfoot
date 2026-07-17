import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import { SQUAD_SIZE } from "../genesis/player-generation.js";

import type { SquadMembershipSnapshot, SquadSnapshot } from "./club-types.js";

export class Squad {
  private constructor(private state: SquadSnapshot) {}

  public static fromSnapshot(
    snapshot: SquadSnapshot,
  ): Result<Squad, DomainError> {
    const players = new Set(
      snapshot.memberships.map(({ playerId }) => playerId),
    );
    // A camisa é o slot (R-190): dois jogadores não vestem o mesmo número.
    const shirts = new Set(snapshot.memberships.map(({ shirtNumber }) => shirtNumber));
    if (
      snapshot.version < 1 ||
      // O teto é REGRA (R-57), não coluna: gravá-lo por elenco permitiria dois
      // clubes com tetos diferentes — o oposto do "teto comum" do GDD §1.
      snapshot.memberships.length > SQUAD_SIZE ||
      snapshot.seasonNumber < 1 ||
      players.size !== snapshot.memberships.length ||
      shirts.size !== snapshot.memberships.length
    ) {
      return fail(new DomainError("INVALID_SQUAD", "Elenco inválido."));
    }
    return succeed(new Squad(snapshot));
  }

  public assign(
    membership: SquadMembershipSnapshot,
  ): Result<void, DomainError> {
    if (this.state.memberships.length >= SQUAD_SIZE) {
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
    if (
      this.state.memberships.some(
        ({ shirtNumber }) => shirtNumber === membership.shirtNumber,
      )
    ) {
      return fail(
        new DomainError(
          "SQUAD_SLOT_OCCUPIED",
          "Outro jogador já veste esse número.",
        ),
      );
    }
    if (!Number.isSafeInteger(membership.shirtNumber) || membership.shirtNumber < 1) {
      return fail(
        new DomainError("INVALID_SQUAD_SLOT", "O número da camisa é obrigatório."),
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
