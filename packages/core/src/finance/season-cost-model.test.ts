import { describe, expect, it } from "vitest";

import { ClubDepartmentKind } from "../clubs/club-types.js";
import { estimatePlayerValueMinor, estimateSalaryPerSeasonMinor } from "../players/player-value.js";

import {
  CostProvenance,
  SeasonCostCategory,
  computeSeasonCost,
  type SeasonCostModelInput,
} from "./season-cost-model.js";

const CURRENCY = "019b76da-a800-7787-9462-49c009becccc";

/** Um elenco de N jogadores da gênese (sem contrato) com o mesmo overall/idade. */
function genesisSquad(count: number, overall = 60, age = 25) {
  return Array.from({ length: count }, (_, index) => ({
    playerId: `player-${index}`,
    overall,
    age,
    salaryPerSeasonMinor: null,
  }));
}

const baseInput: SeasonCostModelInput = {
  currencyId: CURRENCY,
  players: genesisSquad(23),
  departments: Object.values(ClubDepartmentKind).map((kind) => ({
    kind,
    level: 1,
    capacity: 10,
    condition: 100,
  })),
  stadium: { capacity: 10_000, condition: 100 },
};

function lineOf(
  breakdown: ReturnType<typeof computeSeasonCost>,
  category: SeasonCostCategory,
  provenance: CostProvenance,
) {
  return breakdown.lines.find(
    (line) => line.category === category && line.provenance === provenance,
  );
}

describe("computeSeasonCost", () => {
  it("elenco 100% gênese: toda a folha é ESTIMADA, nenhuma CONTRATADA", () => {
    const breakdown = computeSeasonCost(baseInput);

    expect(breakdown.contractedPlayerCount).toBe(0);
    expect(breakdown.estimatedPlayerCount).toBe(23);
    expect(lineOf(breakdown, SeasonCostCategory.PLAYER_WAGES, CostProvenance.CONTRACTED)).toBeUndefined();

    const estimated = lineOf(breakdown, SeasonCostCategory.PLAYER_WAGES, CostProvenance.ESTIMATED);
    expect(estimated).toBeDefined();
    // 23 × salário estimado de um 60/25.
    const perPlayer = estimateSalaryPerSeasonMinor(estimatePlayerValueMinor(60, 25));
    expect(estimated?.amountMinor).toBe(perPlayer * 23n);
  });

  it("elenco misto: separa linha contratada da estimada e conta cada uma", () => {
    const breakdown = computeSeasonCost({
      ...baseInput,
      players: [
        { playerId: "hired-1", overall: 70, age: 26, salaryPerSeasonMinor: 8_000_000n },
        { playerId: "hired-2", overall: 65, age: 24, salaryPerSeasonMinor: 6_000_000n },
        ...genesisSquad(21),
      ],
    });

    expect(breakdown.contractedPlayerCount).toBe(2);
    expect(breakdown.estimatedPlayerCount).toBe(21);

    const contracted = lineOf(breakdown, SeasonCostCategory.PLAYER_WAGES, CostProvenance.CONTRACTED);
    expect(contracted?.amountMinor).toBe(14_000_000n);
    expect(lineOf(breakdown, SeasonCostCategory.PLAYER_WAGES, CostProvenance.ESTIMATED)).toBeDefined();
  });

  it("emite linhas ESTIMADAS de manutenção de infra e de estádio, ambas > 0", () => {
    const breakdown = computeSeasonCost(baseInput);
    const infra = lineOf(breakdown, SeasonCostCategory.INFRA_MAINTENANCE, CostProvenance.ESTIMATED);
    const stadium = lineOf(breakdown, SeasonCostCategory.STADIUM_MAINTENANCE, CostProvenance.ESTIMATED);
    expect(infra?.amountMinor).toBeGreaterThan(0n);
    expect(stadium?.amountMinor).toBeGreaterThan(0n);
  });

  it("omite categorias sem fonte real em vez de inventar R$ 0", () => {
    const breakdown = computeSeasonCost(baseInput);
    expect(breakdown.omitted).toContain(SeasonCostCategory.STAFF_WAGES);
    expect(breakdown.omitted).toContain(SeasonCostCategory.TRAVEL);
    expect(breakdown.omitted).toContain(SeasonCostCategory.TAXES);
    expect(breakdown.omitted).toContain(SeasonCostCategory.AGENT_COMMISSION);
    // Nenhuma linha para categoria omitida.
    for (const omitted of breakdown.omitted) {
      expect(breakdown.lines.some((line) => line.category === omitted)).toBe(false);
    }
  });

  it("total é exatamente a soma das linhas", () => {
    const breakdown = computeSeasonCost(baseInput);
    const sum = breakdown.lines.reduce((acc, line) => acc + line.amountMinor, 0n);
    expect(breakdown.totalMinor).toBe(sum);
  });

  it("é determinístico: mesma entrada, mesmo total", () => {
    expect(computeSeasonCost(baseInput).totalMinor).toBe(computeSeasonCost(baseInput).totalMinor);
  });

  it("condição pior encarece a manutenção (manutenção adiada custa mais)", () => {
    const healthy = computeSeasonCost(baseInput);
    const degraded = computeSeasonCost({
      ...baseInput,
      stadium: { capacity: 10_000, condition: 20 },
    });
    const healthyStadium = lineOf(healthy, SeasonCostCategory.STADIUM_MAINTENANCE, CostProvenance.ESTIMATED);
    const degradedStadium = lineOf(degraded, SeasonCostCategory.STADIUM_MAINTENANCE, CostProvenance.ESTIMATED);
    expect(degradedStadium!.amountMinor).toBeGreaterThan(healthyStadium!.amountMinor);
  });
});
