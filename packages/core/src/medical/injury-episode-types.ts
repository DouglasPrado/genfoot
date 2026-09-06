/**
 * Episódio médico (C4 · medicina) — tipos e portas.
 *
 * O departamento médico não é uma lista de lesionados: é uma MÁQUINA por
 * episódio, ratificada em `docs/02-tecnico/14-maquinas-de-estado.md §6`
 * (MED-1..MED-9), com 7 estágios de reabilitação obrigatórios e ordenados
 * (`docs/01-game-design/02-sistema-de-jogadores.md §16`).
 *
 * Um jogador tem no máximo UM episódio aberto por vez; o episódio atravessa a
 * virada de temporada sem reiniciar (§3.5). `version` para concorrência
 * otimista, como o resto do C4.
 */

/** Estados da máquina médica (§6.1). `REHAB` carrega o estágio 1–7 à parte. */
export const MedicalEpisodeState = {
  /** MED-1: sinal/dor detectado, ainda sem exame. */
  EVALUATION: "EVALUATION",
  /** MED-2: exames solicitados, aguardando resultado. */
  EXAMS: "EXAMS",
  /** MED-3: diagnóstico fechado — o jogador está `INJURED` (P4-1). */
  DIAGNOSIS: "DIAGNOSIS",
  /** MED-4/5/6: reabilitação em curso; ver `rehabStage`. */
  REHAB: "REHAB",
  /** MED-7: liberado pela medicina, aguardando decisão esportiva. */
  COMPETITIVE_RETURN: "COMPETITIVE_RETURN",
  /** MED-8: alta — terminal do episódio, devolve o jogador a `ACTIVE` (P4-2). */
  DISCHARGE: "DISCHARGE",
  /** Terminal absoluto: aposentadoria médica (→ `RETIRED`, INV-4). */
  MEDICAL_RETIREMENT: "MEDICAL_RETIREMENT",
} as const;

export type MedicalEpisodeState =
  (typeof MedicalEpisodeState)[keyof typeof MedicalEpisodeState];

/** Os 7 estágios, na ordem obrigatória (§16). */
export const REHAB_STAGES = [
  "PAIN_CONTROL",
  "MOVEMENT_RECOVERY",
  "STRENGTHENING",
  "INDIVIDUAL_TRAINING",
  "PARTIAL_TRAINING",
  "FULL_TRAINING",
  "COMPETITIVE_CLEARANCE",
] as const;

export type RehabStageCode = (typeof REHAB_STAGES)[number];

export const FIRST_REHAB_STAGE = 1;
export const LAST_REHAB_STAGE = REHAB_STAGES.length; // 7

/** "Retorno ao treino" = entrada em S4 (§6.1). */
export const RETURN_TO_TRAINING_STAGE = 4;

export const rehabStageCode = (stage: number): RehabStageCode | null =>
  REHAB_STAGES[stage - 1] ?? null;

/** Gravidade — espelha `enum InjurySeverity` do `schema.prisma:462`. */
export const InjurySeverity = {
  MINOR: "MINOR",
  LIGHT: "LIGHT",
  MODERATE: "MODERATE",
  SERIOUS: "SERIOUS",
  CRITICAL: "CRITICAL",
} as const;

export type InjurySeverity =
  (typeof InjurySeverity)[keyof typeof InjurySeverity];

/** Tipos da matriz de lesão de **R-21** (F13). */
export const InjuryType = {
  LIGHT: "LIGHT",
  MODERATE: "MODERATE",
  SERIOUS: "SERIOUS",
  MUSCULAR: "MUSCULAR",
  IMPACT: "IMPACT",
  RECURRENT: "RECURRENT",
} as const;

export type InjuryType = (typeof InjuryType)[keyof typeof InjuryType];

/** De onde veio a lesão — MED-1 aceita partida, treino ou desgaste. */
export const InjuryCause = {
  MATCH: "MATCH",
  TRAINING: "TRAINING",
  WEAR: "WEAR",
} as const;

export type InjuryCause = (typeof InjuryCause)[keyof typeof InjuryCause];

/**
 * Opções de tratamento (§16 "Tratamento": objetivo, duração, custo,
 * responsável, risco, alternativas).
 *
 * ⚠️ **Calibração VAL-MED-001, não ratificada.** As magnitudes (multiplicador
 * de duração, delta de risco de recaída, custo) NÃO têm decisão R-* que as
 * fixe — R-48 ratifica os limiares do EXAME, não a tabela de tratamento.
 * Tratar como constante de código sujeita a calibração, não como regra de doc.
 */
export const TreatmentOption = {
  /** Conservador: mais lento, mais seguro, barato. */
  CONSERVATIVE: "CONSERVATIVE",
  /** Padrão da comissão médica. */
  STANDARD: "STANDARD",
  /** Intensivo: encurta o prazo, eleva o risco de recaída. */
  INTENSIVE: "INTENSIVE",
  /** Cirúrgico: só faz sentido de MODERATE para cima; caro e longo, mas resolve. */
  SURGERY: "SURGERY",
} as const;

export type TreatmentOption =
  (typeof TreatmentOption)[keyof typeof TreatmentOption];

export interface TreatmentProfile {
  readonly option: TreatmentOption;
  /** Multiplica a faixa de recuperação do diagnóstico. */
  readonly durationMultiplier: number;
  /** Pontos somados ao risco de recaída (0–100). */
  readonly relapseRiskDelta: number;
  /** Custo em minor units por dia de tratamento. */
  readonly dailyCostMinor: number;
  /** Gravidade mínima em que a opção é recomendada. */
  readonly minimumSeverity: InjurySeverity;
}

/** Diagnóstico fechado (MED-3) — pode ser revisto por MED-9. */
export interface InjuryDiagnosis {
  readonly severity: InjurySeverity;
  /** Faixa estimada de recuperação, em dias. A estimativa PODE mudar (§16). */
  readonly minimumDays: number;
  readonly maximumDays: number;
  /** Risco de retorno, 0–100. */
  readonly returnRiskScore: number;
  /** Quantas vezes a estimativa já foi revista (MED-9). */
  readonly revisions: number;
}

export interface InjuryTreatment {
  readonly option: TreatmentOption;
  readonly startedOn: string;
  /** Prazo estimado de alta, derivado do diagnóstico × perfil do tratamento. */
  readonly estimatedReturnOn: string;
}

export interface InjuryEpisodeSnapshot {
  readonly id: string;
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly playerId: string;
  readonly state: MedicalEpisodeState;
  /** 1–7 quando `state === REHAB`; null fora dela. */
  readonly rehabStage: number | null;
  readonly injuryType: InjuryType;
  readonly cause: InjuryCause;
  /** Região do corpo — alimenta o `recorrente ×3` de R-21. */
  readonly region: string;
  readonly occurredOn: string;
  readonly diagnosis: InjuryDiagnosis | null;
  readonly treatment: InjuryTreatment | null;
  /** Recaídas acumuladas neste episódio (exceção RELAPSE do §6.3). */
  readonly relapseCount: number;
  /** Data da alta (MED-8), null enquanto o episódio está aberto. */
  readonly dischargedOn: string | null;
  readonly version: number;
}

/** Um episódio é terminal quando não aceita mais transição. */
export const TERMINAL_EPISODE_STATES: readonly MedicalEpisodeState[] = [
  MedicalEpisodeState.DISCHARGE,
  MedicalEpisodeState.MEDICAL_RETIREMENT,
];

export const isEpisodeClosed = (episode: InjuryEpisodeSnapshot): boolean =>
  TERMINAL_EPISODE_STATES.includes(episode.state);

/**
 * Eventos do episódio — nomes canônicos do catálogo
 * (`docs/02-tecnico/05-catalogo-de-regras-e-formulas.md:1041-1042`).
 */
export type MedicalEventType =
  | "InjurySuspected"
  | "MedicalExamOrdered"
  | "InjuryDiagnosed"
  | "DiagnosisRevised"
  | "MedicalPlanSet"
  | "RehabStarted"
  | "RehabStageAdvanced"
  | "ReturnedToTraining"
  | "MedicallyCleared"
  | "PlayerRecovered"
  | "InjuryRelapsed"
  | "MedicalRetirement";

export interface MedicalEvent {
  readonly type: MedicalEventType;
  readonly playerId: string;
  readonly injuryId: string;
  readonly occurredOn: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface InjuryEpisodeRepository {
  /** O episódio ABERTO do jogador, ou null se ele está saudável. */
  findOpenByPlayer(
    gameWorldId: string,
    playerId: string,
  ): Promise<InjuryEpisodeSnapshot | null>;
  findById(
    gameWorldId: string,
    injuryId: string,
  ): Promise<InjuryEpisodeSnapshot | null>;
  /** Todos os episódios abertos do clube — alimenta `M-MEDICAL`. */
  listOpenByClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<readonly InjuryEpisodeSnapshot[]>;
  save(
    episode: InjuryEpisodeSnapshot,
    expectedVersion: number | null,
  ): Promise<void>;
}
