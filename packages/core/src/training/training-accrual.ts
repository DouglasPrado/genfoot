import {
  GAIN_SCALE,
  computeDevelopmentGain,
} from "./development-gain.js";
import { TrainingFocus } from "./training-types.js";

/**
 * Motor de accrual do treino (R-212, R-82, R-113).
 *
 * O ganho de treino NÃO altera o atributo na hora: ele acumula num buffer por
 * `attributeCode` (`PlayerDevelopmentAccrual`), e só é aplicado UMA vez na
 * virada de temporada (INV-29). Isto é o passo de acumulação — o buffer, não a
 * aplicação. A aplicação vive em `applyAccruals`.
 */

/**
 * Mapa foco→atributos — CALIBRAÇÃO minha, não do doc.
 *
 * O doc (`02-sistema-de-jogadores.md:253-295`) detalha sub-treinos finos (Passe,
 * Finalização, Drible…), mas o enum `TrainingFocus` do schema é grosso
 * (TECHNICAL, PHYSICAL, DEFENSIVE…). Este mapa é a ponte entre os dois: cada
 * foco grosso aponta para o conjunto de atributos canônicos que ele desenvolve,
 * agregando as linhas das tabelas do doc. Candidato a VAL-001 — se um foco ficar
 * largo ou estreito demais no jogo, é aqui que se ajusta.
 *
 * `RECOVERY` é vazio de propósito: recuperação é descanso sob ordem médica, não
 * ganho de atributo (a restrição médica no SetTrainingPlan já a trata assim).
 * `INDIVIDUAL_ROLE` também é vazio aqui — o alvo dele é por jogador
 * (`M-TRAINING-INDIV`), não um conjunto fixo, e entra quando aquela tela existir.
 */
export const FOCUS_ATTRIBUTES: Record<TrainingFocus, readonly string[]> = {
  [TrainingFocus.TECHNICAL]: [
    "shortPassing",
    "longPassing",
    "firstTouch",
    "dribbling",
    "vision",
  ],
  [TrainingFocus.PHYSICAL]: [
    "strength",
    "pace",
    "acceleration",
    "stamina",
    "agility",
    "explosiveness",
  ],
  [TrainingFocus.TACTICAL]: ["positioning", "decisions", "concentration"],
  [TrainingFocus.MENTAL]: [
    "composure",
    "determination",
    "concentration",
    "leadership",
    "resilience",
  ],
  [TrainingFocus.DEFENSIVE]: ["marking", "tackling", "positioning"],
  [TrainingFocus.OFFENSIVE]: [
    "finishing",
    "longShots",
    "dribbling",
    "heading",
  ],
  [TrainingFocus.SET_PIECES]: ["setPieces", "crossing"],
  [TrainingFocus.RECOVERY]: [],
  [TrainingFocus.INDIVIDUAL_ROLE]: [],
};

export interface AccrualPlayerContext {
  readonly playerId: string;
  readonly age: number;
  readonly baselineAbility: number;
  readonly currentAbility: number;
  readonly naturalPotential: number;
  readonly baseLearningRate: number;
  readonly trainingQuality: number;
  readonly compatibility: number;
  readonly competitiveMinutes: number;
  readonly morale: number;
  readonly fatigue: number;
  readonly injury: number;
  readonly negativePressure: number;
  /** Atributos que se aplicam à posição do jogador (não-`null` no grid). */
  readonly applicableAttributes: readonly string[];
}

export interface AccrualDelta {
  readonly playerId: string;
  readonly attributeCode: string;
  /** Delta escalado em pontos-base (R-82), a somar no buffer. */
  readonly pendingDelta: number;
}

export interface TrainingLoad {
  readonly focus: TrainingFocus;
  /** Carga individual do jogador no plano (0..100). */
  readonly workload: number;
  /** Perda de qualidade por excesso de agenda (R-13), 0..1. */
  readonly qualityFactor: number;
}

/**
 * O ganho de UM dia de treino, por atributo, para UM jogador.
 *
 * `remainingPotential` é a margem até o teto NATURAL, normalizada — o accrual
 * acumula rumo ao natural; é a APLICAÇÃO (na virada) que trava no aproveitável
 * (R-216). Manter o buffer no natural evita perder ganho quando a estrutura
 * melhora no meio da temporada.
 */
export function accrueTrainingDay(
  load: TrainingLoad,
  player: AccrualPlayerContext,
): readonly AccrualDelta[] {
  if (load.workload <= 0 || load.qualityFactor <= 0) return [];

  const alvos = FOCUS_ATTRIBUTES[load.focus].filter((code) =>
    player.applicableAttributes.includes(code),
  );
  if (alvos.length === 0) return [];

  const margem = Math.max(0, player.naturalPotential - player.baselineAbility);
  const remainingPotential =
    player.naturalPotential <= 0 ? 0 : margem / player.naturalPotential;
  // `focoDoTreino` combina a carga individual (0..100 → 0..1) com a perda de
  // qualidade da agenda: um treino sobrecarregado rende menos, não zero (R-13).
  const trainingFocus = (load.workload / 100) * load.qualityFactor;

  const gainScaled = computeDevelopmentGain({
    baseLearningRate: player.baseLearningRate,
    remainingPotential,
    trainingFocus,
    trainingQuality: player.trainingQuality,
    compatibility: player.compatibility,
    competitiveMinutes: player.competitiveMinutes,
    age: player.age,
    morale: player.morale,
    fatigue: player.fatigue,
    injury: player.injury,
    negativePressure: player.negativePressure,
  });
  if (gainScaled <= 0) return [];

  // O ganho do dia é dividido entre os atributos do foco: treinar cinco coisas
  // ao mesmo tempo desenvolve cada uma menos que treinar uma só. `GAIN_SCALE`
  // já está embutido em `gainScaled`; dividir mantém a escala.
  const perAttribute = Math.round(gainScaled / alvos.length);
  if (perAttribute <= 0) return [];

  return alvos.map((attributeCode) => ({
    playerId: player.playerId,
    attributeCode,
    pendingDelta: perAttribute,
  }));
}

/** Reexporta para quem calibra a escala junto do accrual. */
export { GAIN_SCALE };
