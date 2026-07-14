import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
  type RulesetVersion,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldAdmin,
  WorldIdentity,
  type GameWorldSnapshot,
  type IdentityAccountRef,
  type IdentityClubRef,
} from "../../src/index.js";

// GP-001 · Club entry — convergência C1 (identidade/controle) + C12 (risco).
// Uma conta elegível reserva UMA vaga, ativa o controle UMA vez; a disputa da
// última vaga é resolvida por um único vencedor; repetir a intenção não duplica.

const ACCOUNT_A = "019f0000-0000-7000-8000-0000000000a1" as IdentityAccountRef;
const ACCOUNT_B = "019f0000-0000-7000-8000-0000000000b1" as IdentityAccountRef;
const CLUB = "019f0000-0000-7000-8000-0000000000c1" as IdentityClubRef;

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-001",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

function eligibilityOf(
  admin: WorldAdmin,
  gameWorld: GameWorldSnapshot,
  account: string,
  weight: number,
): boolean {
  const assessment = admin.recordRiskSignal({
    dedupKey: `risk:${account}`,
    subject: account,
    kind: "SIGNUP",
    weight,
    source: "onboarding",
    observedOn: "2026-01-04",
    actor: "system",
    rulesetVersion: gameWorld.rulesetVersion,
    idempotencyKey: `risk:${account}`,
    worldSeed: gameWorld.seed,
    worldDate: "2026-01-04",
  });
  if (!assessment.ok) throw assessment.error;
  return !assessment.value.flagged;
}

describe("GP-001 Club entry (convergence)", () => {
  it("uma conta elegível reserva e assume o controle uma única vez", () => {
    const gameWorld = world();
    const ruleset: RulesetVersion = gameWorld.rulesetVersion;
    const identityR = WorldIdentity.initialize(gameWorld, 30);
    const adminR = WorldAdmin.initialize(gameWorld);
    if (!identityR.ok) throw identityR.error;
    if (!adminR.ok) throw adminR.error;
    const identity = identityR.value;
    const admin = adminR.value;

    // C12: conta A é elegível (risco baixo); conta B seria elegível também.
    expect(eligibilityOf(admin, gameWorld, ACCOUNT_A, 10)).toBe(true);

    // C1: A reserva a vaga.
    const reservation = identity.reserveClub({
      clubId: CLUB,
      accountId: ACCOUNT_A,
      expiresOn: "2026-01-10",
      rulesetVersion: ruleset,
      idempotencyKey: "reserve:A",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    expect(reservation).toMatchObject({ ok: true, value: { status: "HELD" } });
    if (!reservation.ok) throw reservation.error;

    // Disputa: B tenta a mesma (última) vaga e perde de forma estável.
    expect(
      identity.reserveClub({
        clubId: CLUB,
        accountId: ACCOUNT_B,
        expiresOn: "2026-01-10",
        rulesetVersion: ruleset,
        idempotencyKey: "reserve:B",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-05",
      }),
    ).toMatchObject({ ok: false, error: { code: "CLUB_ALREADY_RESERVED" } });

    // C1: A conclui o onboarding e ativa o controle (único).
    const control = identity.confirmOnboarding({
      reservationId: reservation.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "onboard:A",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-06",
    });
    expect(control).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    expect(identity.activeControlForClub(CLUB)!.accountId).toBe(ACCOUNT_A);
    expect(identity.summary().activeControlCount).toBe(1);

    // Idempotência: repetir o onboarding com a mesma chave não duplica efeito.
    const revision = identity.snapshot().revision;
    const repeated = identity.confirmOnboarding({
      reservationId: reservation.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "onboard:A",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-06",
    });
    expect(repeated).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    expect(identity.snapshot().revision).toBe(revision);
    expect(identity.summary().activeControlCount).toBe(1);
  });
});
