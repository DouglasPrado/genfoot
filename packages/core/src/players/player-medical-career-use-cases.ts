import {
  DomainError,
  fail,
  succeed,
  type GameWorldId,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import type { PlayerLifecycleRepository } from "./player-lifecycle-repository.js";
import type {
  MedicalCaseSeverity,
  MedicalCaseSnapshot,
  PlayerLifecycleSnapshot,
} from "./player-lifecycle-types.js";
import { WorldPlayerLifecycle } from "./world-player-lifecycle.js";

async function loadLifecycle(
  repository: PlayerLifecycleRepository,
  gameWorldId: GameWorldId,
): Promise<Result<WorldPlayerLifecycle, DomainError>> {
  const snapshot = await repository.findPlayerLifecycleByWorldId(gameWorldId);
  if (snapshot === null) {
    return fail(
      new DomainError(
        "PLAYER_LIFECYCLE_NOT_FOUND",
        "O lifecycle de jogadores ainda não foi inicializado.",
        { gameWorldId },
      ),
    );
  }
  return WorldPlayerLifecycle.fromSnapshot(snapshot);
}

export class OpenMedicalCase {
  public constructor(private readonly repository: PlayerLifecycleRepository) {}

  public async execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      playerId: string;
      diagnosis: string;
      severity: MedicalCaseSeverity;
      expectedReturnOn: string;
      worldDate: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
  ): Promise<Result<MedicalCaseSnapshot, DomainError>> {
    const loaded = await loadLifecycle(this.repository, gameWorldId);
    if (!loaded.ok) return loaded;
    const expectedRevision = loaded.value.snapshot().revision;
    const result = loaded.value.openMedicalCase(input);
    if (!result.ok) return result;
    if (loaded.value.snapshot().revision !== expectedRevision) {
      await this.repository.savePlayerLifecycle(
        loaded.value.snapshot(),
        expectedRevision,
      );
    }
    return result;
  }
}

export class ReassessMedicalCase {
  public constructor(private readonly repository: PlayerLifecycleRepository) {}

  public async execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      medicalCaseId: string;
      outcome: "CLEAR" | "EXTEND";
      worldDate: string;
      newExpectedReturnOn?: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
  ): Promise<Result<MedicalCaseSnapshot, DomainError>> {
    const loaded = await loadLifecycle(this.repository, gameWorldId);
    if (!loaded.ok) return loaded;
    const expectedRevision = loaded.value.snapshot().revision;
    const result = loaded.value.reassessMedicalCase(input);
    if (!result.ok) return result;
    if (loaded.value.snapshot().revision !== expectedRevision) {
      await this.repository.savePlayerLifecycle(
        loaded.value.snapshot(),
        expectedRevision,
      );
    }
    return result;
  }
}

export class RetirePlayer {
  public constructor(private readonly repository: PlayerLifecycleRepository) {}

  public async execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      playerId: string;
      reason: string;
      worldDate: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
  ): Promise<Result<PlayerLifecycleSnapshot, DomainError>> {
    const loaded = await loadLifecycle(this.repository, gameWorldId);
    if (!loaded.ok) return loaded;
    const expectedRevision = loaded.value.snapshot().revision;
    const result = loaded.value.retirePlayer(input);
    if (!result.ok) return result;
    if (loaded.value.snapshot().revision !== expectedRevision) {
      await this.repository.savePlayerLifecycle(
        loaded.value.snapshot(),
        expectedRevision,
      );
    }
    return result;
  }
}
