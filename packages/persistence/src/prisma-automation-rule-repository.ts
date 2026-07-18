import {
  AutomationRuleStatus,
  type ActiveRuleKey,
  type AutomationRuleRepository,
  type AutomationRuleSnapshot,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Adapter das regras de automação (X-001).
 *
 * O gatilho é guardado como `triggerJson = { event }`; a condição e a ação como
 * JSON livre. Cada `saveRuleWithVersion` faz upsert da regra E congela uma
 * `AutomationRuleVersion` — o histórico imutável (por `(ruleId, version)`).
 */
export class PrismaAutomationRuleRepository
  implements AutomationRuleRepository
{
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async findRuleById(
    gameWorldId: string,
    ruleId: string,
  ): Promise<AutomationRuleSnapshot | null> {
    const row = await this.client.automationRule.findFirst({
      where: { id: ruleId, gameWorldId },
    });
    if (row === null) return null;
    return {
      id: row.id,
      gameWorldId: row.gameWorldId,
      clubId: row.clubId,
      name: row.name,
      level: row.level,
      status: row.status,
      triggerEvent: readEvent(row.triggerJson),
      condition: row.conditionJson ?? null,
      action: row.actionJson ?? null,
      risk: row.risk,
      priority: row.priority,
      version: row.version,
    };
  }

  public async activeRuleKeys(
    gameWorldId: string,
    clubId: string,
  ): Promise<readonly ActiveRuleKey[]> {
    const rows = await this.client.automationRule.findMany({
      where: { gameWorldId, clubId, status: AutomationRuleStatus.ACTIVE },
      select: { id: true, triggerJson: true, priority: true },
    });
    return rows.map((r) => ({
      id: r.id,
      triggerEvent: readEvent(r.triggerJson),
      priority: r.priority,
    }));
  }

  public async activeRulesForTrigger(
    gameWorldId: string,
    clubId: string,
    triggerEvent: string,
  ): Promise<readonly AutomationRuleSnapshot[]> {
    const rows = await this.client.automationRule.findMany({
      where: {
        gameWorldId,
        clubId,
        status: AutomationRuleStatus.ACTIVE,
        triggerJson: { path: ["event"], equals: triggerEvent },
      },
      orderBy: { priority: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      gameWorldId: row.gameWorldId,
      clubId: row.clubId,
      name: row.name,
      level: row.level,
      status: row.status,
      triggerEvent: readEvent(row.triggerJson),
      condition: row.conditionJson ?? null,
      action: row.actionJson ?? null,
      risk: row.risk,
      priority: row.priority,
      version: row.version,
    }));
  }

  public async saveRuleWithVersion(
    snapshot: AutomationRuleSnapshot,
  ): Promise<void> {
    const triggerJson = { event: snapshot.triggerEvent } as Prisma.InputJsonValue;
    const conditionJson = (snapshot.condition ??
      undefined) as Prisma.InputJsonValue;
    const actionJson = (snapshot.action ?? undefined) as Prisma.InputJsonValue;
    const common = {
      name: snapshot.name,
      level: snapshot.level,
      status: snapshot.status,
      triggerJson,
      ...(snapshot.condition != null ? { conditionJson } : {}),
      ...(snapshot.action != null ? { actionJson } : {}),
      risk: snapshot.risk,
      priority: snapshot.priority,
      version: snapshot.version,
    };

    await this.client.automationRule.upsert({
      where: { id: snapshot.id },
      create: {
        id: snapshot.id,
        gameWorldId: snapshot.gameWorldId,
        clubId: snapshot.clubId,
        ...common,
      },
      update: common,
    });

    // Congela a versão. Idempotente por (ruleId, version): reprocessar não
    // duplica o snapshot do histórico.
    await this.client.automationRuleVersion.upsert({
      where: {
        ruleId_version: { ruleId: snapshot.id, version: snapshot.version },
      },
      create: {
        ruleId: snapshot.id,
        version: snapshot.version,
        name: snapshot.name,
        level: snapshot.level,
        status: snapshot.status,
        triggerJson,
        ...(snapshot.condition != null ? { conditionJson } : {}),
        ...(snapshot.action != null ? { actionJson } : {}),
        risk: snapshot.risk,
        priority: snapshot.priority,
      },
      update: {},
    });
  }
}

function readEvent(triggerJson: unknown): string {
  if (triggerJson !== null && typeof triggerJson === "object") {
    const event = (triggerJson as { event?: unknown }).event;
    if (typeof event === "string") return event;
  }
  return "";
}
