import { describe, expect, it } from "vitest";

import { WorldDate } from "../src/index.js";

describe("WorldDate", () => {
  it("valida e avança datas lógicas sem depender de fuso horário", () => {
    const parsed = WorldDate.parse("2028-02-28");

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.value.addDays(1).toString()).toBe("2028-02-29");
    expect(parsed.value.addDays(2).toString()).toBe("2028-03-01");
  });

  it.each(["2026-02-29", "2026-13-01", "13/07/2026", "2026-1-01"])(
    "rejeita a data inválida %s",
    (value) => {
      const result = WorldDate.parse(value);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("INVALID_WORLD_DATE");
    },
  );
});
