import type { EntityId, GameWorldId, RulesetVersion } from "@grinta/shared";

import type { ClubId, PlayerId, SquadId } from "../genesis/genesis-types.js";
import type { InfrastructureProjectSnapshot } from "./infrastructure-project-types.js";

export type ClubIdentityPeriodId = EntityId<"ClubIdentityPeriod">;
export type StadiumId = EntityId<"Stadium">;
export type TicketPricePolicyId = EntityId<"TicketPricePolicy">;
export type CommercialAgreementId = EntityId<"CommercialAgreement">;
export type BoardDecisionId = EntityId<"BoardDecision">;

export const ClubStatus = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  DISSOLVED: "DISSOLVED",
} as const;
export type ClubStatus = (typeof ClubStatus)[keyof typeof ClubStatus];

export const ClubDepartmentKind = {
  FOOTBALL: "FOOTBALL",
  TRAINING: "TRAINING",
  MEDICAL: "MEDICAL",
  SCOUTING: "SCOUTING",
  YOUTH: "YOUTH",
  COMMERCIAL: "COMMERCIAL",
} as const;
export type ClubDepartmentKind =
  (typeof ClubDepartmentKind)[keyof typeof ClubDepartmentKind];

export const StadiumLicenseStatus = {
  PENDING: "PENDING",
  LICENSED: "LICENSED",
  SUSPENDED: "SUSPENDED",
} as const;
export type StadiumLicenseStatus =
  (typeof StadiumLicenseStatus)[keyof typeof StadiumLicenseStatus];

/**
 * Identidade visual do clube (cosmética). As cores são hex `#RRGGBB` e os
 * `templateId`s referenciam o catálogo (`visual-identity-catalog.ts`). É
 * versionada junto do período de identidade — cada rebranding abre um novo
 * período com sua própria identidade visual, preservando o histórico.
 */
export interface VisualIdentitySnapshot {
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly tertiaryColor: string | null;
  readonly homeKitTemplateId: string;
  readonly awayKitTemplateId: string;
  readonly crestTemplateId: string;
}

export interface ClubIdentityPeriodSnapshot {
  readonly id: ClubIdentityPeriodId;
  readonly name: string;
  readonly shortCode: string;
  readonly effectiveFrom: string;
  readonly effectiveThrough: string | null;
  readonly rulesetVersion: RulesetVersion;
  readonly visualIdentity?: VisualIdentitySnapshot;
}

/**
 * O departamento é FILHO do clube, não root: quem o versiona é o `Club`, dentro
 * de cuja fronteira de consistência ele vive (`Club.setDepartmentPlan` o muta).
 *
 * Ele não tem `version` próprio: o que existia era um contador que ninguém
 * comparava — só incrementava. Concorrência otimista que nada checa não é
 * concorrência otimista, é ruído com nome de invariante.
 */
export interface ClubDepartmentSnapshot {
  readonly kind: ClubDepartmentKind;
  readonly level: number;
  readonly targetLevel: number;
  readonly capacity: number;
  readonly condition: number;
  readonly maintenanceDueOn: string | null;
}

export interface StadiumSnapshot {
  readonly id: StadiumId;
  readonly name: string;
  readonly tenure: "OWNED" | "LEASED";
  readonly capacity: number;
  readonly pitchQuality: number;
  readonly condition: number;
  readonly licenseStatus: StadiumLicenseStatus;
  readonly maintenanceDueOn: string | null;
  readonly version: number;
}

export interface TicketPricePolicySnapshot {
  readonly id: TicketPricePolicyId;
  readonly priceMinor: number;
  readonly effectiveOn: string;
  readonly rulesetVersion: RulesetVersion;
}

export interface CommercialAgreementSnapshot {
  readonly id: CommercialAgreementId;
  readonly asset: string;
  readonly exclusive: boolean;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly externalAgreementRef: string;
  readonly rulesetVersion: RulesetVersion;
}

export interface BoardDecisionSnapshot {
  readonly id: BoardDecisionId;
  readonly decisionType: string;
  readonly authorId: string;
  readonly justification: string;
  readonly effectiveFrom: string;
  readonly effectiveThrough: string | null;
  readonly recordedAt: string;
  readonly rulesetVersion: RulesetVersion;
}

export interface ClubSnapshot {
  readonly id: ClubId;
  readonly gameWorldId: GameWorldId;
  readonly identity: ClubIdentityPeriodSnapshot;
  readonly identityHistory: readonly ClubIdentityPeriodSnapshot[];
  readonly regionId: string;
  readonly reputationBand: number;
  readonly status: ClubStatus;
  readonly departments: readonly ClubDepartmentSnapshot[];
  readonly stadium: StadiumSnapshot;
  readonly ticketPolicies: readonly TicketPricePolicySnapshot[];
  readonly commercialAgreements: readonly CommercialAgreementSnapshot[];
  readonly boardDecisions: readonly BoardDecisionSnapshot[];
  readonly version: number;
}

/**
 * Um membro do elenco — R-190.
 *
 * `slot: string` livre virou `shirtNumber`: a invariante "dois membros não
 * ocupam o mesmo slot" era boa, e o físico já sabia qual é o slot de verdade num
 * elenco de futebol. Agora ela diz o que quer dizer — dois jogadores não vestem
 * o mesmo número.
 *
 * `category` saiu daqui: ela é do `Squad` (`SquadCategory`), não do membro. Um
 * jogador não é "profissional" — o ELENCO é o profissional, e ele está nele.
 *
 * Sem `version` e sem `id` próprio no domínio: é filho do `Squad`, não root
 * (R-183/R-187). Ninguém disputa um membro em separado do elenco dele.
 */
export interface SquadMembershipSnapshot {
  readonly playerId: PlayerId;
  readonly shirtNumber: number;
  /** Livre de propósito: "capitão", "reserva imediato". Não é regra. */
  readonly role: string | null;
  /** Data de MUNDO (R-190/R-177) — quando entrou no elenco. */
  readonly effectiveFrom: string;
}

export const SquadCategory = {
  FIRST_TEAM: "FIRST_TEAM",
  RESERVE: "RESERVE",
  YOUTH_ACADEMY: "YOUTH_ACADEMY",
  LOAN: "LOAN",
  TRIAL: "TRIAL",
} as const;

export type SquadCategory = (typeof SquadCategory)[keyof typeof SquadCategory];

/**
 * O elenco de um clube numa temporada — R-190.
 *
 * `capacity` saiu: não tem coluna, e não deveria ter. O tamanho do elenco é
 * REGRA (R-57: 23 jogadores), não dado por linha — gravá-lo permitiria dois
 * clubes com tetos diferentes, o oposto do "teto comum" do GDD §1. A invariante
 * ficou no agregado, contra a constante.
 *
 * `name`, `category` e `seasonNumber` entraram porque o físico os exige e o
 * domínio os ignorava: elenco é por temporada, e um clube tem o profissional e a
 * base ao mesmo tempo.
 */
export interface SquadSnapshot {
  readonly id: SquadId;
  readonly gameWorldId: GameWorldId;
  readonly clubId: ClubId;
  readonly name: string;
  readonly category: SquadCategory;
  readonly seasonNumber: number;
  readonly memberships: readonly SquadMembershipSnapshot[];
  readonly version: number;
}

export interface ClubCommandReceipt {
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly fingerprint: string;
  readonly gameWorldId: GameWorldId;
  readonly clubId: ClubId;
  readonly aggregateVersion: number;
  readonly portfolioRevision: number;
  readonly resultType: string;
  readonly result: Readonly<Record<string, unknown>>;
}

export interface ClubDomainEvent {
  readonly id: EntityId<"ClubDomainEvent">;
  readonly type: string;
  readonly eventVersion: 1;
  readonly gameWorldId: GameWorldId;
  readonly aggregateId: string;
  readonly aggregateVersion: number;
  readonly occurredAt: string;
  readonly rulesetVersion: RulesetVersion;
  readonly correlationId: string;
  readonly causationId: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface WorldClubPortfolioSnapshot {
  readonly schemaVersion: 1;
  readonly gameWorldId: GameWorldId;
  readonly rulesetVersion: RulesetVersion;
  readonly clubs: readonly ClubSnapshot[];
  readonly squads: readonly SquadSnapshot[];
  readonly projects: readonly InfrastructureProjectSnapshot[];
  readonly commandReceipts: readonly ClubCommandReceipt[];
  readonly events: readonly ClubDomainEvent[];
  readonly processedMaintenanceDayKeys: readonly string[];
  readonly revision: number;
}

export interface ClubPortfolioSummary {
  readonly clubCount: number;
  readonly squadCount: number;
  readonly projectCount: number;
  readonly activeProjectCount: number;
  readonly revision: number;
}

export interface ClubCommandBase {
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly gameWorldId: GameWorldId;
  readonly clubId: ClubId;
  readonly expectedVersion: number;
  readonly occurredAt: string;
  readonly rulesetVersion: RulesetVersion;
  readonly actorId: string;
}

export type ClubCommand =
  | (ClubCommandBase &
      Readonly<{
        type: "UpdateClubIdentity";
        name: string;
        shortCode: string;
      }>)
  | (ClubCommandBase &
      Readonly<{
        type: "UpdateClubVisualIdentity";
        name: string;
        shortCode: string;
        visualIdentity: VisualIdentitySnapshot;
      }>)
  | (ClubCommandBase &
      Readonly<{
        type: "AssignSquadSlot";
        squadId: SquadId;
        playerId: PlayerId;
        shirtNumber: number;
        role: string | null;
      }>)
  | (ClubCommandBase &
      Readonly<{
        type: "RemoveSquadMember";
        squadId: SquadId;
        playerId: PlayerId;
      }>)
  | (ClubCommandBase &
      Readonly<{
        type: "SetDepartmentPlan";
        kind: ClubDepartmentKind;
        targetLevel: number;
        capacity: number;
      }>)
  | (ClubCommandBase &
      Readonly<{
        type: "SetTicketPrices";
        priceMinor: number;
        effectiveOn: string;
      }>)
  | (ClubCommandBase &
      Readonly<{
        type: "SignCommercialDeal";
        asset: string;
        exclusive: boolean;
        startsOn: string;
        endsOn: string;
        externalAgreementRef: string;
      }>)
  | (ClubCommandBase &
      Readonly<{
        type: "RecordBoardDecision";
        decisionType: string;
        justification: string;
        effectiveFrom: string;
        effectiveThrough: string | null;
      }>);
