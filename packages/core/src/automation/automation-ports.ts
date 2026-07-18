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
  /** Grava a regra e congela uma nova versão no histórico (imutável). */
  saveRuleWithVersion(snapshot: AutomationRuleSnapshot): Promise<void>;
}

export interface AutomationRepositories {
  readonly profiles: ClubAIProfileRepository;
  readonly rules: AutomationRuleRepository;
}

export interface AutomationUnitOfWork {
  run<T>(work: (repositories: AutomationRepositories) => Promise<T>): Promise<T>;
}
