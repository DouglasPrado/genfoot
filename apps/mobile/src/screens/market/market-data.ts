/**
 * View-model do Mercado de Transferências. Tipado e estável; os valores são um
 * *seed de apresentação* fiel ao protótipo (docs/04-ui-ux/Prototipo/
 * prototipo-mercado-transferencias-v2.png). A próxima fatia troca este seed por
 * queries reais do contexto de economia/mercado da API (o admin já opera este
 * mesmo domínio na aba Mercado).
 */
export type Temperature = "cold" | "warm" | "hot";
export type Confidence = "low" | "medium" | "high";
export type ExitRisk = "low" | "medium" | "high";

export interface MarketPlayer {
  readonly id: string;
  readonly name: string;
  readonly club: string;
  readonly position: string;
  readonly age: number;
  readonly u21: boolean;
  readonly ovr: number;
  readonly pot: number;
  readonly confidence: Confidence;
  readonly valueLabel: string;
  readonly valueTrendPct: number; // negativo = abaixo do pedido
  readonly wageLabel: string;
  readonly contractLabel: string;
  readonly clubInterest: number;
  readonly exitRisk: ExitRisk;
  readonly exitRiskPct: number;
}

export interface MarketViewModel {
  readonly temperature: Temperature;
  readonly temperatureNote: string;
  readonly tabs: readonly { readonly id: string; readonly label: string; readonly icon: string }[];
  readonly activeTab: string;
  readonly layers: readonly { readonly id: string; readonly label: string; readonly icon: string }[];
  readonly activeLayer: string;
  readonly players: readonly MarketPlayer[];
}

export const MARKET_SEED: MarketViewModel = {
  temperature: "hot",
  temperatureNote: "Clubes estão comprando mais e os preços estão subindo.",
  tabs: [
    { id: "alvos", label: "ALVOS", icon: "locate" },
    { id: "livres", label: "LIVRES", icon: "hand-left" },
    { id: "oportunidades", label: "OPORTUNIDADES", icon: "diamond" },
    { id: "observados", label: "OBSERVADOS", icon: "eye" },
    { id: "vendas", label: "MINHA LISTA DE VENDAS", icon: "pricetag" },
  ],
  activeTab: "alvos",
  layers: [
    { id: "geral", label: "GERAL", icon: "globe" },
    { id: "regional", label: "REGIONAL / INICIANTE", icon: "shield-half" },
    { id: "base", label: "BASE LOCAL", icon: "shield" },
    { id: "emprestimos", label: "EMPRÉSTIMOS", icon: "swap-horizontal" },
  ],
  activeLayer: "geral",
  players: [
    { id: "matheus", name: "Matheus Costa", club: "Clube Alpha", position: "MEI", age: 22, u21: false, ovr: 78, pot: 84, confidence: "medium", valueLabel: "€ 4,2M", valueTrendPct: -12, wageLabel: "85 mil/sem", contractLabel: "1 ano", clubInterest: 3, exitRisk: "medium", exitRiskPct: 35 },
    { id: "lucas", name: "Lucas Ferreira", club: "Clube Beta", position: "ATA", age: 24, u21: false, ovr: 81, pot: 87, confidence: "high", valueLabel: "€ 7,8M", valueTrendPct: 8, wageLabel: "120 mil/sem", contractLabel: "2 anos", clubInterest: 5, exitRisk: "high", exitRiskPct: 60 },
    { id: "gabriel", name: "Gabriel Mendes", club: "Clube Gama", position: "ZAG", age: 26, u21: false, ovr: 76, pot: 82, confidence: "medium", valueLabel: "€ 3,1M", valueTrendPct: -5, wageLabel: "75 mil/sem", contractLabel: "6 meses", clubInterest: 2, exitRisk: "high", exitRiskPct: 70 },
    { id: "joao", name: "João Victor", club: "Clube Delta", position: "LD", age: 21, u21: false, ovr: 73, pot: 79, confidence: "low", valueLabel: "€ 1,9M", valueTrendPct: -18, wageLabel: "40 mil/sem", contractLabel: "1 ano", clubInterest: 1, exitRisk: "medium", exitRiskPct: 40 },
    { id: "rafael", name: "Rafael Lima", club: "Clube Épsilon", position: "GOL", age: 23, u21: false, ovr: 74, pot: 80, confidence: "medium", valueLabel: "€ 2,6M", valueTrendPct: -7, wageLabel: "60 mil/sem", contractLabel: "2 anos", clubInterest: 2, exitRisk: "low", exitRiskPct: 20 },
    { id: "thiago", name: "Thiago Nunes", club: "Clube Zeta", position: "ME", age: 20, u21: true, ovr: 70, pot: 76, confidence: "low", valueLabel: "€ 1,2M", valueTrendPct: -22, wageLabel: "30 mil/sem", contractLabel: "6 meses", clubInterest: 1, exitRisk: "medium", exitRiskPct: 45 },
    { id: "andre", name: "André Santos", club: "Clube Ômega", position: "ATA", age: 25, u21: false, ovr: 79, pot: 85, confidence: "high", valueLabel: "€ 6,5M", valueTrendPct: 3, wageLabel: "110 mil/sem", contractLabel: "3 anos", clubInterest: 4, exitRisk: "medium", exitRiskPct: 30 },
    { id: "pedro", name: "Pedro Henrique", club: "Clube Sigma", position: "VOL", age: 22, u21: true, ovr: 72, pot: 78, confidence: "low", valueLabel: "€ 1,6M", valueTrendPct: -15, wageLabel: "35 mil/sem", contractLabel: "1 ano", clubInterest: 1, exitRisk: "low", exitRiskPct: 25 },
  ],
};
