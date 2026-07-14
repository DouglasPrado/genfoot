import {
  DomainError,
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
  type GameWorldId,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  CreateStaffMember,
  GameWorld,
  WorldStaff,
  type GameWorldSnapshot,
  type StaffCapabilities,
  type StaffClubRef,
  type StaffDepartmentRef,
  type StaffRepository,
  type WorldStaffSnapshot,
} from "../../src/index.js";

class MemoryStaffRepository implements StaffRepository {
  public snapshot: WorldStaffSnapshot | null = null;

  public findStaffByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldStaffSnapshot | null> {
    return Promise.resolve(
      this.snapshot?.gameWorldId === gameWorldId
        ? structuredClone(this.snapshot)
        : null,
    );
  }

  public saveStaff(
    snapshot: WorldStaffSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    if (
      (expectedRevision === null && this.snapshot !== null) ||
      (expectedRevision !== null &&
        this.snapshot?.revision !== expectedRevision)
    ) {
      throw new DomainError("STAFF_REVISION_CONFLICT", "Conflito.");
    }
    this.snapshot = structuredClone(snapshot);
    return Promise.resolve();
  }
}

const CLUB = "019f0000-0000-7000-8000-000000000001" as StaffClubRef;
const DEPARTMENT =
  "019f0000-0000-7000-8000-000000000009" as StaffDepartmentRef;
const CAPABILITIES: StaffCapabilities = {
  coaching: 60,
  fitness: 40,
  medical: 30,
  scouting: 50,
  management: 45,
};

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function world(seed = "staff-001"): GameWorldSnapshot {
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

function staff(seed = "staff-001") {
  const gameWorld = world(seed);
  const created = WorldStaff.initialize(gameWorld);
  if (!created.ok) throw created.error;
  return { gameWorld, value: created.value };
}

function createHeadCoach(
  aggregate: WorldStaff,
  gameWorld: GameWorldSnapshot,
  key: string,
) {
  const member = aggregate.createStaffMember({
    firstName: "Ana",
    lastName: "Treinadora",
    role: "HEAD_COACH",
    capabilities: CAPABILITIES,
    reputation: 70,
    worldDate: "2026-01-01",
    rulesetVersion: gameWorld.rulesetVersion,
    idempotencyKey: key,
    worldSeed: gameWorld.seed,
  });
  if (!member.ok) throw member.error;
  return member.value;
}

function activeContract(
  aggregate: WorldStaff,
  gameWorld: GameWorldSnapshot,
  staffId: string,
  key: string,
) {
  const offered = aggregate.offerStaffContract({
    staffId,
    clubId: CLUB,
    role: "HEAD_COACH",
    startOn: "2026-01-01",
    endOn: "2026-12-31",
    compensationRef: `comp:${key}`,
    rulesetVersion: gameWorld.rulesetVersion,
    idempotencyKey: `offer:${key}`,
    worldSeed: gameWorld.seed,
    worldDate: "2026-01-01",
  });
  if (!offered.ok) throw offered.error;
  const accepted = aggregate.acceptStaffContract({
    contractId: offered.value.id,
    rulesetVersion: gameWorld.rulesetVersion,
    idempotencyKey: `accept:${key}`,
    worldSeed: gameWorld.seed,
    worldDate: "2026-01-02",
  });
  if (!accepted.ok) throw accepted.error;
  return accepted.value;
}

describe("Staff bounded context", () => {
  it("cria membro e produz um único efeito ao repetir a chave", () => {
    const { gameWorld, value } = staff();
    const first = createHeadCoach(value, gameWorld, "hire:1");
    expect(first.availability).toBe("AVAILABLE");
    const revision = value.snapshot().revision;

    const repeated = value.createStaffMember({
      firstName: "Ana",
      lastName: "Treinadora",
      role: "HEAD_COACH",
      capabilities: CAPABILITIES,
      reputation: 70,
      worldDate: "2026-01-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "hire:1",
      worldSeed: gameWorld.seed,
    });
    expect(repeated).toEqual({ ok: true, value: first });
    expect(value.snapshot().members).toHaveLength(1);
    expect(value.snapshot().revision).toBe(revision);
  });

  it("ativa contrato e bloqueia vínculo ativo sobreposto na mesma função/clube", () => {
    const { gameWorld, value } = staff();
    const coachA = createHeadCoach(value, gameWorld, "a");
    const contract = activeContract(value, gameWorld, coachA.id, "a");
    expect(contract.status).toBe("ACTIVE");
    expect(
      value.snapshot().events.some((e) => e.type === "StaffContractActivated"),
    ).toBe(true);

    const coachB = createHeadCoach(value, gameWorld, "b");
    const offeredB = value.offerStaffContract({
      staffId: coachB.id,
      clubId: CLUB,
      role: "HEAD_COACH",
      startOn: "2026-06-01",
      endOn: "2027-06-01",
      compensationRef: "comp:b",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "offer:b",
      worldSeed: gameWorld.seed,
      worldDate: "2026-05-01",
    });
    if (!offeredB.ok) throw offeredB.error;

    expect(
      value.acceptStaffContract({
        contractId: offeredB.value.id,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "accept:b",
        worldSeed: gameWorld.seed,
        worldDate: "2026-05-02",
      }),
    ).toMatchObject({ ok: false, error: { code: "STAFF_CONTRACT_OVERLAP" } });
  });

  it("aloca staff ativo, marca ASSIGNED e recusa contrato não ativo", () => {
    const { gameWorld, value } = staff();
    const coach = createHeadCoach(value, gameWorld, "c");
    const contract = activeContract(value, gameWorld, coach.id, "c");

    const assignment = value.assignStaff({
      contractId: contract.id,
      departmentRef: DEPARTMENT,
      workload: 50,
      startOn: "2026-01-05",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "assign:c",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    expect(assignment).toMatchObject({ ok: true, value: { workload: 50 } });
    expect(value.findMember(coach.id)!.availability).toBe("ASSIGNED");

    const otherCoach = createHeadCoach(value, gameWorld, "c2");
    const offered = value.offerStaffContract({
      staffId: otherCoach.id,
      clubId: "019f0000-0000-7000-8000-000000000002" as StaffClubRef,
      role: "HEAD_COACH",
      startOn: "2026-01-01",
      endOn: "2026-12-31",
      compensationRef: "comp:c2",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "offer:c2",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    if (!offered.ok) throw offered.error;
    expect(
      value.assignStaff({
        contractId: offered.value.id,
        departmentRef: DEPARTMENT,
        workload: 20,
        startOn: "2026-01-05",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "assign:c2",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-05",
      }),
    ).toMatchObject({ ok: false, error: { code: "STAFF_CONTRACT_NOT_ACTIVE" } });
  });

  it("encerra contrato, libera o membro e rejeita novo encerramento terminal", () => {
    const { gameWorld, value } = staff();
    const coach = createHeadCoach(value, gameWorld, "d");
    const contract = activeContract(value, gameWorld, coach.id, "d");
    const assigned = value.assignStaff({
      contractId: contract.id,
      departmentRef: DEPARTMENT,
      workload: 60,
      startOn: "2026-01-05",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "assign:d",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    if (!assigned.ok) throw assigned.error;

    const ended = value.endStaffContract({
      contractId: contract.id,
      endedOn: "2026-06-30",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "end:d",
      worldSeed: gameWorld.seed,
      worldDate: "2026-06-30",
    });
    expect(ended).toMatchObject({
      ok: true,
      value: { status: "ENDED", endOn: "2026-06-30" },
    });
    expect(value.findMember(coach.id)!.availability).toBe("AVAILABLE");
    expect(
      value.snapshot().assignments.every((a) => a.endOn === "2026-06-30"),
    ).toBe(true);

    expect(
      value.endStaffContract({
        contractId: contract.id,
        endedOn: "2026-07-01",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "end:d:again",
        worldSeed: gameWorld.seed,
        worldDate: "2026-07-01",
      }),
    ).toMatchObject({ ok: false, error: { code: "STAFF_CONTRACT_TERMINAL" } });
  });

  it("consulta capacidade as-of do contrato ativo sem escrita e recusa ruleset divergente", () => {
    const { gameWorld, value } = staff();
    const coach = createHeadCoach(value, gameWorld, "e");
    activeContract(value, gameWorld, coach.id, "e");

    const capability = value.capability(coach.id, date("2026-03-01"));
    expect(capability).toMatchObject({
      role: "HEAD_COACH",
      score: 60,
      confidence: 70,
      asOf: "2026-03-01",
    });
    expect(value.capability(coach.id, date("2030-01-01"))).toBeNull();

    const otherRuleset = parseRulesetVersion("2.0.0");
    if (!otherRuleset.ok) throw otherRuleset.error;
    expect(
      value.createStaffMember({
        firstName: "X",
        lastName: "Y",
        role: "SCOUT",
        capabilities: CAPABILITIES,
        reputation: 50,
        worldDate: "2026-01-01",
        rulesetVersion: otherRuleset.value,
        idempotencyKey: "hire:bad",
        worldSeed: gameWorld.seed,
      }),
    ).toMatchObject({ ok: false, error: { code: "RULESET_VERSION_MISMATCH" } });
  });

  it("persiste criação idempotente de membro via caso de uso", async () => {
    const { gameWorld, value } = staff();
    const repository = new MemoryStaffRepository();
    repository.snapshot = value.snapshot();
    const useCase = new CreateStaffMember(repository);

    const first = await useCase.execute(gameWorld.id, {
      firstName: "Bruno",
      lastName: "Preparador",
      role: "FITNESS_COACH",
      capabilities: CAPABILITIES,
      reputation: 65,
      worldDate: "2026-01-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "hire:uc",
      worldSeed: gameWorld.seed,
    });
    const revision = repository.snapshot.revision;
    const repeated = await useCase.execute(gameWorld.id, {
      firstName: "Bruno",
      lastName: "Preparador",
      role: "FITNESS_COACH",
      capabilities: CAPABILITIES,
      reputation: 65,
      worldDate: "2026-01-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "hire:uc",
      worldSeed: gameWorld.seed,
    });

    expect(first).toMatchObject({ ok: true, value: { role: "FITNESS_COACH" } });
    expect(repeated).toEqual(first);
    expect(repository.snapshot.revision).toBe(revision);
    expect(repository.snapshot.members).toHaveLength(1);
  });

  it("consulta capacidade as-of sem escrita e pagina contratos por cursor", () => {
    const { gameWorld, value } = staff();
    const coach = createHeadCoach(value, gameWorld, "cap");
    const contract = activeContract(value, gameWorld, coach.id, "cap");
    expect(contract.status).toBe("ACTIVE");

    // capability é read-only (não muda a revisão) e as-of do contrato ativo
    const revision = value.snapshot().revision;
    const capability = value.capability(coach.id, date("2026-06-01"));
    expect(capability).toMatchObject({ role: "HEAD_COACH", clubId: CLUB });
    expect(capability!.score).toBeGreaterThan(0);
    expect(value.snapshot().revision).toBe(revision);

    // fora da vigência não há capacidade
    expect(value.capability(coach.id, date("2027-06-01"))).toBeNull();

    // query cursor-based por clube, paginada
    const firstPage = value.listContracts({ clubId: CLUB, limit: 1 });
    expect(firstPage.items).toHaveLength(1);
    const cursor = firstPage.nextCursor;
    // com um único contrato, não há próxima página
    expect(cursor).toBeNull();
  });
});
