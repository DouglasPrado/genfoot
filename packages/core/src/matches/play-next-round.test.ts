import { describe, expect, it } from "vitest";

import type {
  MatchPlayRepository,
  ScheduledMatchWithStrength,
} from "./match-play-repository.js";
import { PlayNextRound } from "./play-next-round.js";
import type { SimulatedMatchResult } from "./match-simulation.js";

class MemoryPlayRepo implements MatchPlayRepository {
  public saved: SimulatedMatchResult[] = [];
  public constructor(private round: readonly ScheduledMatchWithStrength[]) {}
  nextUnplayedRound(): Promise<readonly ScheduledMatchWithStrength[]> {
    return Promise.resolve(this.round);
  }
  saveResults(
    _worldId: unknown,
    results: readonly SimulatedMatchResult[],
  ): Promise<void> {
    this.saved.push(...results);
    this.round = [];
    return Promise.resolve();
  }
}

const round: readonly ScheduledMatchWithStrength[] = [
  {
    matchId: "019b76da-a800-7a01-9462-49c009be0001",
    roundNumber: 1,
    homeClubId: "club-a",
    awayClubId: "club-b",
    homeStrength: 70,
    awayStrength: 55,
  },
  {
    matchId: "019b76da-a800-7a02-9462-49c009be0002",
    roundNumber: 1,
    homeClubId: "club-c",
    awayClubId: "club-d",
    homeStrength: 60,
    awayStrength: 60,
  },
];

describe("PlayNextRound", () => {
  it("simula toda a rodada e grava os resultados", async () => {
    const repo = new MemoryPlayRepo(round);
    const result = await new PlayNextRound("grinta-demo", repo).execute(
      "world-1" as never,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.roundNumber).toBe(1);
      expect(result.value.results).toHaveLength(2);
    }
    expect(repo.saved).toHaveLength(2);
  });

  /** Determinístico (R-182): a mesma rodada dá o mesmo placar. */
  it("é determinístico — reexecutar dá o mesmo placar", async () => {
    const a = await new PlayNextRound("grinta-demo", new MemoryPlayRepo(round)).execute(
      "world-1" as never,
    );
    const b = await new PlayNextRound("grinta-demo", new MemoryPlayRepo(round)).execute(
      "world-1" as never,
    );
    if (!a.ok || !b.ok) throw new Error("esperado ok");
    expect(a.value.results[0]).toEqual(b.value.results[0]);
  });

  /**
   * Placar de FUTEBOL, não de basquete. Uma rodada inteira do mundo demo tem de
   * ficar numa média plausível — ~3 gols por jogo, não 7. É o que a calibração
   * de `MATCH_CHANCES` garante; se alguém a subir sem querer, isto pega.
   */
  it("produz placares de futebol na média", async () => {
    const wide = Array.from({ length: 40 }, (_, i) => ({
      matchId: `019b76da-a800-7b00-9462-${String(i).padStart(12, "0")}`,
      roundNumber: 1,
      homeClubId: `h${i}`,
      awayClubId: `a${i}`,
      homeStrength: 55 + (i % 20),
      awayStrength: 55 + ((i * 7) % 20),
    }));
    const result = await new PlayNextRound(
      "grinta-demo",
      new MemoryPlayRepo(wide),
    ).execute("world-1" as never);
    if (!result.ok) throw new Error("esperado ok");
    const totalGoals = result.value.results.reduce(
      (sum, m) => sum + m.homeGoals + m.awayGoals,
      0,
    );
    const perMatch = totalGoals / result.value.results.length;
    expect(perMatch).toBeGreaterThan(1.5);
    expect(perMatch).toBeLessThan(4.5);
  });

  it("recusa quando não há rodada a jogar", async () => {
    const result = await new PlayNextRound("grinta-demo", new MemoryPlayRepo([])).execute(
      "world-1" as never,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NO_ROUND_TO_PLAY");
  });
});
