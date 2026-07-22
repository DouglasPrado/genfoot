import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import {
  deterministicUuidV7,
  timestampOf,
} from "../foundation/deterministic-uuid.js";
import { Player } from "../players/player.js";
import type { PlayerAttributeCode } from "../players/player-lifecycle-types.js";

import { INDIVIDUAL_SESSION_DURATION_DAYS } from "./training-session.js";
import {
  MAX_SESSION_ATTRIBUTES,
  type TrainingSessionSnapshot,
  type TrainingSessionUnitOfWork,
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
  /** 1..5 atributos-foco (o ganho é dividido entre eles). */
  readonly attributeCodes: readonly string[];
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

      // 1..5 habilidades distintas, todas aplicáveis à posição.
      const attributeCodes = [...new Set(input.attributeCodes)];
      if (
        attributeCodes.length === 0 ||
        attributeCodes.length > MAX_SESSION_ATTRIBUTES
      ) {
        return fail(
          new DomainError(
            "TRAINING_ATTRIBUTES_INVALID",
            `Escolha de 1 a ${MAX_SESSION_ATTRIBUTES} habilidades para treinar.`,
            { playerId: input.playerId, count: attributeCodes.length },
          ),
        );
      }
      const notApplicable = attributeCodes.find(
        (code) => player.attributeValue(code as PlayerAttributeCode) === null,
      );
      if (notApplicable !== undefined) {
        return fail(
          new DomainError(
            "ATTRIBUTE_NOT_APPLICABLE",
            "Uma das habilidades não se aplica à posição do jogador.",
            { playerId: input.playerId, attributeCode: notApplicable },
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
        attributeCodes,
        startDate: input.worldDate,
        durationDays: INDIVIDUAL_SESSION_DURATION_DAYS,
        active: true,
        version: 1,
      };

      // O id é determinístico por (mundo, jogador, data lógica): um jogador tem
      // no máximo UMA sessão por dia. Sem esta checagem, tentar a segunda no
      // mesmo dia estourava a unicidade do Prisma e chegava na tela como
      // COMMAND_EXECUTION_FAILED com stack — erro técnico no lugar de regra.
      if (await sessions.existsWithId(input.gameWorldId, session.id)) {
        return fail(
          new DomainError(
            "TRAINING_SESSION_ALREADY_TODAY",
            "Este jogador já teve uma sessão de treino hoje.",
            { playerId: input.playerId, worldDate: input.worldDate },
          ),
        );
      }

      await sessions.save(session, null);
      await players.savePlayer(
        { player: player.snapshot(), person: snapshot.person },
        snapshot.player.version,
      );
      return succeed({ session });
    });
  }
}
