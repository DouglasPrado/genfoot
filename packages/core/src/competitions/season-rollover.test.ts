import { describe, expect, it } from "vitest";

import { nextSeasonWindow } from "./season-rollover.js";

describe("nextSeasonWindow", () => {
  it("começa no dia seguinte à homologação e mantém a duração", () => {
    // Temporada de 200 dias (01-06 a 18-12); homologada em 20-12.
    const r = nextSeasonWindow("2026-06-01", "2026-12-18", "2026-12-20");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.startsOn).toBe("2026-12-21");
    // 200 dias depois de 21-12-2026.
    expect(r.value.endsOn).toBe("2027-07-09");
  });

  it("a duração da nova temporada é a mesma da encerrada", () => {
    const r = nextSeasonWindow("2026-01-01", "2026-01-31", "2026-02-05");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.startsOn).toBe("2026-02-06");
    expect(r.value.endsOn).toBe("2026-03-08"); // +30 dias
  });

  it("recusa uma janela sem duração positiva", () => {
    const r = nextSeasonWindow("2026-05-10", "2026-05-10", "2026-05-12");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_SEASON_WINDOW");
  });

  it("recusa datas malformadas", () => {
    expect(nextSeasonWindow("nope", "2026-01-31", "2026-02-05").ok).toBe(false);
    expect(nextSeasonWindow("2026-01-01", "2026-13-31", "2026-02-05").ok).toBe(
      false,
    );
  });
});
