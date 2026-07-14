import {
  DomainError,
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
  type GameWorldId,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  OpenMedicalCase,
  ReassessMedicalCase,
  RetirePlayer,
  WorldGenesisGenerator,
  WorldPlayerLifecycle,
  type GameWorldSnapshot,
  type PlayerLifecycleRepository,
  type WorldPlayerLifecycleSnapshot,
} from "../src/index.js";

class MemoryPlayerRepository implements PlayerLifecycleRepository {
  public snapshot: WorldPlayerLifecycleSnapshot | null = null;

  public findPlayerLifecycleByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldPlayerLifecycleSnapshot | null> {
    return Promise.resolve(
      this.snapshot?.gameWorldId === gameWorldId
        ? structuredClone(this.snapshot)
        : null,
    );
  }

  public savePlayerLifecycle(
    snapshot: WorldPlayerLifecycleSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    if (
      (expectedRevision === null && this.snapshot !== null) ||
      (expectedRevision !== null &&
        this.snapshot?.revision !== expectedRevision)
    ) {
      throw new DomainError("PLAYER_LIFECYCLE_REVISION_CONFLICT", "Conflito.");
    }
    this.snapshot = structuredClone(snapshot);
    return Promise.resolve();
  }
}

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function world(seed = "player-medical-001"): GameWorldSnapshot {
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

function lifecycle(seed = "player-medical-001") {
  const gameWorld = world(seed);
  const genesis = new WorldGenesisGenerator().generate(gameWorld);
  const created = WorldPlayerLifecycle.fromGenesis(gameWorld, genesis);
  if (!created.ok) throw created.error;
  return { gameWorld, value: created.value };
}

describe("Player medical and career", () => {
  it("abre caso médico, marca INJURED e produz um único efeito ao repetir a chave", () => {
    const { gameWorld, value } = lifecycle();
    const player = value.snapshot().players[0]!;

    const first = value.openMedicalCase({
      playerId: player.id,
      diagnosis: "Estiramento muscular",
      severity: "MODERATE",
      expectedReturnOn: "2026-04-01",
      worldDate: "2026-03-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: `injury:${player.id}:1`,
      worldSeed: gameWorld.seed,
    });

    expect(first).toMatchObject({
      ok: true,
      value: { status: "OPEN", playerId: player.id, severity: "MODERATE" },
    });
    expect(value.findPlayer(player.id)!.availability).toBe("INJURED");
    const revision = value.snapshot().revision;

    const repeated = value.openMedicalCase({
      playerId: player.id,
      diagnosis: "Estiramento muscular",
      severity: "MODERATE",
      expectedReturnOn: "2026-04-01",
      worldDate: "2026-03-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: `injury:${player.id}:1`,
      worldSeed: gameWorld.seed,
    });

    expect(repeated).toEqual(first);
    expect(value.snapshot().revision).toBe(revision);
    expect(value.snapshot().medicalCases).toHaveLength(1);
    expect(value.snapshot().lifecycleEvents).toHaveLength(1);
  });

  it("rejeita novo caso enquanto lesionado e recusa ruleset divergente", () => {
    const { gameWorld, value } = lifecycle();
    const player = value.snapshot().players[0]!;
    const open = value.openMedicalCase({
      playerId: player.id,
      diagnosis: "Entorse",
      severity: "MINOR",
      expectedReturnOn: "2026-03-20",
      worldDate: "2026-03-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: `injury:${player.id}:a`,
      worldSeed: gameWorld.seed,
    });
    if (!open.ok) throw open.error;

    expect(
      value.openMedicalCase({
        playerId: player.id,
        diagnosis: "Nova lesão",
        severity: "SEVERE",
        expectedReturnOn: "2026-05-01",
        worldDate: "2026-03-10",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: `injury:${player.id}:b`,
        worldSeed: gameWorld.seed,
      }),
    ).toMatchObject({ ok: false, error: { code: "PLAYER_ALREADY_INJURED" } });

    const otherRuleset = parseRulesetVersion("2.0.0");
    if (!otherRuleset.ok) throw otherRuleset.error;
    expect(
      value.openMedicalCase({
        playerId: value.snapshot().players[1]!.id,
        diagnosis: "Contusão",
        severity: "MINOR",
        expectedReturnOn: "2026-03-20",
        worldDate: "2026-03-01",
        rulesetVersion: otherRuleset.value,
        idempotencyKey: "injury:other",
        worldSeed: gameWorld.seed,
      }),
    ).toMatchObject({ ok: false, error: { code: "RULESET_VERSION_MISMATCH" } });
  });

  it("estende e depois dá alta, restaurando disponibilidade e emitindo PlayerCleared", () => {
    const { gameWorld, value } = lifecycle();
    const player = value.snapshot().players[0]!;
    const opened = value.openMedicalCase({
      playerId: player.id,
      diagnosis: "Lesão no joelho",
      severity: "SEVERE",
      expectedReturnOn: "2026-04-01",
      worldDate: "2026-03-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: `injury:${player.id}:knee`,
      worldSeed: gameWorld.seed,
    });
    if (!opened.ok) throw opened.error;

    const extended = value.reassessMedicalCase({
      medicalCaseId: opened.value.id,
      outcome: "EXTEND",
      worldDate: "2026-03-25",
      newExpectedReturnOn: "2026-05-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: `reassess:${opened.value.id}:1`,
      worldSeed: gameWorld.seed,
    });
    expect(extended).toMatchObject({
      ok: true,
      value: { status: "RECOVERING", expectedReturnOn: "2026-05-01" },
    });

    const cleared = value.reassessMedicalCase({
      medicalCaseId: opened.value.id,
      outcome: "CLEAR",
      worldDate: "2026-05-02",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: `reassess:${opened.value.id}:2`,
      worldSeed: gameWorld.seed,
    });
    expect(cleared).toMatchObject({
      ok: true,
      value: { status: "CLEARED", clearedOn: "2026-05-02" },
    });
    expect(value.findPlayer(player.id)!.availability).toBe("AVAILABLE");
    expect(
      value.snapshot().lifecycleEvents!.some((e) => e.type === "PlayerCleared"),
    ).toBe(true);

    const revision = value.snapshot().revision;
    const repeated = value.reassessMedicalCase({
      medicalCaseId: opened.value.id,
      outcome: "CLEAR",
      worldDate: "2026-05-02",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: `reassess:${opened.value.id}:2`,
      worldSeed: gameWorld.seed,
    });
    expect(repeated).toEqual(cleared);
    expect(value.snapshot().revision).toBe(revision);

    expect(
      value.reassessMedicalCase({
        medicalCaseId: opened.value.id,
        outcome: "CLEAR",
        worldDate: "2026-05-03",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: `reassess:${opened.value.id}:3`,
        worldSeed: gameWorld.seed,
      }),
    ).toMatchObject({ ok: false, error: { code: "MEDICAL_CASE_TERMINAL" } });
  });

  it("aposenta o jogador uma vez e rejeita a segunda transição terminal", () => {
    const { gameWorld, value } = lifecycle();
    const player = value.snapshot().players[0]!;

    const retired = value.retirePlayer({
      playerId: player.id,
      reason: "Fim de carreira",
      worldDate: "2026-06-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: `retire:${player.id}`,
      worldSeed: gameWorld.seed,
    });
    expect(retired).toMatchObject({
      ok: true,
      value: { careerStatus: "RETIRED", availability: "UNAVAILABLE" },
    });

    expect(
      value.retirePlayer({
        playerId: player.id,
        reason: "De novo",
        worldDate: "2026-07-01",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: `retire:${player.id}:again`,
        worldSeed: gameWorld.seed,
      }),
    ).toMatchObject({ ok: false, error: { code: "PLAYER_ALREADY_RETIRED" } });

    expect(
      value.retirePlayer({
        playerId: "missing-player",
        reason: "N/A",
        worldDate: "2026-07-01",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "retire:missing",
        worldSeed: gameWorld.seed,
      }),
    ).toMatchObject({ ok: false, error: { code: "PLAYER_NOT_FOUND" } });
  });

  it("persiste aposentadoria idempotente via caso de uso com optimistic concurrency", async () => {
    const { gameWorld, value } = lifecycle();
    const repository = new MemoryPlayerRepository();
    repository.snapshot = value.snapshot();
    const player = value.snapshot().players[0]!;
    const useCase = new RetirePlayer(repository);

    const first = await useCase.execute(gameWorld.id, {
      playerId: player.id,
      reason: "Aposentadoria programada",
      worldDate: "2026-06-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: `retire:${player.id}`,
      worldSeed: gameWorld.seed,
    });
    const revision = repository.snapshot.revision;

    const repeated = await useCase.execute(gameWorld.id, {
      playerId: player.id,
      reason: "Aposentadoria programada",
      worldDate: "2026-06-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: `retire:${player.id}`,
      worldSeed: gameWorld.seed,
    });

    expect(first).toMatchObject({ ok: true, value: { careerStatus: "RETIRED" } });
    expect(repeated).toEqual(first);
    expect(repository.snapshot.revision).toBe(revision);
    expect(
      repository.snapshot.lifecycleEvents!.filter(
        (e) => e.type === "PlayerRetired",
      ),
    ).toHaveLength(1);
  });

  it("abre e dá alta em um caso médico via casos de uso persistidos", async () => {
    const { gameWorld, value } = lifecycle();
    const repository = new MemoryPlayerRepository();
    repository.snapshot = value.snapshot();
    const player = value.snapshot().players[0]!;

    const opened = await new OpenMedicalCase(repository).execute(gameWorld.id, {
      playerId: player.id,
      diagnosis: "Fratura por estresse",
      severity: "SEVERE",
      expectedReturnOn: "2026-05-01",
      worldDate: "2026-03-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: `injury:${player.id}:uc`,
      worldSeed: gameWorld.seed,
    });
    if (!opened.ok) throw opened.error;
    expect(
      repository.snapshot.players.find(({ id }) => id === player.id)!
        .availability,
    ).toBe("INJURED");

    const cleared = await new ReassessMedicalCase(repository).execute(
      gameWorld.id,
      {
        medicalCaseId: opened.value.id,
        outcome: "CLEAR",
        worldDate: "2026-05-02",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: `reassess:${opened.value.id}:uc`,
        worldSeed: gameWorld.seed,
      },
    );

    expect(cleared).toMatchObject({ ok: true, value: { status: "CLEARED" } });
    expect(
      repository.snapshot.players.find(({ id }) => id === player.id)!
        .availability,
    ).toBe("AVAILABLE");
  });
});
