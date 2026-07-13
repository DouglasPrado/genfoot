// Configuração canônica do guia: versão, Partes (mapeadas 1:1 aos arquivos de docs) e áreas.
// A ordem, os slugs e as categorias seguem o índice oficial em
// docs/03-guia-do-jogador/README.md (§3 e §6).

export type GuideCategory =
  | "getting-started"
  | "world"
  | "club"
  | "players"
  | "transfers"
  | "matches"
  | "competitions"
  | "relationships"
  | "strategy"
  | "reference";

export interface PartConfig {
  /** slug de rota, ex.: "comecando-a-jogar" */
  slug: string;
  /** numeral romano exibido, ex.: "I" */
  roman: string;
  /** título curto sem o "Parte X —" */
  title: string;
  /** subtítulo de uma linha para cards e cabeçalhos */
  subtitle: string;
  category: GuideCategory;
  /** nome do arquivo em docs/03-guia-do-jogador */
  file: string;
  /** chave de ícone (ver components/Icon.tsx) */
  icon: string;
  /** cor de destaque da Parte (navegação colorida) */
  accent: string;
}

export const GUIDE = {
  name: "Grinta",
  productTagline: "Guia Oficial do Jogador",
  gameVersion: "Pré-alpha 0.1",
  updatedAt: "2026-07-12",
  updatedLabel: "12 jul 2026",
  docsDir: "../../docs/03-guia-do-jogador",
};

export const PARTS: PartConfig[] = [
  {
    slug: "comecando-a-jogar",
    roman: "I",
    title: "Começando a jogar",
    subtitle: "O que é o Grinta, seu objetivo, o nascimento do clube e os primeiros passos.",
    category: "getting-started",
    file: "parte-01-comecando-a-jogar.md",
    icon: "flag",
    accent: "#FF5C5C",
  },
  {
    slug: "o-mundo-do-jogo",
    roman: "II",
    title: "O mundo do jogo",
    subtitle: "Mundo persistente, tempo e calendário, e os clubes conduzidos pela inteligência.",
    category: "world",
    file: "parte-02-o-mundo-do-jogo.md",
    icon: "globe",
    accent: "#22D3EE",
  },
  {
    slug: "gestao-do-clube",
    roman: "III",
    title: "Gestão do clube",
    subtitle: "Nível e evolução, estrutura, comissão técnica e finanças da instituição.",
    category: "club",
    file: "parte-03-gestao-do-clube.md",
    icon: "shield",
    accent: "#A78BFA",
  },
  {
    slug: "jogadores",
    roman: "IV",
    title: "Jogadores de futebol",
    subtitle: "Identidade, geração, história de vida, desenvolvimento, condição física e moral.",
    category: "players",
    file: "parte-04-jogadores.md",
    icon: "user",
    accent: "#34D399",
  },
  {
    slug: "elenco-e-mercado",
    roman: "V",
    title: "Elenco e mercado",
    subtitle: "Formação do elenco, contratos, transferências e jogadores livres.",
    category: "transfers",
    file: "parte-05-elenco-e-mercado.md",
    icon: "swap",
    accent: "#FBBF24",
  },
  {
    slug: "tatica-e-partidas",
    roman: "VI",
    title: "Tática e partidas",
    subtitle: "Preparação, formação e funções, motor de partida, ao vivo e eventos do jogo.",
    category: "matches",
    file: "parte-06-tatica-e-partidas.md",
    icon: "pitch",
    accent: "#FB923C",
  },
  {
    slug: "competicoes-e-temporadas",
    roman: "VII",
    title: "Competições e temporadas",
    subtitle: "Tipos de campeonato, o ciclo da temporada e o fim de temporada.",
    category: "competitions",
    file: "parte-07-competicoes-e-temporadas.md",
    icon: "trophy",
    accent: "#FDE047",
  },
  {
    slug: "relacoes-e-ambiente",
    roman: "VIII",
    title: "Relações e ambiente do clube",
    subtitle: "Torcida, comunicação e imprensa, e eventos externos ao redor do clube.",
    category: "relationships",
    file: "parte-08-relacoes-e-ambiente.md",
    icon: "megaphone",
    accent: "#F472B6",
  },
  {
    slug: "plano-de-jogo",
    roman: "IX",
    title: "Plano de jogo",
    subtitle: "O ciclo principal e as estratégias de curto, médio e longo prazo.",
    category: "strategy",
    file: "parte-09-plano-de-jogo.md",
    icon: "compass",
    accent: "#818CF8",
  },
  {
    slug: "referencia",
    roman: "X",
    title: "Referência",
    subtitle: "Regras gerais, glossário e perguntas frequentes — para consulta rápida.",
    category: "reference",
    file: "parte-10-referencia.md",
    icon: "book",
    accent: "#A3E635",
  },
];

/** Áreas em destaque na página inicial (§5.3 do README do guia). */
export const AREAS: { label: string; partSlug: string; icon: string; blurb: string }[] = [
  { label: "Clube", partSlug: "gestao-do-clube", icon: "shield", blurb: "Estrutura, staff e finanças" },
  { label: "Jogadores", partSlug: "jogadores", icon: "user", blurb: "Atributos, evolução e moral" },
  { label: "Partidas", partSlug: "tatica-e-partidas", icon: "pitch", blurb: "Tática, motor e ao vivo" },
  { label: "Competições", partSlug: "competicoes-e-temporadas", icon: "trophy", blurb: "Ligas, copas e temporada" },
];

export const CATEGORY_LABEL: Record<GuideCategory, string> = {
  "getting-started": "Começando",
  world: "Mundo",
  club: "Clube",
  players: "Jogadores",
  transfers: "Elenco e mercado",
  matches: "Partidas",
  competitions: "Competições",
  relationships: "Relações",
  strategy: "Estratégia",
  reference: "Referência",
};
