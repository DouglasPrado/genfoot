import { derivePotentialLayers } from "./potential-layers.js";
import { GAIN_SCALE } from "../training/development-gain.js";

/**
 * A view de desenvolvimento de um jogador (§31, `M-PLAYER-DEV`/`M-CAREER-PLAN`).
 *
 * Junta o que a tela precisa para responder "onde ele pode chegar e o que está
 * ganhando agora": as três camadas de potencial (R-213) e o buffer de accrual
 * da temporada, traduzido de pontos-base para o ganho projetado por atributo.
 *
 * Compositor PURO: o read model Prisma só lê as linhas e chama isto. Assim a
 * regra (camadas, conversão de escala) é testável sem banco.
 */
export interface PendingGain {
  readonly attributeCode: string;
  /** Ganho já garantido em PONTOS de atributo, se a virada fosse hoje. */
  readonly projectedPoints: number;
  /** Quantos dias de treino alimentaram este buffer. */
  readonly evidenceCount: number;
}

export interface PlayerDevelopmentView {
  readonly playerId: string;
  /** O NÚCLEO permanente (R-221): sobe por treino, não cai sozinho. */
  readonly currentAbility: number;
  /** A FORMA ± transiente (R-221): move por partida/decisão, decai. */
  readonly formaModifier: number;
  /** O que a partida/tela/mercado leem: núcleo + forma, preso em 0..100. */
  readonly effectiveAbility: number;
  readonly potential: {
    readonly natural: number;
    readonly usable: number;
    readonly functional: number;
  };
  readonly pendingGains: readonly PendingGain[];
}

export interface PlayerDevelopmentRaw {
  readonly playerId: string;
  readonly currentAbility: number;
  readonly formaModifier: number;
  readonly baselineAbility: number;
  readonly naturalPotential: number;
  readonly accruals: readonly {
    readonly attributeCode: string;
    readonly pendingDeltaMinor: bigint;
    readonly evidenceCount: number;
  }[];
}

export function composePlayerDevelopmentView(
  raw: PlayerDevelopmentRaw,
): PlayerDevelopmentView {
  const layers = derivePotentialLayers({
    natural: raw.naturalPotential,
    baselineAbility: raw.baselineAbility,
    currentAbility: raw.currentAbility,
  });

  const pendingGains = raw.accruals.map((a) => ({
    attributeCode: a.attributeCode,
    // Mesma conversão da aplicação (applyAccruals): pontos-base → pontos, com o
    // mesmo arredondamento, para a projeção da tela bater com o que a virada faz.
    projectedPoints: Math.round(Number(a.pendingDeltaMinor) / GAIN_SCALE),
    evidenceCount: a.evidenceCount,
  }));

  return {
    playerId: raw.playerId,
    currentAbility: raw.currentAbility,
    formaModifier: raw.formaModifier,
    effectiveAbility: Math.max(
      0,
      Math.min(100, raw.currentAbility + raw.formaModifier),
    ),
    potential: {
      natural: layers.natural,
      usable: layers.usable,
      functional: layers.functional,
    },
    pendingGains,
  };
}
