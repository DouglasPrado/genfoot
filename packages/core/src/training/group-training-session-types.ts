import type { PlayerRepository } from "../players/player-repository.js";
import type { CohesionWriter } from "./train-formation-cohesion.js";

/**
 * A sessão de treino em GRUPO (R-220.2 / R-221): o time treina uma formação por
 * um tempo, e o coletivo entrosa. Diferente da sessão individual — que
 * desenvolve o ATRIBUTO de um jogador — esta sobe o ENTROSAMENTO do time.
 *
 * Uma ativa por clube. Os participantes ficam INDISPONÍVEIS enquanto treinam, o
 * que impede (de graça) que estejam ao mesmo tempo num treino individual: um
 * jogador só entra num treino se estiver disponível. Persistente e determinística.
 */
export interface GroupTrainingSessionSnapshot {
  readonly id: string;
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly formation: string;
  /** Quem participa — os que ficam indisponíveis e entrosam. */
  readonly participantIds: readonly string[];
  readonly startDate: string;
  readonly durationDays: number;
  readonly active: boolean;
  readonly version: number;
}

export interface GroupTrainingSessionRepository {
  findActiveByClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<GroupTrainingSessionSnapshot | null>;
  /**
   * Todas as sessões de grupo ATIVAS do mundo — para o settle na virada do dia
   * (`SettleDueGroupTrainingSessions`), que encerra as que cumpriram a duração,
   * sobe o entrosamento e libera os participantes. Sem isto, esquecer de coletar
   * prendia o grupo até a coleta manual.
   */
  findAllActive(
    gameWorldId: string,
  ): Promise<readonly GroupTrainingSessionSnapshot[]>;
  save(
    session: GroupTrainingSessionSnapshot,
    expectedVersion: number | null,
  ): Promise<void>;
}

export interface GroupTrainingSessionRepositories {
  readonly sessions: GroupTrainingSessionRepository;
  readonly players: PlayerRepository;
  readonly cohesion: CohesionWriter;
}

/** Participantes, sessão e coesão mudam no MESMO commit. */
export interface GroupTrainingSessionUnitOfWork {
  run<T>(
    work: (repos: GroupTrainingSessionRepositories) => Promise<T>,
  ): Promise<T>;
}
