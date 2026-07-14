import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldCompetitions,
  WorldEventing,
  WorldInbox,
  type CompetitionClubRef,
  type CompetitionSeasonRef,
  type GameWorldSnapshot,
} from "../../src/index.js";

// GP-006 · Season rollover — convergência C7/C2: a virada de temporada cria uma
// nova edição/calendário sem apagar a temporada anterior (fatos append-only). As
// duas edições coexistem e a nova gera fixtures determinísticas próprias.

const SEASON_1 = "019f0000-0000-7000-8000-000000000a01" as CompetitionSeasonRef;
const SEASON_2 = "019f0000-0000-7000-8000-000000000a02" as CompetitionSeasonRef;
const CLUBS = [
  "019f0000-0000-7000-8000-0000000000c1",
  "019f0000-0000-7000-8000-0000000000c2",
  "019f0000-0000-7000-8000-0000000000c3",
  "019f0000-0000-7000-8000-0000000000c4",
].map((id) => id as CompetitionClubRef);

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-006",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

function runSeason(
  competitions: WorldCompetitions,
  gameWorld: GameWorldSnapshot,
  seasonRef: CompetitionSeasonRef,
  label: string,
  startOn: string,
) {
  const edition = competitions.createCompetitionEdition({
    seasonRef,
    name: `Liga ${label}`,
    formatVersion: "league-double-rr@1",
    maxParticipants: 4,
    startOn,
    roundIntervalDays: 7,
    worldDate: startOn,
    rulesetVersion: gameWorld.rulesetVersion,
    idempotencyKey: `edition:${label}`,
    worldSeed: gameWorld.seed,
  });
  if (!edition.ok) throw edition.error;
  CLUBS.forEach((clubId, index) => {
    const registered = competitions.registerParticipant({
      editionId: edition.value.id,
      clubId,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: `reg:${label}:${index}`,
      worldSeed: gameWorld.seed,
      worldDate: startOn,
    });
    if (!registered.ok) throw registered.error;
  });
  const fixtures = competitions.generateFixtures({
    editionId: edition.value.id,
    rulesetVersion: gameWorld.rulesetVersion,
    idempotencyKey: `fixtures:${label}`,
    worldSeed: gameWorld.seed,
    worldDate: startOn,
  });
  if (!fixtures.ok) throw fixtures.error;
  return { editionId: edition.value.id, fixtures: fixtures.value };
}

describe("GP-006 Season rollover (convergence)", () => {
  it("abre a nova temporada sem apagar a anterior", () => {
    const gameWorld = world();
    const competitionsR = WorldCompetitions.initialize(gameWorld);
    if (!competitionsR.ok) throw competitionsR.error;
    const competitions = competitionsR.value;

    const first = runSeason(competitions, gameWorld, SEASON_1, "2026", "2026-02-01");
    const second = runSeason(competitions, gameWorld, SEASON_2, "2027", "2027-02-01");

    // Ambas as edições coexistem (temporada anterior preservada).
    expect(competitions.snapshot().editions).toHaveLength(2);
    expect(first.fixtures).toHaveLength(12);
    expect(second.fixtures).toHaveLength(12);

    // As fixtures de cada temporada ficam no seu próprio calendário e edição.
    expect(first.fixtures.every((f) => f.editionId === first.editionId)).toBe(true);
    expect(second.fixtures.every((f) => f.kickoffOn >= "2027-02-01")).toBe(true);

    // Fatos append-only: a edição da temporada 1 continua registrada.
    expect(competitions.findEdition(first.editionId)!.status).toBe("SCHEDULED");
  });

  it("homologa a temporada anterior e vira via SAGA de rollover (C7+X-002+C11)", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const competitionsR = WorldCompetitions.initialize(gameWorld);
    if (!competitionsR.ok) throw competitionsR.error;
    const competitions = competitionsR.value;
    const first = runSeason(competitions, gameWorld, SEASON_1, "2026", "2026-02-01");

    // C7: todos os resultados oficiais → todas as fixtures FINAL → homologação.
    first.fixtures.forEach((fixture, index) => {
      const recorded = competitions.recordOfficialResult({
        fixtureId: fixture.id,
        matchRef: `match:${index}`,
        homeGoals: index % 3,
        awayGoals: index % 2,
        rulesetVersion: ruleset,
        idempotencyKey: `res:${index}`,
        worldSeed: gameWorld.seed,
        worldDate: "2026-11-30",
      });
      if (!recorded.ok) throw recorded.error;
    });
    const homologation = competitions.homologateCompetition({
      editionId: first.editionId,
      decidedBy: "league-office",
      rulesetVersion: ruleset,
      idempotencyKey: "homolog:2026",
      worldSeed: gameWorld.seed,
      worldDate: "2026-12-01",
    });
    expect(homologation).toMatchObject({ ok: true });
    if (!homologation.ok) throw homologation.error;
    expect(competitions.findEdition(first.editionId)!.status).toBe("HOMOLOGATED");
    const champion = homologation.value.finalRanking[0]!;

    // X-002: o rollover roda como saga durável (start → claim → advance → complete).
    const eventingR = WorldEventing.initialize(gameWorld);
    if (!eventingR.ok) throw eventingR.error;
    const eventing = eventingR.value;
    const saga = eventing.startSaga({
      sagaType: "SAGA-02",
      correlationKey: "rollover:2026",
      steps: ["archive", "open-next"],
      rulesetVersion: ruleset,
      idempotencyKey: "rollover:saga",
      worldSeed: gameWorld.seed,
      worldDate: "2026-12-02",
    });
    if (!saga.ok) throw saga.error;
    const claim = eventing.claimSaga({
      sagaId: saga.value.id,
      owner: "rollover-worker",
      nowMs: 1_000,
      leaseMs: 60_000,
      rulesetVersion: ruleset,
    });
    if (!claim.ok) throw claim.error;
    for (const step of ["archive", "open-next"]) {
      const advanced = eventing.advanceSagaStep({
        sagaId: saga.value.id,
        fencingToken: claim.value.fencingToken,
        checkpointHash: `${step}-ok`,
        rulesetVersion: ruleset,
        idempotencyKey: `rollover:${step}`,
        worldSeed: gameWorld.seed,
        worldDate: "2026-12-02",
      });
      if (!advanced.ok) throw advanced.error;
    }
    expect(eventing.findSaga(saga.value.id)!.status).toBe("COMPLETED");

    // C11: o campeão é arquivado como record histórico (append-only, idempotente).
    const inboxR = WorldInbox.initialize(gameWorld);
    if (!inboxR.ok) throw inboxR.error;
    const record = inboxR.value.establishRecord({
      category: "LEAGUE_CHAMPION",
      holder: champion,
      value: 2026,
      achievedOn: "2026-12-01",
      factRef: `champion:${first.editionId}`,
      rulesetVersion: ruleset,
      idempotencyKey: "record:champion:2026",
      worldSeed: gameWorld.seed,
      worldDate: "2026-12-02",
    });
    expect(record).toMatchObject({ ok: true, value: { category: "LEAGUE_CHAMPION" } });

    // A nova temporada abre sem apagar a anterior (fatos append-only).
    const second = runSeason(competitions, gameWorld, SEASON_2, "2027", "2027-02-01");
    expect(competitions.snapshot().editions).toHaveLength(2);
    expect(second.fixtures).toHaveLength(12);
  });
});
