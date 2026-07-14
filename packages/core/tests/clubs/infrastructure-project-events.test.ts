import { newEntityId } from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  AbortInfrastructureProject,
  InitializeClubPortfolio,
  StartInfrastructureProject,
  WorldGenesisGenerator,
  buildClubPortfolioFromGenesis,
  processClubMaintenanceDay,
  type ClubPortfolioRepository,
  type InfrastructureFinancingPort,
  type WorldClubPortfolioSnapshot,
} from "../../src/index.js";
import {
  activeWorldSnapshot,
  schedulingWorldId,
} from "../helpers/scheduling-fixtures.js";

class MemoryRepository implements ClubPortfolioRepository {
  public snapshot: WorldClubPortfolioSnapshot | null = null;
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
    return Promise.resolve();
  }
}

describe("infrastructure project domain events", () => {
  it("emite ProjectCancelled ao abortar a obra (SAGA-04 compensada)", async () => {
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
      commandId: "abort-command",
      idempotencyKey: "project:abort:1",
      actorId: "board:1",
      proposedAt: "2026-01-01",
      target: {
        kind: "STADIUM_CAPACITY",
        reference: club.stadium.id,
        targetValue: 15_000,
      },
      fundingRequestRef: "funding:abort",
      milestones: [
        { id: "M1", name: "Entrega", dueOn: "2026-01-02", amountMinor: 10_000 },
      ],
      maxAttemptsPerStep: 3,
    });
    if (!started.ok) throw started.error;

    const financing: InfrastructureFinancingPort = {
      reserve: () => Promise.resolve({ reservationRef: "r:1" }),
      disburseMilestone: () => Promise.resolve({ disbursementRef: "d:1" }),
      releaseRemainder: () => Promise.resolve({ releaseFactRef: "rel:1" }),
    };
    const aborted = await new AbortInfrastructureProject(
      repository,
      financing,
      "worker-a",
      () => 1_000,
    ).execute(world.id, started.value.id, "board-cancelled");
    if (!aborted.ok) throw aborted.error;

    const types = repository.snapshot!.events.map((e) => e.type);
    expect(types).toContain("InfrastructureProjectProposed");
    expect(types).toContain("ProjectCancelled");
  });

  it("emite MaintenanceDue quando uma facilidade cruza o limiar", () => {
    const world = activeWorldSnapshot(schedulingWorldId());
    const genesis = new WorldGenesisGenerator().generate(world);
    const portfolio = buildClubPortfolioFromGenesis(world, genesis);
    // aproxima o estádio do limiar para a próxima deterioração acioná-lo
    const near: WorldClubPortfolioSnapshot = {
      ...portfolio,
      clubs: portfolio.clubs.map((club, index) =>
        index === 0
          ? {
              ...club,
              stadium: { ...club.stadium, condition: 71 },
            }
          : club,
      ),
    };
    // dia 30 após o início dispara a deterioração (elapsed % 30 === 0)
    const processed = processClubMaintenanceDay(near, "2026-01-31");
    if (!processed.ok) throw processed.error;
    expect(processed.value.clubs[0]!.stadium.condition).toBe(70);
    expect(
      processed.value.events.some((e) => e.type === "MaintenanceDue"),
    ).toBe(true);
  });
});
