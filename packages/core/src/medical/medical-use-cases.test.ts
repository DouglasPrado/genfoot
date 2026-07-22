import { describe, expect, it } from "vitest";

import {
  InjuryCause,
  InjurySeverity,
  InjuryType,
  MedicalEpisodeState,
  TreatmentOption,
  type InjuryEpisodeRepository,
  type InjuryEpisodeSnapshot,
} from "./injury-episode-types.js";
import {
  AdvanceRehabStage,
  DiagnoseInjury,
  DischargeFromMedical,
  ForceMedicalReturn,
  OpenInjuryEpisode,
  OrderMedicalExam,
  SetMedicalPlan,
  type PlayerAvailabilityWriter,
} from "./medical-use-cases.js";

const WORLD = "11111111-1111-7111-8111-111111111111";
const CLUB = "22222222-2222-7222-8222-222222222222";
const PLAYER = "33333333-3333-7333-8333-333333333333";

class MemoryInjuryEpisodeRepository implements InjuryEpisodeRepository {
  public readonly rows = new Map<string, InjuryEpisodeSnapshot>();
  public conflicts = 0;

  public findOpenByPlayer(
    gameWorldId: string,
    playerId: string,
  ): Promise<InjuryEpisodeSnapshot | null> {
    for (const episode of this.rows.values()) {
      if (
        episode.gameWorldId === gameWorldId &&
        episode.playerId === playerId &&
        episode.state !== MedicalEpisodeState.DISCHARGE &&
        episode.state !== MedicalEpisodeState.MEDICAL_RETIREMENT
      ) {
        return Promise.resolve(episode);
      }
    }
    return Promise.resolve(null);
  }

  public findById(
    gameWorldId: string,
    injuryId: string,
  ): Promise<InjuryEpisodeSnapshot | null> {
    const row = this.rows.get(injuryId);
    return Promise.resolve(row && row.gameWorldId === gameWorldId ? row : null);
  }

  public listOpenByClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<readonly InjuryEpisodeSnapshot[]> {
    return Promise.resolve(
      [...this.rows.values()].filter(
        (episode) =>
          episode.gameWorldId === gameWorldId &&
          episode.clubId === clubId &&
          episode.state !== MedicalEpisodeState.DISCHARGE,
      ),
    );
  }

  public save(
    episode: InjuryEpisodeSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    const current = this.rows.get(episode.id);
    if (expectedVersion === null) {
      if (current) throw new Error("duplicado");
    } else if (!current || current.version !== expectedVersion) {
      this.conflicts += 1;
      throw new Error("AGGREGATE_VERSION_CONFLICT");
    }
    this.rows.set(episode.id, episode);
    return Promise.resolve();
  }
}

class SpyAvailabilityWriter implements PlayerAvailabilityWriter {
  public readonly calls: string[] = [];

  public markInjured(): Promise<void> {
    this.calls.push("INJURED");
    return Promise.resolve();
  }
  public markAvailable(): Promise<void> {
    this.calls.push("AVAILABLE");
    return Promise.resolve();
  }
  public markRetired(): Promise<void> {
    this.calls.push("RETIRED");
    return Promise.resolve();
  }
}

const OPEN_INPUT = {
  gameWorldId: WORLD,
  clubId: CLUB,
  playerId: PLAYER,
  worldSeed: "seed-medical",
  occurredOn: "2026-07-22",
  injuryType: InjuryType.MUSCULAR,
  cause: InjuryCause.TRAINING,
  region: "coxa-direita",
} as const;

function setup() {
  const repository = new MemoryInjuryEpisodeRepository();
  const availability = new SpyAvailabilityWriter();
  return {
    repository,
    availability,
    open: new OpenInjuryEpisode(repository),
    exam: new OrderMedicalExam(repository, availability),
    diagnose: new DiagnoseInjury(repository, availability),
    plan: new SetMedicalPlan(repository, availability),
    advance: new AdvanceRehabStage(repository, availability),
    force: new ForceMedicalReturn(repository, availability),
    discharge: new DischargeFromMedical(repository, availability),
  };
}

/** Percorre até a reabilitação, como a UI faria comando a comando. */
async function toRehab(kit: ReturnType<typeof setup>) {
  await kit.open.execute(OPEN_INPUT);
  await kit.exam.execute({
    gameWorldId: WORLD,
    playerId: PLAYER,
    occurredOn: "2026-07-22",
  });
  await kit.diagnose.execute({
    gameWorldId: WORLD,
    playerId: PLAYER,
    occurredOn: "2026-07-24",
    severity: InjurySeverity.MODERATE,
    returnRiskScore: 40,
  });
  return kit.plan.execute({
    gameWorldId: WORLD,
    playerId: PLAYER,
    occurredOn: "2026-07-24",
    option: TreatmentOption.STANDARD,
  });
}

describe("abertura do episódio", () => {
  it("grava o episódio novo", async () => {
    const kit = setup();

    const result = await kit.open.execute(OPEN_INPUT);

    expect(result.ok).toBe(true);
    expect(kit.repository.rows.size).toBe(1);
  });

  it("é idempotente: segunda lesão em cima de caso aberto não abre outro", async () => {
    const kit = setup();
    await kit.open.execute(OPEN_INPUT);

    const again = await kit.open.execute({
      ...OPEN_INPUT,
      occurredOn: "2026-07-25",
      region: "panturrilha-esquerda",
    });

    expect(again.ok).toBe(true);
    expect(kit.repository.rows.size).toBe(1);
    if (!again.ok) return;
    expect(again.value.events).toHaveLength(0);
  });

  it("comando sobre jogador saudável é recusado", async () => {
    const kit = setup();

    const result = await kit.exam.execute({
      gameWorldId: WORLD,
      playerId: PLAYER,
      occurredOn: "2026-07-22",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("PLAYER_NOT_INJURED");
  });
});

describe("sincronia com o estado oficial do jogador (P4)", () => {
  it("o diagnóstico marca o jogador como lesionado (P4-1)", async () => {
    const kit = setup();
    await kit.open.execute(OPEN_INPUT);
    await kit.exam.execute({
      gameWorldId: WORLD,
      playerId: PLAYER,
      occurredOn: "2026-07-22",
    });

    await kit.diagnose.execute({
      gameWorldId: WORLD,
      playerId: PLAYER,
      occurredOn: "2026-07-24",
      severity: InjurySeverity.SERIOUS,
      returnRiskScore: 60,
    });

    expect(kit.availability.calls).toEqual(["INJURED"]);
  });

  it("exame e avanço de estágio NÃO mexem na disponibilidade", async () => {
    const kit = setup();
    await toRehab(kit);
    kit.availability.calls.length = 0;

    await kit.advance.execute({
      gameWorldId: WORLD,
      playerId: PLAYER,
      occurredOn: "2026-07-26",
    });

    expect(kit.availability.calls).toEqual([]);
  });

  it("a alta devolve o jogador ao elenco (P4-2)", async () => {
    const kit = setup();
    await toRehab(kit);
    for (let step = 0; step < 7; step += 1) {
      await kit.advance.execute({
        gameWorldId: WORLD,
        playerId: PLAYER,
        occurredOn: "2026-08-01",
      });
    }
    kit.availability.calls.length = 0;

    const result = await kit.discharge.execute({
      gameWorldId: WORLD,
      playerId: PLAYER,
      occurredOn: "2026-08-20",
    });

    expect(result.ok).toBe(true);
    expect(kit.availability.calls).toEqual(["AVAILABLE"]);
    expect(await kit.repository.findOpenByPlayer(WORLD, PLAYER)).toBeNull();
  });
});

describe("revisão do diagnóstico e retorno forçado", () => {
  it("diagnosticar de novo revisa no lugar (MED-9), sem reabrir episódio", async () => {
    const kit = setup();
    await toRehab(kit);

    const revised = await kit.diagnose.execute({
      gameWorldId: WORLD,
      playerId: PLAYER,
      occurredOn: "2026-07-28",
      severity: InjurySeverity.SERIOUS,
      returnRiskScore: 70,
    });

    expect(revised.ok).toBe(true);
    if (!revised.ok) return;
    expect(revised.value.episode.diagnosis?.revisions).toBe(1);
    expect(kit.repository.rows.size).toBe(1);
  });

  it("o retorno forçado com sorteio ruim recai e é gravado", async () => {
    const kit = setup();
    await toRehab(kit);
    await kit.advance.execute({
      gameWorldId: WORLD,
      playerId: PLAYER,
      occurredOn: "2026-07-26",
    });

    const result = await kit.force.execute({
      gameWorldId: WORLD,
      playerId: PLAYER,
      occurredOn: "2026-07-27",
      relapseRoll: 0,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.episode.relapseCount).toBe(1);
    const persisted = await kit.repository.findOpenByPlayer(WORLD, PLAYER);
    expect(persisted?.relapseCount).toBe(1);
  });
});

describe("concorrência otimista", () => {
  it("grava sempre contra a versão que veio do banco", async () => {
    const kit = setup();
    await toRehab(kit);

    await kit.advance.execute({
      gameWorldId: WORLD,
      playerId: PLAYER,
      occurredOn: "2026-07-26",
    });
    await kit.advance.execute({
      gameWorldId: WORLD,
      playerId: PLAYER,
      occurredOn: "2026-07-27",
    });

    expect(kit.repository.conflicts).toBe(0);
    const persisted = await kit.repository.findOpenByPlayer(WORLD, PLAYER);
    expect(persisted?.rehabStage).toBe(3);
  });
});
