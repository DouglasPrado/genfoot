import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import {
  deterministicUuidV7,
  timestampOf,
} from "../foundation/deterministic-uuid.js";
import { Player } from "../players/player.js";
import type { PlayerAttributeCode } from "../players/player-lifecycle-types.js";

import { SESSION_DURATION_DAYS } from "./training-session.js";
import type {
  TrainingSessionSnapshot,
  TrainingSessionUnitOfWork,
} from "./training-session-types.js";

/**
 * Inicia uma sessão de treino (R-221 Fase 2a, `training:start-session`).
 *
 * O jogador some do jogo enquanto treina (`beginTraining` → indisponível). Uma
 * sessão ativa por vez; foco num atributo que se aplique à posição. Nada muda no
 * atributo agora — o ganho vem na COLETA, proporcional ao tempo treinado.
 */
export interface StartTrainingSessionInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly playerId: string;
  readonly attributeCode: string;
  readonly worldSeed: string;
  readonly worldDate: string;
}

export class StartTrainingSession {
  public constructor(private readonly uow: TrainingSessionUnitOfWork) {}

  public async execute(
    input: StartTrainingSessionInput,
  ): Promise<Result<{ session: TrainingSessionSnapshot }, DomainError>> {
    return this.uow.run(async ({ sessions, players }) => {
      const active = await sessions.findActiveByPlayer(
        input.gameWorldId,
        input.playerId,
      );
      if (active !== null) {
        return fail(
          new DomainError(
            "TRAINING_SESSION_ALREADY_ACTIVE",
            "O jogador já está numa sessão de treino.",
            { playerId: input.playerId },
          ),
        );
      }

      const snapshot = await players.findPlayerById(
        input.gameWorldId as never,
        input.playerId as never,
      );
      if (snapshot === null) {
        return fail(
          new DomainError("PLAYER_NOT_FOUND", "Jogador não encontrado.", {
            playerId: input.playerId,
          }),
        );
      }
      const loaded = Player.fromSnapshot(snapshot.player);
      if (!loaded.ok) return loaded;
      const player = loaded.value;

      if (player.attributeValue(input.attributeCode as PlayerAttributeCode) === null) {
        return fail(
          new DomainError(
            "ATTRIBUTE_NOT_APPLICABLE",
            "Esse atributo não se aplica à posição do jogador.",
            { playerId: input.playerId, attributeCode: input.attributeCode },
          ),
        );
      }

      if (!player.beginTraining()) {
        return fail(
          new DomainError(
            "PLAYER_NOT_AVAILABLE",
            "Só um jogador disponível entra em treino de sessão.",
            { playerId: input.playerId, availability: player.availability },
          ),
        );
      }

      const session: TrainingSessionSnapshot = {
        id: deterministicUuidV7({
          worldSeed: input.worldSeed,
          context: `${input.gameWorldId}:training-session:${input.playerId}`,
          timestampMilliseconds: timestampOf(input.worldDate),
        }),
        gameWorldId: input.gameWorldId,
        clubId: input.clubId,
        playerId: input.playerId,
        attributeCode: input.attributeCode,
        startDate: input.worldDate,
        durationDays: SESSION_DURATION_DAYS,
        active: true,
        version: 1,
      };

      await sessions.save(session, null);
      await players.savePlayer(
        { player: player.snapshot(), person: snapshot.person },
        snapshot.player.version,
      );
      return succeed({ session });
    });
  }
}
