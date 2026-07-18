import { describe, expect, it } from "vitest";

import type { NotificationItemSnapshot } from "../notifications/notification-types.js";

import { AutomationLevel } from "./automation-types.js";
import {
  AutomationRuleStatus,
  type AutomationRuleSnapshot,
} from "./automation-rule.js";
import type {
  AutomationRepositories,
  AutomationUnitOfWork,
} from "./automation-ports.js";
import { RunClubAutopilot } from "./run-autopilot.js";

const WORLD = "019f0000-0000-7000-8000-000000000001";
const CLUB = "019f0000-0000-7000-8000-0000000000a1";

function rule(): AutomationRuleSnapshot {
  return {
    id: "rule-1",
    gameWorldId: WORLD,
    clubId: CLUB,
    name: "Escalar XI",
    level: AutomationLevel.SEMI_AUTOMATED,
    status: AutomationRuleStatus.ACTIVE,
    triggerEvent: "BEFORE_MATCH",
    condition: null,
    action: null,
    risk: 1,
    priority: 0,
    version: 1,
  };
}

function harness(opts: { attended: boolean; rules: AutomationRuleSnapshot[] }) {
  const notifications: NotificationItemSnapshot[] = [];
  const repos: AutomationRepositories = {
    profiles: {
      findByClub: () => Promise.resolve(null),
      saveProfile: () => Promise.resolve(),
    },
    rules: {
      findRuleById: () => Promise.resolve(null),
      activeRuleKeys: () => Promise.resolve([]),
      activeRulesForTrigger: () => Promise.resolve(opts.rules),
      saveRuleWithVersion: () => Promise.resolve(),
    },
    attendance: {
      isClubAttended: () => Promise.resolve(opts.attended),
    },
    notifications: {
      append: (item) => {
        notifications.push(item);
        return Promise.resolve();
      },
    },
  };
  const uow: AutomationUnitOfWork = { run: (work) => work(repos) };
  return { uow, notifications };
}

const input = {
  gameWorldId: WORLD,
  clubId: CLUB,
  triggerEvent: "BEFORE_MATCH",
  nowIso: "2026-08-01T12:00:00.000Z",
  occurredOn: "2026-08-01",
  worldSeed: "seed",
};

describe("RunClubAutopilot — precedência da automação (X-001)", () => {
  it("humano presente: a IA se cala (não age, não notifica)", async () => {
    const h = harness({ attended: true, rules: [rule()] });
    const r = await new RunClubAutopilot(h.uow).execute(input);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.acted).toBe(false);
      expect(r.value.reason).toBe("USER_PRESENT");
    }
    expect(h.notifications).toHaveLength(0);
  });

  it("clube desatendido com regra ativa: a IA cobre e registra no inbox", async () => {
    const h = harness({ attended: false, rules: [rule()] });
    const r = await new RunClubAutopilot(h.uow).execute(input);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.acted).toBe(true);
      expect(r.value.reason).toBe("AI_COVERED");
      expect(r.value.firedRuleIds).toEqual(["rule-1"]);
    }
    expect(h.notifications).toHaveLength(1);
    expect(h.notifications[0]!.clubId).toBe(CLUB);
    expect(h.notifications[0]!.type).toBe("BOARD_MESSAGE");
  });

  it("desatendido mas sem regras: nada a fazer", async () => {
    const h = harness({ attended: false, rules: [] });
    const r = await new RunClubAutopilot(h.uow).execute(input);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.reason).toBe("USER_ABSENT_NO_RULES");
    expect(h.notifications).toHaveLength(0);
  });
});
