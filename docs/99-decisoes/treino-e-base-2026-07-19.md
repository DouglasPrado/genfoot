# Treino e base — o schema cede à doc (R-212..R-215)

**Data:** 2026-07-19 · **Status:** RATIFICADAS · **Escopo:** treino de jogadores, categorias de base, desenvolvimento de atributos

## Contexto

Treino está **integralmente especificado e integralmente não implementado**. Existe a
fórmula canônica (`docs/01-game-design/02-sistema-de-jogadores.md:307-322`), as quatro
tabelas treino→atributo (§6:253-295), as curvas por idade (§5:232-245), a matriz de
compatibilidade (R-02), o aproveitamento por nível de estrutura (R-12), a capacidade do
CT (R-13), e a invariante de aplicação única na virada (INV-29/R-113).

Existe também o schema físico: `TrainingPlan`, `TrainingPlayerEntry`,
`PlayerDevelopment`, `PlayerDevelopmentAccrual`.

Não existe **uma única linha de código**. Grep de `SetTrainingPlan` em `packages/` e
`apps/`: zero. A base está em ~20% — a gênese cria 12 jovens por clube (R-198), e
`PromoteYouthPlayer` só move o `SquadMembership`.

Ao começar a construir, quatro pontos onde o **schema contradiz a doc**. Como a doc é a
fonte da verdade (CLAUDE.md §2) e as decisões que ela carrega estão ratificadas, quem
cede é o schema.

## R-212 — O accrual de desenvolvimento é por atributo individual, não por grupo

`TrainingPlayerEntry` grava ganho em três colunas — `technicalGain`, `physicalGain`,
`mentalGain` (`prisma/schema.prisma:1684-1700`). Isso contradiz a **R-188** (o grid é o
do GDD §2, 39 atributos) e a **R-179**, que diz com todas as letras: *"com 4 [grupos],
scouting/treino/tática não têm sobre o que operar"*.

O `PlayerDevelopmentAccrual` já está certo — chaveado por `attributeCode`
(`schema.prisma:2629-2646`, `@@unique([playerId, seasonId, attributeCode])`). São as
colunas de `TrainingPlayerEntry` que ficaram para trás.

**Decisão:** o accrual de desenvolvimento acontece **por `attributeCode`**, sempre. As
três colunas de ganho em `TrainingPlayerEntry` deixam de ser fonte de desenvolvimento e
passam a ser **projeção de leitura** (o que a tela mostra como "ganho estimado por
grupo"), derivada do accrual por `rollupAttributes`. Não se escreve desenvolvimento
nelas.

Motivo de não simplesmente removê-las: a `M-TRAINING-INDIV` pede *"projeção de ganho e
trade-off"* por área, e derivar isso a cada leitura dos 39 atributos é caro para o que é
um resumo. Elas viram cache do rollup, com dono claro.

## R-213 — Potencial em três camadas, materializado

`Player.potentialAbility` é um `Int` único (`schema.prisma:1338`). O
`02-sistema-de-jogadores.md:203-213` define **três camadas**:

- **Natural** — teto bruto, quase imutável; cai com lesão grave
- **Aproveitável** — quanto do teto é alcançável no contexto atual (estrutura, comissão,
  compatibilidade); é onde a **R-12** opera (40/55/70/85/95% por nível)
- **Funcional** — o que rende por função; mudança de posição pode elevá-lo

O exemplo do doc não é decorativo: potencial natural 82 rende **68** em clube errado,
**82** no certo, **86** com mudança de posição. Com um escalar só, essa diferença não tem
onde existir — e a `M-PLAYER-DEV`, que precisa explicar *"por que estagnou"*, não teria o
que explicar.

**Decisão:** `Player` ganha as três camadas. `potentialAbility` atual passa a ser o
**natural** (migração direta, sem perda). `aproveitável` e `funcional` são **derivados**,
recalculados a partir de estrutura/comissão/compatibilidade/posição — não colunas
escritas à mão, para não criar duas fontes da verdade sobre o mesmo teto.

O clamp de `Player.applyAttributeChange` (`player.ts:128-175`) passa a comparar contra o
**aproveitável**, não o natural: é ele que a R-12 limita, e é ele que faz um jovem de
potencial 85 parar em 55–65 numa estrutura nível 1 (`04-estrutura-do-clube-e-staff.md:258-264`).

## R-214 — `TrainingPlan` ganha `version`

A rastreabilidade (`23-rastreabilidade-ux-api.md:63`) exige `expectedVersion` no
`SetTrainingPlan`, e a **INV-31** o cobre. `TrainingPlan` não tem coluna `version`
(`schema.prisma:1665-1682`) — concorrência otimista declarada e não implementável.

**Decisão:** `TrainingPlan` ganha `version Int @default(1)`, como todo agregado de topo
(R-175). `SetTrainingPlan` falha com `AGGREGATE_VERSION_CONFLICT` quando a revisão não
bate, e a tela recarrega e reenvia (`23-rastreabilidade-ux-api.md:176`).

## R-215 — Os nomes de command do golden path se alinham ao registry real

`golden-path-registry.ts:43` (GP-005) e `:49` (GP-011) declaram `player:set-training`,
`player:generate-youth` e `player:promote-youth`. **Nenhum existe.** O real é
`youth:promote-player` (`command-registry.ts:702`), e os outros dois não foram escritos.

Isso não é detalhe de nomenclatura: o golden path é o que o cliente usa para saber que
command despachar, e um catálogo que aponta para comandos inexistentes é documentação que
mente ao próprio código.

**Correção da premissa.** Ao escrever o teste que provaria isto, o número apareceu:
**36 commands reais**, e **12 dos 16 golden paths** citam commands inexistentes — não os
dois que motivaram a decisão. GP-007 (partida), GP-008/009/010 (mercado), GP-013
(financeiro), GP-014 (infraestrutura) e GP-015/016 (narrativa) apontam inteiramente para
handlers que não existem.

Com essa proporção, a leitura muda: o `GOLDEN_PATH_REGISTRY` **não é contrato de runtime
mentindo — é o mapa das jornadas projetadas**, e a maior parte do backend que elas exigem
foi removida pela R-175 e ainda não voltou. Citar command futuro ali é legítimo: é o
catálogo dizendo aonde o jogo vai.

O defeito real é outro: **não havia como distinguir o que já existe do que é projeto**, e
nada avisava quando um nome divergia do handler real (`player:promote-youth` vs
`youth:promote-player` conviveram sem ninguém notar).

**Decisão:**

1. O prefixo do command é o **contexto dono**, não a entidade tocada — treino é contexto
   próprio, base é `youth`:

   | Declarado | Passa a ser |
   |---|---|
   | `player:set-training` | `training:set-plan` |
   | `player:generate-youth` | `youth:generate-class` |
   | `player:promote-youth` | `youth:promote-player` (já existe) |

2. O golden path **pode** citar command não construído — mas cada um precisa estar numa
   lista explícita de pendências (`apps/api/test/golden-path-commands.test.ts`). Nome fora
   dessa lista e fora do registry **quebra o teste**. É catraca: a dívida atual fica
   registrada e visível, e dívida nova não entra em silêncio.

3. Quando um handler é escrito, ele sai da lista de pendências. A lista encolhendo é a
   medida honesta de quanto do jogo projetado existe de fato.

---

## Consequências aceitas / pendências

- **Duas migrations** saem daqui: potencial em camadas (R-213) e `TrainingPlan.version`
  (R-214). Mundos existentes migram sem perda — `potentialAbility` vira o natural.
- **`TrainingPlayerEntry` fica com colunas que não são mais fonte da verdade** (R-212).
  Enquanto o rollup não as preencher, elas ficam em zero — e zero ali significa "ainda
  não projetado", não "sem ganho". A tela precisa saber distinguir.
- **O `aproveitável` depende de coisas que ainda não existem**: `DevelopmentSignature`
  (§7) e níveis de estrutura do CT não estão implementados (a própria R-197 registra a
  ausência do multiplicador de treino). Até existirem, o aproveitável cai no natural
  ×0,70 — o nível 3 da R-12, o meio da tabela. **É provisório e está registrado como
  dívida**, não como regra.
- **Não decide** a captação (`M-YOUTH-INTAKE`), a disputa entre clubes, nem o contrato de
  formação. São peças grandes com spec própria (`08-mobile-telas-base-e-formacao.md:19-26`)
  e ficam para decisão posterior.
- **Sete telas de treino/base não têm linha de rastreabilidade** — `M-ACADEMY`,
  `M-YOUTH-INTAKE`, `M-YOUTH-PLAYER`, `M-MENTORING`, `M-TRAINING-INDIV`, `M-PLAYER-DEV`,
  `M-ROLES`. O contrato (query · command · evento · errorCode · invariante) precisa ser
  decidido e escrito em `23-rastreabilidade-ux-api.md` antes de cada uma ser construída.
