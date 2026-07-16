import { describe, expect, it } from "vitest";

import {
  deriveListingAction,
  deriveMarketPresentation,
  matchesSearch,
} from "./market-state";

describe("estado oficial do Mercado", () => {
  it("não transforma MARKET_NOT_FOUND em lista fictícia", () => {
    expect(deriveMarketPresentation("empty", null)).toMatchObject({
      title: "MERCADO AINDA NÃO ABERTO",
      kind: "blocked",
      canRetry: true,
    });
  });

  it("expõe contagens oficiais quando o contexto existe", () => {
    expect(
      deriveMarketPresentation("ready", {
        scoutingReportCount: 3,
        openNegotiationCount: 2,
        activeContractCount: 23,
        activeLinkCount: 23,
        activeListingCount: 4,
        completedTransferCount: 1,
        activeLoanCount: 2,
        availablePlayerCount: 160,
        availablePlayers: [],
        scoutingReports: [],
      }),
    ).toMatchObject({
      title: "MERCADO ABERTO",
      kind: "ready",
      stats: [
        { label: "LIVRES", value: 160 },
        { label: "LISTADOS", value: 4 },
        { label: "NEGOCIAÇÕES", value: 2 },
        { label: "EMPRÉSTIMOS", value: 2 },
        { label: "RELATÓRIOS", value: 3 },
      ],
    });
  });

  it("distingue falha técnica de falta de conexão", () => {
    expect(deriveMarketPresentation("error", null).kind).toBe("error");
    expect(deriveMarketPresentation("offline", null).kind).toBe("offline");
  });
});

describe("negociação de listagem (mercado jogável)", () => {
  const listing = {
    id: "l1",
    playerId: "p1",
    sellerClubId: "seller",
    askingFeeMinor: 2_500_000,
    status: "ACTIVE",
    playerName: "Caio Silva",
    primaryPosition: "ST",
    currentAbility: 70,
    personId: "person-1",
  };
  const base = {
    id: "n1",
    playerId: "p1",
    buyerClubId: "me",
    sellerClubId: "seller",
    currentVersion: 1,
    offers: [],
    playerName: "Caio Silva",
    primaryPosition: "ST",
  };

  it("minha própria listagem não é negociável", () => {
    expect(
      deriveListingAction(listing, [], "seller"),
    ).toEqual({ kind: "mine" });
  });

  it("sem negociação → propor; OPEN → open; OFFERED → offered; ACCEPTED → accepted", () => {
    expect(deriveListingAction(listing, [], "me")).toEqual({ kind: "propose" });
    expect(
      deriveListingAction(listing, [{ ...base, status: "OPEN" }], "me").kind,
    ).toBe("open");
    expect(
      deriveListingAction(listing, [{ ...base, status: "OFFERED" }], "me").kind,
    ).toBe("offered");
    expect(
      deriveListingAction(listing, [{ ...base, status: "ACCEPTED" }], "me").kind,
    ).toBe("accepted");
  });

  it("negociação cancelada/expirada permite propor de novo", () => {
    expect(
      deriveListingAction(listing, [{ ...base, status: "CANCELLED" }], "me"),
    ).toEqual({ kind: "propose" });
  });

  it("busca filtra por nome ou posição", () => {
    expect(matchesSearch("caio", "Caio Silva", "ST")).toBe(true);
    expect(matchesSearch("st", "Caio Silva", "ST")).toBe(true);
    expect(matchesSearch("zz", "Caio Silva", "ST")).toBe(false);
    expect(matchesSearch("  ", "Caio Silva", "ST")).toBe(true);
  });
});
