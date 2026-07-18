import { describe, expect, it } from "vitest";

import { Competition } from "./competition.js";
import {
  CompetitionLifecycle,
  defaultKnockoutConfig,
  defaultLeagueConfig,
  type CompetitionConfig,
} from "./competition-config.js";
import { CompetitionFormat, CompetitionType } from "./competition-types.js";

const WORLD = "019f0000-0000-7000-8000-000000000001";

function clubs(n: number): string[] {
  return Array.from(
    { length: n },
    (_, i) => `019f0000-0000-7000-8000-${(i + 1).toString(16).padStart(12, "0")}`,
  );
}

function league(config: CompetitionConfig = defaultLeagueConfig()) {
  const created = Competition.create(
    {
      id: "019f0000-0000-7000-8000-0000000000a1",
      gameWorldId: WORLD,
      name: "Série A",
      type: CompetitionType.LEAGUE,
      format: CompetitionFormat.DOUBLE_ROUND_ROBIN,
      tier: 1,
      reputation: 70,
    },
    config,
  );
  if (!created.ok) throw new Error("setup falhou");
  return created.value;
}

describe("Competition — agregado autorado (C7, R-202)", () => {
  it("nasce em RASCUNHO, sem janela nem participantes", () => {
    const c = league().snapshot();
    expect(c.lifecycle).toBe(CompetitionLifecycle.DRAFT);
    expect(c.startsOn).toBeNull();
    expect(c.clubIds).toHaveLength(0);
    expect(c.version).toBe(1);
  });

  it("configura participantes e janela em RASCUNHO", () => {
    const c = league();
    const r = c.configure({
      clubIds: clubs(20),
      startsOn: "2026-08-01",
      endsOn: "2026-12-15",
    });
    expect(r.ok).toBe(true);
    expect(c.snapshot().clubIds).toHaveLength(20);
    expect(c.snapshot().version).toBe(2);
  });

  it("recusa participante duplicado", () => {
    const c = league();
    const dup = clubs(20);
    dup[1] = dup[0]!;
    const r = c.configure({ clubIds: dup });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("INVALID_COMPETITION");
  });

  it("trava uma liga de 20 com janela válida (RASCUNHO→AGENDADA)", () => {
    const c = league();
    c.configure({
      clubIds: clubs(20),
      startsOn: "2026-08-01",
      endsOn: "2026-12-15",
    });
    const r = c.lock();
    expect(r.ok).toBe(true);
    expect(c.snapshot().lifecycle).toBe(CompetitionLifecycle.SCHEDULED);
  });

  it("recusa lock sem janela", () => {
    const c = league();
    c.configure({ clubIds: clubs(20) });
    const r = c.lock();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("INVALID_COMPETITION_WINDOW");
  });

  it("recusa lock com término antes do início", () => {
    const c = league();
    c.configure({
      clubIds: clubs(20),
      startsOn: "2026-12-15",
      endsOn: "2026-08-01",
    });
    const r = c.lock();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("INVALID_COMPETITION_WINDOW");
  });

  it("recusa liga com número ímpar de clubes", () => {
    const c = league();
    c.configure({
      clubIds: clubs(19),
      startsOn: "2026-08-01",
      endsOn: "2026-12-15",
    });
    const r = c.lock();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("INVALID_COMPETITION_PARTICIPANTS");
  });

  it("a config é IMUTÁVEL depois do lock (R-52)", () => {
    const c = league();
    c.configure({
      clubIds: clubs(20),
      startsOn: "2026-08-01",
      endsOn: "2026-12-15",
    });
    c.lock();
    const r = c.configure({ name: "Outra coisa" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("COMPETITION_LOCKED");
  });

  it("percorre o ciclo AGENDADA→EM_ANDAMENTO→ENCERRADA", () => {
    const c = league();
    c.configure({
      clubIds: clubs(20),
      startsOn: "2026-08-01",
      endsOn: "2026-12-15",
    });
    c.lock();
    expect(c.start().ok).toBe(true);
    expect(c.snapshot().lifecycle).toBe(CompetitionLifecycle.RUNNING);
    expect(c.finish().ok).toBe(true);
    expect(c.snapshot().lifecycle).toBe(CompetitionLifecycle.FINISHED);
  });

  it("não deixa começar quem ainda é rascunho", () => {
    const c = league();
    const r = c.start();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("COMPETITION_NOT_SCHEDULED");
  });

  describe("copa mata-mata", () => {
    function cup(n: number) {
      const created = Competition.create(
        {
          id: "019f0000-0000-7000-8000-0000000000b1",
          gameWorldId: WORLD,
          name: "Copa",
          type: CompetitionType.CUP,
          format: CompetitionFormat.KNOCKOUT,
          tier: null,
          reputation: 55,
        },
        defaultKnockoutConfig(),
      );
      if (!created.ok) throw new Error("setup falhou");
      const c = created.value;
      c.configure({
        clubIds: clubs(n),
        startsOn: "2026-08-01",
        endsOn: "2026-11-01",
      });
      return c;
    }

    it("trava mata-mata com potência de 2", () => {
      expect(cup(16).lock().ok).toBe(true);
    });

    it("recusa mata-mata que não é potência de 2", () => {
      const r = cup(12).lock();
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe("INVALID_COMPETITION_PARTICIPANTS");
    });
  });
});
