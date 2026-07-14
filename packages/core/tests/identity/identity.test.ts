import {
  DomainError,
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
  type GameWorldId,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  ConfirmOnboarding,
  GameWorld,
  WorldIdentity,
  type GameWorldSnapshot,
  type IdentityAccountRef,
  type IdentityClubRef,
  type IdentityRepository,
  type WorldIdentitySnapshot,
} from "../../src/index.js";

class MemoryIdentityRepository implements IdentityRepository {
  public snapshot: WorldIdentitySnapshot | null = null;

  public findIdentityByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldIdentitySnapshot | null> {
    return Promise.resolve(
      this.snapshot?.gameWorldId === gameWorldId
        ? structuredClone(this.snapshot)
        : null,
    );
  }

  public saveIdentity(
    snapshot: WorldIdentitySnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    if (
      (expectedRevision === null && this.snapshot !== null) ||
      (expectedRevision !== null &&
        this.snapshot?.revision !== expectedRevision)
    ) {
      throw new DomainError("IDENTITY_REVISION_CONFLICT", "Conflito.");
    }
    this.snapshot = structuredClone(snapshot);
    return Promise.resolve();
  }
}

const ACCOUNT_A = "019f0000-0000-7000-8000-0000000000a1" as IdentityAccountRef;
const ACCOUNT_B = "019f0000-0000-7000-8000-0000000000b1" as IdentityAccountRef;
const CLUB = "019f0000-0000-7000-8000-0000000000c1" as IdentityClubRef;
const CLUB2 = "019f0000-0000-7000-8000-0000000000c2" as IdentityClubRef;

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function world(seed = "identity-001"): GameWorldSnapshot {
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

function identity() {
  const gameWorld = world();
  const created = WorldIdentity.initialize(gameWorld, 30);
  if (!created.ok) throw created.error;
  return { gameWorld, value: created.value };
}

function reserve(
  value: WorldIdentity,
  gameWorld: GameWorldSnapshot,
  accountId: IdentityAccountRef,
  clubId: IdentityClubRef,
  key: string,
) {
  return value.reserveClub({
    clubId,
    accountId,
    expiresOn: "2026-02-01",
    rulesetVersion: gameWorld.rulesetVersion,
    idempotencyKey: key,
    worldSeed: gameWorld.seed,
    worldDate: "2026-01-05",
  });
}

describe("Identity and club control", () => {
  it("garante exclusividade da reserva e um único controle ativo por clube", () => {
    const { gameWorld, value } = identity();
    const first = reserve(value, gameWorld, ACCOUNT_A, CLUB, "res:a");
    expect(first).toMatchObject({ ok: true, value: { status: "HELD" } });

    expect(
      reserve(value, gameWorld, ACCOUNT_B, CLUB, "res:b"),
    ).toMatchObject({ ok: false, error: { code: "CLUB_ALREADY_RESERVED" } });

    if (!first.ok) throw first.error;
    const control = value.confirmOnboarding({
      reservationId: first.value.id,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "onb:a",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-06",
    });
    expect(control).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    expect(value.activeControlForClub(CLUB)!.accountId).toBe(ACCOUNT_A);

    // reserva idempotente (mesma chave) não cria novo efeito
    const revisionBefore = value.snapshot().revision;
    const repeated = reserve(value, gameWorld, ACCOUNT_A, CLUB, "res:a");
    if (!repeated.ok) throw repeated.error;
    expect(repeated.value.id).toBe(first.value.id);
    expect(value.snapshot().reservations).toHaveLength(1);
    expect(value.snapshot().revision).toBe(revisionBefore);
  });

  it("aplica cooldown ao encerrar controle e bloqueia troca durante o cooldown", () => {
    const { gameWorld, value } = identity();
    const reservation = reserve(value, gameWorld, ACCOUNT_A, CLUB, "res:c");
    if (!reservation.ok) throw reservation.error;
    const control = value.confirmOnboarding({
      reservationId: reservation.value.id,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "onb:c",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-06",
    });
    if (!control.ok) throw control.error;

    const ended = value.endClubControl({
      controlId: control.value.id,
      reason: "LEFT",
      endedOn: "2026-06-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "end:c",
      worldSeed: gameWorld.seed,
      worldDate: "2026-06-01",
    });
    expect(ended).toMatchObject({ ok: true, value: { status: "ENDED" } });
    expect(
      value.snapshot().events.some((e) => e.type === "CooldownStarted"),
    ).toBe(true);

    expect(
      value.requestClubSwitch({
        accountId: ACCOUNT_A,
        targetClubId: CLUB2,
        expiresOn: "2026-07-15",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "switch:early",
        worldSeed: gameWorld.seed,
        worldDate: "2026-06-15",
      }),
    ).toMatchObject({ ok: false, error: { code: "COOLDOWN_ACTIVE" } });

    const afterCooldown = value.requestClubSwitch({
      accountId: ACCOUNT_A,
      targetClubId: CLUB2,
      expiresOn: "2026-09-01",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "switch:ok",
      worldSeed: gameWorld.seed,
      worldDate: "2026-08-01",
    });
    expect(afterCooldown).toMatchObject({ ok: true, value: { clubId: CLUB2 } });
  });

  it("rotaciona a sessão e revoga a família ao reutilizar um token antigo", () => {
    const { gameWorld, value } = identity();
    const start = value.startSession({
      accountId: ACCOUNT_A,
      tokenHash: "t1",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "sess:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    if (!start.ok) throw start.error;

    const rotated = value.refreshSession({
      familyId: start.value.id,
      presentedTokenHash: "t1",
      newTokenHash: "t2",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "ref:1",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-06",
    });
    expect(rotated).toMatchObject({
      ok: true,
      value: { currentTokenHash: "t2", status: "ACTIVE" },
    });

    // reúso do token antigo revoga a família
    expect(
      value.refreshSession({
        familyId: start.value.id,
        presentedTokenHash: "t1",
        newTokenHash: "t3",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "ref:reuse",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-07",
      }),
    ).toMatchObject({ ok: false, error: { code: "SESSION_REVOKED" } });

    // qualquer refresh posterior falha
    expect(
      value.refreshSession({
        familyId: start.value.id,
        presentedTokenHash: "t2",
        newTokenHash: "t4",
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "ref:after",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-08",
      }),
    ).toMatchObject({ ok: false, error: { code: "SESSION_REVOKED" } });
  });

  it("confirma onboarding idempotente via caso de uso", async () => {
    const { gameWorld, value } = identity();
    const reservation = reserve(value, gameWorld, ACCOUNT_A, CLUB, "res:uc");
    if (!reservation.ok) throw reservation.error;
    const repository = new MemoryIdentityRepository();
    repository.snapshot = value.snapshot();
    const useCase = new ConfirmOnboarding(repository);
    const input = {
      reservationId: reservation.value.id,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "onb:uc",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-06",
    };
    const first = await useCase.execute(gameWorld.id, input);
    const revision = repository.snapshot.revision;
    const repeated = await useCase.execute(gameWorld.id, input);

    expect(first).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    expect(repeated).toEqual(first);
    expect(repository.snapshot.revision).toBe(revision);
    expect(repository.snapshot.controls).toHaveLength(1);
  });
});
