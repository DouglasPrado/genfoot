import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import { Player } from "../players/player.js";

import { sessionElapsedDays } from "./training-session.js";
import type { GroupTrainingSessionUnitOfWork } from "./group-training-session-types.js";

/**
 * Coleta a sessão de treino em GRUPO: sobe o entrosamento do time e libera os
 * participantes (voltam a ficar disponíveis). Coletar antes do fim vale — o
 * ganho de coesão é aplicado pelo repositório (mesma escrita do
 * `train-formation`), e o tempo mínimo garante que treinou de fato.
 */
const MIN_DAYS_TO_COLLECT = 1;

export interface CollectGroupTrainingSessionInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly worldDate: string;
}

export interface CollectGroupTrainingSessionResult {
  readonly elapsedDays: number;
  readonly complete: boolean;
  readonly participantCount: number;
}

export class CollectGroupTrainingSession {
  public constructor(private readonly uow: GroupTrainingSessionUnitOfWork) {}

  public async execute(
    input: CollectGroupTrainingSessionInput,
  ): Promise<Result<CollectGroupTrainingSessionResult, DomainError>> {
    return this.uow.run(async ({ sessions, players, cohesion }) => {
      const session = await sessions.findActiveByClub(
        input.gameWorldId,
        input.clubId,
      );
      if (session === null) {
        return fail(
          new DomainError(
            "NO_ACTIVE_GROUP_TRAINING",
            "O clube não tem treino em grupo ativo.",
            { clubId: input.clubId },
          ),
        );
      }

      const elapsedDays = sessionElapsedDays(session.startDate, input.worldDate);
      if (elapsedDays < MIN_DAYS_TO_COLLECT) {
        return fail(
          new DomainError(
            "GROUP_TRAINING_TOO_EARLY",
            "O treino em grupo ainda não rendeu — volte mais tarde.",
            { elapsedDays },
          ),
        );
      }

      // Libera cada participante (volta ao elenco, disponível).
      for (const playerId of session.participantIds) {
        const snapshot = await players.findPlayerById(
          input.gameWorldId as never,
          playerId as never,
        );
        if (snapshot === null) continue; // sumiu do mundo — segue os outros.
        const loaded = Player.fromSnapshot(snapshot.player);
        if (!loaded.ok) return loaded;
        const player = loaded.value;
        player.endTraining();
        await players.savePlayer(
          { player: player.snapshot(), person: snapshot.person },
          snapshot.player.version,
        );
      }

      // Sobe o entrosamento do time (mesma escrita do train-formation).
      await cohesion.raiseByFormationTraining(input.gameWorldId, input.clubId);

      await sessions.save(
        { ...session, active: false, version: session.version + 1 },
        session.version,
      );

      return succeed({
        elapsedDays,
        complete: elapsedDays >= session.durationDays,
        participantCount: session.participantIds.length,
      });
    });
  }
}
