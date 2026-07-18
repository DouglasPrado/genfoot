/**
 * A config de uma competição autorada (C7, R-202..R-207). É o que o admin edita
 * em RASCUNHO e o que o `lock` congela. Dinheiro é minor units em `string`
 * (bigint não serializa em JSON; o domínio converte na fronteira).
 */

/** Ciclo de vida do agregado autorado (R-202). */
export const CompetitionLifecycle = {
  /** Config editável; nada materializado. */
  DRAFT: "DRAFT",
  /** Config CONGELADA; sorteio e datas materializados; ainda não começou. */
  SCHEDULED: "SCHEDULED",
  /** Em andamento; rodadas jogam, tabela evolui. */
  RUNNING: "RUNNING",
  /** Homologada; campeão, prêmios e acesso/rebaixamento aplicados. */
  FINISHED: "FINISHED",
} as const;

export type CompetitionLifecycle =
  (typeof CompetitionLifecycle)[keyof typeof CompetitionLifecycle];

/** Critérios de desempate, aplicados em sequência (spec §2). */
export const Tiebreaker = {
  POINTS: "POINTS",
  WINS: "WINS",
  GOAL_DIFFERENCE: "GOAL_DIFFERENCE",
  GOALS_FOR: "GOALS_FOR",
  HEAD_TO_HEAD: "HEAD_TO_HEAD",
  FAIR_PLAY: "FAIR_PLAY",
  DRAW: "DRAW",
} as const;

export type Tiebreaker = (typeof Tiebreaker)[keyof typeof Tiebreaker];

export const DEFAULT_TIEBREAKERS: readonly Tiebreaker[] = [
  Tiebreaker.POINTS,
  Tiebreaker.WINS,
  Tiebreaker.GOAL_DIFFERENCE,
  Tiebreaker.GOALS_FOR,
  Tiebreaker.HEAD_TO_HEAD,
];

/** Regras esportivas (o `ChampionshipRules` da spec §2). */
export interface CompetitionRules {
  readonly pointsWin: number;
  readonly pointsDraw: number;
  /** Jogo único (1) ou ida-e-volta (2) — no mata-mata e nos grupos. */
  readonly legs: 1 | 2;
  /** Quantos sobem para a divisão de cima (liga). 0 = ninguém (topo). */
  readonly promotionSlots: number;
  /** Quantos descem para a divisão de baixo (liga). 0 = ninguém (fundo). */
  readonly relegationSlots: number;
  readonly tiebreakers: readonly Tiebreaker[];
  /** Só para GROUPS_AND_KNOCKOUT: nº de grupos e quantos avançam por grupo. */
  readonly groupCount: number | null;
  readonly qualifiersPerGroup: number | null;
}

/** Premiação, em minor units (R-205). Tudo entra no razão por faucet. */
export interface CompetitionPrizes {
  /** Cota fixa por participar. */
  readonly participationMinor: string;
  /** Bônus por vitória (por partida). */
  readonly winBonusMinor: string;
  /** Prêmio por colocação final: índice 0 = campeão, 1 = vice, … */
  readonly positionMinor: readonly string[];
  /** Prêmio do artilheiro (creditado ao clube dele). */
  readonly topScorerMinor: string;
  /** Prêmio do melhor jogador (creditado ao clube dele). */
  readonly bestPlayerMinor: string;
}

/** Ligação imutável para outra competição (R-207, spec §2). */
export interface QualificationRule {
  /** A competição de destino (para onde os classificados vão). */
  readonly targetCompetitionId: string;
  readonly criteria: "TOP_POSITIONS" | "CHAMPION" | "CUP_WINNER";
  readonly slots: number;
}

export interface CompetitionConfig {
  readonly rules: CompetitionRules;
  readonly prizes: CompetitionPrizes;
  readonly qualifications: readonly QualificationRule[];
}

/** Config padrão de uma liga nacional (formato Brasileirão, spec §2). */
export function defaultLeagueConfig(): CompetitionConfig {
  return {
    rules: {
      pointsWin: 3,
      pointsDraw: 1,
      legs: 2,
      promotionSlots: 4,
      relegationSlots: 4,
      tiebreakers: DEFAULT_TIEBREAKERS,
      groupCount: null,
      qualifiersPerGroup: null,
    },
    prizes: emptyPrizes(),
    qualifications: [],
  };
}

/** Config padrão de copa mata-mata (jogo único nas fases). */
export function defaultKnockoutConfig(): CompetitionConfig {
  return {
    rules: {
      pointsWin: 3,
      pointsDraw: 1,
      legs: 1,
      promotionSlots: 0,
      relegationSlots: 0,
      tiebreakers: DEFAULT_TIEBREAKERS,
      groupCount: null,
      qualifiersPerGroup: null,
    },
    prizes: emptyPrizes(),
    qualifications: [],
  };
}

function emptyPrizes(): CompetitionPrizes {
  return {
    participationMinor: "0",
    winBonusMinor: "0",
    positionMinor: [],
    topScorerMinor: "0",
    bestPlayerMinor: "0",
  };
}
