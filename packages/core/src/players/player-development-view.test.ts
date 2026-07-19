import { describe, expect, it } from "vitest";

import { composePlayerDevelopmentView } from "./player-development-view.js";

const RAW = {
  playerId: "019b76da-a800-72ca-9ec5-f37f87ff4d3a",
  currentAbility: 50,
  baselineAbility: 40,
  naturalPotential: 90,
  accruals: [
    { attributeCode: "strength", pendingDeltaMinor: 30000n, evidenceCount: 20 },
    { attributeCode: "pace", pendingDeltaMinor: 4000n, evidenceCount: 20 },
  ],
};

describe("composePlayerDevelopmentView (§31, M-PLAYER-DEV)", () => {
  it("expõe as três camadas de potencial (R-213)", () => {
    const v = composePlayerDevelopmentView(RAW);
    expect(v.potential.natural).toBe(90);
    // aproveitável = base + (natural-base)×rendimento(nível provisório 3 = 0,70)
    expect(v.potential.usable).toBe(75); // 40 + 50×0,70
    expect(v.potential.functional).toBe(75); // função neutra
  });

  it("converte o buffer de pontos-base em ganho projetado por atributo (R-82)", () => {
    const v = composePlayerDevelopmentView(RAW);
    const strength = v.pendingGains.find((g) => g.attributeCode === "strength");
    expect(strength?.projectedPoints).toBe(3); // 30000 / 10000
    expect(strength?.evidenceCount).toBe(20);
  });

  it("ganho abaixo de 1 ponto aparece como 0 projetado, mas segue listado", () => {
    // 4000 pontos-base = 0,4 → arredonda a 0 no que a virada aplicaria hoje
    // (mesmo Math.round de applyAccruals), mas o buffer existe e a tela deve
    // mostrá-lo acumulando rumo ao próximo ponto.
    const v = composePlayerDevelopmentView(RAW);
    const pace = v.pendingGains.find((g) => g.attributeCode === "pace");
    expect(pace?.projectedPoints).toBe(0);
    expect(pace?.evidenceCount).toBe(20);
  });

  it("sem buffer, a lista de ganhos é vazia (não inventa)", () => {
    const v = composePlayerDevelopmentView({ ...RAW, accruals: [] });
    expect(v.pendingGains).toEqual([]);
  });

  it("é determinística", () => {
    expect(composePlayerDevelopmentView(RAW)).toEqual(
      composePlayerDevelopmentView(RAW),
    );
  });
});
