import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import { deterministicUuidV7, timestampOf } from "../foundation/deterministic-uuid.js";
import { Player } from "../players/player.js";

import { SESSION_DURATION_DAYS } from "./training-session.js";
import type {
  GroupTrainingSessionSnapshot,
  GroupTrainingSessionUnitOfWork,
} from "./group-training-session-types.js";

/**
 * Inicia a sessão de treino em GRUPO (R-220.2). Cada participante precisa estar
 * DISPONÍVEL e fica indisponível enquanto treina — o que impede, sem regra
 * extra, que ele esteja num treino individual ao mesmo tempo (e vice-versa).
 *
 * Uma sessão de grupo ativa por clube. O entrosamento sobe na COLETA,
 * proporcional ao tempo treinado.
 */
export interface StartGroupTrainingSessionInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly formation: string;
  readonly participantIds: readonly string[];
  readonly worldSeed: string;
  readonly worldDate: string;
}

export class StartGroupTrainingSession {
  public constructor(private readonly uow: GroupTrainingSessionUnitOfWork) {}

  public async execute(
    input: StartGroupTrainingSessionInput,
  ): Promise<Result<{ session: GroupTrainingSessionSnapshot }, DomainError>> {
    return this.uow.run(async ({ sessions, players }) => {
      if (input.participantIds.length === 0) {
        return fail(
          new DomainError(
            "GROUP_TRAINING_NO_PARTICIPANTS",
            "Escolha ao menos um jogador para o treino em grupo.",
            { clubId: input.clubId },
          ),
        );
      }

      const active = await sessions.findActiveByClub(
        input.gameWorldId,
        input.clubId,
      );
      if (active !== null) {
        return fail(
          new DomainError(
            "GROUP_TRAINING_ALREADY_ACTIVE",
            "O clube já tem um treino em grupo em andamento.",
            { clubId: input.clubId },
          ),
        );
      }

      // Cada participante: DISPONÍVEL → indisponível. Se um só não estiver
      // disponível (lesão, suspensão, já treinando), a sessão inteira é recusada
      // — nada de meio-time no treino.
      for (const playerId of input.participantIds) {
        const snapshot = await players.findPlayerById(
          input.gameWorldId as never,
          playerId as never,
        );
        if (snapshot === null) {
          return fail(
            new DomainError("PLAYER_NOT_FOUND", "Jogador não encontrado.", {
              playerId,
            }),
          );
        }
        const loaded = Player.fromSnapshot(snapshot.player);
        if (!loaded.ok) return loaded;
        const player = loaded.value;
        if (!player.beginTraining()) {
          return fail(
            new DomainError(
              "PLAYER_NOT_AVAILABLE",
              "Só jogadores disponíveis entram no treino em grupo.",
              { playerId, availability: player.availability },
            ),
          );
        }
        await players.savePlayer(
          { player: player.snapshot(), person: snapshot.person },
          snapshot.player.version,
        );
      }

      const session: GroupTrainingSessionSnapshot = {
        id: deterministicUuidV7({
          worldSeed: input.worldSeed,
          context: `${input.gameWorldId}:group-training:${input.clubId}`,
          timestampMilliseconds: timestampOf(input.worldDate),
        }),
        gameWorldId: input.gameWorldId,
        clubId: input.clubId,
        formation: input.formation,
        participantIds: [...input.participantIds],
        startDate: input.worldDate,
        durationDays: SESSION_DURATION_DAYS,
        active: true,
        version: 1,
      };
      await sessions.save(session, null);
      return succeed({ session });
    });
  }
}
