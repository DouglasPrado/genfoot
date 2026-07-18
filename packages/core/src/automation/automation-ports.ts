import type { NotificationRepository } from "../notifications/notification-types.js";

import type { AutomationRuleSnapshot } from "./automation-rule.js";
import type { ClubAIProfileSnapshot } from "./automation-types.js";

/**
 * As portas de repositório da Automação (X-001), num lugar só para os dois casos
 * de uso (plano offline e regras) compartilharem a MESMA transação.
 */
export interface ClubAIProfileRepository {
  findByClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<ClubAIProfileSnapshot | null>;
  saveProfile(snapshot: ClubAIProfileSnapshot): Promise<void>;
}

/** Uma regra ativa reduzida ao que a checagem de precedência precisa. */
export interface ActiveRuleKey {
  readonly id: string;
  readonly triggerEvent: string;
  readonly priority: number;
}

export interface AutomationRuleRepository {
  findRuleById(
    gameWorldId: string,
    ruleId: string,
  ): Promise<AutomationRuleSnapshot | null>;
  /** As regras ATIVAS do clube — para detectar conflito de precedência. */
  activeRuleKeys(
    gameWorldId: string,
    clubId: string,
  ): Promise<readonly ActiveRuleKey[]>;
  /** As regras ATIVAS do clube que disparam num gatilho — o executor as roda. */
  activeRulesForTrigger(
    gameWorldId: string,
    clubId: string,
    triggerEvent: string,
  ): Promise<readonly AutomationRuleSnapshot[]>;
  /** Grava a regra e congela uma nova versão no histórico (imutável). */
  saveRuleWithVersion(snapshot: AutomationRuleSnapshot): Promise<void>;
}

/**
 * Se o clube está ATENDIDO por um humano presente (X-001). "Não atendido" =
 * sem controle humano ativo (R-180) OU o controlador está ausente. É o que o
 * executor lê para aplicar a precedência: humano presente manda, IA se cala.
 */
export interface ClubAttendanceRepository {
  isClubAttended(
    gameWorldId: string,
    clubId: string,
    nowIso: string,
  ): Promise<boolean>;
}

export interface AutomationRepositories {
  readonly profiles: ClubAIProfileRepository;
  readonly rules: AutomationRuleRepository;
  readonly attendance: ClubAttendanceRepository;
  readonly notifications: NotificationRepository;
}

export interface AutomationUnitOfWork {
  run<T>(work: (repositories: AutomationRepositories) => Promise<T>): Promise<T>;
}
