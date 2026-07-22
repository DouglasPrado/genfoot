/**
 * Foco do plano COLETIVO → conjunto de atributos que ele desenvolve.
 *
 * O plano coletivo (M-TRAINING) dá um `TrainingFocus` a cada jogador; na virada,
 * o settle desenvolve os atributos deste conjunto (espalhado, mais fraco
 * primeiro). O mapeamento é calibração minha (VAL-001), ancorado na semântica
 * dos atributos. `RECOVERY` não desenvolve (descanso); `INDIVIDUAL_ROLE` usa as
 * recomendadas da posição do jogador.
 */

import {
  MENTAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
} from "../players/player-attributes.js";
import { recommendedAttributes } from "../players/position-attributes.js";

import { TrainingFocus } from "./training-types.js";

const BY_FOCUS: Readonly<Record<string, readonly string[]>> = {
  [TrainingFocus.PHYSICAL]: PHYSICAL_ATTRIBUTES,
  [TrainingFocus.TECHNICAL]: TECHNICAL_ATTRIBUTES,
  [TrainingFocus.MENTAL]: MENTAL_ATTRIBUTES,
  [TrainingFocus.TACTICAL]: ["positioning", "decisions", "vision", "concentration"],
  [TrainingFocus.DEFENSIVE]: ["marking", "tackling", "positioning", "heading", "strength"],
  [TrainingFocus.OFFENSIVE]: ["finishing", "dribbling", "crossing", "longShots", "firstTouch"],
  [TrainingFocus.SET_PIECES]: ["setPieces", "crossing", "longShots", "longPassing"],
  [TrainingFocus.RECOVERY]: [],
  // INDIVIDUAL_ROLE resolve pela posição — ver `focusAttributes`.
};

export function focusAttributes(
  focus: string,
  position: string,
): readonly string[] {
  if (focus === TrainingFocus.INDIVIDUAL_ROLE) {
    return recommendedAttributes(position);
  }
  return BY_FOCUS[focus] ?? [];
}
