import type {
  AutomationRepositories,
  AutomationUnitOfWork,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaClubAIProfileRepository } from "./prisma-club-ai-profile-repository.js";
import { PrismaAutomationRuleRepository } from "./prisma-automation-rule-repository.js";
import { PrismaClubAttendanceRepository } from "./prisma-club-attendance-repository.js";
import { PrismaNotificationRepository } from "./prisma-notification-repository.js";

/**
 * A transação do plano offline (X-001): o perfil de IA do clube num commit.
 * `TransactionClient` (sem `$transaction`) mantém o upsert atômico.
 */
export class PrismaAutomationUnitOfWork implements AutomationUnitOfWork {
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(
    work: (repositories: AutomationRepositories) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction((tx) => work(bind(tx)), {
      timeout: 15_000,
      maxWait: 5_000,
    });
  }
}

function bind(tx: Prisma.TransactionClient): AutomationRepositories {
  return {
    profiles: new PrismaClubAIProfileRepository(tx),
    rules: new PrismaAutomationRuleRepository(tx),
    attendance: new PrismaClubAttendanceRepository(tx),
    notifications: new PrismaNotificationRepository(tx),
  };
}
