import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
} from "@grinta/shared";

import type {
  BoardDecisionSnapshot,
  ClubSnapshot,
  CommercialAgreementSnapshot,
  TicketPricePolicySnapshot,
} from "./club-types.js";

export class Club {
  private constructor(private state: ClubSnapshot) {}

  public static fromSnapshot(
    snapshot: ClubSnapshot,
  ): Result<Club, DomainError> {
    if (snapshot.version < 1 || snapshot.gameWorldId === undefined) {
      return fail(invalidClub("Versão ou mundo do clube inválido."));
    }
    if (
      snapshot.identityHistory.length === 0 ||
      snapshot.identityHistory.filter(
        ({ effectiveThrough }) => effectiveThrough === null,
      ).length !== 1 ||
      snapshot.identity.effectiveThrough !== null
    ) {
      return fail(invalidClub("O clube deve ter uma identidade ativa."));
    }
    if (
      snapshot.departments.some(
        ({ level, targetLevel, capacity, condition }) =>
          !inRange(level, 1, 10) ||
          !inRange(targetLevel, 1, 10) ||
          !positiveInteger(capacity) ||
          !inRange(condition, 0, 100),
      ) ||
      !positiveInteger(snapshot.stadium.capacity) ||
      !inRange(snapshot.stadium.condition, 0, 100)
    ) {
      return fail(invalidClub("Estrutura do clube inválida."));
    }
    return succeed(new Club(snapshot));
  }

  public updateIdentity(
    input: Readonly<{
      name: string;
      shortCode: string;
      effectiveOn: WorldDate;
      rulesetVersion: ClubSnapshot["identity"]["rulesetVersion"];
      identityId: ClubSnapshot["identity"]["id"];
    }>,
  ): Result<void, DomainError> {
    if (input.name.trim() === "" || !/^[A-Z0-9]{2,5}$/u.test(input.shortCode)) {
      return fail(invalidClub("Nome ou código do clube inválido."));
    }
    const effectiveOn = input.effectiveOn.toString();
    if (effectiveOn <= this.state.identity.effectiveFrom) {
      return fail(
        invalidClub("A nova identidade deve iniciar depois da atual."),
      );
    }
    const closed = {
      ...this.state.identity,
      effectiveThrough: input.effectiveOn.addDays(-1).toString(),
    };
    const identity = {
      id: input.identityId,
      name: input.name.trim(),
      shortCode: input.shortCode,
      effectiveFrom: effectiveOn,
      effectiveThrough: null,
      rulesetVersion: input.rulesetVersion,
    } as const;
    this.state = {
      ...this.state,
      identity,
      identityHistory: [
        ...this.state.identityHistory.slice(0, -1),
        closed,
        identity,
      ],
      version: this.state.version + 1,
    };
    return succeed(undefined);
  }

  public setDepartmentPlan(
    input: Readonly<{
      kind: ClubSnapshot["departments"][number]["kind"];
      targetLevel: number;
      capacity: number;
    }>,
  ): Result<void, DomainError> {
    const index = this.state.departments.findIndex(
      ({ kind }) => kind === input.kind,
    );
    if (
      index < 0 ||
      !inRange(input.targetLevel, 1, 10) ||
      !positiveInteger(input.capacity) ||
      input.capacity > input.targetLevel * 100
    ) {
      return fail(invalidClub("Plano de departamento fora dos limites."));
    }
    const departments = [...this.state.departments];
    const current = departments[index]!;
    departments[index] = {
      ...current,
      targetLevel: input.targetLevel,
      capacity: input.capacity,
      version: current.version + 1,
    };
    this.state = {
      ...this.state,
      departments,
      version: this.state.version + 1,
    };
    return succeed(undefined);
  }

  public setTicketPrice(
    policy: TicketPricePolicySnapshot,
  ): Result<void, DomainError> {
    if (!positiveInteger(policy.priceMinor) || !validDate(policy.effectiveOn)) {
      return fail(invalidClub("Política de ingresso inválida."));
    }
    this.state = {
      ...this.state,
      ticketPolicies: [...this.state.ticketPolicies, policy],
      version: this.state.version + 1,
    };
    return succeed(undefined);
  }

  public signCommercialAgreement(
    agreement: CommercialAgreementSnapshot,
  ): Result<void, DomainError> {
    if (
      agreement.asset.trim() === "" ||
      agreement.externalAgreementRef.trim() === "" ||
      !validDate(agreement.startsOn) ||
      !validDate(agreement.endsOn) ||
      agreement.startsOn > agreement.endsOn
    ) {
      return fail(invalidClub("Acordo comercial inválido."));
    }
    const conflict = this.state.commercialAgreements.some(
      (current) =>
        current.asset === agreement.asset &&
        current.exclusive &&
        agreement.exclusive &&
        current.startsOn <= agreement.endsOn &&
        agreement.startsOn <= current.endsOn,
    );
    if (conflict) {
      return fail(
        new DomainError(
          "COMMERCIAL_EXCLUSIVITY_CONFLICT",
          "Há um direito comercial exclusivo sobreposto.",
        ),
      );
    }
    this.state = {
      ...this.state,
      commercialAgreements: [...this.state.commercialAgreements, agreement],
      version: this.state.version + 1,
    };
    return succeed(undefined);
  }

  public recordBoardDecision(
    decision: BoardDecisionSnapshot,
  ): Result<void, DomainError> {
    if (
      decision.decisionType.trim() === "" ||
      decision.authorId.trim() === "" ||
      decision.justification.trim() === "" ||
      !validDate(decision.effectiveFrom) ||
      !validDate(decision.recordedAt) ||
      (decision.effectiveThrough !== null &&
        (!validDate(decision.effectiveThrough) ||
          decision.effectiveThrough < decision.effectiveFrom))
    ) {
      return fail(invalidClub("Decisão de diretoria inválida."));
    }
    this.state = {
      ...this.state,
      boardDecisions: [...this.state.boardDecisions, decision],
      version: this.state.version + 1,
    };
    return succeed(undefined);
  }

  public snapshot(): ClubSnapshot {
    return this.state;
  }
}

function validDate(value: string): boolean {
  return WorldDate.parse(value).ok;
}

function positiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function inRange(value: number, minimum: number, maximum: number): boolean {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

function invalidClub(message: string): DomainError {
  return new DomainError("INVALID_CLUB", message);
}
