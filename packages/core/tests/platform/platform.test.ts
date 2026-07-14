import { describe, expect, it } from "vitest";

import {
  advanceDeployment,
  aggregateHealth,
  evaluateRestore,
  evaluateSlo,
  isCommandAllowed,
  type DependencyHealth,
} from "../../src/index.js";

describe("Platform production readiness", () => {
  it("avalia SLO conforme o comparador", () => {
    expect(
      evaluateSlo({ observed: 350, target: 300, comparator: "AT_MOST" }),
    ).toEqual({ breached: true });
    expect(
      evaluateSlo({ observed: 250, target: 300, comparator: "AT_MOST" }),
    ).toEqual({ breached: false });
    expect(
      evaluateSlo({ observed: 99.5, target: 99.9, comparator: "AT_LEAST" }),
    ).toEqual({ breached: true });
  });

  it("agrega a saúde das dependências em um estado global", () => {
    const deps = (
      db: DependencyHealth["status"],
      broker: DependencyHealth["status"],
    ): DependencyHealth[] => [
      { name: "db", status: db, critical: true },
      { name: "broker", status: broker, critical: false },
    ];
    expect(aggregateHealth(deps("DOWN", "UP"))).toBe("UNAVAILABLE");
    expect(aggregateHealth(deps("UP", "UP"), true)).toBe("READ_ONLY");
    expect(aggregateHealth(deps("UP", "DEGRADED"))).toBe("DEGRADED");
    expect(aggregateHealth(deps("UP", "UP"))).toBe("HEALTHY");
  });

  it("bloqueia commands críticos em READ_ONLY e tudo em UNAVAILABLE", () => {
    expect(isCommandAllowed("HEALTHY", "CRITICAL")).toBe(true);
    expect(isCommandAllowed("DEGRADED", "CRITICAL")).toBe(true);
    expect(isCommandAllowed("READ_ONLY", "CRITICAL")).toBe(false);
    expect(isCommandAllowed("READ_ONLY", "SAFE_QUERY")).toBe(true);
    expect(isCommandAllowed("UNAVAILABLE", "SAFE_QUERY")).toBe(false);
  });

  it("libera restore só dentro de RPO/RTO e com integridade", () => {
    expect(
      evaluateRestore({
        observedRpoMinutes: 5,
        observedRtoMinutes: 20,
        targetRpoMinutes: 15,
        targetRtoMinutes: 30,
        integrityChecksPassed: true,
      }),
    ).toMatchObject({ ok: true, value: { withinObjectives: true } });

    expect(
      evaluateRestore({
        observedRpoMinutes: 40,
        observedRtoMinutes: 20,
        targetRpoMinutes: 15,
        targetRtoMinutes: 30,
        integrityChecksPassed: true,
      }),
    ).toMatchObject({ ok: false, error: { code: "RPO_RTO_MISSED" } });

    expect(
      evaluateRestore({
        observedRpoMinutes: 5,
        observedRtoMinutes: 20,
        targetRpoMinutes: 15,
        targetRtoMinutes: 30,
        integrityChecksPassed: false,
      }),
    ).toMatchObject({ ok: false, error: { code: "BACKUP_INVALID" } });
  });

  it("percorre o deployment progressivo com rollback seguro", () => {
    const canary = advanceDeployment("PLANNED", "PROMOTE_CANARY");
    expect(canary).toEqual({ ok: true, value: "CANARY" });
    const rollout = advanceDeployment("CANARY", "START_ROLLOUT");
    expect(rollout).toEqual({ ok: true, value: "ROLLING_OUT" });
    expect(advanceDeployment("ROLLING_OUT", "COMPLETE")).toEqual({
      ok: true,
      value: "COMPLETE",
    });
    expect(advanceDeployment("ROLLING_OUT", "ROLLBACK")).toEqual({
      ok: true,
      value: "ROLLED_BACK",
    });
    expect(advanceDeployment("PLANNED", "COMPLETE")).toMatchObject({
      ok: false,
      error: { code: "INVALID_DEPLOYMENT_TRANSITION" },
    });
    expect(advanceDeployment("COMPLETE", "FAIL")).toMatchObject({
      ok: false,
      error: { code: "INVALID_DEPLOYMENT_TRANSITION" },
    });
  });
});
