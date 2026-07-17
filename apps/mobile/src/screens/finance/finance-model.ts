import type {
  ClubFinanceSnapshotView,
  CostProvenance,
  SeasonCostCategory,
} from "@grinta/core";

/**
 * Modelo puro da tela de Finanças (M-FINANCE). Deriva o view-model do
 * `ClubFinanceSnapshotView` que a query `finance-snapshot` serve — formata os
 * custos, separa contratado×estimado, monta a faixa de saúde (ou "indisponível"),
 * e nomeia os cartões que ainda são PARCIAIS por falta de domínio. O componente
 * só renderiza; toda decisão de exibição vive e é testada aqui.
 */

export type HealthTone =
  | "excellent"
  | "stable"
  | "attention"
  | "pressure"
  | "crisis"
  | "collapse"
  | "unavailable";

export interface HealthBadge {
  readonly label: string;
  readonly tone: HealthTone;
  readonly value: number | null;
}

export interface CostLineView {
  readonly label: string;
  readonly provenanceLabel: string | null;
  readonly amountLabel: string;
}

export interface PartialCard {
  readonly title: string;
  readonly missing: string;
}

export interface FinanceView {
  readonly cashLabel: string;
  readonly cashNegative: boolean;
  readonly seasonTotalLabel: string;
  readonly costLines: readonly CostLineView[];
  readonly contractedCount: number;
  readonly estimatedCount: number;
  readonly omittedLabels: readonly string[];
  readonly health: HealthBadge;
  readonly provenanceNotes: readonly string[];
  readonly partialCards: readonly PartialCard[];
}

const CATEGORY_LABELS: Record<SeasonCostCategory, string> = {
  PLAYER_WAGES: "Folha salarial",
  STAFF_WAGES: "Comissão técnica",
  INFRA_MAINTENANCE: "Manutenção — infraestrutura",
  STADIUM_MAINTENANCE: "Manutenção — estádio",
  OPERATING: "Operacional",
  TRAVEL: "Viagens",
  TAXES: "Impostos",
  AGENT_COMMISSION: "Comissão de empresários",
};

const PROVENANCE_LABELS: Record<CostProvenance, string | null> = {
  CONTRACTED: "contratado",
  ESTIMATED: "estimado",
  UNAVAILABLE: null,
};

/** Cartões do doc da tela ainda sem fonte de domínio — parciais, declarados. */
const PARTIAL_CARDS: readonly PartialCard[] = [
  { title: "Receita mensal", missing: "sem faucet de receita (TV/sócios) no domínio" },
  { title: "Orçamento de transferências", missing: "orçamento ainda não persistido" },
  { title: "Dívida", missing: "sem contexto de crédito/dívida" },
  { title: "Patrocínio", missing: "sem contexto comercial" },
  { title: "Bilheteria", missing: "sem receita de partida materializada" },
];

/** R$ a partir de unidade mínima (centavos), com separador de milhar pt-BR. */
export function formatMinor(amountMinor: number): string {
  return `R$ ${Math.round(amountMinor / 100).toLocaleString("pt-BR")}`;
}

export function healthBadge(value: number | null): HealthBadge {
  if (value === null) {
    return { label: "Indisponível", tone: "unavailable", value: null };
  }
  const rounded = Math.round(value);
  if (rounded >= 90) return { label: "Excelente", tone: "excellent", value: rounded };
  if (rounded >= 70) return { label: "Estável", tone: "stable", value: rounded };
  if (rounded >= 50) return { label: "Atenção", tone: "attention", value: rounded };
  if (rounded >= 30) return { label: "Pressão", tone: "pressure", value: rounded };
  if (rounded >= 10) return { label: "Crise", tone: "crisis", value: rounded };
  return { label: "Colapso", tone: "collapse", value: rounded };
}

export function deriveFinanceView(
  snapshot: ClubFinanceSnapshotView | null,
): FinanceView | null {
  if (snapshot === null) return null;
  const { seasonCost } = snapshot;
  return {
    cashLabel: formatMinor(snapshot.cashMinor),
    cashNegative: snapshot.cashMinor < 0,
    seasonTotalLabel: formatMinor(seasonCost.totalMinor),
    costLines: seasonCost.lines.map((line) => ({
      label: CATEGORY_LABELS[line.category],
      provenanceLabel: PROVENANCE_LABELS[line.provenance],
      amountLabel: formatMinor(line.amountMinor),
    })),
    contractedCount: seasonCost.contractedPlayerCount,
    estimatedCount: seasonCost.estimatedPlayerCount,
    omittedLabels: seasonCost.omitted.map((category) => CATEGORY_LABELS[category]),
    health: healthBadge(snapshot.financialHealth.value),
    provenanceNotes: snapshot.provenanceNotes,
    partialCards: PARTIAL_CARDS,
  };
}
