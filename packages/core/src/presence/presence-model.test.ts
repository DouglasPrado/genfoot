import { describe, expect, it } from "vitest";

import { PRESENCE_TTL_SECONDS, isPresent } from "./presence-model.js";

const NOW = "2026-08-01T12:00:00.000Z";

describe("isPresent — derivação de ausência (X-001)", () => {
  it("nunca visto = ausente", () => {
    expect(isPresent(null, NOW)).toBe(false);
  });

  it("visto agora = presente", () => {
    expect(isPresent(NOW, NOW)).toBe(true);
  });

  it("visto dentro do TTL = presente", () => {
    const seen = "2026-08-01T11:59:30.000Z"; // 30s atrás, TTL 90s
    expect(isPresent(seen, NOW)).toBe(true);
  });

  it("visto além do TTL = ausente", () => {
    const seen = "2026-08-01T11:58:00.000Z"; // 120s atrás
    expect(isPresent(seen, NOW)).toBe(false);
  });

  it("exatamente no limite do TTL = presente", () => {
    const seen = "2026-08-01T11:58:30.000Z"; // 90s atrás
    expect(isPresent(seen, NOW, PRESENCE_TTL_SECONDS)).toBe(true);
  });

  it("datas inválidas = ausente", () => {
    expect(isPresent("nao-e-data", NOW)).toBe(false);
  });
});
