import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldIdentity,
  type GameWorldSnapshot,
  type IdentityAccountRef,
  type IdentityClubRef,
} from "../../src/index.js";

// GP-003 · Club exit or switch — convergência C1: encerrar o controle libera a
// vaga para outro controlador (handover) e inicia cooldown de quem saiu; o novo
// controlador assume uma única vez, preservando o histórico do anterior.

const OUTGOING = "019f0000-0000-7000-8000-0000000000a1" as IdentityAccountRef;
const INCOMING = "019f0000-0000-7000-8000-0000000000b1" as IdentityAccountRef;
const CLUB = "019f0000-0000-7000-8000-0000000000c1" as IdentityClubRef;

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-003",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

describe("GP-003 Club exit or switch (convergence)", () => {
  it("a saída libera a vaga e um novo controlador assume uma única vez", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const identityR = WorldIdentity.initialize(gameWorld, 30);
    if (!identityR.ok) throw identityR.error;
    const identity = identityR.value;

    const reservation = identity.reserveClub({
      clubId: CLUB,
      accountId: OUTGOING,
      expiresOn: "2026-01-10",
      rulesetVersion: ruleset,
      idempotencyKey: "reserve:out",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    if (!reservation.ok) throw reservation.error;
    const control = identity.confirmOnboarding({
      reservationId: reservation.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "onboard:out",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-06",
    });
    if (!control.ok) throw control.error;

    // Enquanto A controla, o clube não pode ser reservado por B.
    expect(
      identity.reserveClub({
        clubId: CLUB,
        accountId: INCOMING,
        expiresOn: "2026-02-10",
        rulesetVersion: ruleset,
        idempotencyKey: "reserve:in-blocked",
        worldSeed: gameWorld.seed,
        worldDate: "2026-02-01",
      }),
    ).toMatchObject({ ok: false, error: { code: "CLUB_ALREADY_RESERVED" } });

    // A sai: encerra o controle (libera a vaga e entra em cooldown).
    const exit = identity.endClubControl({
      controlId: control.value.id,
      reason: "EXIT",
      endedOn: "2026-03-01",
      rulesetVersion: ruleset,
      idempotencyKey: "end:out",
      worldSeed: gameWorld.seed,
      worldDate: "2026-03-01",
    });
    expect(exit).toMatchObject({ ok: true, value: { status: "ENDED" } });
    expect(identity.activeControlForClub(CLUB)).toBeNull();

    // Handover: B reserva e assume o clube vago uma única vez.
    const handover = identity.reserveClub({
      clubId: CLUB,
      accountId: INCOMING,
      expiresOn: "2026-03-20",
      rulesetVersion: ruleset,
      idempotencyKey: "reserve:in",
      worldSeed: gameWorld.seed,
      worldDate: "2026-03-05",
    });
    if (!handover.ok) throw handover.error;
    const newControl = identity.confirmOnboarding({
      reservationId: handover.value.id,
      rulesetVersion: ruleset,
      idempotencyKey: "onboard:in",
      worldSeed: gameWorld.seed,
      worldDate: "2026-03-06",
    });
    expect(newControl).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    expect(identity.activeControlForClub(CLUB)!.accountId).toBe(INCOMING);
    expect(identity.summary().activeControlCount).toBe(1);

    // Histórico do controlador anterior preservado.
    expect(
      identity.snapshot().controls.filter((c) => c.status === "ENDED"),
    ).toHaveLength(1);
  });
});
