import {
  DomainError,
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
  type GameWorldId,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  CreateCompetitionEdition,
  GameWorld,
  WorldCompetitions,
  type CompetitionClubRef,
  type CompetitionRepository,
  type CompetitionSeasonRef,
  type GameWorldSnapshot,
  type WorldCompetitionsSnapshot,
} from "../../src/index.js";

class MemoryCompetitionRepository implements CompetitionRepository {
  public snapshot: WorldCompetitionsSnapshot | null = null;

  public findCompetitionsByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldCompetitionsSnapshot | null> {
    return Promise.resolve(
      this.snapshot?.gameWorldId === gameWorldId
        ? structuredClone(this.snapshot)
        : null,
    );
  }

  public saveCompetitions(
    snapshot: WorldCompetitionsSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    if (
      (expectedRevision === null && this.snapshot !== null) ||
      (expectedRevision !== null &&
        this.snapshot?.revision !== expectedRevision)
    ) {
      throw new DomainError("COMPETITIONS_REVISION_CONFLICT", "Conflito.");
    }
    this.snapshot = structuredClone(snapshot);
    return Promise.resolve();
  }
}

const SEASON = "019f0000-0000-7000-8000-0000000000aa" as CompetitionSeasonRef;
const CLUBS = [
  "019f0000-0000-7000-8000-0000000000c1",
  "019f0000-0000-7000-8000-0000000000c2",
  "019f0000-0000-7000-8000-0000000000c3",
  "019f0000-0000-7000-8000-0000000000c4",
].map((id) => id as CompetitionClubRef);

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function world(seed = "competitions-001"): GameWorldSnapshot {
  const rulesetVersion = parseRulesetVersion("1.0.0");
  if (!rulesetVersion.ok) throw rulesetVersion.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed,
    startDate: date("2026-01-01"),
    rulesetVersion: rulesetVersion.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

function editionWithParticipants(seed = "competitions-001") {
  const gameWorld = world(seed);
  const created = WorldCompetitions.initialize(gameWorld);
  if (!created.ok) throw created.error;
  const value = created.value;
  const edition = value.createCompetitionEdition({
    seasonRef: SEASON,
    name: "Liga Nacional",
    formatVersion: "league-double-rr@1",
    maxParticipants: 4,
    startOn: "2026-02-01",
    roundIntervalDays: 7,
    worldDate: "2026-01-10",
    rulesetVersion: gameWorld.rulesetVersion,
    idempotencyKey: "edition:1",
    worldSeed: gameWorld.seed,
  });
  if (!edition.ok) throw edition.error;
  CLUBS.forEach((clubId, index) => {
    const registered = value.registerParticipant({
      editionId: edition.value.id,
      clubId,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: `reg:${index}`,
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-11",
    });
    if (!registered.ok) throw registered.error;
  });
  return { gameWorld, value, editionId: edition.value.id };
}

describe("Competitions and calendar", () => {
  it("cria edição e produz um único efeito ao repetir a chave", () => {
    const gameWorld = world();
    const created = WorldCompetitions.initialize(gameWorld);
    if (!created.ok) throw created.error;
    const value = created.value;
    const first = value.createCompetitionEdition({
      seasonRef: SEASON,
      name: "Copa",
      formatVersion: "cup@1",
      maxParticipants: 4,
      startOn: "2026-02-01",
      roundIntervalDays: 7,
      worldDate: "2026-01-10",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "edition:x",
      worldSeed: gameWorld.seed,
    });
    expect(first).toMatchObject({ ok: true, value: { status: "REGISTRATION" } });
    const revision = value.snapshot().revision;
    const repeated = value.createCompetitionEdition({
      seasonRef: SEASON,
      name: "Copa",
      formatVersion: "cup@1",
      maxParticipants: 4,
      startOn: "2026-02-01",
      roundIntervalDays: 7,
      worldDate: "2026-01-10",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "edition:x",
      worldSeed: gameWorld.seed,
    });
    expect(repeated).toEqual(first);
    expect(value.snapshot().editions).toHaveLength(1);
    expect(value.snapshot().revision).toBe(revision);
  });

  it("rejeita clube duplicado e estoura capacidade na inscrição", () => {
    const { gameWorld, value, editionId } = editionWithParticipants();

    expect(
      value.registerParticipant({
        editionId,
        clubId: CLUBS[0]!,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "reg:dup",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-12",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "PARTICIPANT_ALREADY_REGISTERED" },
    });

    expect(
      value.registerParticipant({
        editionId,
        clubId: "019f0000-0000-7000-8000-0000000000c9" as CompetitionClubRef,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "reg:5",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-12",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "COMPETITION_CAPACITY_EXCEEDED" },
    });
  });

  it("gera fixtures turno-returno sem colisão, cobrindo todos os pares", () => {
    const { gameWorld, value, editionId } = editionWithParticipants();
    const generated = value.generateFixtures({
      editionId,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "fixtures:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-15",
    });
    if (!generated.ok) throw generated.error;
    const fixtures = generated.value;

    expect(fixtures).toHaveLength(12);
    expect(value.findEdition(editionId)!.status).toBe("SCHEDULED");

    const orderedPairs = new Set(
      fixtures.map((f) => `${f.homeClubId}|${f.awayClubId}`),
    );
    expect(orderedPairs.size).toBe(12);

    const rounds = new Set(fixtures.map((f) => f.round));
    expect(rounds.size).toBe(6);
    for (const round of rounds) {
      const clubsInRound = fixtures
        .filter((f) => f.round === round)
        .flatMap((f) => [f.homeClubId, f.awayClubId]);
      expect(new Set(clubsInRound).size).toBe(clubsInRound.length);
      expect(clubsInRound).toHaveLength(4);
    }

    const revision = value.snapshot().revision;
    const repeated = value.generateFixtures({
      editionId,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "fixtures:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-15",
    });
    expect(repeated).toEqual(generated);
    expect(value.snapshot().revision).toBe(revision);

    expect(
      value.generateFixtures({
        editionId,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "fixtures:2",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-16",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "COMPETITION_ALREADY_SCHEDULED" },
    });
  });

  it("gera fixtures deterministicamente para os mesmos participantes/seed", () => {
    const first = editionWithParticipants("det-seed");
    const firstFixtures = first.value.generateFixtures({
      editionId: first.editionId,
      rulesetVersion: first.gameWorld.rulesetVersion,
      idempotencyKey: "fixtures:det",
      worldSeed: first.gameWorld.seed,
      worldDate: "2026-01-15",
    });
    const second = editionWithParticipants("det-seed");
    const secondFixtures = second.value.generateFixtures({
      editionId: second.editionId,
      rulesetVersion: second.gameWorld.rulesetVersion,
      idempotencyKey: "fixtures:det",
      worldSeed: second.gameWorld.seed,
      worldDate: "2026-01-15",
    });
    if (!firstFixtures.ok || !secondFixtures.ok) throw new Error("falhou");

    expect(firstFixtures.value.map((f) => f.id)).toEqual(
      secondFixtures.value.map((f) => f.id),
    );
    expect(firstFixtures.value.map((f) => f.kickoffOn)).toEqual(
      secondFixtures.value.map((f) => f.kickoffOn),
    );
  });

  it("persiste criação idempotente de edição via caso de uso", async () => {
    const gameWorld = world();
    const created = WorldCompetitions.initialize(gameWorld);
    if (!created.ok) throw created.error;
    const repository = new MemoryCompetitionRepository();
    repository.snapshot = created.value.snapshot();
    const useCase = new CreateCompetitionEdition(repository);

    const input = {
      seasonRef: SEASON,
      name: "Liga",
      formatVersion: "league@1",
      maxParticipants: 4,
      startOn: "2026-02-01",
      roundIntervalDays: 7,
      worldDate: "2026-01-10",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "edition:uc",
      worldSeed: gameWorld.seed,
    };
    const first = await useCase.execute(gameWorld.id, input);
    const revision = repository.snapshot.revision;
    const repeated = await useCase.execute(gameWorld.id, input);

    expect(first).toMatchObject({ ok: true, value: { name: "Liga" } });
    expect(repeated).toEqual(first);
    expect(repository.snapshot.revision).toBe(revision);
    expect(repository.snapshot.editions).toHaveLength(1);
  });

  it("registra resultado oficial, atualiza standings, é idempotente e uma vez por match", () => {
    const { gameWorld, value, editionId } = editionWithParticipants();
    const generated = value.generateFixtures({
      editionId,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "fixtures:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-20",
    });
    if (!generated.ok) throw generated.error;
    const fixture = generated.value[0]!;

    const recorded = value.recordOfficialResult({
      fixtureId: fixture.id,
      matchRef: "match:0",
      homeGoals: 2,
      awayGoals: 0,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "res:0",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-01",
    });
    expect(recorded).toMatchObject({
      ok: true,
      value: { status: "FINAL", homeGoals: 2, awayGoals: 0 },
    });
    const home = value
      .standingsFor(editionId)
      .find((s) => s.clubId === fixture.homeClubId)!;
    expect(home.points).toBe(3);
    expect(home.won).toBe(1);
    expect(home.goalsFor).toBe(2);

    // idempotente: mesmo matchRef não gera novo efeito
    const revision = value.snapshot().revision;
    const repeat = value.recordOfficialResult({
      fixtureId: fixture.id,
      matchRef: "match:0",
      homeGoals: 2,
      awayGoals: 0,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "res:0b",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-01",
    });
    expect(repeat).toMatchObject({ ok: true, value: { status: "FINAL" } });
    expect(value.snapshot().revision).toBe(revision);

    // matchRef diferente numa fixture já FINAL = conflito (fato não reescrito)
    expect(
      value.recordOfficialResult({
        fixtureId: fixture.id,
        matchRef: "match:other",
        homeGoals: 1,
        awayGoals: 1,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "res:conf",
        worldSeed: gameWorld.seed,
        worldDate: "2026-02-02",
      }),
    ).toMatchObject({ ok: false, error: { code: "RESULT_ALREADY_RECORDED" } });
  });

  it("aplica disciplina no desempate do standing, idempotente por chave", () => {
    const { gameWorld, value, editionId } = editionWithParticipants();
    const generated = value.generateFixtures({
      editionId,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "fixtures:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-20",
    });
    if (!generated.ok) throw generated.error;

    const disc = value.applyDiscipline({
      editionId,
      clubId: CLUBS[0]!,
      disciplinaryPoints: 5,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "disc:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-01",
    });
    expect(disc).toMatchObject({ ok: true, value: { disciplinaryPoints: 5 } });
    // com tudo empatado em 0, o punido cai no desempate disciplinar
    expect(value.standingsFor(editionId).at(-1)!.clubId).toBe(CLUBS[0]);

    const revision = value.snapshot().revision;
    const again = value.applyDiscipline({
      editionId,
      clubId: CLUBS[0]!,
      disciplinaryPoints: 5,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "disc:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-01",
    });
    expect(again).toEqual(disc);
    expect(value.snapshot().revision).toBe(revision);
  });

  it("homologa só com todas as fixtures finalizadas, determinística e idempotente", () => {
    const { gameWorld, value, editionId } = editionWithParticipants();
    const generated = value.generateFixtures({
      editionId,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "fixtures:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-20",
    });
    if (!generated.ok) throw generated.error;
    const fixtures = generated.value;

    // homologar antes de finalizar tudo é prematuro
    expect(
      value.homologateCompetition({
        editionId,
        decidedBy: "board",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "hom:early",
        worldSeed: gameWorld.seed,
        worldDate: "2026-06-01",
      }),
    ).toMatchObject({ ok: false, error: { code: "HOMOLOGATION_PREMATURE" } });

    fixtures.forEach((fixture, index) => {
      const recorded = value.recordOfficialResult({
        fixtureId: fixture.id,
        matchRef: `match:${index}`,
        homeGoals: 2,
        awayGoals: 1,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: `res:${index}`,
        worldSeed: gameWorld.seed,
        worldDate: "2026-05-01",
      });
      if (!recorded.ok) throw recorded.error;
    });

    const homologated = value.homologateCompetition({
      editionId,
      decidedBy: "board",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "hom:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-06-01",
    });
    expect(homologated).toMatchObject({ ok: true });
    if (!homologated.ok) throw homologated.error;
    expect(value.findEdition(editionId)!.status).toBe("HOMOLOGATED");
    expect(homologated.value.finalRanking).toHaveLength(4);
    expect(homologated.value.inputHash).toMatch(/^[0-9a-f]{16}$/);

    // idempotente: uma edição já homologada devolve a mesma homologação
    const revision = value.snapshot().revision;
    const again = value.homologateCompetition({
      editionId,
      decidedBy: "board",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "hom:again",
      worldSeed: gameWorld.seed,
      worldDate: "2026-06-02",
    });
    expect(again.ok && again.value.inputHash).toBe(homologated.value.inputHash);
    expect(value.snapshot().revision).toBe(revision);
  });
});
