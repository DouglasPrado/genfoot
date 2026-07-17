/**
 * Os números que o dashboard mostra e a API ainda não tem.
 *
 * Vivem TODOS aqui, num arquivo só, por três motivos:
 *
 * 1. Quem procura "o que é mentira nesta tela" acha em um lugar.
 * 2. Quando um contexto voltar, apaga-se a função dele daqui e o compilador
 *    aponta cada tela que dependia — em vez de o mock sobreviver escondido.
 * 3. O contexto que falta fica NOMEADO em cada função. Isto não é código
 *    temporário anônimo: é uma lista de trabalho.
 *
 * São derivados do `worldId`, não de `Math.random()`: um número que muda a cada
 * render denuncia-se sozinho, mas também torna a tela impossível de conferir. E
 * o determinismo é a regra da casa (R-182).
 *
 * **O mock respeita o canon.** Ele mente sobre os VALORES, nunca sobre a FORMA:
 * um mock com a estrutura errada ensina o modelo errado a quem olha a tela, e
 * some junto com a tela quando o contexto real chegar com outro formato.
 */

/** Hash estável e barato. Não é criptografia — é só espalhar o id. */
function seedOf(key: string): number {
  let hash = 2_166_136_261;
  for (const char of key) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return Math.abs(hash);
}

function pick(key: string, salt: number, min: number, max: number): number {
  return min + ((seedOf(key) >>> salt) % (max - min + 1));
}

/** C9 (razão/economia). O dinheiro do mundo inteiro, em unidade mínima. */
export function mockDinheiroCirculante(worldId: string, clubes: number): bigint {
  return BigInt(clubes) * BigInt(pick(worldId, 3, 80, 140)) * 1_000_00n;
}

/** C4 (jogadores). Onde estão os jogadores do mundo. */
export function mockJogadores(worldId: string, clubes: number) {
  const porClube = pick(worldId, 5, 20, 26);
  return {
    emClubes: clubes * porClube,
    livres: pick(worldId, 7, 12, 40),
    base: clubes * pick(worldId, 11, 8, 14),
  };
}

/** C9 + C4, por clube — as colunas da tabela de clubes. */
export interface MockClubeNumeros {
  readonly caixaMinor: bigint;
  readonly folhaMinor: bigint;
  readonly elenco: number;
  readonly base: number;
}

export function mockNumerosDoClube(
  worldId: string,
  clubId: string,
): MockClubeNumeros {
  const chave = `${worldId}:${clubId}`;
  const elenco = pick(chave, 3, 20, 26);
  return {
    caixaMinor: BigInt(pick(chave, 5, 40, 260)) * 100_000n,
    folhaMinor: BigInt(pick(chave, 7, 8, 60)) * 100_000n,
    elenco,
    base: pick(chave, 11, 8, 16),
  };
}

/**
 * C7 (competições) + C2 (temporada).
 *
 * **Uma temporada tem VÁRIOS torneios, não um campeonato.** O canon é explícito
 * (`00-gdd-overview.md:168`): "a temporada contém pré-temporada, mercado
 * inicial, campeonato principal, COPAS, janela de transferências…" — e
 * `06-temporada-e-competicoes.md:131` lista os tipos: liga nacional, copa
 * eliminatória, estadual/regional, continental, mundial, base, amistosos.
 *
 * O modelo anterior dava UMA linha por temporada, com posição e pontos. Isso só
 * descreve uma liga: numa copa eliminatória não há "posição", há a fase em que
 * o clube caiu. Era o formato errado ensinando o modelo errado.
 */
export const TipoTorneio = {
  LIGA_NACIONAL: "Liga nacional",
  COPA_ELIMINATORIA: "Copa eliminatória",
  ESTADUAL: "Estadual / regional",
  CONTINENTAL: "Continental",
} as const;

export type TipoTorneio = (typeof TipoTorneio)[keyof typeof TipoTorneio];

/**
 * Os três formatos que o canon define (`06-temporada-e-competicoes.md:214-217`):
 *
 * - **Liga** — turno e returno (round-robin com mando ida/volta).
 * - **Copa** — clubes semeados por reputação, sorteio, rodadas eliminatórias.
 * - **Continental** — grupos por sorteio em potes, e DEPOIS o mata-mata.
 *
 * O formato não é enfeite: ele decide o que cada coluna significa. Liga tem
 * posição e pontos; mata-mata tem fase; continental tem os dois, em momentos
 * diferentes da mesma competição.
 */
export type FormatoTorneio =
  | "PONTOS_CORRIDOS"
  | "MATA_MATA"
  | "GRUPOS_E_MATA_MATA";

export interface MockTorneio {
  readonly id: string;
  readonly nome: string;
  readonly tipo: TipoTorneio;
  readonly formato: FormatoTorneio;
  readonly temporada: number;
  readonly emAndamento: boolean;
}

/** Os torneios de UMA temporada. Mais de um, sempre — é o ponto. */
export function mockTorneiosDaTemporada(
  worldId: string,
  temporada: number,
): readonly MockTorneio[] {
  const chave = `${worldId}:t${temporada}`;
  const continental = pick(chave, 13, 0, 1) === 1;
  const base: readonly Omit<MockTorneio, "temporada" | "emAndamento" | "id">[] = [
    { nome: "Liga Inicial", tipo: TipoTorneio.LIGA_NACIONAL, formato: "PONTOS_CORRIDOS" },
    { nome: "Copa Nacional", tipo: TipoTorneio.COPA_ELIMINATORIA, formato: "MATA_MATA" },
    { nome: "Estadual", tipo: TipoTorneio.ESTADUAL, formato: "PONTOS_CORRIDOS" },
    ...(continental
      ? [
          {
            nome: "Continental",
            tipo: TipoTorneio.CONTINENTAL,
            // Grupos por sorteio em potes, e DEPOIS o mata-mata
            // (`06-temporada-e-competicoes.md:217`).
            formato: "GRUPOS_E_MATA_MATA" as const,
          },
        ]
      : []),
  ];
  return base.map((torneio, index) => ({
    ...torneio,
    id: `${chave}:${index}`,
    temporada,
    // Só a temporada corrente tem torneio em andamento.
    emAndamento: pick(`${chave}:${index}`, 17, 0, 2) > 0,
  }));
}

export function mockCompeticoes(worldId: string) {
  const temporada = pick(worldId, 17, 1, 4);
  const torneios = mockTorneiosDaTemporada(worldId, temporada);
  return {
    temporada,
    torneios,
    rodando: torneios.filter((t) => t.emAndamento).length,
    total: torneios.length,
    rodada: pick(worldId, 19, 1, 30),
    totalRodadas: 30,
  };
}

/**
 * C9 + C10. Crescente/decrescente é medida de ECONOMIA (o razão diz se entra
 * mais do que sai) cruzada com torcida. Sem C9 não há como saber — nem
 * aproximar honestamente.
 */
export function mockTendencia(worldId: string) {
  const delta = pick(worldId, 23, 0, 200) / 10 - 10;
  return { crescente: delta >= 0, percentual: Math.abs(delta) };
}

/**
 * A campanha de um clube em UM torneio.
 *
 * `posicao` e `pontos` são `null` em mata-mata — não é "zero", é pergunta que
 * não se faz: numa copa eliminatória o resultado é a FASE alcançada. Um zero ali
 * diria "terminou em último com nenhum ponto".
 */
export interface MockCampanha {
  readonly torneio: MockTorneio;
  readonly posicao: number | null;
  readonly pontos: number | null;
  readonly faseAlcancada: string | null;
  readonly vitorias: number;
  readonly empates: number;
  readonly derrotas: number;
  readonly campeao: boolean;
}

const FASES = [
  "Primeira fase",
  "Oitavas",
  "Quartas",
  "Semifinal",
  "Final",
  "Campeão",
];

/** C7 + C5. Todas as campanhas de um clube, de todas as temporadas. */
export function mockCampanhasDoClube(
  worldId: string,
  clubId: string,
  ateTemporada: number,
): readonly MockCampanha[] {
  const campanhas: MockCampanha[] = [];
  for (let temporada = 1; temporada <= ateTemporada; temporada += 1) {
    for (const torneio of mockTorneiosDaTemporada(worldId, temporada)) {
      const chave = `${worldId}:${clubId}:${torneio.id}`;
      if (torneio.formato === "PONTOS_CORRIDOS") {
        const jogos = torneio.tipo === TipoTorneio.LIGA_NACIONAL ? 30 : 14;
        const vitorias = pick(chave, 3, 2, Math.floor(jogos * 0.7));
        const empates = pick(chave, 7, 1, Math.max(1, jogos - vitorias - 1));
        const posicao = pick(chave, 11, 1, 16);
        campanhas.push({
          torneio,
          posicao,
          pontos: vitorias * 3 + empates,
          faseAlcancada: null,
          vitorias,
          empates,
          derrotas: Math.max(0, jogos - vitorias - empates),
          campeao: posicao === 1,
        });
      } else {
        // Continental também cai aqui: o resultado FINAL de uma competição com
        // grupos é a fase alcançada no mata-mata que vem depois deles.
        const fase = pick(chave, 13, 0, FASES.length - 1);
        const vitorias = fase;
        campanhas.push({
          torneio,
          posicao: null,
          pontos: null,
          faseAlcancada: FASES[fase]!,
          vitorias,
          empates: 0,
          // Quem não foi campeão perdeu exatamente uma vez: é assim que se sai
          // de um mata-mata.
          derrotas: fase === FASES.length - 1 ? 0 : 1,
          campeao: fase === FASES.length - 1,
        });
      }
    }
  }
  return campanhas;
}

// ---------------------------------------------------------------------------
// A aba de Competições. Tudo C7 (competições) + C5 (partidas) + C4 (jogadores).
// ---------------------------------------------------------------------------

/**
 * Uma linha da classificação.
 *
 * `zona` não é enfeite de cor: o canon trata promoção/rebaixamento como parte da
 * virada de temporada (`06-temporada-e-competicoes.md:268`), e é a zona que diz
 * ao operador o que vai acontecer com o clube quando a temporada virar.
 */
export type Zona = "TITULO" | "CONTINENTAL" | "NEUTRA" | "REBAIXAMENTO";

export interface MockLinhaTabela {
  readonly posicao: number;
  readonly clube: ClubeRef;
  readonly pontos: number;
  readonly jogos: number;
  readonly vitorias: number;
  readonly empates: number;
  readonly derrotas: number;
  readonly golsPro: number;
  readonly golsContra: number;
  readonly saldo: number;
  readonly zona: Zona;
}

/**
 * O clube como as telas o exibem: com a identidade visual junto.
 *
 * Carregar `name` solto obrigaria cada tabela a reencontrar o clube para achar o
 * escudo — e a que esquecesse mostraria nome sem escudo. O par nome+escudo anda
 * junto porque é assim que o clube aparece.
 */
export interface ClubeRef {
  readonly id: string;
  readonly name: string;
  readonly shortCode: string;
  readonly primaryColor: string | null;
  readonly secondaryColor: string | null;
  readonly crestTemplateId: string | null;
}

export function mockTabela(
  torneioId: string,
  clubes: readonly ClubeRef[],
): readonly MockLinhaTabela[] {
  const linhas = clubes.map((clube) => {
    const chave = `${torneioId}:${clube.id}`;
    const jogos = 30;
    const vitorias = pick(chave, 3, 4, 22);
    const empates = pick(chave, 7, 1, Math.max(1, jogos - vitorias - 2));
    const derrotas = Math.max(0, jogos - vitorias - empates);
    const golsPro = vitorias * 2 + empates + pick(chave, 11, 0, 12);
    const golsContra = derrotas * 2 + empates + pick(chave, 13, 0, 10);
    return {
      clube,
      pontos: vitorias * 3 + empates,
      jogos,
      vitorias,
      empates,
      derrotas,
      golsPro,
      golsContra,
      saldo: golsPro - golsContra,
    };
  });

  // Pontos, depois saldo, depois gols pró: o desempate clássico. Ordenar por
  // pontos só empataria metade da tabela.
  linhas.sort(
    (a, b) => b.pontos - a.pontos || b.saldo - a.saldo || b.golsPro - a.golsPro,
  );

  return linhas.map((linha, index) => ({
    ...linha,
    posicao: index + 1,
    zona: zonaDe(index + 1, linhas.length),
  }));
}

function zonaDe(posicao: number, total: number): Zona {
  if (posicao === 1) return "TITULO";
  if (posicao <= 4) return "CONTINENTAL";
  if (posicao > total - 4) return "REBAIXAMENTO";
  return "NEUTRA";
}

/** Fase de grupos: potes sorteados (`06-temporada-e-competicoes.md:217`). */
export interface MockGrupo {
  readonly nome: string;
  readonly linhas: readonly MockLinhaTabela[];
}

export function mockGrupos(
  torneioId: string,
  clubes: readonly ClubeRef[],
): readonly MockGrupo[] {
  const porGrupo = 4;
  const grupos: MockGrupo[] = [];
  for (let i = 0; i < clubes.length; i += porGrupo) {
    const fatia = clubes.slice(i, i + porGrupo);
    if (fatia.length < 2) break;
    const linhas = fatia
      .map((clube) => {
        const chave = `${torneioId}:g:${clube.id}`;
        const jogos = 6;
        const vitorias = pick(chave, 3, 0, jogos);
        const empates = pick(chave, 7, 0, jogos - vitorias);
        const derrotas = jogos - vitorias - empates;
        const golsPro = vitorias * 2 + pick(chave, 11, 0, 5);
        const golsContra = derrotas * 2 + pick(chave, 13, 0, 4);
        return {
          clube,
          pontos: vitorias * 3 + empates,
          jogos,
          vitorias,
          empates,
          derrotas,
          golsPro,
          golsContra,
          saldo: golsPro - golsContra,
        };
      })
      .sort((a, b) => b.pontos - a.pontos || b.saldo - a.saldo);
    grupos.push({
      nome: `Grupo ${String.fromCharCode(65 + grupos.length)}`,
      linhas: linhas.map((linha, index) => ({
        ...linha,
        posicao: index + 1,
        // Nos grupos, os 2 primeiros passam. Não há rebaixamento aqui — quem
        // fica em 3º está eliminado, não rebaixado: são coisas diferentes.
        zona: index < 2 ? "CONTINENTAL" : "NEUTRA",
      })),
    });
  }
  return grupos;
}

export interface MockConfronto {
  readonly id: string;
  readonly casa: ClubeRef;
  readonly fora: ClubeRef;
  readonly golsCasa: number | null;
  readonly golsFora: number | null;
  readonly decidido: boolean;
}

export interface MockFaseMataMata {
  readonly nome: string;
  readonly confrontos: readonly MockConfronto[];
}

/** A chave, das oitavas à final. Clubes semeados por reputação (`:216`). */
export function mockChave(
  torneioId: string,
  clubes: readonly ClubeRef[],
  /**
   * Torneio encerrado NÃO tem jogo indeciso. Sem isto, a final de uma temporada
   * passada aparecia "em aberto" e sem campeão — um torneio que acabou sem
   * decidir a final é incoerente, e a tela mostrava isso com toda a calma.
   */
  emAndamento = false,
): readonly MockFaseMataMata[] {
  const nomes = ["Oitavas", "Quartas", "Semifinal", "Final"];
  const fases: MockFaseMataMata[] = [];
  let vivos = clubes.slice(0, 16);
  for (const nome of nomes) {
    if (vivos.length < 2) break;
    const confrontos: MockConfronto[] = [];
    const proximos: ClubeRef[] = [];
    for (let i = 0; i + 1 < vivos.length; i += 2) {
      const casa = vivos[i]!;
      const fora = vivos[i + 1]!;
      const chave = `${torneioId}:${nome}:${casa.id}:${fora.id}`;
      // A final é a última a se decidir: num torneio em andamento, ela fica em
      // aberto e as fases anteriores já correram.
      const decidido = !emAndamento || nome !== "Final";
      const golsCasa = pick(chave, 5, 0, 4);
      const golsFora = pick(chave, 7, 0, 3);
      confrontos.push({
        id: chave,
        casa,
        fora,
        // Confronto não decidido não tem placar: `null`, não `0 x 0` — que é um
        // placar de verdade e diria que o jogo terminou empatado.
        golsCasa: decidido ? golsCasa : null,
        golsFora: decidido ? golsFora : null,
        decidido,
      });
      proximos.push(golsCasa >= golsFora ? casa : fora);
    }
    fases.push({ nome, confrontos });
    vivos = proximos;
  }
  return fases;
}

/**
 * As posições do canon (`genesis-types.ts:10`). Não inventei sigla: o domínio
 * valida `primaryPosition` contra esta lista, e uma sigla fora dela seria um
 * jogador que o jogo não sabe gerar.
 */
export const POSICOES = [
  "GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST", "CF",
] as const;

export type Posicao = (typeof POSICOES)[number];

/** C4 + C5. Artilharia e — o nome do canon — GARÇOM, o líder de assistências. */
export interface MockJogadorRanking {
  /** A colocação no ranking. Nada a ver com a posição em campo. */
  readonly colocacao: number;
  readonly jogador: string;
  /** Número da camisa — `shirtNumber` no schema (`:1626`). */
  readonly numero: number;
  readonly posicao: Posicao;
  readonly clube: ClubeRef | null;
  readonly valor: number;
  readonly jogos: number;
}

const NOMES = [
  "Rivaldo Neves", "Caio Mendes", "Túlio Barros", "Émerson Prado",
  "Léo Vasques", "Danilo Ítalo", "Wesley Aragão", "Fabinho Cruz",
  "Igor Salles", "Murilo Tavares",
];

/**
 * Artilheiro é atacante quase sempre. Sortear a posição uniformemente daria um
 * goleiro artilheiro — o mock estaria errado sobre o JOGO, não só sobre o
 * número.
 */
const POSICOES_ARTILHEIRO: readonly Posicao[] = ["ST", "CF", "LW", "RW", "CAM"];
/** Garçom vem do meio e das pontas: quem dá o passe, não quem finaliza. */
const POSICOES_GARCOM: readonly Posicao[] = ["CAM", "CM", "LW", "RW", "LB", "RB"];

export function mockArtilharia(
  torneioId: string,
  clubes: readonly ClubeRef[],
): readonly MockJogadorRanking[] {
  return ranking(`${torneioId}:gols`, clubes, 5, 24, POSICOES_ARTILHEIRO);
}

/** "Garçom (líder de assistências)" — `06-temporada-e-competicoes.md:§7`. */
export function mockGarcons(
  torneioId: string,
  clubes: readonly ClubeRef[],
): readonly MockJogadorRanking[] {
  return ranking(`${torneioId}:assist`, clubes, 3, 16, POSICOES_GARCOM);
}

function ranking(
  chaveBase: string,
  clubes: readonly ClubeRef[],
  min: number,
  max: number,
  posicoes: readonly Posicao[],
): readonly MockJogadorRanking[] {
  return NOMES.map((jogador, index) => {
    const chave = `${chaveBase}:${index}`;
    return {
      jogador,
      numero: pick(chave, 11, 1, 40),
      posicao: posicoes[pick(chave, 13, 0, posicoes.length - 1)]!,
      clube: clubes[index % Math.max(1, clubes.length)] ?? null,
      valor: pick(chave, 3, min, max),
      jogos: pick(chave, 7, 18, 30),
      colocacao: 0,
    };
  })
    .sort((a, b) => b.valor - a.valor)
    .map((linha, index) => ({ ...linha, colocacao: index + 1 }));
}

/**
 * As premiações do canon (`06-temporada-e-competicoes.md:§7`), na ordem em que
 * ele as lista. Não inventei categoria: elas "afetam reputação e mercado" e
 * encaixam no sistema psicológico — inventar uma seria inventar efeito de jogo.
 */
/**
 * O `reputationWeight` da R-59 — o par do `financialWeight`. A decisão define os
 * dois juntos: "quanto cada competição move a REPUTAÇÃO (clube/jogador) e a
 * receita ao virar a temporada".
 *
 * É ele que faz "Melhor jogador do Continental" (0,85) valer mais que "Melhor
 * jogador do Estadual" (0,30). Sem o peso, um prêmio de torneio regional
 * valorizaria tanto quanto um continental — e aí a competição não importaria.
 */
export const REPUTATION_WEIGHT: Record<TipoTorneio, number> = {
  [TipoTorneio.CONTINENTAL]: 0.85,
  [TipoTorneio.LIGA_NACIONAL]: 0.7,
  [TipoTorneio.COPA_ELIMINATORIA]: 0.55,
  [TipoTorneio.ESTADUAL]: 0.3,
};

/**
 * O efeito do prêmio no jogador.
 *
 * A corrente é a do canon: prêmio "afeta reputação e mercado" (§7), e "a
 * reputação do jogador afeta salário, VALOR DE MERCADO, propostas, pressão,
 * moral" (`00-gdd-overview.md:226`). Logo a valorização não é efeito direto do
 * prêmio — é efeito da reputação que o prêmio move. Por isso ela escala pelo
 * `reputationWeight` da R-59.
 *
 * **O ganho de overall EXTENDE o canon.** O §7 fala em reputação, mercado e
 * psicologia — não em atributo. É decisão de produto (do dono, 2026-07-16) e
 * está declarada como tal: quando C4 voltar, ela precisa de um R- próprio, senão
 * vira regra de jogo que ninguém ratificou.
 *
 * `Jogador decepção` é NEGATIVO nos dois. O canon o lista entre os prêmios, mas
 * ele é o oposto de um: tratá-lo como bônus daria valorização a quem decepcionou.
 */
export interface MockPremio {
  readonly categoria: string;
  readonly jogador: string;
  readonly clube: ClubeRef | null;
  /** Valorização de mercado, em %. Negativa na decepção. */
  readonly valorizacao: number;
  /** Pontos de overall ganhos. Negativo na decepção. */
  readonly overall: number;
  /**
   * Moral, em %. É a parte MAIS canônica das três: o §7 diz que os prêmios
   * "encaixam no sistema psicológico (ex.: eleito revelação ganha confiança, mas
   * passa a sofrer mais pressão)", e o overview:226 lista moral entre o que a
   * reputação do jogador move.
   *
   * A contrapartida da pressão que o §7 cita NÃO está aqui — é outro eixo, e
   * inventá-lo como coluna diria que prêmio só tem lado bom. Fica anotado para
   * quando C4 voltar.
   */
  readonly moral: number;
}

/**
 * As categorias do §7, na ordem dele, com o peso de cada uma.
 *
 * `base` é a valorização em % antes do `reputationWeight`; `ovr` é o ganho de
 * overall. "Melhor jogador" pesa mais que "Melhor zagueiro" porque é o prêmio do
 * campeonato inteiro, não de um setor. "Melhor técnico" não move NADA de jogador
 * — ele não é jogador, e dar-lhe overall seria inventar atributo para quem não
 * entra em campo.
 */
const CATEGORIAS: readonly {
  nome: string;
  base: number;
  ovr: number;
  moral: number;
}[] = [
  { nome: "Melhor jogador do campeonato", base: 28, ovr: 3, moral: 20 },
  // Craque da torcida move POUCO mercado e MUITA moral: é o afeto da
  // arquibancada, não a leitura do olheiro. O overview:226 separa as duas coisas
  // — "relação com a torcida" e "valor de mercado" são efeitos distintos.
  { nome: "Craque da torcida", base: 12, ovr: 1, moral: 25 },
  { nome: "Artilheiro", base: 22, ovr: 2, moral: 18 },
  { nome: "Garçom (líder de assistências)", base: 18, ovr: 2, moral: 15 },
  // "Revelação ganha confiança" — o exemplo é literalmente o do §7.
  { nome: "Revelação", base: 35, ovr: 4, moral: 30 },
  { nome: "Melhor goleiro", base: 15, ovr: 2, moral: 12 },
  { nome: "Melhor zagueiro", base: 15, ovr: 2, moral: 12 },
  // Técnico não é jogador: sem overall, sem moral de atleta, sem valor de
  // mercado. Dar-lhe atributo seria inventar jogador que não entra em campo.
  { nome: "Melhor técnico", base: 0, ovr: 0, moral: 0 },
  { nome: "Jogador mais evoluído", base: 20, ovr: 3, moral: 15 },
  { nome: "Jogador decepção", base: -18, ovr: -2, moral: -22 },
];

export function mockPremiacao(
  torneio: MockTorneio,
  clubes: readonly ClubeRef[],
): readonly MockPremio[] {
  const peso = REPUTATION_WEIGHT[torneio.tipo];
  return CATEGORIAS.map((categoria, index) => {
    const chave = `${torneio.id}:premio:${index}`;
    // A variação por sorteio é pequena de propósito: o que decide o tamanho do
    // prêmio é a CATEGORIA e o peso do torneio, não o acaso.
    const ruido = pick(chave, 11, 90, 110) / 100;
    return {
      categoria: categoria.nome,
      jogador: NOMES[pick(chave, 3, 0, NOMES.length - 1)]!,
      clube: clubes[pick(chave, 7, 0, Math.max(0, clubes.length - 1))] ?? null,
      valorizacao: Math.round(categoria.base * peso * ruido * 10) / 10,
      moral: Math.round(categoria.moral * peso * ruido * 10) / 10,
      // Overall é INTEIRO: atributo de jogador não tem meio ponto. Um prêmio
      // pequeno num torneio fraco arredonda para 0 — e 0 é a resposta certa:
      // ser melhor zagueiro do estadual não muda o jogador.
      overall: Math.round(categoria.ovr * peso),
    };
  });
}

export function mockEstatisticas(torneioId: string) {
  const jogos = pick(torneioId, 3, 180, 240);
  const gols = pick(torneioId, 5, 380, 700);
  return {
    jogos,
    gols,
    mediaGols: gols / jogos,
    publicoMedio: pick(torneioId, 7, 4_000, 26_000),
    cartoesAmarelos: pick(torneioId, 11, 400, 900),
    cartoesVermelhos: pick(torneioId, 13, 10, 60),
    vitoriasCasa: pick(torneioId, 17, 35, 55),
  };
}

/**
 * Premiação em DINHEIRO por clube.
 *
 * Isto é diferente dos prêmios do §7: aqueles são individuais (melhor jogador,
 * artilheiro, garçom) e "afetam reputação e mercado". O dinheiro do CLUBE entra
 * por `ClubSeasonUpdate.budgetChange` (§9), quando a temporada vira.
 *
 * **Os pesos são os da R-59**, não inventados: `financialWeight` (0–1) define
 * "quanto cada competição move a receita ao virar a temporada". Mundial 0,90;
 * Continental 0,85; Liga nacional 1,00; Copa nacional 0,70; Estadual 0,35. A
 * razão está na própria decisão: "a liga nacional domina a RECEITA recorrente,
 * enquanto continental/mundial dominam o PRESTÍGIO" — por isso a liga vale mais
 * dinheiro que a continental, mesmo sendo menos prestigiosa.
 *
 * Quando C7 e C9 voltarem, os pesos saem daqui e vão para o ruleset
 * (`05-catalogo-de-regras-e-formulas.md`, como a R-59 manda). O que fica é a
 * forma: prêmio de clube é receita por colocação, não uma linha por categoria.
 */
export const FINANCIAL_WEIGHT: Record<TipoTorneio, number> = {
  [TipoTorneio.LIGA_NACIONAL]: 1.0,
  [TipoTorneio.CONTINENTAL]: 0.85,
  [TipoTorneio.COPA_ELIMINATORIA]: 0.7,
  [TipoTorneio.ESTADUAL]: 0.35,
};

/** Base de premiação do campeão, antes do peso. Balanceamento, não regra. */
const PREMIO_BASE_MINOR = 20_000_000n;

export interface MockPremioDinheiro {
  readonly colocacao: string;
  readonly clube: ClubeRef | null;
  readonly valorMinor: bigint;
}

/**
 * A tabela de premiação do torneio. Liga paga por POSIÇÃO; mata-mata paga por
 * FASE — o formato manda aqui também.
 */
export function mockPremiacaoDinheiro(
  torneio: MockTorneio,
  clubes: readonly ClubeRef[],
): readonly MockPremioDinheiro[] {
  const peso = FINANCIAL_WEIGHT[torneio.tipo];
  const escala = (fracao: number): bigint =>
    (PREMIO_BASE_MINOR * BigInt(Math.round(fracao * peso * 1000))) / 1000n;

  if (torneio.formato === "PONTOS_CORRIDOS") {
    const tabela = mockTabela(torneio.id, clubes);
    const fracoes: readonly [string, number][] = [
      ["Campeão", 1],
      ["Vice", 0.5],
      ["3º lugar", 0.3],
      ["4º lugar", 0.22],
      ["5º ao 8º", 0.12],
      ["9º ao 12º", 0.06],
      ["Demais", 0.03],
    ];
    return fracoes.map(([colocacao, fracao], index) => ({
      colocacao,
      clube: index < 4 ? (tabela[index]?.clube ?? null) : null,
      valorMinor: escala(fracao),
    }));
  }

  const fases = mockChave(torneio.id, clubes, torneio.emAndamento);
  const decisao = fases[fases.length - 1]?.confrontos[0];
  const campeao =
    decisao === undefined || !decisao.decidido
      ? null
      : (decisao.golsCasa ?? 0) >= (decisao.golsFora ?? 0)
        ? decisao.casa
        : decisao.fora;
  const vice =
    decisao === undefined || !decisao.decidido
      ? null
      : campeao === decisao.casa
        ? decisao.fora
        : decisao.casa;

  const fracoes: readonly [string, number, ClubeRef | null][] = [
    ["Campeão", 1, campeao],
    ["Vice", 0.5, vice],
    ["Semifinalista", 0.28, null],
    ["Quartas de final", 0.15, null],
    ["Oitavas de final", 0.08, null],
  ];
  return fracoes.map(([colocacao, fracao, clube]) => ({
    colocacao,
    clube,
    valorMinor: escala(fracao),
  }));
}
