/**
 * Parâmetros do mundo: a ficha técnica do que o mundo É, e do que dá para mexer.
 *
 * **A resposta curta é: quase nada.** Esta tabela nasceu do pedido de "todos os
 * parâmetros do mundo que será possível alterar" e o levantamento derrubou a
 * premissa — o domínio não tem configuração de mundo. O `GameWorldSnapshot`
 * (`packages/core/src/world/world-types.ts:34-43`) tem oito campos, e `seed`,
 * `startDate` e `rulesetVersion` são `readonly` no agregado
 * (`game-world.ts:20-22`): imutáveis por construção, não por falta de tela.
 *
 * Os números do mundo (16 clubes, 23 por elenco, 30 rodadas) não são
 * configuração — são **literais de tipo**. `generatedClubCount: 16` é o tipo,
 * não um `number`. Hoje um mundo de 20 clubes não compila. R-182 já ratificou
 * que eles viram `GameRuleConfig`/`GameEconomyConfig`; a decisão está tomada e a
 * implementação, pendente.
 *
 * Por isso a coluna "alterável" tem três respostas, e não duas: além de "sim, por
 * este command" e "não, é imutável", existe **travado** — o parâmetro deveria
 * mudar, o canon diz como, e o caminho não existe. Colapsar "travado" em "não"
 * esconderia a dívida; anunciar um command inexistente seria a tela mentindo
 * sobre a API. A distinção é o conteúdo desta tela.
 */

/** De onde o valor veio. `code` não foi observado: espelha um literal do core. */
export type ParameterOrigin = "snapshot" | "query" | "code";

export type Mutability =
  /** Há command real no registry. Verificado contra ele no teste. */
  | { readonly kind: "command"; readonly commandTypes: readonly string[] }
  /** Imutável por construção — `readonly` no agregado. Mudar é criar outro mundo. */
  | { readonly kind: "immutable"; readonly reason: string }
  /** Deveria mudar; não há caminho. `decision` aponta a decisão que rege. */
  | {
      readonly kind: "blocked";
      readonly reason: string;
      readonly decision?: string;
    };

export interface ParameterRow {
  readonly key: string;
  readonly label: string;
  /** `null` = desconhecido. Nunca um default inventado: chute vira fato na tela. */
  readonly value: string | null;
  readonly origin: ParameterOrigin;
  /** Arquivo:linha (origem `code`) ou o endpoint que serviu o valor. */
  readonly source: string;
  readonly mutability: Mutability;
}

export interface WorldSnapshotLike {
  readonly seed: string;
  readonly name: string | null;
  readonly description: string | null;
  readonly startDate: string;
  readonly currentDate: string;
  readonly rulesetVersion: string;
  readonly status: string;
  readonly worldSequence: number;
  readonly version: number;
}

export interface WorldParametersInput {
  readonly snapshot: WorldSnapshotLike | null;
  /** Contagem real de `club-detail`. `null` enquanto não se sabe — não é 0. */
  readonly observedClubCount: number | null;
}

const RULESET_BLOCKED: Mutability = {
  kind: "blocked",
  // `PublishRuleSetVersion` está especificado em docs/02-tecnico/10-catalogo-de-commands.md:519
  // (payload, gate do SimulationLab, RULESET_RETROACTIVE_FORBIDDEN) e não existe
  // no código. É o command que faria esta tabela ser editável de verdade.
  reason:
    "PublishRuleSetVersion está no catálogo de commands e não foi implementado. O ruleset é carimbo: nada no código o interpreta.",
  decision: "R-24 · R-30",
};

/** Literais de tipo do core que R-182 manda virar configuração. Ainda não são. */
const GENESIS_CONSTANTS: readonly {
  key: string;
  label: string;
  value: string;
  source: string;
}[] = [
  {
    key: "squadSize",
    label: "Jogadores por elenco",
    value: "23",
    source: "world-types.ts:29 · playersPerSquad: 23",
  },
  {
    key: "playerCount",
    label: "Jogadores gerados",
    value: "368",
    source: "world-types.ts:28 · generatedPlayerCount: 368",
  },
  {
    key: "rounds",
    label: "Rodadas da liga",
    value: "30",
    source: "genesis-types.ts:78 · rounds: 30",
  },
  {
    key: "leagueName",
    label: "Nome da liga",
    value: "Liga Inicial",
    source: 'genesis-types.ts:76 · name: "Liga Inicial"',
  },
];

const GENESIS_BLOCKED: Mutability = {
  kind: "blocked",
  reason:
    "Literal de tipo no core, não configuração: um mundo fora deste número não compila, e a ativação recusa (game-world.ts:135-148). R-182 manda virar GameRuleConfig; pendente.",
  decision: "R-182",
};

export function buildWorldParameters(
  input: WorldParametersInput,
): readonly ParameterRow[] {
  const s = input.snapshot;

  return [
    {
      key: "name",
      label: "Nome",
      // Estas duas linhas eram a prova da tese desta tabela: `name` existia no
      // banco, nullable, e NUNCA era escrito — travado por um comentário que
      // atribuía a R-182 algo que R-182 não diz. Hoje gravam.
      value: s?.name ?? null,
      origin: "snapshot",
      source: "GET /worlds/{id} · world:set-identity",
      mutability: { kind: "command", commandTypes: ["world:set-identity"] },
    },
    {
      key: "description",
      label: "Descrição",
      value: s?.description ?? null,
      origin: "snapshot",
      source: "GET /worlds/{id} · world:set-identity",
      mutability: { kind: "command", commandTypes: ["world:set-identity"] },
    },
    {
      key: "seed",
      label: "Seed",
      value: s?.seed ?? null,
      origin: "snapshot",
      source: "GET /worlds/{id} · world:create",
      mutability: {
        kind: "immutable",
        reason:
          "Entrada do determinismo (R-182): o mundo inteiro é derivado dela. Trocar a seed não muda um parâmetro — cria outro mundo.",
      },
    },
    {
      key: "startDate",
      label: "Data inicial",
      value: s?.startDate ?? null,
      origin: "snapshot",
      source: "GET /worlds/{id} · world:create",
      mutability: {
        kind: "immutable",
        reason:
          "readonly no agregado (game-world.ts:21). O calendário e os ids determinísticos derivam dela.",
      },
    },
    {
      key: "currentDate",
      label: "Data lógica",
      value: s?.currentDate ?? null,
      origin: "snapshot",
      source: "GET /worlds/{id}",
      mutability: {
        kind: "blocked",
        // Verificado no registry: são 10 commands, e nenhum é `world:advance-day`.
        // O use case AdvanceWorldDays (world-use-cases.ts:64) e o método
        // advanceDays() do agregado existem, órfãos — morreram com o
        // WorldScheduler em R-175. O relógio do mundo não anda pela API.
        reason:
          "Não existe command que avance o relógio. AdvanceWorldDays sobrevive no core como código morto (R-175 matou o WorldScheduler); nenhum command o expõe.",
        decision: "R-175",
      },
    },
    {
      key: "rulesetVersion",
      label: "Versão do ruleset",
      value: s?.rulesetVersion ?? null,
      origin: "snapshot",
      source: "GET /worlds/{id} · world:create",
      mutability: RULESET_BLOCKED,
    },
    {
      key: "status",
      label: "Status",
      value: s?.status ?? null,
      origin: "snapshot",
      source: "GET /worlds/{id}",
      // O ciclo de vida operacional inteiro: em breve → ativo → congelado ⇄
      // ativo | inativo ⇄ ativo. `world:delete` NÃO entra: ele não muda o
      // status, apaga a linha — o parâmetro deixa de existir junto com o mundo.
      mutability: {
        kind: "command",
        commandTypes: [
          "world:activate",
          "world:pause",
          "world:resume",
          "world:archive",
        ],
      },
    },
    {
      key: "worldSequence",
      label: "Sequência do mundo",
      value: s === null ? null : String(s.worldSequence),
      origin: "snapshot",
      source: "GET /worlds/{id}",
      mutability: {
        kind: "immutable",
        reason:
          "Contador de eventos, não parâmetro. Quem o move é o domínio, ao emitir evento.",
      },
    },
    {
      key: "version",
      label: "Revisão (lock otimista)",
      value: s === null ? null : String(s.version),
      origin: "snapshot",
      source: "GET /worlds/{id}",
      mutability: {
        kind: "immutable",
        reason:
          "Controle de concorrência: vai no expectedVersion do command. Editar seria burlar o lock.",
      },
    },
    {
      key: "clubCount",
      label: "Clubes",
      // Observado, não espelhado: o `16` do core não se repete aqui. Se a gênese
      // um dia variar, esta linha acompanha sozinha.
      value:
        input.observedClubCount === null
          ? null
          : String(input.observedClubCount),
      origin: "query",
      source: "GET /worlds/{id}/club-detail",
      mutability: GENESIS_BLOCKED,
    },
    ...GENESIS_CONSTANTS.map((c) => ({
      key: c.key,
      label: c.label,
      value: c.value,
      origin: "code" as const,
      source: c.source,
      mutability: GENESIS_BLOCKED,
    })),
  ];
}

/** O que dá para mexer hoje. Hoje: `status`. */
export function mutableParameters(
  rows: readonly ParameterRow[],
): readonly ParameterRow[] {
  return rows.filter((r) => r.mutability.kind === "command");
}
