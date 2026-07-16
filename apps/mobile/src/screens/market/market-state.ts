export interface MarketListingProjection {
  readonly id: string;
  readonly playerId: string;
  readonly sellerClubId: string;
  readonly askingFeeMinor: number;
  readonly status: string;
  readonly playerName: string;
  readonly primaryPosition: string;
  readonly currentAbility: number;
  readonly personId: string | null;
}

export interface MarketNegotiationProjection {
  readonly id: string;
  readonly playerId: string;
  readonly buyerClubId: string;
  readonly sellerClubId: string;
  readonly status: string;
  readonly currentVersion: number;
  readonly offers: readonly {
    readonly version: number;
    readonly createdByClubId: string;
    readonly terms: {
      readonly feeMinor: number;
      readonly wageMinor: number;
      readonly contractYears: number;
    };
    readonly expiresOn: string;
  }[];
  readonly playerName: string;
  readonly primaryPosition: string;
}

export interface MarketSummaryProjection {
  readonly scoutingReportCount: number;
  readonly openNegotiationCount: number;
  readonly activeContractCount: number;
  readonly activeLinkCount: number;
  readonly activeListingCount: number;
  readonly completedTransferCount: number;
  readonly activeLoanCount: number;
  readonly availablePlayerCount: number;
  readonly availablePlayers: readonly {
    readonly id: string;
    readonly name: string;
    readonly primaryPosition: string;
    readonly currentAbility: number;
    readonly potentialAbility: number;
    readonly nationality: string;
  }[];
  readonly scoutingReports: readonly {
    readonly id: string;
    readonly playerId: string;
    readonly observerClubId: string;
    readonly confidence: number;
    readonly observations: readonly string[];
    readonly validUntil: string;
  }[];
  readonly listings?: readonly MarketListingProjection[];
  readonly negotiations?: readonly MarketNegotiationProjection[];
}

/** Estado acionável de uma listagem para o clube gerenciado. */
export type ListingAction =
  | { readonly kind: "mine" }
  | { readonly kind: "propose" }
  | {
      readonly kind: "offered";
      readonly negotiation: MarketNegotiationProjection;
    }
  | {
      readonly kind: "accepted";
      readonly negotiation: MarketNegotiationProjection;
    }
  | { readonly kind: "open"; readonly negotiation: MarketNegotiationProjection };

export function deriveListingAction(
  listing: MarketListingProjection,
  negotiations: readonly MarketNegotiationProjection[],
  myClubId: string,
): ListingAction {
  if (listing.sellerClubId === myClubId) return { kind: "mine" };
  const negotiation = negotiations.find(
    (candidate) =>
      candidate.playerId === listing.playerId &&
      candidate.buyerClubId === myClubId &&
      candidate.status !== "CANCELLED" &&
      candidate.status !== "EXPIRED",
  );
  if (negotiation === undefined) return { kind: "propose" };
  if (negotiation.status === "ACCEPTED") return { kind: "accepted", negotiation };
  if (negotiation.status === "OPEN") return { kind: "open", negotiation };
  return { kind: "offered", negotiation };
}

/** Filtro de busca por nome/posição (case-insensitive). */
export function matchesSearch(
  search: string,
  name: string,
  position: string,
): boolean {
  const term = search.trim().toLowerCase();
  if (term === "") return true;
  return (
    name.toLowerCase().includes(term) || position.toLowerCase().includes(term)
  );
}

type MarketState = "loading" | "ready" | "empty" | "error" | "offline";

export interface MarketPresentation {
  readonly kind: "loading" | "ready" | "blocked" | "error" | "offline";
  readonly title: string;
  readonly body: string;
  readonly canRetry: boolean;
  readonly stats: readonly { readonly label: string; readonly value: number }[];
}

export function deriveMarketPresentation(
  state: MarketState,
  summary: MarketSummaryProjection | null,
): MarketPresentation {
  if (state === "loading") {
    return {
      kind: "loading",
      title: "CONSULTANDO O MERCADO",
      body: "Buscando negociações e listagens oficiais deste mundo.",
      canRetry: false,
      stats: [],
    };
  }
  if (state === "offline") {
    return {
      kind: "offline",
      title: "SEM CONEXÃO",
      body: "Negociações não podem ser iniciadas offline. Reconecte para consultar o estado oficial.",
      canRetry: true,
      stats: [],
    };
  }
  if (state === "error") {
    return {
      kind: "error",
      title: "NÃO FOI POSSÍVEL CONSULTAR",
      body: "O mercado não foi alterado. Tente buscar novamente o estado oficial.",
      canRetry: true,
      stats: [],
    };
  }
  if (state === "empty" || summary === null) {
    return {
      kind: "blocked",
      title: "MERCADO AINDA NÃO ABERTO",
      body: "A temporada deste mundo ainda não inicializou o mercado. Nenhuma negociação está disponível.",
      canRetry: true,
      stats: [],
    };
  }
  return {
    kind: "ready",
    title: "MERCADO ABERTO",
    body:
      summary.availablePlayerCount > 0
        ? `${summary.availablePlayerCount} jogadores livres estão disponíveis para observação.`
        : summary.activeListingCount === 0
          ? "Não há atletas disponíveis neste momento."
          : "Acompanhe somente operações registradas no mercado oficial.",
    canRetry: true,
    stats: [
      { label: "LIVRES", value: summary.availablePlayerCount },
      { label: "LISTADOS", value: summary.activeListingCount },
      { label: "NEGOCIAÇÕES", value: summary.openNegotiationCount },
      { label: "EMPRÉSTIMOS", value: summary.activeLoanCount },
      { label: "RELATÓRIOS", value: summary.scoutingReportCount },
    ],
  };
}
