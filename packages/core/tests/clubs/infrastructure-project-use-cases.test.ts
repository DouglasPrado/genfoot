import { newEntityId } from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  InitializeClubPortfolio,
  ResumeInfrastructureProject,
  StartInfrastructureProject,
  WorldGenesisGenerator,
  type ClubPortfolioRepository,
  type InfrastructureFinancingPort,
  type InfrastructureLicensingPort,
  type WorldClubPortfolioSnapshot,
} from "../../src/index.js";
import {
  activeWorldSnapshot,
  schedulingWorldId,
} from "../helpers/scheduling-fixtures.js";

describe("infrastructure project use cases", () => {
  it("persists checkpoints and uses idempotent external facts", async () => {
    const repository = new MemoryRepository();
    const world = activeWorldSnapshot(schedulingWorldId());
    const genesis = new WorldGenesisGenerator().generate(world);
    const initialized = await new InitializeClubPortfolio(repository).execute(
      world,
      genesis,
    );
    if (!initialized.ok) throw initialized.error;
    const club = initialized.value.clubs[0]!;
    const started = await new StartInfrastructureProject(repository).execute({
      id: newEntityId<"InfrastructureProject">(),
      gameWorldId: world.id,
      clubId: club.id,
      expectedClubVersion: 1,
      rulesetVersion: world.rulesetVersion,
      commandId: "project-command-e2e",
      idempotencyKey: "project:create:e2e",
      actorId: "board:1",
      proposedAt: "2026-01-01",
      target: {
        kind: "STADIUM_CAPACITY",
        reference: club.stadium.id,
        targetValue: 15_000,
      },
      fundingRequestRef: "funding:e2e",
      milestones: [
        { id: "M1", name: "Entrega", dueOn: "2026-01-02", amountMinor: 10_000 },
      ],
      maxAttemptsPerStep: 3,
    });
    if (!started.ok) throw started.error;
    const calls: string[] = [];
    const financing: InfrastructureFinancingPort = {
      reserve: (context) =>
        fact(calls, context.idempotencyKey, "reservationRef"),
      disburseMilestone: (context) =>
        fact(calls, context.idempotencyKey, "disbursementRef"),
      releaseRemainder: (context) =>
        fact(calls, context.idempotencyKey, "releaseFactRef"),
    };
    const licensing: InfrastructureLicensingPort = {
      inspect: (context) => {
        calls.push(context.idempotencyKey);
        return Promise.resolve({ approved: true, inspectionRef: "license:1" });
      },
    };
    const resumed = await new ResumeInfrastructureProject(
      repository,
      financing,
      licensing,
      "worker-a",
      () => 1_000,
    ).execute(world.id, started.value.id, "2026-01-02");

    expect(resumed).toMatchObject({ ok: true, value: { status: "COMPLETED" } });
    expect(new Set(calls).size).toBe(calls.length);
    expect(repository.snapshot?.clubs[0]?.stadium.capacity).toBe(15_000);
    expect(repository.saves).toBeGreaterThanOrEqual(6);

    // SAGA-04 emite os fatos de infraestrutura do contrato C3
    const types = new Set(repository.snapshot!.events.map((e) => e.type));
    for (const expected of [
      "InfrastructureProjectProposed",
      "StadiumWorksApproved",
      "FinancialReservationAcknowledged",
      "ConstructionMilestoneReached",
      "FacilityLicensed",
      "StadiumWorksCompleted",
    ]) {
      expect(types.has(expected)).toBe(true);
    }
  });
});

function fact(
  calls: string[],
  key: string,
  field: string,
): Promise<Record<string, string>> {
  calls.push(key);
  return Promise.resolve({ [field]: `${field}:1` });
}

class MemoryRepository implements ClubPortfolioRepository {
  public snapshot: WorldClubPortfolioSnapshot | null = null;
  public saves = 0;
  public findClubPortfolioByWorldId() {
    return Promise.resolve(structuredClone(this.snapshot));
  }
  public findClubCommandReceipt() {
    return Promise.resolve(null);
  }
  public saveClubPortfolio(
    snapshot: WorldClubPortfolioSnapshot,
    expectedRevision: number | null,
  ) {
    if (
      expectedRevision !== null &&
      this.snapshot?.revision !== expectedRevision
    )
      throw new Error("revision conflict");
    this.snapshot = structuredClone(snapshot);
    this.saves += 1;
    return Promise.resolve();
  }
}
