import { describe, expect, it } from "vitest";

import {
  MedicalEpisodeState,
  type InjuryEpisodeRepository,
  type InjuryEpisodeSnapshot,
} from "./injury-episode-types.js";
import { OpenInjuryEpisode } from "./medical-use-cases.js";
import {
  SettleTrainingInjuries,
  trainingInjuryProbability,
  trainingRiskScore,
  type TrainingLoadEntry,
  type TrainingLoadReader,
} from "./settle-training-injuries.js";

const WORLD = "11111111-1111-7111-8111-111111111111";
const CLUB = "22222222-2222-7222-8222-222222222222";

class MemoryRepository implements InjuryEpisodeRepository {
  public readonly rows = new Map<string, InjuryEpisodeSnapshot>();

  public findOpenByPlayer(
    gameWorldId: string,
    playerId: string,
  ): Promise<InjuryEpisodeSnapshot | null> {
    for (const episode of this.rows.values()) {
      if (
        episode.gameWorldId === gameWorldId &&
        episode.playerId === playerId &&
        episode.state !== MedicalEpisodeState.DISCHARGE
      ) {
        return Promise.resolve(episode);
      }
    }
    return Promise.resolve(null);
  }

  public findById(): Promise<InjuryEpisodeSnapshot | null> {
    return Promise.resolve(null);
  }

  public listOpenByClub(): Promise<readonly InjuryEpisodeSnapshot[]> {
    return Promise.resolve([...this.rows.values()]);
  }

  public save(episode: InjuryEpisodeSnapshot): Promise<void> {
    this.rows.set(episode.id, episode);
    return Promise.resolve();
  }
}

class StubLoadReader implements TrainingLoadReader {
  public constructor(private readonly entries: readonly TrainingLoadEntry[]) {}

  public playersUnderLoad(): Promise<readonly TrainingLoadEntry[]> {
    return Promise.resolve(this.entries);
  }
}

const entry = (
  playerId: string,
  overrides: Partial<TrainingLoadEntry> = {},
): TrainingLoadEntry => ({
  playerId,
  clubId: CLUB,
  fatigue: 30,
  age: 25,
  intensity: 50,
  underPlan: true,
  injuredRegionHistory: [],
  ...overrides,
});

function settleWith(entries: readonly TrainingLoadEntry[]) {
  const repository = new MemoryRepository();
  const settle = new SettleTrainingInjuries(
    new StubLoadReader(entries),
    new OpenInjuryEpisode(repository),
  );
  return { repository, settle };
}

/**
 * Uma população grande o bastante para a incidência de UM dia aparecer.
 *
 * Com a calibração correta o risco diário é da ordem de 0,5%: um elenco de 23
 * não produz caso nenhum na maioria dos dias — que é o comportamento desejado,
 * mas não serve para testar a incidência. Daí o lote.
 */
const squad = (overrides: Partial<TrainingLoadEntry> = {}) =>
  Array.from({ length: 2000 }, (_, index) =>
    entry(`3333333-3333-7333-8333-3333333${String(index).padStart(5, "0")}`, overrides),
  );

describe("risco de treino", () => {
  it("intensidade e idade elevam o riscoScore", () => {
    expect(trainingRiskScore(entry("p", { intensity: 100 }))).toBeGreaterThan(
      trainingRiskScore(entry("p", { intensity: 20 })),
    );
    expect(trainingRiskScore(entry("p", { age: 36 }))).toBeGreaterThan(
      trainingRiskScore(entry("p", { age: 24 })),
    );
  });

  it("o dia de treino é MUITO menos perigoso que uma partida inteira", () => {
    const perDay = trainingInjuryProbability(entry("p"));

    // A partida-base de 90 ticks dá ≈3,6% (R-21). Treina-se todo dia e joga-se
    // uma vez por semana: o dia de treino tem de ficar bem abaixo de um décimo.
    expect(perDay).toBeLessThan(0.0036);
    expect(perDay).toBeGreaterThan(0);
  });

  /**
   * Guarda contra a regressão que a primeira calibração produziu: com 30 ticks
   * por dia, 40 dias lesionaram 37% do mundo. A propriedade que importa não é
   * a taxa diária isolada, é o ACÚMULO ao longo de uma janela de calendário.
   */
  it("em 40 dias de rotina, a incidência acumulada fica na casa de poucos por cento", () => {
    const perDay = trainingInjuryProbability(
      entry("p", { fatigue: 0, intensity: 40 }),
    );
    const overForty = 1 - (1 - perDay) ** 40;

    expect(overForty).toBeLessThan(0.08);
    expect(overForty).toBeGreaterThan(0.005);
  });

  it("jogador exausto corre mais risco no mesmo treino", () => {
    expect(trainingInjuryProbability(entry("p", { fatigue: 95 }))).toBeGreaterThan(
      trainingInjuryProbability(entry("p", { fatigue: 10 })),
    );
  });
});

describe("virada do dia", () => {
  it("com elenco descansado quase ninguém se lesiona", async () => {
    const { settle } = settleWith(squad({ fatigue: 0, intensity: 30 }));

    const result = await settle.execute({
      gameWorldId: WORLD,
      worldSeed: "seed-1",
      worldDate: "2026-07-22",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.evaluatedCount).toBe(2000);
    expect(result.value.openedEpisodes.length).toBeLessThan(15);
  });

  it("sobrecarga em elenco exausto produz lesão — o laço com a decisão anterior", async () => {
    const exhausted = settleWith(squad({ fatigue: 95, intensity: 100, age: 34 }));
    const rested = settleWith(squad({ fatigue: 0, intensity: 30, age: 24 }));

    const hurt = await exhausted.settle.execute({
      gameWorldId: WORLD,
      worldSeed: "seed-1",
      worldDate: "2026-07-22",
    });
    const fine = await rested.settle.execute({
      gameWorldId: WORLD,
      worldSeed: "seed-1",
      worldDate: "2026-07-22",
    });

    expect(hurt.ok && fine.ok).toBe(true);
    if (!hurt.ok || !fine.ok) return;
    expect(hurt.value.openedEpisodes.length).toBeGreaterThan(0);
    expect(hurt.value.openedEpisodes.length).toBeGreaterThan(
      fine.value.openedEpisodes.length,
    );
  });

  it("o episódio nasce em EVALUATION, com causa TREINO e região preenchida", async () => {
    const { settle } = settleWith(squad({ fatigue: 95, intensity: 100 }));

    const result = await settle.execute({
      gameWorldId: WORLD,
      worldSeed: "seed-1",
      worldDate: "2026-07-22",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const episode = result.value.openedEpisodes[0];
    expect(episode?.state).toBe(MedicalEpisodeState.EVALUATION);
    expect(episode?.cause).toBe("TRAINING");
    expect(episode?.region.length).toBeGreaterThan(0);
  });

  it("quem treina sem plano se lesiona por DESGASTE, não por treino dirigido", async () => {
    const { settle } = settleWith(
      squad({ fatigue: 95, intensity: 100, underPlan: false }),
    );

    const result = await settle.execute({
      gameWorldId: WORLD,
      worldSeed: "seed-1",
      worldDate: "2026-07-22",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.openedEpisodes.length).toBeGreaterThan(0);
    expect(result.value.openedEpisodes[0]?.cause).toBe("WEAR");
  });

  it("mesma semente, mesmo dia: a virada é reproduzível", async () => {
    const first = settleWith(squad({ fatigue: 90, intensity: 90 }));
    const second = settleWith(squad({ fatigue: 90, intensity: 90 }));

    const a = await first.settle.execute({
      gameWorldId: WORLD,
      worldSeed: "seed-1",
      worldDate: "2026-07-22",
    });
    const b = await second.settle.execute({
      gameWorldId: WORLD,
      worldSeed: "seed-1",
      worldDate: "2026-07-22",
    });

    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value.openedEpisodes).toEqual(b.value.openedEpisodes);
  });

  it("sementes diferentes dão mundos diferentes", async () => {
    const first = settleWith(squad({ fatigue: 90, intensity: 90 }));
    const second = settleWith(squad({ fatigue: 90, intensity: 90 }));

    const a = await first.settle.execute({
      gameWorldId: WORLD,
      worldSeed: "seed-1",
      worldDate: "2026-07-22",
    });
    const b = await second.settle.execute({
      gameWorldId: WORLD,
      worldSeed: "seed-outro",
      worldDate: "2026-07-22",
    });

    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value.openedEpisodes.map((e) => e.playerId)).not.toEqual(
      b.value.openedEpisodes.map((e) => e.playerId),
    );
  });

  it("quem já tem caso aberto não ganha um segundo episódio", async () => {
    const { settle, repository } = settleWith(squad({ fatigue: 95, intensity: 100 }));
    await settle.execute({
      gameWorldId: WORLD,
      worldSeed: "seed-1",
      worldDate: "2026-07-22",
    });
    const afterFirstDay = repository.rows.size;

    await settle.execute({
      gameWorldId: WORLD,
      worldSeed: "seed-1",
      worldDate: "2026-07-22",
    });

    expect(repository.rows.size).toBe(afterFirstDay);
  });
});
