import { fail, succeed, type DomainError, type Result } from "@grinta/shared";
import type { GameWorldId } from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import { NotificationType } from "../notifications/notification-types.js";

import type {
  AutomationRepositories,
  AutomationUnitOfWork,
} from "./automation-ports.js";

/**
 * RunClubAutopilot (X-001, o executor) — a IA cobre a ausência do usuário.
 *
 * A PRECEDÊNCIA é a regra de ouro (Resolução 27.10.5, "a presença oferece
 * decisão"): se o clube está ATENDIDO por um humano presente, a IA se cala —
 * não toca em nada. Só quando o clube está desatendido (sem controle ativo, ou
 * o controlador ausente) a IA age, dentro das regras ativas que o usuário deixou.
 *
 * Nesta primeira passada a "ação" é REGISTRAR no inbox o que a IA cobriu
 * (BOARD_MESSAGE) — a IA emite os mesmos commands que um humano (INV-17), mas os
 * commands-alvo de clube (escalar, aceitar oferta) ainda não existem; então o
 * executor prova a precedência e a decisão, e a execução real vem quando os
 * commands existirem. Idempotente por (regra, gatilho, dia).
 */
export interface RunAutopilotInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly triggerEvent: string;
  /** O relógio de parede (a ausência é tempo real). Vem da borda. */
  readonly nowIso: string;
  /** A data do mundo, para a notificação (R-177). */
  readonly occurredOn: string;
  readonly worldSeed: string;
}

export interface AutopilotOutcome {
  readonly acted: boolean;
  readonly reason: "USER_PRESENT" | "USER_ABSENT_NO_RULES" | "AI_COVERED";
  readonly firedRuleIds: readonly string[];
}

export class RunClubAutopilot {
  public constructor(private readonly unitOfWork: AutomationUnitOfWork) {}

  public execute(
    input: RunAutopilotInput,
  ): Promise<Result<AutopilotOutcome, DomainError>> {
    return run(this.unitOfWork, async (repos): Promise<
      Result<AutopilotOutcome, DomainError>
    > => {
      const attended = await repos.attendance.isClubAttended(
        input.gameWorldId,
        input.clubId,
        input.nowIso,
      );
      // Precedência: o humano presente decide; a IA não interfere.
      if (attended) {
        return succeed({
          acted: false,
          reason: "USER_PRESENT" as const,
          firedRuleIds: [],
        });
      }

      const rules = await repos.rules.activeRulesForTrigger(
        input.gameWorldId,
        input.clubId,
        input.triggerEvent,
      );
      if (rules.length === 0) {
        return succeed({
          acted: false,
          reason: "USER_ABSENT_NO_RULES" as const,
          firedRuleIds: [],
        });
      }

      for (const rule of rules) {
        const notificationId = deterministicUuidV7({
          worldSeed: input.worldSeed,
          context: `autopilot:${input.clubId}:${rule.id}:${input.triggerEvent}:${input.occurredOn}`,
          timestampMilliseconds: Date.parse(`${input.occurredOn}T00:00:00.000Z`),
        });
        await repos.notifications.append({
          id: notificationId,
          gameWorldId: input.gameWorldId as GameWorldId,
          userId: null,
          clubId: input.clubId,
          type: NotificationType.BOARD_MESSAGE,
          title: "A automação cobriu sua ausência",
          message: `A IA aplicou a regra "${rule.name}" (${rule.level}) no gatilho ${input.triggerEvent}.`,
          priority: rule.priority,
          createdOn: input.occurredOn,
        });
      }

      return succeed({
        acted: true,
        reason: "AI_COVERED" as const,
        firedRuleIds: rules.map((r) => r.id),
      });
    });
  }
}

class Rollback extends Error {
  public constructor(public readonly domainError: DomainError) {
    super(domainError.message);
  }
}

async function run<T>(
  unitOfWork: AutomationUnitOfWork,
  work: (
    repositories: AutomationRepositories,
  ) => Promise<Result<T, DomainError>>,
): Promise<Result<T, DomainError>> {
  try {
    return await unitOfWork.run(async (repositories) => {
      const result = await work(repositories);
      if (!result.ok) throw new Rollback(result.error);
      return result;
    });
  } catch (error) {
    if (error instanceof Rollback) return fail(error.domainError);
    throw error;
  }
}
