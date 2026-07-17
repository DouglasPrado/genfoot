import { PlayerPosition } from "../genesis/genesis-types.js";

/**
 * O grid canônico do jogador — R-188.
 *
 * **A lista é a do GDD §2**, que se declara fonte única
 * (`01-game-design/02-sistema-de-jogadores.md:107`):
 *
 * > Esta subseção é a **fonte única** da lista de atributos do jogador. O
 * > overview (§7) e a IA de comportamento (§3.4) apenas **referenciam** esta
 * > lista — não mantêm listas próprias.
 *
 * O que estava no schema era o grid do **Football Manager**, com os nomes dele
 * (`technique`, `flair`, `teamwork`, `workRate`) — e sem os do GDD. E o domínio
 * tinha 4 escalares agrupados, que a R-179 já havia condenado.
 *
 * Escala 0–100 para todo atributo (GDD §2, "escala canônica").
 */

/** Técnicos (12) — GDD §2. Evoluem pelos treinos técnicos da §6. */
export const TECHNICAL_ATTRIBUTES = [
  "finishing", // finalização
  "longShots", // chute de longe
  "shortPassing", // passe curto
  "longPassing", // passe longo (lançamento)
  "crossing", // cruzamento
  "dribbling", // drible
  "firstTouch", // controle de bola (domínio / primeiro toque)
  "marking", // marcação
  "tackling", // desarme
  "heading", // cabeceio
  "setPieces", // bola parada (falta / escanteio / pênalti)
  "vision", // visão de jogo
] as const;

/** Físicos (9) — GDD §2. */
export const PHYSICAL_ATTRIBUTES = [
  "pace", // velocidade
  "acceleration", // aceleração
  "strength", // força
  "stamina", // resistência
  "jumping", // impulsão
  "agility", // agilidade
  "balance", // equilíbrio
  "explosiveness", // explosão
  "recovery", // recuperação física
] as const;

/**
 * Mentais (10) — GDD §2. Estruturais: mudam devagar, pelos treinos mentais e
 * táticos.
 *
 * `aggression` NÃO está aqui, e a ausência é a decisão: o GDD o classifica como
 * **traço** ("temperamento"). Traço tem intensidade e **visibilidade** — parte
 * só se revela com o tempo — e não é nota que sobe com treino. O schema o tinha
 * como atributo porque copiou o FM.
 */
export const MENTAL_ATTRIBUTES = [
  "positioning", // inteligência tática (leitura de jogo / posicionamento)
  "decisions", // tomada de decisão
  "concentration", // concentração / foco
  "discipline", // disciplina
  "composure", // frieza
  "determination", // determinação / garra
  "leadership", // liderança
  "consistency", // regularidade
  "bravery", // coragem
  "resilience", // resiliência
] as const;

/**
 * Goleiro (8) — GDD §2: "grid próprio do goleiro, **somado aos atributos
 * físicos e mentais comuns**".
 *
 * Por isso o goleiro não tem grid técnico no peso (ver `OVERALL_WEIGHTS`): o
 * dele é este.
 */
export const GOALKEEPING_ATTRIBUTES = [
  "goalkeeperReflexes", // reflexos
  "goalkeeperPositioning", // posicionamento de gol
  "goalkeeperHandling", // saída de gol (domínio de área / cruzamentos)
  "goalkeeperKicking", // reposição com os pés
  "goalkeeperAerial", // jogo aéreo
  "goalkeeperOneOnOne", // um-contra-um
  "goalkeeperPenalty", // defesa de pênalti
  "goalkeeperCommand", // comando de área / comunicação
] as const;

export type TechnicalAttributeCode = (typeof TECHNICAL_ATTRIBUTES)[number];
export type PhysicalAttributeCode = (typeof PHYSICAL_ATTRIBUTES)[number];
export type MentalAttributeCode = (typeof MENTAL_ATTRIBUTES)[number];
export type GoalkeepingAttributeCode = (typeof GOALKEEPING_ATTRIBUTES)[number];

export type PlayerAttributeCode =
  | TechnicalAttributeCode
  | PhysicalAttributeCode
  | MentalAttributeCode
  | GoalkeepingAttributeCode;

/**
 * Os 39 atributos. O grid de goleiro é `null` em quem não é goleiro — e `null`
 * não é `0`: zero diria "péssimo goleiro", null diz "não se aplica".
 */
export type PlayerAttributes = {
  readonly [K in
    | TechnicalAttributeCode
    | PhysicalAttributeCode
    | MentalAttributeCode]: number;
} & {
  readonly [K in GoalkeepingAttributeCode]: number | null;
};

/**
 * Os 4 grupos da R-179: **rollup derivado para exibição, nunca fonte**.
 *
 * É o que a tela mostra em cima do card; quem decide qualquer coisa lê os 39.
 */
export interface PlayerAttributeRollup {
  readonly technical: number;
  readonly physical: number;
  readonly mental: number;
  /** `null` em quem não é goleiro. */
  readonly goalkeeping: number | null;
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function rollupAttributes(
  attributes: PlayerAttributes,
): PlayerAttributeRollup {
  const goalkeeping = GOALKEEPING_ATTRIBUTES.map((code) => attributes[code]);
  // O predicado no `every` é o que estreita o array para `number[]` — sem ele
  // sobraria um `as`, que é afirmar em vez de provar.
  const temGrid = goalkeeping.every((value): value is number => value !== null);
  return {
    technical: average(TECHNICAL_ATTRIBUTES.map((code) => attributes[code])),
    physical: average(PHYSICAL_ATTRIBUTES.map((code) => attributes[code])),
    mental: average(MENTAL_ATTRIBUTES.map((code) => attributes[code])),
    goalkeeping: temGrid ? average(goalkeeping) : null,
  };
}

/**
 * Os pesos de agregação do `overall` — R-09.
 *
 * A R-09 ratifica a FORMA (média ponderada do grid canônico por posição, mais
 * um atributo específico da função) e ancora **duas** posições ao pé da letra:
 *
 * > ex.: atacante = 0,45 técnico + 0,20 físico + 0,20 mental + 0,15
 * > finalização-específica; goleiro = 0,60 grid de goleiro + 0,25 mental + 0,15
 * > físico
 *
 * As outras 13 são **calibração de primeira passada**, e a R-09 diz isso de si
 * mesma: "os pesos de agregação por posição são decisão de balanceamento". Elas
 * seguem o racional que a própria R-09 dá — "ancorar os pesos na posição impede
 * que um atributo irrelevante para a função infle a nota" — e são para ajustar,
 * não escritura.
 *
 * `specificAttribute` é o atributo que define a função: finalização no atacante,
 * marcação no zagueiro, visão no meia armador. É o que impede um zagueiro de
 * subir de nota por finalizar bem.
 *
 * **Todo peso soma 1**, e há teste para isso nas 15 posições: peso que não soma
 * 1 não é média ponderada, é escala arbitrária — uma posição sairia
 * sistematicamente mais forte que a outra.
 */
export interface OverallWeights {
  readonly technical: number;
  readonly physical: number;
  readonly mental: number;
  readonly goalkeeping: number;
  readonly specific: number;
  readonly specificAttribute: PlayerAttributeCode;
}

const DEFENSOR: Omit<OverallWeights, "specificAttribute"> = {
  technical: 0.3,
  physical: 0.25,
  mental: 0.3,
  goalkeeping: 0,
  specific: 0.15,
};

const LATERAL: Omit<OverallWeights, "specificAttribute"> = {
  technical: 0.35,
  physical: 0.3,
  mental: 0.2,
  goalkeeping: 0,
  specific: 0.15,
};

const MEIA: Omit<OverallWeights, "specificAttribute"> = {
  technical: 0.4,
  physical: 0.2,
  mental: 0.25,
  goalkeeping: 0,
  specific: 0.15,
};

const PONTA: Omit<OverallWeights, "specificAttribute"> = {
  technical: 0.45,
  physical: 0.25,
  mental: 0.15,
  goalkeeping: 0,
  specific: 0.15,
};

/** O da R-09, ao pé da letra. */
const ATACANTE: Omit<OverallWeights, "specificAttribute"> = {
  technical: 0.45,
  physical: 0.2,
  mental: 0.2,
  goalkeeping: 0,
  specific: 0.15,
};

export const OVERALL_WEIGHTS: Readonly<
  Record<PlayerPosition, OverallWeights>
> = {
  // R-09, ao pé da letra. Sem peso técnico: o GDD diz que o grid do goleiro é
  // "próprio, somado aos atributos físicos e mentais comuns" — o técnico de
  // linha não entra.
  [PlayerPosition.GK]: {
    technical: 0,
    physical: 0.15,
    mental: 0.25,
    goalkeeping: 0.6,
    specific: 0,
    specificAttribute: "goalkeeperReflexes",
  },
  [PlayerPosition.CB]: { ...DEFENSOR, specificAttribute: "marking" },
  [PlayerPosition.LB]: { ...LATERAL, specificAttribute: "crossing" },
  [PlayerPosition.RB]: { ...LATERAL, specificAttribute: "crossing" },
  [PlayerPosition.LWB]: { ...LATERAL, specificAttribute: "stamina" },
  [PlayerPosition.RWB]: { ...LATERAL, specificAttribute: "stamina" },
  [PlayerPosition.CDM]: { ...DEFENSOR, specificAttribute: "tackling" },
  [PlayerPosition.CM]: { ...MEIA, specificAttribute: "shortPassing" },
  [PlayerPosition.CAM]: {
    ...MEIA,
    technical: 0.45,
    physical: 0.15,
    specificAttribute: "vision",
  },
  [PlayerPosition.LM]: { ...MEIA, physical: 0.25, mental: 0.2, specificAttribute: "crossing" },
  [PlayerPosition.RM]: { ...MEIA, physical: 0.25, mental: 0.2, specificAttribute: "crossing" },
  [PlayerPosition.LW]: { ...PONTA, specificAttribute: "dribbling" },
  [PlayerPosition.RW]: { ...PONTA, specificAttribute: "dribbling" },
  [PlayerPosition.ST]: { ...ATACANTE, specificAttribute: "finishing" },
  [PlayerPosition.CF]: { ...ATACANTE, specificAttribute: "firstTouch" },
};

/**
 * O `overall` do jogador — R-09.
 *
 * **Nunca é coluna.** O GDD é explícito (`:120`): "Overall / média é derivado,
 * não armazenado como atributo". Gravá-lo criaria uma segunda verdade que
 * envelhece a cada treino.
 *
 * Lança quando o goleiro não tem grid de goleiro: é dado incoerente, e devolver
 * nota baixa esconderia o defeito atrás de um número plausível.
 */
export function derivePlayerOverall(
  position: PlayerPosition,
  attributes: PlayerAttributes,
): number {
  const weights = OVERALL_WEIGHTS[position];
  const rollup = rollupAttributes(attributes);

  if (weights.goalkeeping > 0 && rollup.goalkeeping === null) {
    throw new Error(
      `Jogador na posição ${position} não tem grid de goleiro: o overall dele depende dele (R-09).`,
    );
  }

  const specific = attributes[weights.specificAttribute];
  if (weights.specific > 0 && specific === null) {
    throw new Error(
      `O atributo ${weights.specificAttribute} define a posição ${position} e está ausente.`,
    );
  }

  return Math.round(
    rollup.technical * weights.technical +
      rollup.physical * weights.physical +
      rollup.mental * weights.mental +
      (rollup.goalkeeping ?? 0) * weights.goalkeeping +
      (specific ?? 0) * weights.specific,
  );
}
