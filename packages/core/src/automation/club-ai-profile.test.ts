import { describe, expect, it } from "vitest";

import { AutomationLevel, defaultOfflinePlan } from "./automation-types.js";
import { ClubAIProfile } from "./club-ai-profile.js";

const WORLD = "019f0000-0000-7000-8000-000000000001";
const CLUB = "019f0000-0000-7000-8000-0000000000a1";

function plan(overrides: Partial<ReturnType<typeof defaultOfflinePlan>> = {}) {
  return { ...defaultOfflinePlan(), ...overrides };
}

describe("ClubAIProfile — plano offline (X-001)", () => {
  it("nasce com o plano padrão: assessora, sem autoridade de risco", () => {
    const p = ClubAIProfile.default(WORLD, CLUB).snapshot();
    expect(p.plan.automationLevel).toBe(AutomationLevel.ASSISTED);
    expect(p.plan.authorityLimits.canChangeIdentity).toBe(false);
    expect(p.plan.offlineDecisionLevel).toBe(1);
  });

  it("aceita um plano válido", () => {
    const profile = ClubAIProfile.default(WORLD, CLUB);
    const r = profile.setOfflinePlan(
      plan({
        automationLevel: AutomationLevel.SEMI_AUTOMATED,
        offlineDecisionLevel: 2,
        authorityLimits: {
          maxDebtMinor: "10000000",
          maxTransferSpendMinor: "50000000",
          canSellKeyPlayers: false,
          canChangeIdentity: false,
        },
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("recusa delegar a mudança de identidade (alto risco não delegável)", () => {
    const profile = ClubAIProfile.default(WORLD, CLUB);
    const r = profile.setOfflinePlan(
      plan({
        authorityLimits: {
          maxDebtMinor: "0",
          maxTransferSpendMinor: "0",
          canSellKeyPlayers: false,
          canChangeIdentity: true,
        },
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("AUTOMATION_HIGH_RISK_NOT_DELEGABLE");
  });

  it("recusa profundidade fora de [0,3]", () => {
    const r = ClubAIProfile.default(WORLD, CLUB).setOfflinePlan(
      plan({ automationLevel: AutomationLevel.FULLY_AUTOMATED, offlineDecisionLevel: 5 }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("OFFLINE_PLAN_INVALID");
  });

  it("recusa manual com decisão offline > 0 (incoerente)", () => {
    const r = ClubAIProfile.default(WORLD, CLUB).setOfflinePlan(
      plan({ automationLevel: AutomationLevel.MANUAL, offlineDecisionLevel: 2 }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("OFFLINE_PLAN_INVALID");
  });

  it("recusa totalmente automático raso (nível < 2)", () => {
    const r = ClubAIProfile.default(WORLD, CLUB).setOfflinePlan(
      plan({ automationLevel: AutomationLevel.FULLY_AUTOMATED, offlineDecisionLevel: 1 }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("OFFLINE_PLAN_INVALID");
  });

  it("recusa limite de dinheiro não-inteiro", () => {
    const r = ClubAIProfile.default(WORLD, CLUB).setOfflinePlan(
      plan({
        authorityLimits: {
          maxDebtMinor: "-5",
          maxTransferSpendMinor: "0",
          canSellKeyPlayers: false,
          canChangeIdentity: false,
        },
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("AUTHORITY_LIMIT_EXCEEDED");
  });
});
