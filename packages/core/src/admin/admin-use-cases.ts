import {
  DomainError,
  fail,
  succeed,
  type GameWorldId,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import type { GameWorldSnapshot } from "../world/world-types.js";
import type { AdminRepository } from "./admin-repository.js";
import type {
  AbuseCaseSnapshot,
  AdminSummary,
  CorrectionRequestSnapshot,
  QuarantineSnapshot,
  ReprocessingRequestSnapshot,
  RiskAssessmentSnapshot,
  SanctionSnapshot,
  SupportCaseSnapshot,
  WorldAdminSnapshot,
} from "./admin-types.js";
import { WorldAdmin } from "./world-admin.js";

async function loadAdmin(
  repository: AdminRepository,
  gameWorldId: GameWorldId,
): Promise<Result<WorldAdmin, DomainError>> {
  const snapshot = await repository.findAdminByWorldId(gameWorldId);
  if (snapshot === null) {
    return fail(
      new DomainError(
        "ADMIN_NOT_FOUND",
        "O admin do mundo ainda não foi inicializado.",
        { gameWorldId },
      ),
    );
  }
  return WorldAdmin.fromSnapshot(snapshot);
}

async function mutate<T>(
  repository: AdminRepository,
  gameWorldId: GameWorldId,
  apply: (admin: WorldAdmin) => Result<T, DomainError>,
): Promise<Result<T, DomainError>> {
  const loaded = await loadAdmin(repository, gameWorldId);
  if (!loaded.ok) return loaded;
  const expectedRevision = loaded.value.snapshot().revision;
  const result = apply(loaded.value);
  if (!result.ok) return result;
  if (loaded.value.snapshot().revision !== expectedRevision) {
    await repository.saveAdmin(loaded.value.snapshot(), expectedRevision);
  }
  return result;
}

export class InitializeAdmin {
  public constructor(private readonly repository: AdminRepository) {}

  public async execute(
    world: GameWorldSnapshot,
  ): Promise<Result<WorldAdminSnapshot, DomainError>> {
    const existing = await this.repository.findAdminByWorldId(world.id);
    if (existing !== null) {
      const validated = WorldAdmin.fromSnapshot(existing);
      return validated.ok ? succeed(validated.value.snapshot()) : validated;
    }
    const created = WorldAdmin.initialize(world);
    if (!created.ok) return created;
    await this.repository.saveAdmin(created.value.snapshot(), null);
    return succeed(created.value.snapshot());
  }
}

export class RecordRiskSignal {
  public constructor(private readonly repository: AdminRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      dedupKey: string;
      subject: string;
      kind: string;
      weight: number;
      source: string;
      observedOn: string;
      actor: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<RiskAssessmentSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (admin) =>
      admin.recordRiskSignal(input),
    );
  }
}

export class ProposeSanction {
  public constructor(private readonly repository: AdminRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      subject: string;
      sanctionType: string;
      severity: number;
      basis: string;
      evidenceRefs: readonly string[];
      proposedBy: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<SanctionSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (admin) =>
      admin.proposeSanction(input),
    );
  }
}

export class ApproveSanction {
  public constructor(private readonly repository: AdminRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      sanctionId: string;
      approvedBy: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<SanctionSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (admin) =>
      admin.approveSanction(input),
    );
  }
}

export class FileAppeal {
  public constructor(private readonly repository: AdminRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      sanctionId: string;
      grounds: string;
      appellant: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<SanctionSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (admin) =>
      admin.fileAppeal(input),
    );
  }
}

export class DecideAppeal {
  public constructor(private readonly repository: AdminRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      sanctionId: string;
      upheld: boolean;
      reviewer: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<SanctionSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (admin) =>
      admin.decideAppeal(input),
    );
  }
}

export class OpenCase {
  public constructor(private readonly repository: AdminRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      subjects: readonly string[];
      severity: number;
      evidenceRefs: readonly string[];
      openedBy: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<AbuseCaseSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (admin) =>
      admin.openCase(input),
    );
  }
}

export class PlaceQuarantine {
  public constructor(private readonly repository: AdminRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      caseId?: string;
      scope: string;
      reason: string;
      startsOn: string;
      expiresOn: string;
      placedBy: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<QuarantineSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (admin) =>
      admin.placeQuarantine(input),
    );
  }
}

export class RequestCorrection {
  public constructor(private readonly repository: AdminRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      targetOwner: string;
      targetId: string;
      targetVersion: number;
      reasonCode: string;
      expectedEffect: string;
      requestedBy: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<CorrectionRequestSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (admin) =>
      admin.requestCorrection(input),
    );
  }
}

export class ApproveCorrection {
  public constructor(private readonly repository: AdminRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      correctionId: string;
      approvedBy: string;
      reject?: boolean;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<CorrectionRequestSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (admin) =>
      admin.approveCorrection(input),
    );
  }
}

export class RequestReprocessing {
  public constructor(private readonly repository: AdminRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      stream: string;
      fromSequence: number;
      toSequence: number;
      reason: string;
      requestedBy: string;
      expectedAuditHead: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<ReprocessingRequestSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (admin) =>
      admin.requestReprocessing(input),
    );
  }
}

export class OpenSupportCase {
  public constructor(private readonly repository: AdminRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      requester: string;
      category: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<SupportCaseSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (admin) =>
      admin.openSupportCase(input),
    );
  }
}

export class ResolveSupportCase {
  public constructor(private readonly repository: AdminRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      supportCaseId: string;
      resolution: string;
      resolvedBy: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<SupportCaseSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (admin) =>
      admin.resolveSupportCase(input),
    );
  }
}

export class InspectAdmin {
  public constructor(private readonly repository: AdminRepository) {}

  public async summary(
    gameWorldId: GameWorldId,
  ): Promise<Result<AdminSummary, DomainError>> {
    const loaded = await loadAdmin(this.repository, gameWorldId);
    return loaded.ok ? succeed(loaded.value.summary()) : loaded;
  }
}
