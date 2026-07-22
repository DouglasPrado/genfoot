import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import { adaptedCohesionBonus } from "../competitions/team-cohesion.js";
import type { PlayerPosition } from "../genesis/genesis-types.js";
import { Player } from "../players/player.js";
import { fillQuality, formationSlots } from "../tactics/formation.js";

import { sessionElapsedDays } from "./training-session.js";
import type {
  GroupTrainingSessionRepositories,
  GroupTrainingSessionSnapshot,
  GroupTrainingSessionUnitOfWork,
} from "./group-training-session-types.js";

/**
 * O jogador está ADAPTADO (fora do ofício) na formação? Melhor encaixe entre os
 * slots é da mesma linha ou vizinha (fillQuality ≥ 0.5), nunca exato. Formação
 * que o core não cataloga → não conta (não inventa bônus). Mesma régua da tela
 * (`formation-fit.ts` no mobile), sobre o modelo canônico do domínio.
 */
function isAdaptedInFormation(
  primaryPosition: PlayerPosition,
  formation: string,
): boolean {
  const slots = formationSlots(formation);
  if (slots === null) return false;
  let best = 0;
  for (const slot of slots) {
    const q = fillQuality(primaryPosition, slot);
    if (q > best) best = q;
  }
  return best >= 0.5 && best < 1;
}

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
  /** Quantos treinaram fora do ofício (adaptados). */
  readonly adaptedCount: number;
  /** Bônus de coesão que a adaptação somou ao ganho base. */
  readonly cohesionBonus: number;
}

/**
 * Encerra UMA sessão de grupo já carregada: libera os participantes, conta os
 * adaptados, sobe o entrosamento (base + bônus) e fecha a sessão — num commit só
 * sobre os repos dados. Compartilhado pela coleta manual
 * (`CollectGroupTrainingSession`) e pelo settle da virada de dia
 * (`SettleDueGroupTrainingSessions`), para o mesmo efeito nos dois caminhos.
 */
export async function settleGroupSession(
  repos: GroupTrainingSessionRepositories,
  input: {
    readonly session: GroupTrainingSessionSnapshot;
    readonly worldDate: string;
  },
): Promise<Result<CollectGroupTrainingSessionResult, DomainError>> {
  const { sessions, players, cohesion } = repos;
  const { session } = input;
  const elapsedDays = sessionElapsedDays(session.startDate, input.worldDate);

  // Libera cada participante (volta ao elenco, disponível) e conta quantos
  // treinaram ADAPTADOS na formação — cada um soma bônus ao entrosamento.
  let adaptedCount = 0;
  for (const playerId of session.participantIds) {
    const snapshot = await players.findPlayerById(
      session.gameWorldId as never,
      playerId as never,
    );
    if (snapshot === null) continue; // sumiu do mundo — segue os outros.
    const loaded = Player.fromSnapshot(snapshot.player);
    if (!loaded.ok) return loaded;
    const player = loaded.value;
    if (isAdaptedInFormation(snapshot.player.primaryPosition, session.formation)) {
      adaptedCount += 1;
    }
    player.endTraining();
    await players.savePlayer(
      { player: player.snapshot(), person: snapshot.person },
      snapshot.player.version,
    );
  }

  // Sobe o entrosamento: ganho base + bônus por adaptação (decisão do dono).
  await cohesion.raiseByFormationTraining(
    session.gameWorldId,
    session.clubId,
    adaptedCohesionBonus(adaptedCount),
  );

  await sessions.save(
    { ...session, active: false, version: session.version + 1 },
    session.version,
  );

  return succeed({
    elapsedDays,
    complete: elapsedDays >= session.durationDays,
    participantCount: session.participantIds.length,
    adaptedCount,
    cohesionBonus: adaptedCohesionBonus(adaptedCount),
  });
}

export class CollectGroupTrainingSession {
  public constructor(private readonly uow: GroupTrainingSessionUnitOfWork) {}

  public async execute(
    input: CollectGroupTrainingSessionInput,
  ): Promise<Result<CollectGroupTrainingSessionResult, DomainError>> {
    return this.uow.run(async (repos) => {
      const session = await repos.sessions.findActiveByClub(
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

      return settleGroupSession(repos, {
        session,
        worldDate: input.worldDate,
      });
    });
  }
}
