import { describe, expect, it } from "vitest";

import { CROP_SIZE, generateYouthClass } from "./youth-class.js";
import { derivePlayerOverall } from "../players/player-attributes.js";

const BASE = {
  worldSeed: "mundo-intake",
  gameWorldId: "019f782c-3033-71fc-86d7-2820a7206070",
  seasonId: "019f782c-830f-759c-9dae-7fc0dd80a6bd",
  worldStartDate: "2026-01-01",
};

describe("generateYouthClass — a safra anual de captação (R-218)", () => {
  it("gera um lote de candidatos do tamanho pedido", () => {
    const c = generateYouthClass({ ...BASE, size: 10 });
    expect(c.candidates).toHaveLength(10);
    expect(c.seasonId).toBe(BASE.seasonId);
  });

  it("usa o tamanho padrão quando não especificado", () => {
    expect(generateYouthClass(BASE).candidates).toHaveLength(CROP_SIZE);
  });

  it("candidatos são jovens (16-19) e prospectos de alto potencial", () => {
    for (const cand of generateYouthClass({ ...BASE, size: 20 }).candidates) {
      const age = 2026 - Number(cand.person.birthDate.slice(0, 4));
      expect(age).toBeGreaterThanOrEqual(16);
      expect(age).toBeLessThanOrEqual(19);
      expect(cand.player.youthProspect).toBe(true);
      // habilidade atual crua, potencial acima dela
      expect(cand.player.potentialAbility).toBeGreaterThan(
        derivePlayerOverall(cand.player.primaryPosition, cand.player.attributes),
      );
    }
  });

  it("candidatos entram SOLTOS — sem clube, sem squad (pool de captação)", () => {
    const c = generateYouthClass({ ...BASE, size: 5 });
    // A YouthClass não carrega squad (diferente da base da gênese): o vínculo
    // vem do contrato de formação, que é outro passo (C6/C9, bloqueado).
    expect("squad" in c).toBe(false);
    for (const cand of c.candidates) {
      expect(cand.player.careerStatus).toBe("ACTIVE");
    }
  });

  it("a safra tem variedade: nem todos são joia (§3.7)", () => {
    const pots = generateYouthClass({ ...BASE, size: 30 }).candidates.map(
      (c) => c.player.potentialAbility,
    );
    const gems = pots.filter((p) => p >= 80).length;
    const modest = pots.filter((p) => p < 70).length;
    // a maioria modesta, poucas joias — não um lote uniforme
    expect(modest).toBeGreaterThan(0);
    expect(gems).toBeLessThan(pots.length / 2);
    expect(new Set(pots).size).toBeGreaterThan(5); // espalhado, não constante
  });

  it("é determinística por (seed, temporada)", () => {
    const a = generateYouthClass({ ...BASE, size: 8 });
    const b = generateYouthClass({ ...BASE, size: 8 });
    expect(a).toEqual(b);
  });

  it("temporadas diferentes dão safras diferentes", () => {
    const s1 = generateYouthClass({ ...BASE, seasonId: "season-0001", size: 8 });
    const s2 = generateYouthClass({ ...BASE, seasonId: "season-0002", size: 8 });
    expect(s1.candidates[0]!.player.id).not.toBe(s2.candidates[0]!.player.id);
  });

  it("ids determinísticos e únicos no lote", () => {
    const ids = generateYouthClass({ ...BASE, size: 20 }).candidates.map(
      (c) => c.player.id,
    );
    expect(new Set(ids).size).toBe(20);
  });
});
