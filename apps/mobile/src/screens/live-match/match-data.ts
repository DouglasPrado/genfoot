/**
 * View-model da tela de Partida ao vivo. Estrutura tipada e estável; os valores
 * são um *seed de apresentação* fiel ao protótipo (docs/04-ui-ux/Prototipo/
 * prototipo-simulador-partida.jpeg). A próxima fatia troca este seed pelo
 * stream de eventos do realtime-gateway (o kernel do client já sabe classificar
 * eventos — @grinta/core clients) + query do estado da partida.
 */
export type Momentum = "rising" | "falling" | "steady";
export type EventKind = "goal" | "sub" | "possession" | "whistle";

export interface MatchViewModel {
  readonly live: boolean;
  readonly competition: string;
  readonly round: number;
  readonly minute: number;
  readonly home: { readonly name: string; readonly score: number; readonly abbr: string };
  readonly away: { readonly name: string; readonly score: number; readonly abbr: string };
  readonly state: {
    readonly possession: number; // 0..100 (%) do time da casa
    readonly momentum: Momentum;
    readonly pressure: number; // 0..10 (gauge)
    readonly reading: string;
    readonly warning: string | null;
  };
  readonly events: readonly {
    readonly id: string;
    readonly minute: number;
    readonly kind: EventKind;
    readonly title: string;
    readonly detail: string | null;
    readonly highlight: boolean;
  }[];
  readonly emergency: {
    readonly expiresInLabel: string;
    readonly title: string;
    readonly detail: string;
    readonly options: readonly { readonly id: string; readonly label: string; readonly tag: string }[];
  } | null;
}

export const MATCH_SEED: MatchViewModel = {
  live: true,
  competition: "LIGA NACIONAL B",
  round: 12,
  minute: 68,
  home: { name: "TIME DA CASA", score: 1, abbr: "CASA" },
  away: { name: "TIME VISITANTE", score: 1, abbr: "VIS" },
  state: {
    possession: 43,
    momentum: "falling",
    pressure: 8,
    reading: "JOGO ABERTO",
    warning: "SETOR ESQUERDO CANSADO",
  },
  events: [
    {
      id: "e68",
      minute: 68,
      kind: "goal",
      title: "GOL do Time da Casa",
      detail: "finalização de fora da área, canto direito, sem chance para o goleiro.",
      highlight: true,
    },
    { id: "e61", minute: 61, kind: "sub", title: "Substituição no Time Visitante", detail: null, highlight: false },
    {
      id: "e58",
      minute: 58,
      kind: "possession",
      title: "Você perdeu a posse de bola",
      detail: "posse caiu de 51% para 43%",
      highlight: false,
    },
    { id: "e45", minute: 45, kind: "whistle", title: "Fim do 1º tempo", detail: null, highlight: false },
  ],
  emergency: {
    expiresInLabel: "02:00",
    title: "Camisa 8 no limite físico",
    detail: "3 sprints seguidos, fadiga muito alta",
    options: [
      { id: "sub16", label: "SUBSTITUIR POR Nº 16", tag: "FÍSICO BAIXO" },
      { id: "hold", label: "RECUAR E POUPAR", tag: "FÍSICO MÉDIO" },
    ],
  },
};

/** Ações rápidas do controle da partida (mapa 1:1 com o protótipo). */
export const QUICK_ACTIONS = [
  { id: "recuar", label: "RECUAR", icon: "arrow-back" },
  { id: "pressao", label: "PRESSÃO", icon: "walk", active: true },
  { id: "atacar", label: "ATACAR", icon: "arrow-forward" },
  { id: "controle", label: "CONTROLE", icon: "shield" },
  { id: "marcar", label: "MARCAR FORTE", icon: "locate" },
  { id: "linha", label: "LINHA ALTA", icon: "chevron-up" },
  { id: "poupar", label: "POUPAR", icon: "heart" },
  { id: "taticas", label: "TÁTICAS", icon: "grid" },
] as const;
