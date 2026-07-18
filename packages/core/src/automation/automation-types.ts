/**
 * Automação / IA do clube (X-001). O concern transversal: a IA emite os MESMOS
 * commands que um humano (INV-17/Q6), dentro de limites de autoridade. Este
 * módulo define o "plano offline" — o que o clube autoriza a IA a decidir quando
 * o usuário está ausente (R-01, Resolução 27.10.5).
 *
 * `AutomationLevel` é o conceito central que a reescrita apontou como faltante:
 * até aqui não era expressável em fonte nenhuma.
 */

export const AutomationLevel = {
  /** Nada automático: o clube só age por comando humano. */
  MANUAL: "MANUAL",
  /** A IA assessora (sugere), mas não decide. */
  ASSISTED: "ASSISTED",
  /** A IA decide o rotineiro; o de peso espera o humano. */
  SEMI_AUTOMATED: "SEMI_AUTOMATED",
  /** A IA assume o comando na ausência, dentro dos limites. */
  FULLY_AUTOMATED: "FULLY_AUTOMATED",
} as const;

export type AutomationLevel =
  (typeof AutomationLevel)[keyof typeof AutomationLevel];

/**
 * Os limites de autoridade da IA (Resolução 27.10.5: "grandes decisões dependem
 * de autoridade prévia"). Dinheiro é minor units em `string` (não serializa
 * bigint em JSON).
 */
export interface AuthorityLimits {
  /** Dívida máxima que a IA pode assumir. */
  readonly maxDebtMinor: string;
  /** Gasto máximo em transferências por janela. */
  readonly maxTransferSpendMinor: string;
  /** A IA pode vender jogadores-chave? (alto risco — normalmente não). */
  readonly canSellKeyPlayers: boolean;
  /**
   * A IA pode mudar a identidade do clube? SEMPRE `false`: identidade é decisão
   * estrutural, não delegável (a invariante "alto risco não delegável").
   */
  readonly canChangeIdentity: boolean;
}

/** Uma política de decisão offline por área (rótulo livre, calibração adiante). */
export type OfflinePolicy = string;

/** O plano que rege o clube na ausência do usuário. */
export interface OfflinePlan {
  readonly automationLevel: AutomationLevel;
  /** Profundidade da decisão offline, 0 (nada) a 3 (tudo autorizado). */
  readonly offlineDecisionLevel: number;
  readonly lineupPolicy: OfflinePolicy;
  readonly substitutionPolicy: OfflinePolicy;
  readonly marketPolicy: OfflinePolicy;
  readonly crisisPolicy: OfflinePolicy;
  readonly authorityLimits: AuthorityLimits;
}

export interface ClubAIProfileSnapshot {
  readonly clubId: string;
  readonly gameWorldId: string;
  readonly plan: OfflinePlan;
}

/** Faixa da profundidade de decisão offline. */
export const MIN_OFFLINE_LEVEL = 0;
export const MAX_OFFLINE_LEVEL = 3;

/** O plano padrão de um clube: assessora, decide pouco, sem autoridade de risco. */
export function defaultOfflinePlan(): OfflinePlan {
  return {
    automationLevel: AutomationLevel.ASSISTED,
    offlineDecisionLevel: 1,
    lineupPolicy: "BEST_AVAILABLE",
    substitutionPolicy: "BALANCED",
    marketPolicy: "HOLD",
    crisisPolicy: "CONSERVATIVE",
    authorityLimits: {
      maxDebtMinor: "0",
      maxTransferSpendMinor: "0",
      canSellKeyPlayers: false,
      canChangeIdentity: false,
    },
  };
}
