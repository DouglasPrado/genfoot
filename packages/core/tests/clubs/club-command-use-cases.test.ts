import { newEntityId, parseRulesetVersion } from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  ExecuteClubCommand,
  InitializeClubPortfolio,
  WorldGenesisGenerator,
  type ClubCommandReceipt,
  type ClubPortfolioRepository,
  type WorldClubPortfolioSnapshot,
} from "../../src/index.js";
import {
  activeWorldSnapshot,
  schedulingWorldId,
} from "../helpers/scheduling-fixtures.js";

const ruleset = parseRulesetVersion("1.0.0");
if (!ruleset.ok) throw ruleset.error;

describe("club command use cases", () => {
  it("returns the same receipt for a retry and rejects stale versions", async () => {
    const repository = new MemoryClubRepository();
    const world = activeWorldSnapshot(schedulingWorldId());
    const genesis = new WorldGenesisGenerator().generate(world);
    const initialized = await new InitializeClubPortfolio(repository).execute(
      world,
      genesis,
    );
    if (!initialized.ok) throw initialized.error;
    const club = initialized.value.clubs[0]!;
    const command = {
      type: "UpdateClubIdentity" as const,
      commandId: "command-1",
      idempotencyKey: "club:update:1",
      gameWorldId: world.id,
      clubId: club.id,
      expectedVersion: 1,
      occurredAt: "2026-01-02",
      rulesetVersion: ruleset.value,
      actorId: "actor:1",
      name: "Clube Idempotente",
      shortCode: "IDE",
    };
    const executor = new ExecuteClubCommand(repository);
    const first = await executor.execute(command);
    const retry = await executor.execute(command);

    expect(first).toEqual(retry);
    expect(first.ok).toBe(true);
    const stale = await executor.execute({
      ...command,
      commandId: "command-2",
      idempotencyKey: "club:update:2",
      name: "Stale",
    });
    expect(stale.ok).toBe(false);
  });

  it("isolates portfolios and rejects a mismatched ruleset", async () => {
    const repository = new MemoryClubRepository();
    const firstWorld = activeWorldSnapshot(schedulingWorldId());
    const secondWorld = activeWorldSnapshot(newEntityId<"GameWorld">());
    for (const world of [firstWorld, secondWorld]) {
      const result = await new InitializeClubPortfolio(repository).execute(
        world,
        new WorldGenesisGenerator().generate(world),
      );
      if (!result.ok) throw result.error;
    }
    expect(repository.snapshots).toHaveLength(2);
    const first = repository.snapshots[0]!;
    const mismatch = parseRulesetVersion("2.0.0");
    if (!mismatch.ok) throw mismatch.error;
    const result = await new ExecuteClubCommand(repository).execute({
      type: "RecordBoardDecision",
      commandId: "command-ruleset",
      idempotencyKey: "club:board:ruleset",
      gameWorldId: first.gameWorldId,
      clubId: first.clubs[0]!.id,
      expectedVersion: 1,
      occurredAt: "2026-01-02",
      rulesetVersion: mismatch.value,
      actorId: "board:1",
      decisionType: "OBJECTIVE",
      justification: "Teste de isolamento",
      effectiveFrom: "2026-01-02",
      effectiveThrough: null,
    });
    expect(result.ok).toBe(false);
    expect(repository.snapshots[1]!.revision).toBe(1);
  });
});

class MemoryClubRepository implements ClubPortfolioRepository {
  public snapshots: WorldClubPortfolioSnapshot[] = [];

  public async findClubPortfolioByWorldId(id: string) {
    return this.snapshots.find(({ gameWorldId }) => gameWorldId === id) ?? null;
  }

  public async findClubCommandReceipt(id: string, key: string) {
    return (
      this.snapshots
        .find(({ gameWorldId }) => gameWorldId === id)
        ?.commandReceipts.find(
          ({ idempotencyKey }) => idempotencyKey === key,
        ) ?? null
    );
  }

  public async saveClubPortfolio(
    snapshot: WorldClubPortfolioSnapshot,
    expectedRevision: number | null,
  ) {
    const index = this.snapshots.findIndex(
      ({ gameWorldId }) => gameWorldId === snapshot.gameWorldId,
    );
    if (expectedRevision === null) this.snapshots.push(snapshot);
    else if (this.snapshots[index]?.revision !== expectedRevision)
      throw new Error("revision conflict");
    else this.snapshots[index] = snapshot;
  }
}

void (null as ClubCommandReceipt | null);
