import { describe, expect, it } from "vitest";

import {
  addSeconds,
  isDue,
  validateClock,
  SetWorldClock,
  type WorldClockRepository,
  type WorldClockState,
} from "./world-clock.js";

const NOW = "2026-08-01T12:00:00.000Z";
const WORLD = "019f0000-0000-7000-8000-000000000001";

describe("relógio do mundo — puro (MUNDO-V1)", () => {
  it("addSeconds soma no relógio de parede", () => {
    expect(addSeconds(NOW, 14400)).toBe("2026-08-01T16:00:00.000Z"); // +4h
  });

  it("isDue: vencido quando agora ≥ próximo tick", () => {
    expect(isDue("2026-08-01T11:00:00.000Z", NOW)).toBe(true);
    expect(isDue("2026-08-01T13:00:00.000Z", NOW)).toBe(false);
    expect(isDue(null, NOW)).toBe(false);
  });

  it("validateClock recusa fora do range", () => {
    expect(validateClock(14400)).toBeNull();
    expect(validateClock(0)?.code).toBe("INVALID_WORLD_CLOCK");
    expect(validateClock(1.5)?.code).toBe("INVALID_WORLD_CLOCK");
  });
});

class FakeClockRepo implements WorldClockRepository {
  public saved: {
    realSecondsPerDay: number;
    clockRunning: boolean;
    nextTickAtIso: string | null;
  } | null = null;
  public constructor(private clock: WorldClockState | null) {}
  public getClock() {
    return Promise.resolve(this.clock);
  }
  public saveClock(
    _id: string,
    patch: {
      realSecondsPerDay: number;
      clockRunning: boolean;
      nextTickAtIso: string | null;
    },
  ) {
    this.saved = patch;
    return Promise.resolve();
  }
  public dueWorlds() {
    return Promise.resolve([]);
  }
}

function clock(): WorldClockState {
  return {
    gameWorldId: WORLD,
    realSecondsPerDay: null,
    clockRunning: false,
    nextTickAt: null,
    currentDate: "2026-08-01",
    version: 1,
  };
}

describe("SetWorldClock (MUNDO-V1)", () => {
  it("iniciar agenda o próximo tick para agora + duração", async () => {
    const repo = new FakeClockRepo(clock());
    const r = await new SetWorldClock(repo).execute({
      gameWorldId: WORLD,
      realSecondsPerDay: 14400,
      running: true,
      nowIso: NOW,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.nextTickAt).toBe("2026-08-01T16:00:00.000Z");
    expect(repo.saved?.clockRunning).toBe(true);
  });

  it("pausar zera o próximo tick", async () => {
    const repo = new FakeClockRepo(clock());
    const r = await new SetWorldClock(repo).execute({
      gameWorldId: WORLD,
      realSecondsPerDay: 14400,
      running: false,
      nowIso: NOW,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.nextTickAt).toBeNull();
  });

  it("recusa duração inválida", async () => {
    const repo = new FakeClockRepo(clock());
    const r = await new SetWorldClock(repo).execute({
      gameWorldId: WORLD,
      realSecondsPerDay: 0,
      running: true,
      nowIso: NOW,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("INVALID_WORLD_CLOCK");
  });

  it("recusa mundo inexistente", async () => {
    const repo = new FakeClockRepo(null);
    const r = await new SetWorldClock(repo).execute({
      gameWorldId: WORLD,
      realSecondsPerDay: 14400,
      running: true,
      nowIso: NOW,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("WORLD_NOT_FOUND");
  });
});
