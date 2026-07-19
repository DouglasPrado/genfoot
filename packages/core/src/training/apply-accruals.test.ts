import { describe, expect, it } from "vitest";

import { applyAccruals, type AccrualToApply } from "./apply-accruals.js";
import { Player } from "../players/player.js";
import {
  PlayerAvailability,
  PlayerCareerStatus,
  PlayerGenerationSource,
} from "../players/player-lifecycle-types.js";
import { DominantFoot, PlayerPosition } from "../genesis/genesis-types.js";
import {
  GOALKEEPING_ATTRIBUTES,
  MENTAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
} from "../players/player-attributes.js";
import type { PlayerLifecycleSnapshot } from "../players/player-lifecycle-types.js";

const WORLD = "019b76da-a800-7451-8ea2-7b2378e42050";
const PLAYER = "019b76da-a800-7451-8ea2-7b2378e42051";

function player(over: Partial<PlayerLifecycleSnapshot> = {}): Player {
  const attributes: Record<string, number | null> = {};
  for (const c of [
    ...TECHNICAL_ATTRIBUTES,
    ...PHYSICAL_ATTRIBUTES,
    ...MENTAL_ATTRIBUTES,
  ])
    attributes[c] = 50;
  for (const c of GOALKEEPING_ATTRIBUTES) attributes[c] = null;

  const snapshot: PlayerLifecycleSnapshot = {
    id: PLAYER,
    gameWorldId: WORLD,
    personId: "019b76da-a800-7451-8ea2-7b2378e42052",
    primaryPosition: PlayerPosition.CB,
    dominantFoot: DominantFoot.RIGHT,
    careerStatus: PlayerCareerStatus.ACTIVE,
    availability: PlayerAvailability.AVAILABLE,
    generationSource: PlayerGenerationSource.INITIAL_WORLD,
    generatedAtSeasonNumber: 1,
    attributes,
    currentAbility: 50,
    baselineAbility: 50,
    potentialAbility: 90,
    dynamicState: {
      morale: 50, confidence: 50, happiness: 50, fatigue: 0, matchSharpness: 50,
    },
    lastProcessedOn: "2026-01-01",
    version: 1,
    ...over,
  } as PlayerLifecycleSnapshot;
  const r = Player.fromSnapshot(snapshot);
  if (!r.ok) throw r.error;
  return r.value;
}

// pontos-base: +6 pontos de atributo = 60000 (GAIN_SCALE 10000)
const buffer = (over: Partial<AccrualToApply> = {}): AccrualToApply => ({
  attributeCode: "shortPassing",
  pendingDeltaMinor: 60000n,
  ...over,
});

const HIST = "019b76da-a800-7eee-9462-49c009be0001";
const base = {
  historyId: HIST as never,
  worldDate: "2026-12-31",
  rulesetVersion: "1.0.0" as never,
};

describe("applyAccruals — aplicação única na virada (INV-29/R-113)", () => {
  it("aplica o buffer ao atributo, respeitando o clamp de ±6", () => {
    const p = player();
    const r = applyAccruals(p, [buffer({ pendingDeltaMinor: 90000n })], base);
    expect(r.ok).toBe(true);
    // 90000 pontos-base = +9, mas o clamp de applyAttributeChange corta em +6.
    expect(p.snapshot().attributes.shortPassing).toBe(56);
  });

  it("converte pontos-base em pontos de atributo (R-82)", () => {
    const p = player();
    applyAccruals(p, [buffer({ pendingDeltaMinor: 30000n })], base); // +3
    expect(p.snapshot().attributes.shortPassing).toBe(53);
  });

  it("reescreve a baselineAbility para a habilidade nova (R-216)", () => {
    const p = player({ currentAbility: 50, baselineAbility: 40 });
    const antes = p.snapshot().currentAbility;
    const r = applyAccruals(p, [buffer()], base);
    expect(r.ok).toBe(true);
    // a base após a virada é a habilidade resultante — a margem da próxima
    // temporada parte daqui.
    expect(p.snapshot().baselineAbility).toBe(p.snapshot().currentAbility);
    expect(p.snapshot().baselineAbility).toBeGreaterThanOrEqual(antes);
  });

  it("devolve o conjunto de buffers consumidos, para zerar (replay-safe)", () => {
    const p = player();
    const r = applyAccruals(
      p,
      [buffer({ attributeCode: "shortPassing" }), buffer({ attributeCode: "vision" })],
      base,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect([...r.value.consumed].sort()).toEqual(["shortPassing", "vision"]);
  });

  it("ignora buffer de atributo não aplicável sem derrubar os outros", () => {
    // Um buffer de reflexo de goleiro num zagueiro é ruído; não pode abortar a
    // virada dos atributos válidos.
    const p = player();
    const r = applyAccruals(
      p,
      [buffer({ attributeCode: "goalkeeperReflexes" }), buffer({ attributeCode: "vision" })],
      base,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.consumed).toContain("vision");
      expect(r.value.consumed).not.toContain("goalkeeperReflexes");
    }
    expect(p.snapshot().attributes.vision).toBe(56);
  });

  it("buffer negativo reduz o atributo (trade-off, §6:297-303)", () => {
    const p = player();
    applyAccruals(p, [buffer({ pendingDeltaMinor: -30000n })], base); // -3
    expect(p.snapshot().attributes.shortPassing).toBe(47);
  });

  it("buffer vazio é no-op bem-sucedido", () => {
    const p = player();
    const r = applyAccruals(p, [], base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.consumed).toEqual([]);
    expect(p.snapshot().attributes.shortPassing).toBe(50);
  });

  it("delta abaixo de 1 ponto não move o atributo, mas é consumido", () => {
    // 4000 pontos-base = 0,4 ponto → arredonda a 0. O buffer some (foi
    // aplicado, rendeu zero), senão migalhas se acumulariam para sempre.
    const p = player();
    const r = applyAccruals(p, [buffer({ pendingDeltaMinor: 4000n })], base);
    expect(r.ok).toBe(true);
    expect(p.snapshot().attributes.shortPassing).toBe(50);
    if (r.ok) expect(r.value.consumed).toContain("shortPassing");
  });
});
