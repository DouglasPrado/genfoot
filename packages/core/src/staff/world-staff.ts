import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import {
  StaffAvailability,
  StaffContractStatus,
  StaffRole,
  type StaffAssignedEvent,
  type StaffAssignmentSnapshot,
  type StaffCapabilities,
  type StaffCapabilitySnapshot,
  type StaffClubRef,
  type StaffContractActivatedEvent,
  type StaffContractEndedEvent,
  type StaffContractSnapshot,
  type StaffDepartmentRef,
  type StaffDomainEvent,
  type StaffMemberCreatedEvent,
  type StaffMemberSnapshot,
  type StaffRole as StaffRoleType,
  type StaffSummary,
  type WorldStaffSnapshot,
} from "./staff-types.js";

export class WorldStaff {
  private constructor(private state: WorldStaffSnapshot) {}

  public static initialize(
    world: GameWorldSnapshot,
  ): Result<WorldStaff, DomainError> {
    return WorldStaff.fromSnapshot({
      gameWorldId: world.id,
      rulesetVersion: world.rulesetVersion,
      members: [],
      contracts: [],
      assignments: [],
      events: [],
      revision: 1,
    });
  }

  public static fromSnapshot(
    snapshot: WorldStaffSnapshot,
  ): Result<WorldStaff, DomainError> {
    if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) {
      return fail(invalidStaff("A revisão do staff é inválida."));
    }
    const memberIds = new Set<string>();
    for (const member of snapshot.members) {
      if (
        member.gameWorldId !== snapshot.gameWorldId ||
        member.firstName.trim() === "" ||
        member.lastName.trim() === "" ||
        !isRole(member.role) ||
        !validScore(member.reputation) ||
        !capabilitiesValid(member.capabilities) ||
        memberIds.has(member.id) ||
        !Number.isSafeInteger(member.version) ||
        member.version < 1
      ) {
        return fail(invalidStaff("Membro de staff inválido."));
      }
      memberIds.add(member.id);
    }
    const contractIds = new Set<string>();
    for (const contract of snapshot.contracts) {
      if (
        contract.gameWorldId !== snapshot.gameWorldId ||
        !memberIds.has(contract.staffId) ||
        !isRole(contract.role) ||
        contract.startOn > contract.endOn ||
        contract.compensationRef.trim() === "" ||
        contractIds.has(contract.id)
      ) {
        return fail(invalidStaff("Contrato de staff inválido."));
      }
      contractIds.add(contract.id);
    }
    for (const assignment of snapshot.assignments) {
      if (
        assignment.gameWorldId !== snapshot.gameWorldId ||
        !contractIds.has(assignment.contractId) ||
        !memberIds.has(assignment.staffId) ||
        !validScore(assignment.workload)
      ) {
        return fail(invalidStaff("Alocação de staff inválida."));
      }
    }
    for (const event of snapshot.events) {
      if (event.gameWorldId !== snapshot.gameWorldId) {
        return fail(invalidStaff("Evento de staff inválido."));
      }
    }
    return succeed(new WorldStaff(snapshot));
  }

  public createStaffMember(
    input: Readonly<{
      firstName: string;
      lastName: string;
      role: StaffRoleType;
      capabilities: StaffCapabilities;
      reputation: number;
      worldDate: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
  ): Result<StaffMemberSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("StaffMemberCreated", input.idempotencyKey);
    if (replay !== undefined) {
      const member = this.state.members.find(({ id }) => id === replay.staffId);
      if (member !== undefined) return succeed(member);
    }
    if (
      input.firstName.trim() === "" ||
      input.lastName.trim() === "" ||
      !isRole(input.role) ||
      !validScore(input.reputation) ||
      !capabilitiesValid(input.capabilities)
    ) {
      return fail(
        new DomainError(
          "INVALID_STAFF_MEMBER",
          "Nome, função, reputação e capacidades devem ser válidos.",
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const timestampMilliseconds = timestampOf(date.value.toString());
    const staffId = deterministicUuidV7<"StaffMember">({
      worldSeed: input.worldSeed,
      context: `staff-member:${input.idempotencyKey}`,
      timestampMilliseconds,
    });
    const eventId = deterministicUuidV7<"StaffEvent">({
      worldSeed: input.worldSeed,
      context: `staff-member-created:${input.idempotencyKey}`,
      timestampMilliseconds,
    });
    const member: StaffMemberSnapshot = {
      id: staffId,
      gameWorldId: this.state.gameWorldId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      role: input.role,
      capabilities: input.capabilities,
      reputation: input.reputation,
      availability: StaffAvailability.AVAILABLE,
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    const event: StaffMemberCreatedEvent = {
      id: eventId,
      type: "StaffMemberCreated",
      gameWorldId: this.state.gameWorldId,
      staffId,
      role: input.role,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      members: [...this.state.members, member],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(member);
  }

  public offerStaffContract(
    input: Readonly<{
      staffId: string;
      clubId: StaffClubRef;
      role: StaffRoleType;
      startOn: string;
      endOn: string;
      compensationRef: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<StaffContractSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const existing = this.state.contracts.find(
      (contract) => contract.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    const member = this.state.members.find(({ id }) => id === input.staffId);
    if (member === undefined) return fail(staffNotFound(input.staffId));
    if (!isRole(input.role) || input.role !== member.role) {
      return fail(
        new DomainError(
          "STAFF_ROLE_MISMATCH",
          "A função do contrato deve corresponder à do membro.",
          { staffId: input.staffId },
        ),
      );
    }
    const start = WorldDate.parse(input.startOn);
    if (!start.ok) return start;
    const end = WorldDate.parse(input.endOn);
    if (!end.ok) return end;
    if (start.value.toString() > end.value.toString()) {
      return fail(
        new DomainError(
          "INVALID_STAFF_CONTRACT",
          "A vigência termina antes de começar.",
        ),
      );
    }
    if (input.compensationRef.trim() === "") {
      return fail(
        new DomainError(
          "INVALID_STAFF_CONTRACT",
          "A referência de compensação é obrigatória.",
        ),
      );
    }
    const contractId = deterministicUuidV7<"StaffContract">({
      worldSeed: input.worldSeed,
      context: `staff-contract:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(start.value.toString()),
    });
    const contract: StaffContractSnapshot = {
      id: contractId,
      gameWorldId: this.state.gameWorldId,
      staffId: member.id,
      clubId: input.clubId,
      role: input.role,
      status: StaffContractStatus.OFFERED,
      startOn: start.value.toString(),
      endOn: end.value.toString(),
      compensationRef: input.compensationRef.trim(),
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    this.state = {
      ...this.state,
      contracts: [...this.state.contracts, contract],
      revision: this.state.revision + 1,
    };
    return succeed(contract);
  }

  public acceptStaffContract(
    input: Readonly<{
      contractId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<StaffContractSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent(
      "StaffContractActivated",
      input.idempotencyKey,
    );
    if (replay !== undefined) {
      const contract = this.state.contracts.find(
        ({ id }) => id === replay.contractId,
      );
      if (contract !== undefined) return succeed(contract);
    }
    const index = this.state.contracts.findIndex(
      ({ id }) => id === input.contractId,
    );
    if (index < 0) return fail(contractNotFound(input.contractId));
    const contract = this.state.contracts[index]!;
    if (contract.status === StaffContractStatus.ACTIVE) {
      return succeed(contract);
    }
    if (contract.status === StaffContractStatus.ENDED) {
      return fail(
        new DomainError(
          "STAFF_CONTRACT_TERMINAL",
          "Contrato encerrado não pode ser ativado.",
          { contractId: contract.id },
        ),
      );
    }
    const overlap = this.state.contracts.some(
      (other) =>
        other.id !== contract.id &&
        other.status === StaffContractStatus.ACTIVE &&
        other.clubId === contract.clubId &&
        other.role === contract.role &&
        other.startOn <= contract.endOn &&
        contract.startOn <= other.endOn,
    );
    if (overlap) {
      return fail(
        new DomainError(
          "STAFF_CONTRACT_OVERLAP",
          "Já existe vínculo ativo para a função/período no clube.",
          { contractId: contract.id },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const eventId = deterministicUuidV7<"StaffEvent">({
      worldSeed: input.worldSeed,
      context: `staff-contract-activated:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const activated: StaffContractSnapshot = {
      ...contract,
      status: StaffContractStatus.ACTIVE,
      version: contract.version + 1,
    };
    const contracts = [...this.state.contracts];
    contracts[index] = activated;
    const event: StaffContractActivatedEvent = {
      id: eventId,
      type: "StaffContractActivated",
      gameWorldId: this.state.gameWorldId,
      contractId: activated.id,
      staffId: activated.staffId,
      clubId: activated.clubId,
      role: activated.role,
      startOn: activated.startOn,
      endOn: activated.endOn,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      contracts,
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(activated);
  }

  public assignStaff(
    input: Readonly<{
      contractId: string;
      departmentRef: StaffDepartmentRef;
      workload: number;
      startOn: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<StaffAssignmentSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("StaffAssigned", input.idempotencyKey);
    if (replay !== undefined) {
      const assignment = this.state.assignments.find(
        ({ id }) => id === replay.assignmentId,
      );
      if (assignment !== undefined) return succeed(assignment);
    }
    const contract = this.state.contracts.find(
      ({ id }) => id === input.contractId,
    );
    if (contract === undefined) return fail(contractNotFound(input.contractId));
    if (contract.status !== StaffContractStatus.ACTIVE) {
      return fail(
        new DomainError(
          "STAFF_CONTRACT_NOT_ACTIVE",
          "Somente contratos ativos podem ser alocados.",
          { contractId: contract.id },
        ),
      );
    }
    if (!validScore(input.workload)) {
      return fail(
        new DomainError("INVALID_STAFF_ASSIGNMENT", "Carga inválida."),
      );
    }
    const start = WorldDate.parse(input.startOn);
    if (!start.ok) return start;
    const memberIndex = this.state.members.findIndex(
      ({ id }) => id === contract.staffId,
    );
    if (memberIndex < 0) return fail(staffNotFound(contract.staffId));
    const timestampMilliseconds = timestampOf(start.value.toString());
    const assignmentId = deterministicUuidV7<"StaffAssignment">({
      worldSeed: input.worldSeed,
      context: `staff-assignment:${input.idempotencyKey}`,
      timestampMilliseconds,
    });
    const eventId = deterministicUuidV7<"StaffEvent">({
      worldSeed: input.worldSeed,
      context: `staff-assigned:${input.idempotencyKey}`,
      timestampMilliseconds,
    });
    const assignment: StaffAssignmentSnapshot = {
      id: assignmentId,
      gameWorldId: this.state.gameWorldId,
      contractId: contract.id,
      staffId: contract.staffId,
      departmentRef: input.departmentRef,
      workload: input.workload,
      startOn: start.value.toString(),
      endOn: null,
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    const members = [...this.state.members];
    members[memberIndex] = {
      ...members[memberIndex]!,
      availability: StaffAvailability.ASSIGNED,
      version: members[memberIndex]!.version + 1,
    };
    const event: StaffAssignedEvent = {
      id: eventId,
      type: "StaffAssigned",
      gameWorldId: this.state.gameWorldId,
      assignmentId,
      contractId: contract.id,
      staffId: contract.staffId,
      departmentRef: input.departmentRef,
      worldDate: start.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      members,
      assignments: [...this.state.assignments, assignment],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(assignment);
  }

  public endStaffContract(
    input: Readonly<{
      contractId: string;
      endedOn: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<StaffContractSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("StaffContractEnded", input.idempotencyKey);
    if (replay !== undefined) {
      const contract = this.state.contracts.find(
        ({ id }) => id === replay.contractId,
      );
      if (contract !== undefined) return succeed(contract);
    }
    const index = this.state.contracts.findIndex(
      ({ id }) => id === input.contractId,
    );
    if (index < 0) return fail(contractNotFound(input.contractId));
    const contract = this.state.contracts[index]!;
    if (contract.status === StaffContractStatus.ENDED) {
      return fail(
        new DomainError(
          "STAFF_CONTRACT_TERMINAL",
          "Contrato já encerrado.",
          { contractId: contract.id },
        ),
      );
    }
    const ended = WorldDate.parse(input.endedOn);
    if (!ended.ok) return ended;
    if (ended.value.toString() < contract.startOn) {
      return fail(
        new DomainError(
          "INVALID_STAFF_CONTRACT",
          "O encerramento é anterior ao início.",
        ),
      );
    }
    const eventId = deterministicUuidV7<"StaffEvent">({
      worldSeed: input.worldSeed,
      context: `staff-contract-ended:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(ended.value.toString()),
    });
    const endedContract: StaffContractSnapshot = {
      ...contract,
      status: StaffContractStatus.ENDED,
      endOn: ended.value.toString(),
      version: contract.version + 1,
    };
    const contracts = [...this.state.contracts];
    contracts[index] = endedContract;
    const assignments = this.state.assignments.map((assignment) =>
      assignment.contractId === contract.id && assignment.endOn === null
        ? {
            ...assignment,
            endOn: ended.value.toString(),
            version: assignment.version + 1,
          }
        : assignment,
    );
    const stillAssigned = assignments.some(
      (assignment) =>
        assignment.staffId === contract.staffId && assignment.endOn === null,
    );
    const members = this.state.members.map((member) =>
      member.id === contract.staffId && !stillAssigned
        ? {
            ...member,
            availability: StaffAvailability.AVAILABLE,
            version: member.version + 1,
          }
        : member,
    );
    const event: StaffContractEndedEvent = {
      id: eventId,
      type: "StaffContractEnded",
      gameWorldId: this.state.gameWorldId,
      contractId: contract.id,
      staffId: contract.staffId,
      endedOn: ended.value.toString(),
      worldDate: ended.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      contracts,
      assignments,
      members,
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(endedContract);
  }

  public capability(
    staffId: string,
    on: WorldDate,
  ): StaffCapabilitySnapshot | null {
    const member = this.state.members.find(({ id }) => id === staffId);
    if (member === undefined) return null;
    const asOf = on.toString();
    const contract = this.state.contracts.find(
      (candidate) =>
        candidate.staffId === staffId &&
        candidate.status === StaffContractStatus.ACTIVE &&
        candidate.startOn <= asOf &&
        asOf <= candidate.endOn,
    );
    if (contract === undefined) return null;
    return {
      staffId: member.id,
      clubId: contract.clubId,
      role: member.role,
      score: primaryScore(member.role, member.capabilities),
      confidence: member.reputation,
      asOf,
      rulesetVersion: this.state.rulesetVersion,
    };
  }

  public findContract(contractId: string): StaffContractSnapshot | null {
    return this.state.contracts.find(({ id }) => id === contractId) ?? null;
  }

  /** Query cursor-based (read-only, as-of) para C4/C6/C8 sem escrita cruzada. */
  public listContracts(
    input: Readonly<{ clubId?: string; afterId?: string; limit: number }>,
  ): { items: readonly StaffContractSnapshot[]; nextCursor: string | null } {
    const limit = Math.max(1, Math.min(200, input.limit));
    const ordered = [...this.state.contracts]
      .filter((contract) =>
        input.clubId === undefined ? true : contract.clubId === input.clubId,
      )
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const start =
      input.afterId === undefined
        ? 0
        : ordered.findIndex(({ id }) => id === input.afterId) + 1;
    const page = ordered.slice(start, start + limit);
    const nextCursor =
      start + limit < ordered.length ? (page.at(-1)?.id ?? null) : null;
    return { items: page, nextCursor };
  }

  public findMember(staffId: string): StaffMemberSnapshot | null {
    return this.state.members.find(({ id }) => id === staffId) ?? null;
  }

  public summary(): StaffSummary {
    return {
      memberCount: this.state.members.length,
      activeContractCount: this.state.contracts.filter(
        ({ status }) => status === StaffContractStatus.ACTIVE,
      ).length,
      assignmentCount: this.state.assignments.filter(
        ({ endOn }) => endOn === null,
      ).length,
      eventCount: this.state.events.length,
    };
  }

  public snapshot(): WorldStaffSnapshot {
    return this.state;
  }

  private findEvent<T extends StaffDomainEvent["type"]>(
    type: T,
    idempotencyKey: string,
  ): Extract<StaffDomainEvent, { type: T }> | undefined {
    return this.state.events.find(
      (event): event is Extract<StaffDomainEvent, { type: T }> =>
        event.type === type && event.idempotencyKey === idempotencyKey,
    );
  }
}

function invalidStaff(message: string): DomainError {
  return new DomainError("INVALID_STAFF_STATE", message);
}

function rulesetMismatch(): DomainError {
  return new DomainError(
    "RULESET_VERSION_MISMATCH",
    "O command usa um ruleset diferente do staff.",
  );
}

function staffNotFound(staffId: string): DomainError {
  return new DomainError("STAFF_MEMBER_NOT_FOUND", "Membro não encontrado.", {
    staffId,
  });
}

function contractNotFound(contractId: string): DomainError {
  return new DomainError(
    "STAFF_CONTRACT_NOT_FOUND",
    "Contrato não encontrado.",
    { contractId },
  );
}

function isRole(value: string): value is StaffRoleType {
  return (Object.values(StaffRole) as string[]).includes(value);
}

function validScore(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= 100;
}

function capabilitiesValid(capabilities: StaffCapabilities): boolean {
  return Object.values(capabilities).every(validScore);
}

function primaryScore(
  role: StaffRoleType,
  capabilities: StaffCapabilities,
): number {
  switch (role) {
    case StaffRole.FITNESS_COACH:
      return capabilities.fitness;
    case StaffRole.PHYSIO:
      return capabilities.medical;
    case StaffRole.SCOUT:
      return capabilities.scouting;
    case StaffRole.DIRECTOR_OF_FOOTBALL:
      return capabilities.management;
    default:
      return capabilities.coaching;
  }
}

function timestampOf(worldDate: string): number {
  return Date.parse(`${worldDate}T00:00:00.000Z`);
}
