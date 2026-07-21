import { describe, expect, it } from "vitest";

import type {
  IndividualTrainingPlanRepository,
  IndividualTrainingPlanSnapshot,
} from "./individual-training-plan-types.js";
import { SetIndividualTrainingPlan } from "./set-individual-training-plan.js";
import type { TrainingContextReader } from "./training-types.js";

const WORLD = "019b76da-a800-7451-8ea2-7b2378e42050";
const CLUB = "019b76da-a800-7451-8ea2-7b2378e420ff";
const PLAYER = "019b76da-a800-7451-8ea2-7b2378e42051";

class MemRepo implements IndividualTrainingPlanRepository {
  public plan: IndividualTrainingPlanSnapshot | null = null;
  public savedExpected: number | null | undefined;
  public findByPlayer(): Promise<IndividualTrainingPlanSnapshot | null> {
    return Promise.resolve(this.plan);
  }
  public save(
    plan: IndividualTrainingPlanSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    this.plan = plan;
    this.savedExpected = expectedVersion;
    return Promise.resolve();
  }
  public findAllActive(): Promise<readonly IndividualTrainingPlanSnapshot[]> {
    return Promise.resolve(this.plan === null ? [] : [this.plan]);
  }
  public dailyBudget(): Promise<number | null> {
    return Promise.resolve(6);
  }
}

class MemContext implements TrainingContextReader {
  public constructor(
    private readonly squad: readonly string[],
    private readonly restricted: readonly string[] = [],
  ) {}
  public squadPlayerIds(): Promise<readonly string[]> {
    return Promise.resolve(this.squad);
  }
  public medicallyRestrictedPlayerIds(): Promise<readonly string[]> {
    return Promise.resolve(this.restricted);
  }
  public trainingCapacity(): Promise<number> {
    return Promise.resolve(2);
  }
}

function run(
  repo: IndividualTrainingPlanRepository,
  context: TrainingContextReader,
  overrides: Partial<Parameters<SetIndividualTrainingPlan["execute"]>[0]> = {},
) {
  return new SetIndividualTrainingPlan(repo, context).execute({
    gameWorldId: WORLD,
    clubId: CLUB,
    playerId: PLAYER,
    worldSeed: "seed",
    occurredOn: "2026-03-02",
    target: { kind: "ATTRIBUTE", attributeCodes: ["finishing"] },
    intensity: 70,
    expectedVersion: null,
    ...overrides,
  });
}

describe("SetIndividualTrainingPlan (M-TRAINING-INDIV)", () => {
  it("cria o plano com alvo de ATRIBUTO (concorrência: expectedVersion null → cria)", async () => {
    const repo = new MemRepo();
    const r = await run(repo, new MemContext([PLAYER]));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.plan.target).toEqual({ kind: "ATTRIBUTE", attributeCodes: ["finishing"] });
    expect(r.value.plan.version).toBe(1);
    expect(repo.savedExpected).toBe(null);
  });

  it("cria o plano com alvo de POSIÇÃO conhecida", async () => {
    const repo = new MemRepo();
    const r = await run(repo, new MemContext([PLAYER]), {
      target: { kind: "POSITION", position: "ST" },
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.plan.target).toEqual({ kind: "POSITION", position: "ST" });
  });

  it("atributo fora do catálogo → ATTRIBUTE_NOT_APPLICABLE", async () => {
    const r = await run(new MemRepo(), new MemContext([PLAYER]), {
      target: { kind: "ATTRIBUTE", attributeCodes: ["teleporte"] },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("ATTRIBUTE_NOT_APPLICABLE");
  });

  it("posição desconhecida → TRAINING_PLAN_INVALID", async () => {
    const r = await run(new MemRepo(), new MemContext([PLAYER]), {
      target: { kind: "POSITION", position: "GOLEIRO_LINHA" },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("TRAINING_PLAN_INVALID");
  });

  it("intensidade fora de 0..100 → TRAINING_PLAN_INVALID", async () => {
    const r = await run(new MemRepo(), new MemContext([PLAYER]), { intensity: 140 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("TRAINING_PLAN_INVALID");
  });

  it("jogador fora do elenco → PLAYER_NOT_IN_SQUAD", async () => {
    const r = await run(new MemRepo(), new MemContext(["outro"]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("PLAYER_NOT_IN_SQUAD");
  });

  it("restrito médico não recebe plano de desenvolvimento → PLAYER_UNDER_MEDICAL_RESTRICTION", async () => {
    const r = await run(new MemRepo(), new MemContext([PLAYER], [PLAYER]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("PLAYER_UNDER_MEDICAL_RESTRICTION");
  });

  it("versão diferente da atual → AGGREGATE_VERSION_CONFLICT", async () => {
    const repo = new MemRepo();
    repo.plan = {
      id: "p", gameWorldId: WORLD, clubId: CLUB, playerId: PLAYER,
      target: { kind: "ATTRIBUTE", attributeCodes: ["finishing"] }, intensity: 50, version: 3,
    };
    const r = await run(repo, new MemContext([PLAYER]), { expectedVersion: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("AGGREGATE_VERSION_CONFLICT");
  });

  it("edição válida sobe a versão e salva contra a versão lida", async () => {
    const repo = new MemRepo();
    repo.plan = {
      id: "p", gameWorldId: WORLD, clubId: CLUB, playerId: PLAYER,
      target: { kind: "ATTRIBUTE", attributeCodes: ["finishing"] }, intensity: 50, version: 3,
    };
    const r = await run(repo, new MemContext([PLAYER]), {
      expectedVersion: 3,
      target: { kind: "POSITION", position: "CB" },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.plan.version).toBe(4);
    expect(repo.savedExpected).toBe(3);
  });
});
