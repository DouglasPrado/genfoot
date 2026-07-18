import { describe, expect, it } from "vitest";

import { generateSchedule } from "./competition-schedule.js";
import { CompetitionFormat } from "./competition-types.js";

function clubs(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `club-${i + 1}`);
}

const WINDOW = { startsOn: "2026-08-01", endsOn: "2026-12-15" };

describe("generateSchedule — sorteio + calendário (C7, R-206)", () => {
  it("liga de 16 (turno único): 15 rodadas, 120 jogos, todo par uma vez", () => {
    const draws = generateSchedule({
      format: CompetitionFormat.ROUND_ROBIN,
      clubIds: clubs(16),
      ...WINDOW,
    });
    expect(draws).toHaveLength(120); // 15 rodadas × 8 jogos
    const rounds = new Set(draws.map((d) => d.round));
    expect(rounds.size).toBe(15);

    // Cada clube joga 15 vezes; nenhum par se repete.
    const games = new Map<string, number>();
    const pairs = new Set<string>();
    for (const d of draws) {
      games.set(d.homeClubId, (games.get(d.homeClubId) ?? 0) + 1);
      games.set(d.awayClubId, (games.get(d.awayClubId) ?? 0) + 1);
      pairs.add([d.homeClubId, d.awayClubId].sort().join("|"));
    }
    expect(pairs.size).toBe(120);
    for (const club of clubs(16)) expect(games.get(club)).toBe(15);
  });

  it("liga de 16 (turno e returno): 30 rodadas, 240 jogos, mando espelhado", () => {
    const draws = generateSchedule({
      format: CompetitionFormat.DOUBLE_ROUND_ROBIN,
      clubIds: clubs(16),
      ...WINDOW,
    });
    expect(draws).toHaveLength(240);
    expect(new Set(draws.map((d) => d.round)).size).toBe(30);

    // Todo par se enfrenta duas vezes, com mando trocado.
    const oriented = draws.map((d) => `${d.homeClubId}>${d.awayClubId}`);
    expect(new Set(oriented).size).toBe(240); // nenhum confronto orientado repetido
  });

  it("as datas ficam dentro da janela e crescem com a rodada", () => {
    const draws = generateSchedule({
      format: CompetitionFormat.DOUBLE_ROUND_ROBIN,
      clubIds: clubs(16),
      ...WINDOW,
    });
    for (const d of draws) {
      expect(d.scheduledOn >= WINDOW.startsOn).toBe(true);
      expect(d.scheduledOn <= WINDOW.endsOn).toBe(true);
    }
    const r1 = draws.find((d) => d.round === 1)!;
    const r30 = draws.find((d) => d.round === 30)!;
    expect(r1.scheduledOn < r30.scheduledOn).toBe(true);
  });

  it("mata-mata de 16: rodada 1 com 8 jogos, semeado i × (N−1−i)", () => {
    const draws = generateSchedule({
      format: CompetitionFormat.KNOCKOUT,
      clubIds: clubs(16),
      ...WINDOW,
    });
    expect(draws).toHaveLength(8);
    expect(draws.every((d) => d.round === 1)).toBe(true);
    expect(draws[0]).toMatchObject({ homeClubId: "club-1", awayClubId: "club-16" });
    expect(draws[7]).toMatchObject({ homeClubId: "club-8", awayClubId: "club-9" });
  });

  it("recusa liga ímpar e formatos ainda não materializados", () => {
    expect(
      generateSchedule({
        format: CompetitionFormat.ROUND_ROBIN,
        clubIds: clubs(15),
        ...WINDOW,
      }),
    ).toHaveLength(0);
    expect(
      generateSchedule({
        format: CompetitionFormat.GROUPS_AND_KNOCKOUT,
        clubIds: clubs(16),
        ...WINDOW,
      }),
    ).toHaveLength(0);
  });
});
