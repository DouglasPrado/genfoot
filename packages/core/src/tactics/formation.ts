import { PlayerPosition } from "../genesis/genesis-types.js";

/**
 * Formações canônicas e a compatibilidade posição↔slot (R-220, Fase 1).
 *
 * Uma formação é um conjunto de 11 SLOTS posicionais. É o esqueleto que a
 * escalação preenche e que, na Fase 3, o entrosamento vai chavear ("treinou
 * nesta formação"). Aqui, puro e determinístico: nomes, slots e o quão bem um
 * jogador ocupa um slot.
 *
 * O conjunto de formações é CALIBRAÇÃO minha (candidata a VAL-001) — um recorte
 * canônico do futebol, não uma lista fechada por decisão. Novas formações
 * entram aqui sem tocar o resto.
 *
 * `fillQuality` AVISA, não bloqueia (R-220/§B): escalar um zagueiro no ataque é
 * permitido e ruim, nunca proibido — a escalação é do treinador.
 */

const P = PlayerPosition;

export type FormationLine = "GK" | "DEF" | "MID" | "FWD";

export const CANONICAL_FORMATIONS = {
  "4-4-2": [P.GK, P.RB, P.CB, P.CB, P.LB, P.RM, P.CM, P.CM, P.LM, P.ST, P.ST],
  "4-3-3": [P.GK, P.RB, P.CB, P.CB, P.LB, P.CDM, P.CM, P.CM, P.RW, P.ST, P.LW],
  "4-2-3-1": [P.GK, P.RB, P.CB, P.CB, P.LB, P.CDM, P.CDM, P.RM, P.CAM, P.LM, P.ST],
  // 3-5-2 com meias abertos (RM/LM) na linha de 5 — mantém 3 def / 5 meio / 2
  // ata. A variante com alas (RWB/LWB) desce os dois para a defesa e é outra
  // formação; entra depois se for preciso.
  "3-5-2": [P.GK, P.CB, P.CB, P.CB, P.RM, P.CM, P.CM, P.CM, P.LM, P.ST, P.ST],
  "5-3-2": [P.GK, P.RB, P.CB, P.CB, P.CB, P.LB, P.CM, P.CM, P.CM, P.ST, P.ST],
} as const satisfies Record<string, readonly PlayerPosition[]>;

export type FormationName = keyof typeof CANONICAL_FORMATIONS;

const LINE_OF: Record<PlayerPosition, FormationLine> = {
  [P.GK]: "GK",
  [P.CB]: "DEF",
  [P.LB]: "DEF",
  [P.RB]: "DEF",
  [P.LWB]: "DEF",
  [P.RWB]: "DEF",
  [P.CDM]: "MID",
  [P.CM]: "MID",
  [P.CAM]: "MID",
  [P.LM]: "MID",
  [P.RM]: "MID",
  [P.LW]: "FWD",
  [P.RW]: "FWD",
  [P.ST]: "FWD",
  [P.CF]: "FWD",
};

export function positionLine(position: PlayerPosition): FormationLine {
  return LINE_OF[position];
}

export function isKnownFormation(name: string): name is FormationName {
  return name in CANONICAL_FORMATIONS;
}

/** Os 11 slots de uma formação, ou `null` se o nome não for conhecido. */
export function formationSlots(
  name: FormationName | string,
): readonly PlayerPosition[] | null {
  return isKnownFormation(name) ? CANONICAL_FORMATIONS[name] : null;
}

/**
 * Quão bem um jogador (posição natural) ocupa um slot (posição pedida): 1 =
 * exato; ~0.8 = mesma linha; ~0.5 = linha vizinha; pior ainda para gol↔linha.
 * Nunca zero — a escalação fora de posição é permitida, só rende menos. Os
 * valores são calibração minha (VAL-001).
 */
const SAME_POSITION = 1;
const SAME_LINE = 0.8;
const ADJACENT_LINE = 0.5;
const FAR_LINE = 0.35;
const GK_MISMATCH = 0.2;

const LINE_ORDER: Record<FormationLine, number> = {
  GK: 0,
  DEF: 1,
  MID: 2,
  FWD: 3,
};

export function fillQuality(
  playerPosition: PlayerPosition,
  slotPosition: PlayerPosition,
): number {
  if (playerPosition === slotPosition) return SAME_POSITION;
  const pl = positionLine(playerPosition);
  const sl = positionLine(slotPosition);
  // Gol é caso à parte: goleiro na linha (ou linha no gol) é o pior aproveitamento.
  if (pl === "GK" || sl === "GK") return GK_MISMATCH;
  if (pl === sl) return SAME_LINE;
  const distance = Math.abs(LINE_ORDER[pl] - LINE_ORDER[sl]);
  return distance === 1 ? ADJACENT_LINE : FAR_LINE;
}
