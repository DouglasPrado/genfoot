/**
 * View-model do Clube. Tipado e estável; valores são um *seed de apresentação*
 * na linguagem do app. A próxima fatia liga às queries `club` (clubPortfolio) e
 * `ledger` da API.
 */
export interface ClubViewModel {
  readonly name: string;
  readonly division: number;
  readonly reputation: number; // 0..100
  readonly foundedSeason: number;
  readonly stadium: { readonly name: string; readonly capacity: number };
  readonly finances: {
    readonly balanceLabel: string;
    readonly transferBudgetLabel: string;
    readonly wageBudgetLabel: string;
    readonly wageUsedPct: number;
    readonly incomeLabel: string;
    readonly expenseLabel: string;
  };
  readonly infrastructure: readonly {
    readonly id: string;
    readonly name: string;
    readonly icon: string;
    readonly level: number;
    readonly maxLevel: number;
    readonly note: string;
  }[];
}

export const CLUB_SEED: ClubViewModel = {
  name: "BELFORT",
  division: 3,
  reputation: 58,
  foundedSeason: 1,
  stadium: { name: "Arena Belfort", capacity: 24500 },
  finances: {
    balanceLabel: "€ 12,4M",
    transferBudgetLabel: "€ 8,0M",
    wageBudgetLabel: "1,5 mi/sem",
    wageUsedPct: 80,
    incomeLabel: "€ 3,2M/mês",
    expenseLabel: "€ 2,6M/mês",
  },
  infrastructure: [
    { id: "training", name: "Centro de Treino", icon: "barbell", level: 3, maxLevel: 5, note: "+8% desenvolvimento" },
    { id: "youth", name: "Base / Categorias", icon: "school", level: 2, maxLevel: 5, note: "Geração a cada temporada" },
    { id: "medical", name: "Departamento Médico", icon: "medkit", level: 3, maxLevel: 5, note: "-15% tempo de lesão" },
    { id: "stadium", name: "Estádio", icon: "business", level: 2, maxLevel: 5, note: "24.500 lugares" },
    { id: "scouting", name: "Observação", icon: "search", level: 4, maxLevel: 5, note: "Rede regional ampla" },
  ],
};
