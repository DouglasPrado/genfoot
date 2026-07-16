import {
  DomainError,
  fail,
  succeed,
  type GameWorldId,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import type { GameWorldSnapshot } from "../world/world-types.js";
import type { IdentityRepository } from "./identity-repository.js";
import type {
  LegacyClubControlSnapshot,
  LegacyClubReservationSnapshot,
  IdentityAccountRef,
  IdentityClubRef,
  IdentitySummary,
  WorldIdentitySnapshot,
  LegacyWorldParticipationSnapshot,
} from "./identity-types.js";
import { WorldIdentity } from "./world-identity.js";

async function loadIdentity(
  repository: IdentityRepository,
  gameWorldId: GameWorldId,
): Promise<Result<WorldIdentity, DomainError>> {
  const snapshot = await repository.findIdentityByWorldId(gameWorldId);
  if (snapshot === null) {
    return fail(
      new DomainError(
        "IDENTITY_NOT_FOUND",
        "A identidade do mundo ainda não foi inicializada.",
        { gameWorldId },
      ),
    );
  }
  return WorldIdentity.fromSnapshot(snapshot);
}

async function mutate<T>(
  repository: IdentityRepository,
  gameWorldId: GameWorldId,
  apply: (identity: WorldIdentity) => Result<T, DomainError>,
): Promise<Result<T, DomainError>> {
  const loaded = await loadIdentity(repository, gameWorldId);
  if (!loaded.ok) return loaded;
  const expectedRevision = loaded.value.snapshot().revision;
  const result = apply(loaded.value);
  if (!result.ok) return result;
  if (loaded.value.snapshot().revision !== expectedRevision) {
    await repository.saveIdentity(loaded.value.snapshot(), expectedRevision);
  }
  return result;
}

export class InitializeIdentity {
  public constructor(private readonly repository: IdentityRepository) {}

  public async execute(
    world: GameWorldSnapshot,
    cooldownDays?: number,
  ): Promise<Result<WorldIdentitySnapshot, DomainError>> {
    const existing = await this.repository.findIdentityByWorldId(world.id);
    if (existing !== null) {
      const validated = WorldIdentity.fromSnapshot(existing);
      return validated.ok ? succeed(validated.value.snapshot()) : validated;
    }
    const created =
      cooldownDays === undefined
        ? WorldIdentity.initialize(world)
        : WorldIdentity.initialize(world, cooldownDays);
    if (!created.ok) return created;
    await this.repository.saveIdentity(created.value.snapshot(), null);
    return succeed(created.value.snapshot());
  }
}

export class JoinWorld {
  public constructor(private readonly repository: IdentityRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      accountId: IdentityAccountRef;
      gameWorldId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<LegacyWorldParticipationSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (identity) =>
      identity.joinWorld(input),
    );
  }
}

export class ReserveClub {
  public constructor(private readonly repository: IdentityRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      clubId: IdentityClubRef;
      accountId: IdentityAccountRef;
      expiresOn: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<LegacyClubReservationSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (identity) =>
      identity.reserveClub(input),
    );
  }
}

export class ConfirmOnboarding {
  public constructor(private readonly repository: IdentityRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      reservationId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<LegacyClubControlSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (identity) =>
      identity.confirmOnboarding(input),
    );
  }
}

export class ReleaseClubReservation {
  public constructor(private readonly repository: IdentityRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      reservationId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<LegacyClubReservationSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (identity) =>
      identity.releaseReservation(input),
    );
  }
}

export class EndClubControl {
  public constructor(private readonly repository: IdentityRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      controlId: string;
      reason: string;
      endedOn: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<LegacyClubControlSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (identity) =>
      identity.endClubControl(input),
    );
  }
}

export class RequestClubSwitch {
  public constructor(private readonly repository: IdentityRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      accountId: IdentityAccountRef;
      targetClubId: IdentityClubRef;
      expiresOn: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<LegacyClubReservationSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (identity) =>
      identity.requestClubSwitch(input),
    );
  }
}

export class InspectIdentity {
  public constructor(private readonly repository: IdentityRepository) {}

  public async world(
    gameWorldId: GameWorldId,
  ): Promise<Result<WorldIdentitySnapshot, DomainError>> {
    const loaded = await loadIdentity(this.repository, gameWorldId);
    return loaded.ok ? succeed(loaded.value.snapshot()) : loaded;
  }

  public async summary(
    gameWorldId: GameWorldId,
  ): Promise<Result<IdentitySummary, DomainError>> {
    const loaded = await loadIdentity(this.repository, gameWorldId);
    return loaded.ok ? succeed(loaded.value.summary()) : loaded;
  }
}
