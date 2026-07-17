import { describe, expect, it } from "vitest";

import {
  estimateInfraMaintenanceMinor,
  estimateStadiumMaintenanceMinor,
} from "./cost-estimators.js";

describe("estimateInfraMaintenanceMinor", () => {
  it("cresce com nível e capacidade", () => {
    const small = estimateInfraMaintenanceMinor(1, 10, 100);
    const bigger = estimateInfraMaintenanceMinor(3, 10, 100);
    expect(bigger).toBeGreaterThan(small);
  });

  it("condição íntegra (100) não aplica ágio; condição ruim encarece", () => {
    const healthy = estimateInfraMaintenanceMinor(2, 20, 100);
    const degraded = estimateInfraMaintenanceMinor(2, 20, 0);
    expect(degraded).toBeGreaterThan(healthy);
    // condição 0 → fator 1.5 sobre a base.
    expect(degraded).toBe((healthy * 3n) / 2n);
  });

  it("é determinístico", () => {
    expect(estimateInfraMaintenanceMinor(4, 15, 60)).toBe(
      estimateInfraMaintenanceMinor(4, 15, 60),
    );
  });
});

describe("estimateStadiumMaintenanceMinor", () => {
  it("cresce com a capacidade", () => {
    expect(estimateStadiumMaintenanceMinor(20_000, 100)).toBeGreaterThan(
      estimateStadiumMaintenanceMinor(10_000, 100),
    );
  });

  it("condição pior encarece", () => {
    expect(estimateStadiumMaintenanceMinor(10_000, 20)).toBeGreaterThan(
      estimateStadiumMaintenanceMinor(10_000, 100),
    );
  });
});
