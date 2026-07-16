import { describe, expect, it } from "vitest";

import {
  deriveGoldenPathScreenState,
  GOLDEN_PATH_REGISTRY,
  goldenPathById,
} from "../../src/index.js";

describe("mobile golden path registry", () => {
  it("registra GP-001…GP-016 uma única vez com contratos oficiais", () => {
    expect(GOLDEN_PATH_REGISTRY).toHaveLength(16);
    expect(GOLDEN_PATH_REGISTRY.map((path) => path.id)).toEqual(
      Array.from({ length: 16 }, (_, index) =>
        `GP-${String(index + 1).padStart(3, "0")}`,
      ),
    );
    expect(new Set(GOLDEN_PATH_REGISTRY.map((path) => path.id)).size).toBe(16);

    for (const path of GOLDEN_PATH_REGISTRY) {
      expect(path.screenIds.length).toBeGreaterThan(0);
      expect(path.queryTypes.length).toBeGreaterThan(0);
      expect(path.commandTypes.length).toBeGreaterThan(0);
      expect(path.commandTypes.every((type) => type.includes(":"))).toBe(true);
    }
  });

  it("mantém ações irreversíveis fora da fila offline", () => {
    expect(goldenPathById("GP-008")?.risk).toBe("irreversible");
    expect(goldenPathById("GP-008")?.offlineIntentTypes).toEqual([]);
    expect(goldenPathById("GP-013")?.offlineIntentTypes).toEqual([]);
    expect(goldenPathById("GP-005")?.offlineIntentTypes).toEqual([
      "SET_LINEUP_DRAFT",
      "TOGGLE_TRAINING_FOCUS",
    ]);
  });

  it("deriva todos os estados explícitos sem simular sucesso", () => {
    expect(deriveGoldenPathScreenState({ session: "connecting", query: "idle" })).toBe(
      "initial-loading",
    );
    expect(deriveGoldenPathScreenState({ session: "offline", query: "ready" })).toBe(
      "offline",
    );
    expect(deriveGoldenPathScreenState({ session: "online", query: "empty" })).toBe(
      "empty",
    );
    expect(deriveGoldenPathScreenState({ session: "online", query: "error" })).toBe(
      "technical-error",
    );
    expect(
      deriveGoldenPathScreenState({
        session: "online",
        query: "ready",
        blocked: true,
      }),
    ).toBe("forbidden/read-only");
    expect(
      deriveGoldenPathScreenState({
        session: "online",
        query: "ready",
        command: "SUBMITTING",
      }),
    ).toBe("processing");
    expect(
      deriveGoldenPathScreenState({
        session: "online",
        query: "ready",
        command: "UNKNOWN_RECOVERING",
      }),
    ).toBe("partial/stale");
    expect(
      deriveGoldenPathScreenState({
        session: "online",
        query: "ready",
        command: "REJECTED",
      }),
    ).toBe("domain-error");
    expect(
      deriveGoldenPathScreenState({
        session: "online",
        query: "ready",
        command: "APPLIED",
      }),
    ).toBe("success");
    expect(deriveGoldenPathScreenState({ session: "online", query: "ready" })).toBe(
      "content",
    );
  });
});
