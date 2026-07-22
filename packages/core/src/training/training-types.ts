/**
 * Treino — tipos e portas (R-212/R-214, rastreabilidade §9).
 *
 * O plano é do CLUBE e da TEMPORADA: é o que a `M-TRAINING` edita e o que o
 * motor de accrual lê todo dia. Ele carrega `version` (R-214) porque dois
 * aparelhos editando o mesmo plano se sobrescreviam em silêncio.
 */

/** Focos do plano — espelha o enum `TrainingFocus` do schema. */
export const TrainingFocus = {
  PHYSICAL: "PHYSICAL",
  TECHNICAL: "TECHNICAL",
  TACTICAL: "TACTICAL",
  MENTAL: "MENTAL",
  DEFENSIVE: "DEFENSIVE",
  OFFENSIVE: "OFFENSIVE",
  SET_PIECES: "SET_PIECES",
  RECOVERY: "RECOVERY",
  INDIVIDUAL_ROLE: "INDIVIDUAL_ROLE",
} as const;

export type TrainingFocus = (typeof TrainingFocus)[keyof typeof TrainingFocus];

export const MIN_INTENSITY = 0;
export const MAX_INTENSITY = 100;

export interface TrainingEntrySnapshot {
  readonly playerId: string;
  readonly focus: TrainingFocus;
  /** Carga individual (0..100). */
  readonly workload: number;
}

export interface TrainingPlanSnapshot {
  readonly id: string;
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly seasonId: string;
  readonly name: string;
  readonly focus: TrainingFocus;
  readonly intensity: number;
  readonly entries: readonly TrainingEntrySnapshot[];
  /**
   * Multiplicador aplicado ao ganho por excesso de agenda (R-13).
   *
   * O doc é explícito: conflito de agenda **não bloqueia** — "excesso sofre
   * perda de qualidade". Então o plano é aceito e carrega quanto perdeu, em vez
   * de recusar o command e deixar o clube sem treino nenhum.
   */
  readonly qualityFactor: number;
  readonly version: number;
}

export interface TrainingPlanRepository {
  findByClubSeason(
    gameWorldId: string,
    clubId: string,
    seasonId: string,
  ): Promise<TrainingPlanSnapshot | null>;
  save(
    plan: TrainingPlanSnapshot,
    expectedVersion: number | null,
  ): Promise<void>;
  /** Todos os planos coletivos do mundo — o settle da virada percorre. */
  findAllActive(
    gameWorldId: string,
  ): Promise<readonly TrainingPlanSnapshot[]>;
}

/**
 * O que o treino precisa saber sobre o elenco, sem carregar o agregado inteiro.
 *
 * Porta estreita de propósito (R-175): o plano não é dono do elenco nem do
 * departamento médico, e perguntar é mais barato que possuir.
 */
export interface TrainingContextReader {
  /** Ids de jogadores no elenco do clube. */
  squadPlayerIds(
    gameWorldId: string,
    clubId: string,
  ): Promise<readonly string[]>;
  /** Ids sob restrição médica — não podem receber carga. */
  medicallyRestrictedPlayerIds(
    gameWorldId: string,
    clubId: string,
  ): Promise<readonly string[]>;
  /**
   * Capacidade do CT: quantas sessões paralelas o nível suporta (R-13).
   * Nível 1 = 1 sessão · nível 3 = 2 · nível 5 = 3.
   */
  trainingCapacity(gameWorldId: string, clubId: string): Promise<number>;
}

export type TrainingEvent =
  | {
      readonly type: "TrainingPlanSet";
      readonly planId: string;
      readonly clubId: string;
      readonly focus: TrainingFocus;
      readonly intensity: number;
      readonly qualityFactor: number;
    }
  | {
      readonly type: "TrainingPlayerEntryUpdated";
      readonly planId: string;
      readonly playerId: string;
      readonly focus: TrainingFocus;
      readonly workload: number;
    };
