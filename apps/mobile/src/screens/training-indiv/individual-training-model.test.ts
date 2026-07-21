import { describe, expect, it } from "vitest";

import {
  ARCHETYPE_OPTIONS,
  POSITION_OPTIONS,
  buildSetIndividualPlanPayload,
  positionLabel,
  targetAttributeOptions,
  tradeoffHint,
} from "./individual-training-model.js";

describe("individual-training-model (M-TRAINING-INDIV)", () => {
  it("cobre as 15 posições do domínio com rótulo PT único", () => {
    expect(POSITION_OPTIONS).toHaveLength(15);
    expect(new Set(POSITION_OPTIONS.map((o) => o.label)).size).toBe(15);
    expect(positionLabel("ST")).toBe("Centroavante");
    expect(positionLabel("XYZ")).toBe("XYZ"); // desconhecida cai no código
  });

  it("targetAttributeOptions mostra só o que o jogador TEM, com rótulo PT", () => {
    const opts = targetAttributeOptions({
      finishing: 30,
      goalkeeperReflexes: null, // jogador de linha: não aparece
      pace: 60,
    });
    expect(opts.map((o) => o.attributeCode).sort()).toEqual(["finishing", "pace"]);
    expect(opts.find((o) => o.attributeCode === "finishing")?.label).toBe("Finalização");
    expect(opts.find((o) => o.attributeCode === "finishing")?.value).toBe(30);
  });

  it("tradeoffHint: uma habilidade concentra; várias dividem; posição espalha", () => {
    expect(tradeoffHint({ kind: "ATTRIBUTE", attributeCodes: ["finishing"] })).toMatch(/CONCENTRADO/);
    expect(tradeoffHint({ kind: "ATTRIBUTE", attributeCodes: ["finishing", "pace"] })).toMatch(/DIVIDIDO/);
    expect(tradeoffHint({ kind: "POSITION", position: "ST" })).toMatch(/ESPALHADO/);
  });

  it("monta o payload de ATRIBUTO (até 5) com a intensidade presa em 0..100", () => {
    const p = buildSetIndividualPlanPayload({
      clubId: "c1", playerId: "p1",
      target: { kind: "ATTRIBUTE", attributeCodes: ["finishing", "pace"] },
      intensity: 140, expectedVersion: 3,
    });
    if ("error" in p) throw new Error("deveria montar");
    expect(p.target).toEqual({ kind: "ATTRIBUTE", attributeCodes: ["finishing", "pace"] });
    expect(p.intensity).toBe(100);
    expect(p.expectedVersion).toBe(3);
  });

  it("monta o payload de POSIÇÃO", () => {
    const p = buildSetIndividualPlanPayload({
      clubId: "c1", playerId: "p1",
      target: { kind: "POSITION", position: "CB" },
      intensity: 60, expectedVersion: null,
    });
    if ("error" in p) throw new Error("deveria montar");
    expect(p.target).toEqual({ kind: "POSITION", position: "CB" });
  });

  it("oferece os 3 arquétipos de goleiro e monta o payload GK_ARCHETYPE", () => {
    expect(ARCHETYPE_OPTIONS.map((a) => a.archetype).sort()).toEqual([
      "CLASSIC", "SHOT_STOPPER", "SWEEPER",
    ]);
    const p = buildSetIndividualPlanPayload({
      clubId: "c1", playerId: "gk",
      target: { kind: "GK_ARCHETYPE", archetype: "SHOT_STOPPER" },
      intensity: 70, expectedVersion: null,
    });
    if ("error" in p) throw new Error("deveria montar");
    expect(p.target).toEqual({ kind: "GK_ARCHETYPE", archetype: "SHOT_STOPPER" });
    expect(tradeoffHint(p.target)).toMatch(/ESPALHADO/);
  });

  it("sem alvo definido → NO_TARGET (não sai do aparelho)", () => {
    expect(buildSetIndividualPlanPayload({
      clubId: "c1", playerId: "p1", target: null, intensity: 50, expectedVersion: null,
    })).toEqual({ error: "NO_TARGET" });
    expect(buildSetIndividualPlanPayload({
      clubId: "c1", playerId: "p1",
      target: { kind: "ATTRIBUTE", attributeCodes: [] }, intensity: 50, expectedVersion: null,
    })).toEqual({ error: "NO_TARGET" });
  });
});
