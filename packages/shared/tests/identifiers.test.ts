import { describe, expect, it } from "vitest";

import {
  newGameWorldId,
  parseGameWorldId,
  parseRulesetVersion,
} from "../src/index.js";

describe("identificadores compartilhados", () => {
  it("gera e reconhece UUIDv7 para mundos", () => {
    const id = newGameWorldId();
    expect(parseGameWorldId(id)).toEqual({ ok: true, value: id });
  });

  it("rejeita UUID que não seja v7", () => {
    const result = parseGameWorldId("550e8400-e29b-41d4-a716-446655440000");
    expect(result.ok).toBe(false);
  });

  it("aceita SemVer e rejeita versões ambíguas", () => {
    expect(parseRulesetVersion("1.0.0").ok).toBe(true);
    expect(parseRulesetVersion("v1").ok).toBe(false);
  });
});
