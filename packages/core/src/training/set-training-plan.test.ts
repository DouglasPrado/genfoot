import { beforeEach, describe, expect, it } from "vitest";

import { SetTrainingPlan } from "./set-training-plan.js";
import {
  TrainingFocus,
  type TrainingContextReader,
  type TrainingPlanRepository,
  type TrainingPlanSnapshot,
} from "./training-types.js";

const WORLD = "019b76da-a800-7451-8ea2-7b2378e42050";
const CLUB = "019b76da-a800-7451-8ea2-7b2378e42060";
const SEASON = "019b76da-a800-7451-8ea2-7b2378e42070";
const P1 = "019b76da-a800-7451-8ea2-7b2378e42081";
const P2 = "019b76da-a800-7451-8ea2-7b2378e42082";
const FORA = "019b76da-a800-7451-8ea2-7b2378e42099";

class MemoryTrainingPlanRepository implements TrainingPlanRepository {
  public planos = new Map<string, TrainingPlanSnapshot>();
  public conflitos = 0;

  private key(w: string, c: string, s: string) {
    return `${w}|${c}|${s}`;
  }

  findByClubSeason(w: string, c: string, s: string) {
    return Promise.resolve(this.planos.get(this.key(w, c, s)) ?? null);
  }

  findAllActive() {
    return Promise.resolve([...this.planos.values()] as readonly TrainingPlanSnapshot[]);
  }

  save(plan: TrainingPlanSnapshot, expectedVersion: number | null) {
    const key = this.key(plan.gameWorldId, plan.clubId, plan.seasonId);
    const atual = this.planos.get(key);
    const versaoAtual = atual?.version ?? null;
    if (versaoAtual !== expectedVersion) {
      this.conflitos += 1;
      throw new Error("AGGREGATE_VERSION_CONFLICT");
    }
    this.planos.set(key, plan);
    return Promise.resolve();
  }
}

class MemoryContextReader implements TrainingContextReader {
  public elenco: string[] = [P1, P2];
  public restritos: string[] = [];
  public capacidade = 2;

  squadPlayerIds() {
    return Promise.resolve(this.elenco as readonly string[]);
  }
  medicallyRestrictedPlayerIds() {
    return Promise.resolve(this.restritos as readonly string[]);
  }
  trainingCapacity() {
    return Promise.resolve(this.capacidade);
  }
}

let repo: MemoryTrainingPlanRepository;
let reader: MemoryContextReader;
let uc: SetTrainingPlan;

beforeEach(() => {
  repo = new MemoryTrainingPlanRepository();
  reader = new MemoryContextReader();
  uc = new SetTrainingPlan(repo, reader);
});

const entrada = (over: Record<string, unknown> = {}) => ({
  gameWorldId: WORLD,
  clubId: CLUB,
  seasonId: SEASON,
  worldSeed: "seed-treino",
  occurredOn: "2026-03-01",
  name: "Base de temporada",
  focus: TrainingFocus.TECHNICAL,
  intensity: 60,
  entries: [
    { playerId: P1, focus: TrainingFocus.TECHNICAL, workload: 50 },
    { playerId: P2, focus: TrainingFocus.PHYSICAL, workload: 40 },
  ],
  expectedVersion: null as number | null,
  ...over,
});

describe("SetTrainingPlan — criação", () => {
  it("cria o plano quando não existe", async () => {
    const r = await uc.execute(entrada());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.plan.version).toBe(1);
    expect(r.value.plan.entries).toHaveLength(2);
  });

  it("emite TrainingPlanSet e uma entry por jogador", async () => {
    const r = await uc.execute(entrada());
    if (!r.ok) throw r.error;
    expect(r.value.events[0]?.type).toBe("TrainingPlanSet");
    const entries = r.value.events.filter(
      (e) => e.type === "TrainingPlayerEntryUpdated",
    );
    expect(entries).toHaveLength(2);
  });

  it("id determinístico por (seed, mundo, clube, temporada)", async () => {
    const a = await uc.execute(entrada());
    repo.planos.clear();
    const b = await uc.execute(entrada());
    if (!a.ok || !b.ok) throw new Error("falhou");
    expect(a.value.plan.id).toBe(b.value.plan.id);
  });
});

describe("SetTrainingPlan — concorrência (R-214/INV-31)", () => {
  it("recusa expectedVersion não-nulo quando o plano não existe", async () => {
    const r = await uc.execute(entrada({ expectedVersion: 3 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("AGGREGATE_VERSION_CONFLICT");
  });

  it("recusa versão defasada e NÃO grava", async () => {
    await uc.execute(entrada());
    const r = await uc.execute(entrada({ expectedVersion: 99, intensity: 10 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("AGGREGATE_VERSION_CONFLICT");
    expect(repo.planos.get(`${WORLD}|${CLUB}|${SEASON}`)?.intensity).toBe(60);
  });

  it("aceita a versão correta e incrementa", async () => {
    await uc.execute(entrada());
    const r = await uc.execute(entrada({ expectedVersion: 1, intensity: 70 }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.plan.version).toBe(2);
  });
});

describe("SetTrainingPlan — validação (TRAINING_PLAN_INVALID)", () => {
  it("recusa intensidade fora de 0..100", async () => {
    for (const intensity of [-1, 101]) {
      const r = await uc.execute(entrada({ intensity }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe("TRAINING_PLAN_INVALID");
    }
  });

  it("recusa plano sem nenhuma entrada", async () => {
    const r = await uc.execute(entrada({ entries: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("TRAINING_PLAN_INVALID");
  });

  it("recusa o mesmo jogador duas vezes", async () => {
    // Duas cargas para o mesmo jogador não é plano ambíguo — é plano inválido.
    // Aceitar a última em silêncio esconderia um erro da tela.
    const r = await uc.execute({
      ...entrada(),
      entries: [
        { playerId: P1, focus: TrainingFocus.TECHNICAL, workload: 50 },
        { playerId: P1, focus: TrainingFocus.PHYSICAL, workload: 30 },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("TRAINING_PLAN_INVALID");
  });

  it("recusa carga individual fora de 0..100", async () => {
    const r = await uc.execute({
      ...entrada(),
      entries: [{ playerId: P1, focus: TrainingFocus.TECHNICAL, workload: 150 }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("TRAINING_PLAN_INVALID");
  });

  it("recusa nome vazio", async () => {
    const r = await uc.execute(entrada({ name: "   " }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("TRAINING_PLAN_INVALID");
  });
});

describe("SetTrainingPlan — gates de elenco e médico", () => {
  it("recusa jogador fora do elenco (PLAYER_NOT_IN_SQUAD)", async () => {
    const r = await uc.execute({
      ...entrada(),
      entries: [{ playerId: FORA, focus: TrainingFocus.TECHNICAL, workload: 40 }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("PLAYER_NOT_IN_SQUAD");
  });

  it("recusa carga em jogador com restrição médica", async () => {
    reader.restritos = [P2];
    const r = await uc.execute(entrada());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("PLAYER_UNDER_MEDICAL_RESTRICTION");
  });

  it("permite RECOVERY para jogador com restrição médica", async () => {
    // Recuperação é o treino que o departamento médico MANDA fazer. Bloqueá-la
    // deixaria o lesionado sem plano nenhum.
    reader.restritos = [P2];
    const r = await uc.execute({
      ...entrada(),
      entries: [
        { playerId: P1, focus: TrainingFocus.TECHNICAL, workload: 50 },
        { playerId: P2, focus: TrainingFocus.RECOVERY, workload: 20 },
      ],
    });
    expect(r.ok).toBe(true);
  });
});

describe("SetTrainingPlan — capacidade do CT (R-13)", () => {
  it("não bloqueia quando excede: perde QUALIDADE", async () => {
    // O doc é explícito: "excesso sofre perda de qualidade, não bloqueio".
    // Recusar deixaria o clube sem treino algum, que é pior que treinar mal.
    reader.capacidade = 1;
    const r = await uc.execute({
      ...entrada(),
      entries: [
        { playerId: P1, focus: TrainingFocus.TECHNICAL, workload: 50 },
        { playerId: P2, focus: TrainingFocus.PHYSICAL, workload: 40 },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.plan.qualityFactor).toBeLessThan(1);
  });

  it("qualidade cheia quando cabe na capacidade", async () => {
    reader.capacidade = 5;
    const r = await uc.execute(entrada());
    if (!r.ok) throw r.error;
    expect(r.value.plan.qualityFactor).toBe(1);
  });

  it("quanto mais excede, pior a qualidade", async () => {
    reader.capacidade = 1;
    const doisFocos = await uc.execute(entrada());
    reader.elenco = [P1, P2, FORA];
    const tresFocos = await uc.execute({
      ...entrada({ expectedVersion: 1 }),
      entries: [
        { playerId: P1, focus: TrainingFocus.TECHNICAL, workload: 50 },
        { playerId: P2, focus: TrainingFocus.PHYSICAL, workload: 40 },
        { playerId: FORA, focus: TrainingFocus.MENTAL, workload: 30 },
      ],
    });
    if (!doisFocos.ok || !tresFocos.ok) throw new Error("falhou");
    expect(tresFocos.value.plan.qualityFactor).toBeLessThan(
      doisFocos.value.plan.qualityFactor,
    );
  });

  it("qualidade nunca zera — treino ruim ainda é treino", async () => {
    reader.capacidade = 1;
    reader.elenco = [P1, P2, FORA];
    const r = await uc.execute({
      ...entrada(),
      entries: [
        { playerId: P1, focus: TrainingFocus.TECHNICAL, workload: 50 },
        { playerId: P2, focus: TrainingFocus.PHYSICAL, workload: 40 },
        { playerId: FORA, focus: TrainingFocus.MENTAL, workload: 30 },
      ],
    });
    if (!r.ok) throw r.error;
    expect(r.value.plan.qualityFactor).toBeGreaterThan(0);
  });
});
