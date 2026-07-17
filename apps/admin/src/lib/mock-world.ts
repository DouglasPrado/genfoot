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
  readonly clubId: string;
  readonly clube: string;
  readonly shortCode: string;
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

interface ClubeRef {
  readonly id: string;
  readonly name: string;
  readonly shortCode: string;
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
      clubId: clube.id,
      clube: clube.name,
      shortCode: clube.shortCode,
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
          clubId: clube.id,
          clube: clube.name,
          shortCode: clube.shortCode,
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
  readonly casa: string;
  readonly fora: string;
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
      const decidido = pick(chave, 3, 0, 4) > 0;
      const golsCasa = pick(chave, 5, 0, 4);
      const golsFora = pick(chave, 7, 0, 3);
      confrontos.push({
        id: chave,
        casa: casa.name,
        fora: fora.name,
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

/** C4 + C5. Artilharia e — o nome do canon — GARÇOM, o líder de assistências. */
export interface MockJogadorRanking {
  readonly posicao: number;
  readonly jogador: string;
  readonly clube: string;
  readonly valor: number;
  readonly jogos: number;
}

const NOMES = [
  "Rivaldo Neves", "Caio Mendes", "Túlio Barros", "Émerson Prado",
  "Léo Vasques", "Danilo Ítalo", "Wesley Aragão", "Fabinho Cruz",
  "Igor Salles", "Murilo Tavares",
];

export function mockArtilharia(
  torneioId: string,
  clubes: readonly ClubeRef[],
): readonly MockJogadorRanking[] {
  return ranking(`${torneioId}:gols`, clubes, 5, 24);
}

/** "Garçom (líder de assistências)" — `06-temporada-e-competicoes.md:§7`. */
export function mockGarcons(
  torneioId: string,
  clubes: readonly ClubeRef[],
): readonly MockJogadorRanking[] {
  return ranking(`${torneioId}:assist`, clubes, 3, 16);
}

function ranking(
  chaveBase: string,
  clubes: readonly ClubeRef[],
  min: number,
  max: number,
): readonly MockJogadorRanking[] {
  return NOMES.map((jogador, index) => {
    const chave = `${chaveBase}:${index}`;
    return {
      jogador,
      clube: clubes[index % Math.max(1, clubes.length)]?.name ?? "—",
      valor: pick(chave, 3, min, max),
      jogos: pick(chave, 7, 18, 30),
      posicao: 0,
    };
  })
    .sort((a, b) => b.valor - a.valor)
    .map((linha, index) => ({ ...linha, posicao: index + 1 }));
}

/**
 * As premiações do canon (`06-temporada-e-competicoes.md:§7`), na ordem em que
 * ele as lista. Não inventei categoria: elas "afetam reputação e mercado" e
 * encaixam no sistema psicológico — inventar uma seria inventar efeito de jogo.
 */
export interface MockPremio {
  readonly categoria: string;
  readonly jogador: string;
  readonly clube: string;
}

const CATEGORIAS = [
  "Melhor jogador do campeonato",
  "Craque da torcida",
  "Artilheiro",
  "Garçom (líder de assistências)",
  "Revelação",
  "Melhor goleiro",
  "Melhor zagueiro",
  "Melhor técnico",
  "Jogador mais evoluído",
  "Jogador decepção",
];

export function mockPremiacao(
  torneioId: string,
  clubes: readonly ClubeRef[],
): readonly MockPremio[] {
  return CATEGORIAS.map((categoria, index) => {
    const chave = `${torneioId}:premio:${index}`;
    return {
      categoria,
      jogador: NOMES[pick(chave, 3, 0, NOMES.length - 1)]!,
      clube: clubes[pick(chave, 7, 0, Math.max(0, clubes.length - 1))]?.name ?? "—",
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
