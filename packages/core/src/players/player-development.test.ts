import { describe, expect, it } from "vitest";

import { WorldDate } from "@grinta/shared";

import { Player } from "./player.js";
import { FORM_MAX } from "./match-form.js";
import { derivePotentialLayers } from "./potential-layers.js";
import {
  PlayerAvailability,
  PlayerCareerStatus,
  PlayerGenerationSource,
} from "./player-lifecycle-types.js";
import { DominantFoot, PlayerPosition } from "../genesis/genesis-types.js";
import {
  GOALKEEPING_ATTRIBUTES,
  MENTAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
} from "./player-attributes.js";
import type { PlayerLifecycleSnapshot } from "./player-lifecycle-types.js";

const WORLD = "019b76da-a800-7451-8ea2-7b2378e42050";
const PLAYER = "019b76da-a800-7451-8ea2-7b2378e42051";
const PERSON = "019b76da-a800-7451-8ea2-7b2378e42052";
const HISTORY = "019b76da-a800-7eee-9462-49c009be0001";

/**
 * Um zagueiro com todos os atributos de linha iguais, para o `overall` ser
 * previsível: mexer num atributo move a habilidade de forma legível, sem os
 * pesos por posição embaralharem a leitura.
 */
function jogador(
  overrides: Partial<PlayerLifecycleSnapshot> = {},
): PlayerLifecycleSnapshot {
  const base: Record<string, number | null> = {};
  // Os arrays canônicos (R-188): montar a lista à mão deixava atributo de fora,
  // e o `overall` derivado saía NaN sem dizer qual faltava.
  for (const code of [
    ...TECHNICAL_ATTRIBUTES,
    ...PHYSICAL_ATTRIBUTES,
    ...MENTAL_ATTRIBUTES,
  ]) base[code] = 50;
  for (const code of GOALKEEPING_ATTRIBUTES) base[code] = null;

  return {
    id: PLAYER,
    gameWorldId: WORLD,
    personId: PERSON,
    primaryPosition: PlayerPosition.CB,
    dominantFoot: DominantFoot.RIGHT,
    careerStatus: PlayerCareerStatus.ACTIVE,
    availability: PlayerAvailability.AVAILABLE,
    generationSource: PlayerGenerationSource.INITIAL_WORLD,
    generatedAtSeasonNumber: 1,
    attributes: base,
    currentAbility: 50,
    potentialAbility: 80,
    baselineAbility: 50,
    dynamicState: {
      morale: 50, confidence: 50, happiness: 50, fatigue: 0, matchSharpness: 50,
    },
    lastProcessedOn: "2026-01-01",
    version: 1,
    ...overrides,
  } as PlayerLifecycleSnapshot;
}

function carregar(snapshot: PlayerLifecycleSnapshot): Player {
  const result = Player.fromSnapshot(snapshot);
  if (!result.ok) throw result.error;
  return result.value;
}

const evoluir = (player: Player, valor: number) =>
  player.applyAttributeChange({
    historyId: HISTORY as never,
    attributeCode: "marking",
    requestedValue: valor,
    cause: "treino defensivo",
    worldDate: "2026-01-03",
    rulesetVersion: "1.0.0" as never,
  });

describe("applyAttributeChange — teto pelo APROVEITÁVEL (R-213)", () => {
  it("para no aproveitável, não no natural", () => {
    // Natural 80, habilidade 50, estrutura provisória nível 3 (70%):
    // aproveitável = 50 + 30×0,70 = 71. O ganho tem que parar em 71, não em 80.
    // Antes da R-213 o clamp usava o natural, e a estrutura do clube não tinha
    // efeito nenhum sobre o desenvolvimento — a R-12 existia só no papel.
    const snapshot = jogador({ currentAbility: 50, potentialAbility: 80 });
    const camadas = derivePotentialLayers({
      natural: 80,
      currentAbility: 50,
      structureLevel: null,
    });
    expect(camadas.usable).toBe(71);

    const player = carregar(snapshot);
    const resultado = evoluir(player, 56);
    expect(resultado.ok).toBe(true);
    expect(player.snapshot().currentAbility).toBeLessThanOrEqual(camadas.usable);
  });

  it("continua respeitando o clamp de ±6 por aplicação", () => {
    const player = carregar(jogador());
    const resultado = evoluir(player, 90);
    expect(resultado.ok).toBe(true);
    expect(player.snapshot().attributes.marking).toBe(56);
  });

  it("bloqueia ganho no APROVEITÁVEL, não no natural (R-213/R-216)", () => {
    // Base 50, natural 80, estrutura provisória nível 3 → aproveitável 71.
    // Chegando a 71, nada mais entra sem melhorar a estrutura ou virar a
    // temporada — é isso que a M-PLAYER-DEV precisa explicar quando o jogador
    // pergunta "por que estagnou?".
    const player = carregar(
      jogador({ currentAbility: 71, potentialAbility: 80, baselineAbility: 50 }),
    );
    const antes = player.snapshot().attributes.marking;
    const resultado = evoluir(player, 60);
    expect(resultado.ok).toBe(true);
    expect(player.snapshot().attributes.marking).toBe(antes);
  });

  it("permite QUEDA mesmo no teto — o teto limita ganho, não perda", () => {
    const player = carregar(
      jogador({ currentAbility: 71, potentialAbility: 80, attributes: { ...jogador().attributes, marking: 71 } }),
    );
    const resultado = evoluir(player, 44);
    expect(resultado.ok).toBe(true);
    expect(player.snapshot().attributes.marking).toBe(65); // 71 - 6
  });

  it("recusa atributo que não se aplica à posição", () => {
    const player = carregar(jogador());
    const resultado = player.applyAttributeChange({
      historyId: HISTORY as never,
      attributeCode: "goalkeeperReflexes",
      requestedValue: 60,
      cause: "treino de goleiro",
      worldDate: "2026-01-03",
      rulesetVersion: "1.0.0" as never,
    });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.code).toBe("ATTRIBUTE_NOT_APPLICABLE");
  });
});

describe("Player.retire — fim de carreira (R-217)", () => {
  it("marca RETIRED e incrementa a versão", () => {
    const p = carregar(jogador());
    const antes = p.snapshot().version;
    p.retire();
    expect(p.snapshot().careerStatus).toBe(PlayerCareerStatus.RETIRED);
    expect(p.snapshot().version).toBe(antes + 1);
  });

  it("aposentar de novo é idempotente — segue RETIRED", () => {
    const p = carregar(jogador());
    p.retire();
    const v = p.snapshot().version;
    p.retire();
    expect(p.snapshot().careerStatus).toBe(PlayerCareerStatus.RETIRED);
    // não incrementa versão à toa: já estava aposentado
    expect(p.snapshot().version).toBe(v);
  });
});

describe("Player — sessão de treino (R-221 Fase 2a)", () => {
  it("beginTraining torna indisponível e transita só de AVAILABLE", () => {
    const p = carregar(jogador());
    expect(p.availability).toBe(PlayerAvailability.AVAILABLE);
    expect(p.beginTraining()).toBe(true);
    expect(p.availability).toBe(PlayerAvailability.UNAVAILABLE);
    // já indisponível: não transita de novo
    expect(p.beginTraining()).toBe(false);
  });

  it("endTraining volta a ficar disponível", () => {
    const p = carregar(jogador());
    p.beginTraining();
    p.endTraining();
    expect(p.availability).toBe(PlayerAvailability.AVAILABLE);
  });

  it("beginTraining não pega quem não está disponível (ex.: lesionado)", () => {
    const p = carregar(jogador({ availability: PlayerAvailability.INJURED }));
    expect(p.beginTraining()).toBe(false);
    expect(p.availability).toBe(PlayerAvailability.INJURED);
  });

  it("addFatigue soma com teto 100 e ignora ≤0", () => {
    const p = carregar(jogador({ dynamicState: { morale: 50, confidence: 50, happiness: 50, fatigue: 0, matchSharpness: 50 } }));
    p.addFatigue(20);
    expect(p.fatigue).toBe(20);
    p.addFatigue(90);
    expect(p.fatigue).toBe(100); // teto
    const v = p.snapshot().version;
    p.addFatigue(0);
    p.addFatigue(-5);
    expect(p.snapshot().version).toBe(v); // no-op não incrementa versão
  });
});

describe("Player — forma (R-221 Fase 2b)", () => {
  it("habilidade efetiva = núcleo + forma", () => {
    const p = carregar(jogador({ currentAbility: 60 }));
    expect(p.effectiveAbility()).toBe(60); // forma 0
    p.applyMatchForm(5);
    expect(p.formaModifier).toBe(5);
    expect(p.effectiveAbility()).toBe(65);
    p.applyMatchForm(-8);
    expect(p.formaModifier).toBe(-3);
    expect(p.effectiveAbility()).toBe(57);
  });

  it("forma é tetada em ±FORM_MAX", () => {
    const p = carregar(jogador());
    p.applyMatchForm(999);
    expect(p.formaModifier).toBe(FORM_MAX);
    p.applyMatchForm(-999);
    expect(p.formaModifier).toBe(-FORM_MAX);
  });

  it("delta zero é no-op (não incrementa versão)", () => {
    const p = carregar(jogador());
    const v = p.snapshot().version;
    p.applyMatchForm(0);
    expect(p.snapshot().version).toBe(v);
  });

  it("efetiva não vaza de 0..100", () => {
    const alto = carregar(jogador({ currentAbility: 95, potentialAbility: 99 }));
    alto.applyMatchForm(FORM_MAX);
    expect(alto.effectiveAbility()).toBe(100);
  });

  it("a forma decai ao neutro com os dias (processUntil)", () => {
    const p = carregar(jogador({ lastProcessedOn: "2026-03-01" }));
    p.applyMatchForm(6);
    expect(p.formaModifier).toBe(6);
    const d = WorldDate.parse("2026-03-05"); // 4 dias
    if (!d.ok) throw d.error;
    p.processUntil(d.value);
    expect(p.formaModifier).toBe(2); // 6 - 4*1
  });
});
