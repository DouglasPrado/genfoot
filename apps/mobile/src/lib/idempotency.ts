/**
 * A chave de idempotência de um command, com a OCASIÃO obrigatória.
 *
 * Existe por causa de quatro bugs da mesma classe, todos confirmados contra a
 * API real e nenhum visto pelo gate:
 *
 * 1. conversa que funcionava UMA vez por jogador, para sempre;
 * 2. treino (start/collect) que cada jogador podia fazer UMA vez na vida;
 * 3. a colisão de sessão que isso escondia, vazando stack do Prisma na tela;
 * 4. a segunda edição do plano coletivo sumindo em SILÊNCIO.
 *
 * A causa foi sempre a mesma: cada tela montava a chave à mão, e "que coisa
 * torna esta tentativa distinta da anterior?" nunca era respondida. Como o
 * servidor deduplica pela chave, chave sem escopo vira funcionalidade de uso
 * único — e o sintoma é `ALREADY_APPLIED`, que não é erro, então nada reclama e
 * o defeito só aparece para quem usa.
 *
 * Aqui a pergunta é obrigatória: sem ocasião, a função LANÇA. Falhar alto na
 * hora de montar é melhor que gravar uma chave que nunca mais destrava.
 */

/** Marca opaca: obriga a ocasião a vir de um dos construtores abaixo. */
export type Occasion = string & { readonly __occasion?: never };

/**
 * A ocasião é o DIA LÓGICO do mundo.
 *
 * Use quando repetir a ação amanhã é legítimo: conversar com um jogador,
 * iniciar o treino do dia. A data vem do mundo (`asOf`), nunca de `Date.now()`:
 * chave derivada do relógio local viraria à meia-noite do jogador, não à virada
 * do dia lógico.
 */
export function onDay(worldDate: string): Occasion {
  const d = worldDate.trim();
  if (d === "") {
    throw new Error(
      "onDay exige a data do mundo: sem ela a chave vira permanente e a ação só funciona uma vez.",
    );
  }
  return `day:${d}`;
}

/**
 * A ocasião é uma ENTIDADE específica — o id é a própria ocasião.
 *
 * Use quando existe um registro que identifica a tentativa: coletar a sessão
 * `X` duas vezes é o mesmo efeito; a sessão da semana que vem é outra coisa.
 */
export function onEntity(id: string): Occasion {
  const value = id.trim();
  if (value === "") {
    throw new Error(
      "onEntity exige o id da entidade: sem ele não há como distinguir uma tentativa da seguinte.",
    );
  }
  return `entity:${value}`;
}

/**
 * A ocasião é uma REVISÃO do agregado mais o conteúdo enviado.
 *
 * Use em edição com concorrência otimista. A versão sozinha NÃO basta: se o
 * refetch pós-gravação falhar, a tela segue na versão velha e a próxima edição
 * — diferente — reusaria a chave e seria descartada em silêncio. Foi assim que
 * o plano perdia a segunda escolha do usuário. Incluindo o conteúdo, retentar a
 * MESMA edição ainda deduplica (que é o ponto), mas outra edição vale.
 */
export function onRevision(
  version: number,
  ...content: readonly (string | number)[]
): Occasion {
  if (!Number.isInteger(version) || version < 0) {
    throw new Error("onRevision exige uma versão inteira não negativa.");
  }
  return `rev:${version}:${content.join(":")}`;
}

export function commandIdempotencyKey(input: {
  readonly commandType: string;
  /** O agregado/entidade sobre o qual o command age (clube, jogador…). */
  readonly target: string;
  /** O que torna ESTA tentativa distinta da anterior. Nunca vazio. */
  readonly occasion: Occasion;
}): string {
  if (input.occasion.trim() === "") {
    throw new Error(
      "commandIdempotencyKey exige a ocasião: chave sem escopo faz o servidor deduplicar para sempre, e a ação passa a funcionar uma vez só.",
    );
  }
  return `${input.commandType}:${input.target}:${input.occasion}`;
}
