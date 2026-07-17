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
 */

/** Hash estável e barato. Não é criptografia — é só espalhar o id. */
function seedOf(worldId: string): number {
  let hash = 2_166_136_261;
  for (const char of worldId) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return Math.abs(hash);
}

function pick(worldId: string, salt: number, min: number, max: number): number {
  return min + ((seedOf(worldId) >>> salt) % (max - min + 1));
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

/** C7 (competições) + C2 (temporada). */
export function mockCompeticoes(worldId: string) {
  return {
    rodando: pick(worldId, 13, 1, 3),
    temporada: pick(worldId, 17, 1, 4),
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
  return {
    crescente: delta >= 0,
    percentual: Math.abs(delta),
  };
}

export interface MockTemporadaResultado {
  readonly temporada: number;
  readonly posicao: number;
  readonly pontos: number;
  readonly vitorias: number;
  readonly empates: number;
  readonly derrotas: number;
}

/** C7 (competições) + C5 (partidas). O histórico de um clube. */
export function mockTemporadasDoClube(
  worldId: string,
  clubId: string,
  ate: number,
): readonly MockTemporadaResultado[] {
  return Array.from({ length: ate }, (_, index) => {
    const temporada = index + 1;
    const chave = `${worldId}:${clubId}:${temporada}`;
    const vitorias = pick(chave, 3, 4, 22);
    const empates = pick(chave, 7, 2, Math.max(3, 30 - vitorias));
    return {
      temporada,
      posicao: pick(chave, 11, 1, 16),
      pontos: vitorias * 3 + empates,
      vitorias,
      empates,
      derrotas: Math.max(0, 30 - vitorias - empates),
    };
  });
}
