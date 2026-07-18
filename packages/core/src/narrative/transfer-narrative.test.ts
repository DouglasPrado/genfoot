import { describe, expect, it } from "vitest";

import { NarrativeType } from "./narrative-types.js";
import {
  buildTransferNarrative,
  intensityForFee,
} from "./transfer-narrative.js";

const BASE = {
  gameWorldId: "019f0000-0000-7000-8000-000000000001",
  worldSeed: "grinta-demo",
  buyingClubId: "019f0000-0000-7000-8000-0000000000b2",
  playerId: "019f0000-0000-7000-8000-0000000000c3",
  playerName: "João Silva",
  feeMinor: 108_900_653n,
  currencyId: "019b76da-a800-7787-9462-49c009becccc",
  occurredOn: "2026-01-01",
};

describe("buildTransferNarrative — a imprensa narra a contratação (C11 §10)", () => {
  it("relata quem assinou e por quanto, sem inventar", () => {
    const item = buildTransferNarrative(BASE);
    expect(item.title).toContain("João Silva");
    expect(item.description).toContain("R$");
    expect(item.description).toContain("1.089.006,53");
    expect(item.type).toBe(NarrativeType.TRANSFER_SPECULATION);
    expect(item.clubId).toBe(BASE.buyingClubId);
    expect(item.playerId).toBe(BASE.playerId);
  });

  it("é determinística pelo fato: mesmo mundo/jogador/data ⇒ mesmo id", () => {
    expect(buildTransferNarrative(BASE).id).toBe(
      buildTransferNarrative(BASE).id,
    );
  });

  it("fatos diferentes ⇒ manchetes diferentes", () => {
    const other = buildTransferNarrative({ ...BASE, playerId: "019f0000-0000-7000-8000-0000000000d4" });
    expect(other.id).not.toBe(buildTransferNarrative(BASE).id);
  });

  it("a intensidade cresce com a taxa", () => {
    expect(intensityForFee(100_000)).toBe(1);
    expect(intensityForFee(600_000)).toBe(2);
    expect(intensityForFee(3_000_000)).toBe(3);
    expect(intensityForFee(20_000_000)).toBe(4);
    expect(intensityForFee(80_000_000)).toBe(5);
  });
});
