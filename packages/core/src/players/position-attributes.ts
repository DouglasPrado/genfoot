import { PlayerPosition } from "../genesis/genesis-types.js";

/**
 * Habilidades RECOMENDADAS por posição — a fonte única para "o que este jogador
 * deveria treinar". Ancorada no `specificAttribute` de cada posição
 * (`OVERALL_WEIGHTS`, R-09) e completada com as habilidades que a função exige
 * no futebol. Calibração (VAL-001): a lista pode ser afinada sem tocar no resto.
 *
 * As chaves são os códigos de `PlayerPosition` (EN: CB, LB, ST…), os mesmos da
 * `primaryPosition` do roster. Cada valor lista códigos de `player-attributes`.
 */
export const RECOMMENDED_ATTRIBUTES_BY_POSITION: Readonly<
  Record<PlayerPosition, readonly string[]>
> = {
  [PlayerPosition.GK]: [
    "goalkeeperReflexes",
    "goalkeeperPositioning",
    "goalkeeperHandling",
    "goalkeeperAerial",
    "goalkeeperOneOnOne",
    "goalkeeperKicking",
    "composure",
    "concentration",
  ],
  [PlayerPosition.CB]: [
    "marking",
    "tackling",
    "heading",
    "strength",
    "positioning",
    "jumping",
    "composure",
  ],
  [PlayerPosition.LB]: [
    "crossing",
    "tackling",
    "marking",
    "pace",
    "stamina",
    "positioning",
  ],
  [PlayerPosition.RB]: [
    "crossing",
    "tackling",
    "marking",
    "pace",
    "stamina",
    "positioning",
  ],
  [PlayerPosition.LWB]: [
    "crossing",
    "stamina",
    "pace",
    "dribbling",
    "tackling",
    "positioning",
  ],
  [PlayerPosition.RWB]: [
    "crossing",
    "stamina",
    "pace",
    "dribbling",
    "tackling",
    "positioning",
  ],
  [PlayerPosition.CDM]: [
    "tackling",
    "marking",
    "positioning",
    "shortPassing",
    "strength",
    "decisions",
    "composure",
  ],
  [PlayerPosition.CM]: [
    "shortPassing",
    "longPassing",
    "vision",
    "decisions",
    "stamina",
    "positioning",
    "composure",
  ],
  [PlayerPosition.CAM]: [
    "vision",
    "shortPassing",
    "dribbling",
    "finishing",
    "longShots",
    "decisions",
    "composure",
  ],
  [PlayerPosition.LM]: [
    "crossing",
    "dribbling",
    "pace",
    "shortPassing",
    "stamina",
    "agility",
  ],
  [PlayerPosition.RM]: [
    "crossing",
    "dribbling",
    "pace",
    "shortPassing",
    "stamina",
    "agility",
  ],
  [PlayerPosition.LW]: [
    "dribbling",
    "pace",
    "crossing",
    "finishing",
    "acceleration",
    "agility",
  ],
  [PlayerPosition.RW]: [
    "dribbling",
    "pace",
    "crossing",
    "finishing",
    "acceleration",
    "agility",
  ],
  [PlayerPosition.ST]: [
    "finishing",
    "positioning",
    "heading",
    "firstTouch",
    "composure",
    "pace",
    "strength",
  ],
  [PlayerPosition.CF]: [
    "firstTouch",
    "finishing",
    "shortPassing",
    "vision",
    "dribbling",
    "composure",
  ],
};

const VALID_POSITIONS = new Set<string>(Object.values(PlayerPosition));

/** As habilidades recomendadas para a posição; vazio se a posição é desconhecida. */
export function recommendedAttributes(position: string): readonly string[] {
  if (!VALID_POSITIONS.has(position)) return [];
  return RECOMMENDED_ATTRIBUTES_BY_POSITION[position as PlayerPosition];
}

/** Esta habilidade é recomendada para a posição do jogador? */
export function isRecommendedAttribute(
  position: string,
  attributeCode: string,
): boolean {
  return recommendedAttributes(position).includes(attributeCode);
}
