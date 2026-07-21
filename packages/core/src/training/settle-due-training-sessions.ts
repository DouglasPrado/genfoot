import { succeed, type Result } from "@grinta/shared";
import type { RulesetVersion , DomainError} from "@grinta/shared";

import {
  settleTrainingSession,
  type CollectTrainingSessionResult,
} from "./collect-training-session.js";
import { sessionElapsedDays } from "./training-session.js";
import type { TrainingSessionUnitOfWork } from "./training-session-types.js";

/**
 * Encerra as sessões de treino que já cumpriram a duração — o gancho da VIRADA
 * do dia (decisão do dono, 2026-07-20, emenda à R-220.2 / destrava a Trava
 * B-08). Chamado pelos handlers `world:advance-day` / `world:advance-days` DEPOIS
 * de avançar o relógio: toda sessão com `elapsed >= durationDays` é coletada
 * (ganho aplicado, jogador liberado), sem coleta manual.
 *
 * Idempotente por natureza: a sessão vira `active:false` ao settlar, então
 * reavançar não a coleta de novo. Uma sessão que falha ao settlar (jogador
 * sumiu, conflito) é PULADA — não derruba a virada nem as outras.
 */
export interface SettleDueTrainingSessionsInput {
  readonly gameWorldId: string;
  readonly worldSeed: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
}

export interface SettleDueTrainingSessionsResult {
  readonly settledCount: number;
  readonly skippedCount: number;
  /** Um relatório por sessão settlada — alimenta o push de treino completo. */
  readonly reports: readonly CollectTrainingSessionResult[];
}

export class SettleDueTrainingSessions {
  public constructor(private readonly uow: TrainingSessionUnitOfWork) {}

  public async execute(
    input: SettleDueTrainingSessionsInput,
  ): Promise<Result<SettleDueTrainingSessionsResult, DomainError>> {
    return this.uow.run(async (repos) => {
      const active = await repos.sessions.findAllActive(input.gameWorldId);
      let settledCount = 0;
      let skippedCount = 0;
      const reports: CollectTrainingSessionResult[] = [];
      for (const session of active) {
        const elapsed = sessionElapsedDays(session.startDate, input.worldDate);
        if (elapsed < session.durationDays) continue; // ainda em curso
        const result = await settleTrainingSession(repos, {
          session,
          worldSeed: input.worldSeed,
          worldDate: input.worldDate,
          rulesetVersion: input.rulesetVersion,
        });
        if (result.ok) {
          settledCount += 1;
          reports.push(result.value);
        } else skippedCount += 1;
      }
      return succeed({ settledCount, skippedCount, reports });
    });
  }
}
