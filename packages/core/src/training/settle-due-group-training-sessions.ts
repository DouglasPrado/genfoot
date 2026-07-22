import type { DomainError} from "@grinta/shared";
import { succeed, type Result } from "@grinta/shared";

import { settleGroupSession } from "./collect-group-training-session.js";
import { sessionElapsedDays } from "./training-session.js";
import type { GroupTrainingSessionUnitOfWork } from "./group-training-session-types.js";

/**
 * Encerra as sessões de treino em GRUPO que já cumpriram a duração — o gancho da
 * VIRADA do dia, irmão do `SettleDueTrainingSessions` (individual). Chamado pelos
 * handlers de avanço DEPOIS de mexer o relógio: toda sessão de grupo com
 * `elapsed >= durationDays` é coletada (entrosamento aplicado, participantes
 * liberados), sem coleta manual — o que impede que esquecer de coletar prenda o
 * grupo. Só settla a COMPLETA; a parcial segue disponível para coleta manual.
 *
 * Idempotente: a sessão vira `active:false` ao settlar. Uma que falha é PULADA,
 * não derruba a virada nem as outras.
 */
export interface SettleDueGroupTrainingSessionsInput {
  readonly gameWorldId: string;
  readonly worldDate: string;
}

export interface SettleDueGroupTrainingSessionsResult {
  readonly settledCount: number;
  readonly skippedCount: number;
}

export class SettleDueGroupTrainingSessions {
  public constructor(private readonly uow: GroupTrainingSessionUnitOfWork) {}

  public async execute(
    input: SettleDueGroupTrainingSessionsInput,
  ): Promise<Result<SettleDueGroupTrainingSessionsResult, DomainError>> {
    return this.uow.run(async (repos) => {
      const active = await repos.sessions.findAllActive(input.gameWorldId);
      let settledCount = 0;
      let skippedCount = 0;
      for (const session of active) {
        const elapsed = sessionElapsedDays(session.startDate, input.worldDate);
        if (elapsed < session.durationDays) continue; // ainda em curso
        const result = await settleGroupSession(repos, {
          session,
          worldDate: input.worldDate,
        });
        if (result.ok) settledCount += 1;
        else skippedCount += 1;
      }
      return succeed({ settledCount, skippedCount });
    });
  }
}
