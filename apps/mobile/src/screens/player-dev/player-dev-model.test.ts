import { describe, expect, it } from "vitest";

import { derivePlayerDevView } from "./player-dev-model.js";
import type { PlayerDevelopmentView } from "@grinta/core";

const base: PlayerDevelopmentView = {
  playerId: "p1",
  currentAbility: 60,
  formaModifier: 0,
  effectiveAbility: 60,
  potential: { natural: 85, usable: 71, functional: 71 },
  pendingGains: [],
};

describe("derivePlayerDevView (M-PLAYER-DEV, R-221)", () => {
  it("decompõe efetiva em núcleo + forma", () => {
    const v = derivePlayerDevView({ ...base, formaModifier: 5, effectiveAbility: 65 });
    expect(v.core).toBe(60);
    expect(v.effectiveAbility).toBe(65);
    expect(v.forma.tone).toBe("up");
    expect(v.forma.value).toBe(5);
  });

  it("forma em baixa e neutra", () => {
    expect(derivePlayerDevView({ ...base, formaModifier: -3, effectiveAbility: 57 }).forma.tone).toBe("down");
    expect(derivePlayerDevView(base).forma.tone).toBe("neutral");
  });

  it("headroom = teto aproveitável − núcleo, e flag de teto", () => {
    expect(derivePlayerDevView(base).headroom).toBe(11); // 71 - 60
    expect(derivePlayerDevView(base).atCeiling).toBe(false);
    const capped = derivePlayerDevView({ ...base, currentAbility: 71 });
    expect(capped.headroom).toBe(0);
    expect(capped.atCeiling).toBe(true);
  });

  it("expõe as três camadas de potencial", () => {
    const layers = derivePlayerDevView(base).layers;
    expect(layers.map((l) => l.key)).toEqual(["natural", "usable", "functional"]);
    expect(layers[1].value).toBe(71);
  });
});
