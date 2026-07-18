import type { GameWorldId } from "@grinta/shared";

/**
 * C8 — comissão técnica (staff). VERTICAL A: a gênese materializa a comissão de
 * cada clube (as PESSOAS, seus cargos e a qualidade), ligada ao clube por um
 * `StaffContract`.
 *
 * Por que contrato na gênese, ao contrário dos jogadores (R-189)? Porque o staff
 * NÃO tem vínculo alternativo: o jogador da gênese tinha o elenco (projeção) e
 * podia esperar C6 para o contrato; o `StaffMember` só se liga ao clube PELO
 * contrato. Sem ele, não há comissão de clube nenhuma. E o contrato aqui é
 * OBRIGAÇÃO REGISTRADA (salário como dado), não dinheiro movido: nenhum
 * lançamento no razão nasce disto, então a oferta monetária (ECO-003) não muda.
 * A folha (pagar o salário por temporada) é do ciclo econômico (C9), que a
 * consome quando existir.
 *
 * O que isto ainda NÃO é: os níveis de estrutura por núcleo/área (§1–3), o
 * multiplicador de evolução (§4), a capacidade operacional do CT (§3.6), os
 * relatórios de olheiro (ScoutReport) e a base (youth) de fato. Aqui a comissão é
 * um plantel de profissionais com cargo e qualidade; os efeitos vêm depois.
 */
export const StaffRole = {
  HEAD_COACH: "HEAD_COACH",
  ASSISTANT_COACH: "ASSISTANT_COACH",
  FITNESS_COACH: "FITNESS_COACH",
  GOALKEEPER_COACH: "GOALKEEPER_COACH",
  SCOUT: "SCOUT",
  DOCTOR: "DOCTOR",
  PHYSIOTHERAPIST: "PHYSIOTHERAPIST",
  PSYCHOLOGIST: "PSYCHOLOGIST",
  DIRECTOR: "DIRECTOR",
  NEGOTIATOR: "NEGOTIATOR",
  COMMUNICATION_MANAGER: "COMMUNICATION_MANAGER",
  YOUTH_COORDINATOR: "YOUTH_COORDINATOR",
} as const;

export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];

export const StaffQualityTier = {
  VERY_LOW: "VERY_LOW",
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  ELITE: "ELITE",
} as const;

export type StaffQualityTier =
  (typeof StaffQualityTier)[keyof typeof StaffQualityTier];

/** Os 7 atributos do `StaffMember` (escala 0–100). */
export interface StaffAttributes {
  readonly tacticalKnowledge: number;
  readonly youthDevelopment: number;
  readonly medicalKnowledge: number;
  readonly negotiation: number;
  readonly communication: number;
  readonly discipline: number;
  readonly dataAnalysis: number;
}

/** O membro da comissão + a pessoa + o contrato que o liga ao clube. */
export interface StaffMemberSeed {
  readonly staffId: string;
  readonly personId: string;
  readonly contractId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly birthDate: string;
  readonly ageVirtual: number;
  readonly role: StaffRole;
  readonly qualityTier: StaffQualityTier;
  readonly abilityScore: number;
  readonly potentialScore: number;
  readonly attributes: StaffAttributes;
  /** O vínculo com o clube (obrigação registrada — R-197). */
  readonly clubId: string;
  readonly currencyId: string;
  readonly salaryPerSeasonMinor: bigint;
  readonly startSeason: number;
  readonly endSeason: number;
}

/** Um membro da comissão como a tela o lê (M-25, seção comissão técnica). */
export interface StaffMemberView {
  readonly staffId: string;
  readonly name: string;
  readonly role: StaffRole;
  readonly qualityTier: StaffQualityTier;
  readonly abilityScore: number;
}

export interface StaffView {
  readonly members: readonly StaffMemberView[];
}

export interface StaffRepository {
  /**
   * Semeia a comissão de um mundo (pessoas + membros + contratos), na transação
   * da gênese. Idempotente por `staffId`: reexecutar não duplica.
   */
  seedStaff(
    gameWorldId: GameWorldId,
    seeds: readonly StaffMemberSeed[],
  ): Promise<void>;
}

export interface StaffReadModel {
  /** A comissão técnica de um clube (via contratos ativos). */
  staffForClub(
    gameWorldId: GameWorldId,
    clubId: string,
  ): Promise<StaffView>;
}
