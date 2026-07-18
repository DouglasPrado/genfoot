import { describe, expect, it } from "vitest";

import { AutomationLevel } from "./automation-types.js";
import {
  AutomationRuleStatus,
  type AutomationRuleSnapshot,
} from "./automation-rule.js";
import type {
  AutomationRepositories,
  AutomationUnitOfWork,
} from "./automation-ports.js";
import { SaveAutomation, ToggleAutomation } from "./save-automation.js";

const WORLD = "019f0000-0000-7000-8000-000000000001";
const CLUB = "019f0000-0000-7000-8000-0000000000a1";

class FakeRules {
  public byId = new Map<string, AutomationRuleSnapshot>();
  public findRuleById(_w: string, id: string) {
    return Promise.resolve(this.byId.get(id) ?? null);
  }
  public activeRuleKeys(_w: string, clubId: string) {
    return Promise.resolve(
      [...this.byId.values()]
        .filter(
          (r) => r.clubId === clubId && r.status === AutomationRuleStatus.ACTIVE,
        )
        .map((r) => ({
          id: r.id,
          triggerEvent: r.triggerEvent,
          priority: r.priority,
        })),
    );
  }
  public activeRulesForTrigger(_w: string, clubId: string, trigger: string) {
    return Promise.resolve(
      [...this.byId.values()].filter(
        (r) =>
          r.clubId === clubId &&
          r.status === AutomationRuleStatus.ACTIVE &&
          r.triggerEvent === trigger,
      ),
    );
  }
  public saveRuleWithVersion(snapshot: AutomationRuleSnapshot) {
    this.byId.set(snapshot.id, snapshot);
    return Promise.resolve();
  }
}

function uow(rules: FakeRules): AutomationUnitOfWork {
  const repos: AutomationRepositories = {
    rules,
    profiles: {
      findByClub: () => Promise.resolve(null),
      saveProfile: () => Promise.resolve(),
    },
    attendance: { isClubAttended: () => Promise.resolve(false) },
    notifications: { append: () => Promise.resolve() },
  };
  return { run: (work) => work(repos) };
}

function config(overrides: Record<string, unknown> = {}) {
  return {
    name: "Escalar o melhor XI",
    level: AutomationLevel.SEMI_AUTOMATED,
    triggerEvent: "BEFORE_MATCH",
    condition: null,
    action: { kind: "SET_LINEUP" },
    risk: 1,
    priority: 0,
    ...overrides,
  };
}

describe("SaveAutomation / ToggleAutomation (X-001)", () => {
  it("cria uma regra nova e ativa", async () => {
    const rules = new FakeRules();
    const r = await new SaveAutomation(uow(rules)).execute({
      gameWorldId: WORLD,
      clubId: CLUB,
      newRuleId: "rule-1",
      activate: true,
      config: config(),
    });
    expect(r.ok).toBe(true);
    const saved = rules.byId.get("rule-1")!;
    expect(saved.status).toBe(AutomationRuleStatus.ACTIVE);
    expect(saved.version).toBe(1);
  });

  it("rebaixa alto risco: FULLY_AUTOMATED de risco 5 vira ASSISTED (sugerir)", async () => {
    const rules = new FakeRules();
    await new SaveAutomation(uow(rules)).execute({
      gameWorldId: WORLD,
      clubId: CLUB,
      newRuleId: "rule-hr",
      activate: false,
      config: config({ level: AutomationLevel.FULLY_AUTOMATED, risk: 5 }),
    });
    expect(rules.byId.get("rule-hr")!.level).toBe(AutomationLevel.ASSISTED);
  });

  it("recusa conflito de precedência (mesmo gatilho e prioridade, ambas ativas)", async () => {
    const rules = new FakeRules();
    await new SaveAutomation(uow(rules)).execute({
      gameWorldId: WORLD, clubId: CLUB, newRuleId: "rule-a",
      activate: true, config: config({ triggerEvent: "BEFORE_MATCH", priority: 1 }),
    });
    const r = await new SaveAutomation(uow(rules)).execute({
      gameWorldId: WORLD, clubId: CLUB, newRuleId: "rule-b",
      activate: true, config: config({ triggerEvent: "BEFORE_MATCH", priority: 1 }),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("AUTOMATION_CONFLICT");
  });

  it("permite mesma prioridade em gatilhos diferentes", async () => {
    const rules = new FakeRules();
    await new SaveAutomation(uow(rules)).execute({
      gameWorldId: WORLD, clubId: CLUB, newRuleId: "rule-a",
      activate: true, config: config({ triggerEvent: "BEFORE_MATCH", priority: 1 }),
    });
    const r = await new SaveAutomation(uow(rules)).execute({
      gameWorldId: WORLD, clubId: CLUB, newRuleId: "rule-b",
      activate: true, config: config({ triggerEvent: "ON_OFFER", priority: 1 }),
    });
    expect(r.ok).toBe(true);
  });

  it("reconfigurar bump a versão", async () => {
    const rules = new FakeRules();
    await new SaveAutomation(uow(rules)).execute({
      gameWorldId: WORLD, clubId: CLUB, newRuleId: "rule-1",
      activate: false, config: config(),
    });
    await new SaveAutomation(uow(rules)).execute({
      gameWorldId: WORLD, clubId: CLUB, ruleId: "rule-1", newRuleId: "rule-1",
      activate: false, config: config({ name: "Novo nome" }),
    });
    expect(rules.byId.get("rule-1")!.version).toBe(2);
  });

  it("toggle pausa e reativa; reativar checa conflito", async () => {
    const rules = new FakeRules();
    await new SaveAutomation(uow(rules)).execute({
      gameWorldId: WORLD, clubId: CLUB, newRuleId: "rule-1",
      activate: true, config: config(),
    });
    const paused = await new ToggleAutomation(uow(rules)).execute({
      gameWorldId: WORLD, clubId: CLUB, ruleId: "rule-1", activate: false,
    });
    expect(paused.ok).toBe(true);
    expect(rules.byId.get("rule-1")!.status).toBe(AutomationRuleStatus.PAUSED);
  });
});
