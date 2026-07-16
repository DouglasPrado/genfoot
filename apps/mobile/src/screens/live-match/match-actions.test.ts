import { describe, expect, it } from "vitest";

import {
  COACH_ACTIONS,
  buildCoachCommand,
  coachSide,
  nextMatchAction,
} from "./match-actions";

describe("ação oficial da jornada de partida", () => {
  it("bloqueia início antes do kickoff", () => {
    expect(
      nextMatchAction({
        status: "CREATED",
        kickoffOn: "2026-01-08",
        worldDate: "2026-01-07",
      }),
    ).toEqual({ kind: "BLOCKED", label: "DISPONÍVEL EM 2026-01-08" });
  });

  it("inicia no kickoff, avança runtime e finaliza no último tick", () => {
    expect(
      nextMatchAction({
        status: "CREATED",
        kickoffOn: "2026-01-08",
        worldDate: "2026-01-08",
      }),
    ).toMatchObject({ kind: "COMMAND", commandType: "match:start" });
    expect(
      nextMatchAction({
        status: "IN_PROGRESS",
        kickoffOn: "2026-01-08",
        worldDate: "2026-01-08",
        currentTick: 20,
        totalTicks: 90,
      }),
    ).toMatchObject({ kind: "COMMAND", commandType: "match:advance-ticks" });
    expect(
      nextMatchAction({
        status: "IN_PROGRESS",
        kickoffOn: "2026-01-08",
        worldDate: "2026-01-08",
        currentTick: 90,
        totalTicks: 90,
      }),
    ).toMatchObject({ kind: "COMMAND", commandType: "match:finalize" });
  });

  it("não oferece mutação após o resultado final", () => {
    expect(
      nextMatchAction({
        status: "FINAL",
        kickoffOn: "2026-01-08",
        worldDate: "2026-01-08",
      }),
    ).toEqual({ kind: "NONE", label: "RESULTADO OFICIAL" });
  });
});

describe("ações de treinador (M-LIVE)", () => {
  it("todas as ações respeitam o limite ±8 do motor", () => {
    for (const action of COACH_ACTIONS) {
      expect(Math.abs(action.delta)).toBeLessThanOrEqual(8);
      expect(action.label.length).toBeGreaterThan(0);
    }
  });

  it("deriva o lado do clube gerenciado ou bloqueia partida alheia", () => {
    const match = { homeClubId: "casa", awayClubId: "fora" };
    expect(coachSide(match, "casa")).toBe("HOME");
    expect(coachSide(match, "fora")).toBe("AWAY");
    expect(coachSide(match, "outro")).toBeNull();
    expect(coachSide(match, null)).toBeNull();
  });

  it("monta o payload oficial com sequência e hash estáveis", () => {
    const payload = buildCoachCommand({
      matchId: "m1",
      side: "HOME",
      action: COACH_ACTIONS[0]!,
      nextSequence: 3,
      actor: "manager:me",
    });
    expect(payload).toMatchObject({
      matchId: "m1",
      side: "HOME",
      delta: 6,
      expectedSequence: 3,
      commandType: "TACTIC_ALL_OUT",
      commandId: "coach:m1:3",
    });
    expect(String(payload.payloadHash)).not.toBe("");
  });
});
