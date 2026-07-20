import type { PlayerRepository } from "../players/player-repository.js";

/**
 * A sessão de treino como registro (R-221 Fase 2a).
 *
 * Uma sessão ativa por jogador: enquanto corre, o jogador está indisponível; ao
 * coletar, o ganho é aplicado NA HORA e a sessão encerra. Persistente e
 * determinística (id por mundo/jogador/início).
 */
export interface TrainingSessionSnapshot {
  readonly id: string;
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly playerId: string;
  /** O atributo-foco que a sessão desenvolve. */
  readonly attributeCode: string;
  /** Início em data lógica do mundo. */
  readonly startDate: string;
  readonly durationDays: number;
  readonly active: boolean;
  readonly version: number;
}

export interface TrainingSessionRepository {
  findActiveByPlayer(
    gameWorldId: string,
    playerId: string,
  ): Promise<TrainingSessionSnapshot | null>;
  /**
   * Todas as sessões ATIVAS do mundo — para o settle na virada do dia
   * (`SettleDueTrainingSessions`), que encerra as que já cumpriram a duração e
   * libera o jogador. Sem isto, a única forma de liberar era a coleta manual.
   */
  findAllActive(
    gameWorldId: string,
  ): Promise<readonly TrainingSessionSnapshot[]>;
  /**
   * Existe sessão com este id — ATIVA OU NÃO?
   *
   * O id é determinístico por (mundo, jogador, data lógica), então duas sessões
   * do mesmo jogador no mesmo dia colidem. Sem esta pergunta, o domínio achava
   * que podia criar (a anterior fora coletada, logo `findActiveByPlayer` dava
   * null) e a colisão estourava como violação de unicidade do Prisma — erro
   * TÉCNICO vazando na tela onde devia haver regra de negócio.
   */
  existsWithId(gameWorldId: string, id: string): Promise<boolean>;
  save(
    session: TrainingSessionSnapshot,
    expectedVersion: number | null,
  ): Promise<void>;
}

export interface TrainingSessionRepositories {
  readonly sessions: TrainingSessionRepository;
  readonly players: PlayerRepository;
}

/** Sessão e jogador mudam no MESMO commit — aplicar o ganho e encerrar a sessão é um efeito só. */
export interface TrainingSessionUnitOfWork {
  run<T>(work: (repos: TrainingSessionRepositories) => Promise<T>): Promise<T>;
}
