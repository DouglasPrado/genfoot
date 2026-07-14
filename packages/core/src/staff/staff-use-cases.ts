import {
  DomainError,
  fail,
  succeed,
  type GameWorldId,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import type { GameWorldSnapshot } from "../world/world-types.js";
import type { StaffRepository } from "./staff-repository.js";
import type {
  StaffAssignmentSnapshot,
  StaffCapabilities,
  StaffClubRef,
  StaffContractSnapshot,
  StaffDepartmentRef,
  StaffMemberSnapshot,
  StaffRole,
  StaffSummary,
  WorldStaffSnapshot,
} from "./staff-types.js";
import { WorldStaff } from "./world-staff.js";

async function loadStaff(
  repository: StaffRepository,
  gameWorldId: GameWorldId,
): Promise<Result<WorldStaff, DomainError>> {
  const snapshot = await repository.findStaffByWorldId(gameWorldId);
  if (snapshot === null) {
    return fail(
      new DomainError(
        "STAFF_NOT_FOUND",
        "O staff do mundo ainda não foi inicializado.",
        { gameWorldId },
      ),
    );
  }
  return WorldStaff.fromSnapshot(snapshot);
}

async function mutate<T>(
  repository: StaffRepository,
  gameWorldId: GameWorldId,
  apply: (staff: WorldStaff) => Result<T, DomainError>,
): Promise<Result<T, DomainError>> {
  const loaded = await loadStaff(repository, gameWorldId);
  if (!loaded.ok) return loaded;
  const expectedRevision = loaded.value.snapshot().revision;
  const result = apply(loaded.value);
  if (!result.ok) return result;
  if (loaded.value.snapshot().revision !== expectedRevision) {
    await repository.saveStaff(loaded.value.snapshot(), expectedRevision);
  }
  return result;
}

export class InitializeStaff {
  public constructor(private readonly repository: StaffRepository) {}

  public async execute(
    world: GameWorldSnapshot,
  ): Promise<Result<WorldStaffSnapshot, DomainError>> {
    const existing = await this.repository.findStaffByWorldId(world.id);
    if (existing !== null) {
      const validated = WorldStaff.fromSnapshot(existing);
      return validated.ok ? succeed(validated.value.snapshot()) : validated;
    }
    const created = WorldStaff.initialize(world);
    if (!created.ok) return created;
    await this.repository.saveStaff(created.value.snapshot(), null);
    return succeed(created.value.snapshot());
  }
}

export class CreateStaffMember {
  public constructor(private readonly repository: StaffRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      firstName: string;
      lastName: string;
      role: StaffRole;
      capabilities: StaffCapabilities;
      reputation: number;
      worldDate: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
  ): Promise<Result<StaffMemberSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (staff) =>
      staff.createStaffMember(input),
    );
  }
}

export class OfferStaffContract {
  public constructor(private readonly repository: StaffRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      staffId: string;
      clubId: StaffClubRef;
      role: StaffRole;
      startOn: string;
      endOn: string;
      compensationRef: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<StaffContractSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (staff) =>
      staff.offerStaffContract(input),
    );
  }
}

export class AcceptStaffContract {
  public constructor(private readonly repository: StaffRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      contractId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<StaffContractSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (staff) =>
      staff.acceptStaffContract(input),
    );
  }
}

export class AssignStaff {
  public constructor(private readonly repository: StaffRepository) {}

  public execute(
    gameWorldId: GameWorldId,
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
  ): Promise<Result<StaffAssignmentSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (staff) =>
      staff.assignStaff(input),
    );
  }
}

export class EndStaffContract {
  public constructor(private readonly repository: StaffRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      contractId: string;
      endedOn: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<StaffContractSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (staff) =>
      staff.endStaffContract(input),
    );
  }
}

export class InspectStaff {
  public constructor(private readonly repository: StaffRepository) {}

  public async summary(
    gameWorldId: GameWorldId,
  ): Promise<Result<StaffSummary, DomainError>> {
    const loaded = await loadStaff(this.repository, gameWorldId);
    return loaded.ok ? succeed(loaded.value.summary()) : loaded;
  }

  public async listContracts(
    gameWorldId: GameWorldId,
    input: Readonly<{ clubId?: string; afterId?: string; limit: number }>,
  ): Promise<
    Result<
      {
        items: readonly StaffContractSnapshot[];
        nextCursor: string | null;
      },
      DomainError
    >
  > {
    const loaded = await loadStaff(this.repository, gameWorldId);
    return loaded.ok ? succeed(loaded.value.listContracts(input)) : loaded;
  }
}
