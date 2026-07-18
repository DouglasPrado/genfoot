import type { GameWorldId } from "@grinta/shared";

import { SeededRandom } from "../foundation/seeded-random.js";

/**
 * C10 — a torcida do clube. VERTICAL A: o headcount materializado na gênese.
 *
 * O que isto é: o tamanho da torcida na largada, determinístico por
 * `(worldSeed, clubIndex)` (R-182), mais a paciência da diretoria e a pressão —
 * que num mundo recém-nascido são NEUTRAS (nenhum resultado ainda aconteceu):
 * paciência 50, pressão 0. Elas ganham vida quando o motor de reação da torcida
 * (§2 da spec, R-69) processar partidas — o que NÃO é este vertical.
 *
 * O que isto ainda NÃO é: os 8 segmentos da R-68 (`FanSegment` com share,
 * satisfação e vocalidade), a expectativa (§3) e a pressão ponderada por
 * vocalidade. Aqui a torcida é um número; a segmentação é o próximo passo.
 */

const HEADCOUNT_MIN = 800;
const HEADCOUNT_MAX = 45_000;

/** A faixa do headcount inicial — exposta para os testes e a documentação. */
export const HEADCOUNT_RANGE = { min: HEADCOUNT_MIN, max: HEADCOUNT_MAX } as const;

/**
 * O tamanho da torcida na largada. "Todos nascem pequenos" (GDD §1): a curva é
 * enviesada para baixo (f²) — muitos clubes pequenos, poucos grandes —, mas
 * sempre determinística: o mesmo mundo gera a mesma torcida.
 */
export function deriveFanbaseHeadcount(
  worldSeed: string,
  clubIndex: number,
): number {
  const random = new SeededRandom({
    worldSeed,
    context: `fanbase-headcount:${clubIndex}`,
  });
  const skewed = random.nextFloat() ** 2;
  return Math.round(HEADCOUNT_MIN + (HEADCOUNT_MAX - HEADCOUNT_MIN) * skewed);
}

/** Os valores NEUTROS da diretoria/pressão num mundo sem histórico (R-69). */
export const NEUTRAL_BOARD_PATIENCE = 50;
export const NEUTRAL_PRESSURE_LEVEL = 0;

/** A visão da torcida de um clube — o que a tela do Clube lê (M-25). */
export interface FanbaseView {
  readonly clubId: string;
  /** Tamanho da torcida (headcount). */
  readonly headcount: number;
  /** Paciência da diretoria, 0–100 (R-69). Neutra = 50 na largada. */
  readonly boardPatience: number;
  /** Pressão pública, 0–100 (R-68). Zero na largada. */
  readonly pressureLevel: number;
}

export interface FanbaseReadModel {
  /** A torcida de um clube; `null` se o clube não existe no mundo. */
  fanbaseForClub(
    gameWorldId: GameWorldId,
    clubId: string,
  ): Promise<FanbaseView | null>;
}
