import { describe, expect, it } from "vitest";

import {
  buildStartSessionPayload,
  canCollect,
  canStart,
  sessionStateOf,
} from "./training-session-model.js";

describe("training-session-model (R-221 mobile)", () => {
  it("disponível sem sessão → IDLE (pode iniciar)", () => {
    const s = sessionStateOf({ availability: "AVAILABLE", hasActiveSession: false });
    expect(s).toBe("IDLE");
    expect(canStart(s)).toBe(true);
    expect(canCollect(s)).toBe(false);
  });

  it("com sessão ativa → TREINANDO (pode coletar, não iniciar)", () => {
    const s = sessionStateOf({ availability: "UNAVAILABLE", hasActiveSession: true });
    expect(s).toBe("TRAINING");
    expect(canCollect(s)).toBe(true);
    expect(canStart(s)).toBe(false);
  });

  it("indisponível por lesão sem sessão → BLOQUEADO", () => {
    const s = sessionStateOf({ availability: "INJURED", hasActiveSession: false });
    expect(s).toBe("BLOCKED");
    expect(canStart(s)).toBe(false);
  });

  it("payload de start exige atributo-foco", () => {
    expect(buildStartSessionPayload({ clubId: "c", playerId: "p", attributeCode: null }))
      .toEqual({ error: "NO_ATTRIBUTE" });
    expect(buildStartSessionPayload({ clubId: "c", playerId: "p", attributeCode: "shortPassing" }))
      .toEqual({ clubId: "c", playerId: "p", attributeCode: "shortPassing" });
  });
});
