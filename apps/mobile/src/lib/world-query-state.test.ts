import { describe, expect, it } from "vitest";
import { queryStateForApiError } from "./world-query-state";

describe("queryStateForApiError", () => {
  it("expõe mundo inexistente como erro mesmo quando há cache", () => {
    expect(queryStateForApiError("WORLD_NOT_FOUND", false)).toBe("error");
    expect(queryStateForApiError("WORLD_NOT_FOUND", true)).toBe("error");
  });

  it("mantém contexto ausente como projeção vazia", () => {
    expect(queryStateForApiError("IDENTITY_NOT_FOUND", false)).toBe("empty");
  });

  it("degrada uma falha desconhecida para cache offline quando possível", () => {
    expect(queryStateForApiError("SERVICE_UNAVAILABLE", true)).toBe("offline");
    expect(queryStateForApiError("SERVICE_UNAVAILABLE", false)).toBe("error");
  });
});
