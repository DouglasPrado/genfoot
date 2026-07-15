import { parseRulesetVersion } from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  ExecuteClubCommand,
  InitializeClubPortfolio,
  WorldGenesisGenerator,
  validateVisualIdentity,
  type ClubCommand,
  type ClubPortfolioRepository,
  type VisualIdentitySnapshot,
  type WorldClubPortfolioSnapshot,
} from "../../src/index.js";
import {
  activeWorldSnapshot,
  schedulingWorldId,
} from "../helpers/scheduling-fixtures.js";

const ruleset = parseRulesetVersion("1.0.0");
if (!ruleset.ok) throw ruleset.error;
const rulesetValue = ruleset.value;

const twoColorVisual: VisualIdentitySnapshot = {
  primaryColor: "#C2F74A",
  secondaryColor: "#0A0B0D",
  tertiaryColor: null,
  homeKitTemplateId: "kit-stripes",
  awayKitTemplateId: "kit-solid",
  crestTemplateId: "crest-shield",
};

async function setup(): Promise<{
  repository: MemoryClubRepository;
  portfolio: WorldClubPortfolioSnapshot;
}> {
  const repository = new MemoryClubRepository();
  const world = activeWorldSnapshot(schedulingWorldId());
  const genesis = new WorldGenesisGenerator().generate(world);
  const initialized = await new InitializeClubPortfolio(repository).execute(
    world,
    genesis,
  );
  if (!initialized.ok) throw initialized.error;
  return { repository, portfolio: initialized.value };
}

function rebrandCommand(
  portfolio: WorldClubPortfolioSnapshot,
  overrides: Partial<Extract<ClubCommand, { type: "UpdateClubVisualIdentity" }>>,
): Extract<ClubCommand, { type: "UpdateClubVisualIdentity" }> {
  const club = portfolio.clubs[0]!;
  return {
    type: "UpdateClubVisualIdentity",
    commandId: "cmd-rebrand-1",
    idempotencyKey: "club:rebrand:1",
    gameWorldId: portfolio.gameWorldId,
    clubId: club.id,
    expectedVersion: club.version,
    occurredAt: "2026-03-01",
    rulesetVersion: rulesetValue,
    actorId: "actor:1",
    name: "Grinta Atlético",
    shortCode: "GRA",
    visualIdentity: twoColorVisual,
    ...overrides,
  };
}

describe("club visual identity (personalização)", () => {
  it("applies a rebrand: new identity period, visual identity and ClubRebranded fact", async () => {
    const { repository, portfolio } = await setup();
    const result = await new ExecuteClubCommand(repository).execute(
      rebrandCommand(portfolio, {}),
    );

    expect(result.ok).toBe(true);
    const saved = repository.snapshots[0]!;
    const club = saved.clubs[0]!;
    expect(club.identity.name).toBe("Grinta Atlético");
    expect(club.identity.visualIdentity).toEqual(twoColorVisual);
    expect(club.identityHistory).toHaveLength(2);
    expect(club.version).toBe(2);

    const rebranded = saved.events.find((event) => event.type === "ClubRebranded");
    expect(rebranded).toBeDefined();
    expect(rebranded!.payload.previousName).toBeDefined();
    expect(rebranded!.payload.newName).toBe("Grinta Atlético");
    expect(rebranded!.payload.visualIdentity).toEqual(twoColorVisual);
    expect(rebranded!.payload.changedFields).toContain("primaryColor");
  });

  it("rejects a name already used by another club in the same world", async () => {
    const { repository, portfolio } = await setup();
    const otherName = portfolio.clubs[1]!.identity.name;
    const result = await new ExecuteClubCommand(repository).execute(
      rebrandCommand(portfolio, { name: otherName }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CLUB_NAME_ALREADY_TAKEN");
    // Nada foi persistido além da inicialização (revision permanece 1).
    expect(repository.snapshots[0]!.revision).toBe(1);
  });

  it("detects name collisions case-insensitively", async () => {
    const { repository, portfolio } = await setup();
    const otherName = portfolio.clubs[1]!.identity.name.toUpperCase();
    const result = await new ExecuteClubCommand(repository).execute(
      rebrandCommand(portfolio, { name: `  ${otherName}  ` }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CLUB_NAME_ALREADY_TAKEN");
  });

  it("rejects an invalid palette (missing tertiary for a 3-color model)", async () => {
    const { repository, portfolio } = await setup();
    const result = await new ExecuteClubCommand(repository).execute(
      rebrandCommand(portfolio, {
        visualIdentity: { ...twoColorVisual, homeKitTemplateId: "kit-tricolor" },
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_VISUAL_IDENTITY");
  });

  it("rejects unknown template ids and malformed colors", async () => {
    const { repository, portfolio } = await setup();
    const badTemplate = await new ExecuteClubCommand(repository).execute(
      rebrandCommand(portfolio, {
        visualIdentity: { ...twoColorVisual, crestTemplateId: "crest-unknown" },
      }),
    );
    expect(badTemplate.ok).toBe(false);

    const badColor = await new ExecuteClubCommand(repository).execute(
      rebrandCommand(portfolio, {
        idempotencyKey: "club:rebrand:color",
        visualIdentity: { ...twoColorVisual, primaryColor: "verde" },
      }),
    );
    expect(badColor.ok).toBe(false);
    if (!badColor.ok) expect(badColor.error.code).toBe("INVALID_VISUAL_IDENTITY");
  });

  it("is idempotent: repeating the same rebrand yields one effect", async () => {
    const { repository, portfolio } = await setup();
    const command = rebrandCommand(portfolio, {});
    const executor = new ExecuteClubCommand(repository);
    const first = await executor.execute(command);
    const retry = await executor.execute(command);

    expect(first).toEqual(retry);
    expect(first.ok).toBe(true);
    expect(repository.snapshots[0]!.clubs[0]!.version).toBe(2);
    expect(
      repository.snapshots[0]!.events.filter(
        (event) => event.type === "ClubRebranded",
      ),
    ).toHaveLength(1);
  });
});

describe("validateVisualIdentity", () => {
  it("accepts a valid 2-color identity and null tertiary", () => {
    expect(validateVisualIdentity(twoColorVisual)).toBeNull();
  });

  it("requires tertiary color when a chosen model uses 3 colors", () => {
    expect(
      validateVisualIdentity({
        ...twoColorVisual,
        crestTemplateId: "crest-banner",
      }),
    ).not.toBeNull();
    expect(
      validateVisualIdentity({
        ...twoColorVisual,
        crestTemplateId: "crest-banner",
        tertiaryColor: "#FF0000",
      }),
    ).toBeNull();
  });
});

class MemoryClubRepository implements ClubPortfolioRepository {
  public snapshots: WorldClubPortfolioSnapshot[] = [];

  public findClubPortfolioByWorldId(id: string) {
    return Promise.resolve(
      this.snapshots.find(({ gameWorldId }) => gameWorldId === id) ?? null,
    );
  }

  public findClubCommandReceipt(id: string, key: string) {
    return Promise.resolve(
      this.snapshots
        .find(({ gameWorldId }) => gameWorldId === id)
        ?.commandReceipts.find(({ idempotencyKey }) => idempotencyKey === key) ??
        null,
    );
  }

  public saveClubPortfolio(
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
    return Promise.resolve();
  }
}
