import { describe, expect, it } from "vitest";
import { CommandTrackingStatus } from "@grinta/core";

import { deriveScreenState } from "./screen-state";

describe("estado canônico de tela mobile", () => {
  it.each([
    [{ session: "connecting", query: "loading" }, "initial-loading"],
    [
      { session: "offline", query: "ready", hasCachedData: true },
      "partial-stale",
    ],
    [{ session: "offline", query: "offline" }, "offline"],
    [{ session: "online", query: "empty" }, "empty"],
    [{ session: "online", query: "error" }, "technical-error"],
    [{ session: "online", query: "ready", blocked: true }, "forbidden"],
    [{ session: "online", query: "ready", expired: true }, "expired"],
    [{ session: "online", query: "ready", maintenance: true }, "maintenance"],
    [
      {
        session: "online",
        query: "ready",
        command: CommandTrackingStatus.SUBMITTING,
      },
      "processing",
    ],
    [
      {
        session: "online",
        query: "ready",
        command: CommandTrackingStatus.REJECTED,
        domainError: true,
      },
      "domain-error",
    ],
    [{ session: "online", query: "ready", conflict: true }, "conflict"],
    [{ session: "online", query: "ready" }, "success"],
  ] as const)("deriva %j como %s", (input, expected) => {
    expect(deriveScreenState(input)).toBe(expected);
  });
});
