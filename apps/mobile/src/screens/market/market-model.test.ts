import { describe, expect, it } from "vitest";

import { CONTRACT_SEASONS, previewDeal } from "./market-model.js";

describe("previewDeal — os termos do negócio no modal (R-192)", () => {
  it("a oferta é 100% do valor e o salário é valor/20", () => {
    const deal = previewDeal("108900653", 500_000_000);
    expect(deal.feeMinor).toBe(108_900_653n);
    expect(deal.salaryPerSeasonMinor).toBe(5_445_032n); // 108900653 / 20, piso
    expect(deal.seasons).toBe(CONTRACT_SEASONS);
  });

  it("o saldo após é caixa − taxa, e cabe quando há caixa", () => {
    const deal = previewDeal("108900653", 500_000_000);
    expect(deal.cashAfterMinor).toBe(391_099_347n);
    expect(deal.affordable).toBe(true);
  });

  it("não cabe quando a taxa supera o caixa — saldo após fica negativo", () => {
    const deal = previewDeal("600000000", 500_000_000);
    expect(deal.affordable).toBe(false);
    expect(deal.cashAfterMinor).toBe(-100_000_000n);
  });

  it("cabe exatamente quando taxa == caixa (limite)", () => {
    const deal = previewDeal("500000000", 500_000_000);
    expect(deal.affordable).toBe(true);
    expect(deal.cashAfterMinor).toBe(0n);
  });

  it("caixa desconhecido (razão não carregou) não barra — o servidor decide", () => {
    const deal = previewDeal("108900653", null);
    expect(deal.affordable).toBe(true);
    expect(deal.cashAfterMinor).toBeNull();
  });
});
