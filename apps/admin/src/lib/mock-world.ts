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

/** Liga soma pontos; mata-mata não. O formato decide o que a linha significa. */
export type FormatoTorneio = "PONTOS_CORRIDOS" | "MATA_MATA";

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
            formato: "MATA_MATA" as const,
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
