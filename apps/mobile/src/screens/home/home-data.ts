import type { Currency } from "@/components/currency-chip";

/**
 * View-model da Home. Estrutura estável e tipada; os valores abaixo são um
 * *seed de apresentação* fiel ao protótipo (docs/04-ui-ux/Prototipo/
 * prototipo-home.jpeg) usado para iterar o visual. As próximas fatias trocam
 * este seed por queries reais da API (`GET /worlds/:id/...`).
 */
export interface HomeViewModel {
  readonly club: {
    readonly name: string;
    readonly level: number;
    readonly xp: number;
    readonly xpMax: number;
  };
  readonly wallet: readonly {
    readonly currency: Currency;
    readonly amount: number;
    readonly max?: number;
  }[];
  readonly standing: {
    readonly phase: string;
    readonly division: number;
    readonly season: number;
    readonly rank: number;
    readonly divisionBadge: number;
  };
  readonly nextMatch: {
    readonly kickoffLabel: string;
    readonly home: { readonly abbr: string; readonly name: string; readonly formation: string };
    readonly away: { readonly abbr: string; readonly name: string; readonly formation: string };
  };
  readonly missions: {
    readonly completed: number;
    readonly total: number;
    readonly items: readonly {
      readonly id: string;
      readonly icon: "walk" | "star" | "eye";
      readonly label: string;
      readonly progress: number;
      readonly goal: number;
      readonly reward: { readonly currency: Currency; readonly amount: number };
      readonly done: boolean;
    }[];
  };
  readonly season: {
    readonly division: number;
    readonly points: number;
    readonly rank: number;
    readonly trend: readonly number[];
  };
  readonly rewardBox: {
    readonly nextInLabel: string;
    readonly openCost: { readonly currency: Currency; readonly amount: number };
  };
}

export const HOME_SEED: HomeViewModel = {
  club: { name: "BELFORT", level: 28, xp: 3456, xpMax: 5600 },
  wallet: [
    { currency: "coin", amount: 45680 },
    { currency: "gem", amount: 2350 },
    { currency: "energy", amount: 120, max: 120 },
  ],
  standing: { phase: "MEIO - CAMPEONATO", division: 3, season: 7, rank: 156, divisionBadge: 3 },
  nextMatch: {
    kickoffLabel: "HOJE 14:00",
    home: { abbr: "B", name: "BELFORT", formation: "4-2-1-3" },
    away: { abbr: "TIG", name: "TIGRES FÉ", formation: "4-3-3" },
  },
  missions: {
    completed: 3,
    total: 5,
    items: [
      {
        id: "goals",
        icon: "walk",
        label: "FAZER 3 GOLS EM PARTIDAS",
        progress: 2,
        goal: 3,
        reward: { currency: "coin", amount: 2000 },
        done: false,
      },
      {
        id: "wins",
        icon: "star",
        label: "VENCER 2 PARTIDAS",
        progress: 2,
        goal: 2,
        reward: { currency: "coin", amount: 1500 },
        done: true,
      },
      {
        id: "ad",
        icon: "eye",
        label: "ASSISTIR 1 ANÚNCIO",
        progress: 0,
        goal: 1,
        reward: { currency: "gem", amount: 50 },
        done: false,
      },
    ],
  },
  season: {
    division: 3,
    points: 1256,
    rank: 156,
    trend: [0.2, 0.15, 0.25, 0.3, 0.28, 0.4, 0.45, 0.55, 0.5, 0.62, 0.7, 0.68, 0.82],
  },
  rewardBox: { nextInLabel: "02:36:45", openCost: { currency: "gem", amount: 25 } },
};
