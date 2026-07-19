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

O clamp de `Player.applyAttributeChange` (`player.ts:128-175`) deve comparar contra o
**aproveitável**, não o natural: é ele que a R-12 limita, e é ele que faz um jovem de
potencial 85 parar em 55–65 numa estrutura nível 1 (`04-estrutura-do-clube-e-staff.md:258-264`).

### Bloqueio descoberto na implementação: falta a linha de base (trava B-07)

Ao ligar o clamp, o defeito apareceu: o aproveitável é
`habilidade + margem × rendimento`, e a **habilidade sobe a cada ganho**. Recalculado a
cada aplicação, o teto sobe junto — 71 → teto 77 → ganha → teto 79 — e converge para o
natural. O clamp *pareceria* cumprir a R-12 e **não travaria nada**.

A tabela do doc só fecha se a margem for medida **uma vez**, a partir de uma linha de base
estável (a habilidade de entrada no clube ou no início da temporada). **Essa linha de base
não existe no schema**: nem `Player` nem `PlayerDevelopment` (`schema.prisma:1512-1526`)
guardam a habilidade de entrada.

**Estado:** `derivePotentialLayers` está implementado e testado (15 testes, incluindo a
validação cruzada contra a tabela do doc), mas **não está ligado ao clamp**. O teto segue
o natural, como antes. Preferiu-se o erro antigo e visível ao erro novo disfarçado de
regra cumprida.

**DESTRAVADA pela R-216** (abaixo).

## R-216 — A linha de base é fixada na virada de temporada

`Player.baselineAbility` guarda a habilidade de onde a **margem de crescimento** é medida.
O potencial aproveitável passa a ser `base + (natural − base) × rendimento`, e o clamp de
`Player.applyAttributeChange` trava nele.

**A base é reescrita a cada virada de temporada**, no passo 7 — o mesmo onde o accrual é
aplicado (INV-29/R-113). Uma passada toca as duas coisas.

**Consequência de jogo, e ela é a razão da escolha:** estrutura ruim **atrasa**, não
limita para sempre. Um talento de potencial 85 num clube nível 1 evolui pouco por
temporada, mas a cada virada a margem é remedida do que ele virou — com tempo, ele ainda
se aproxima do teto. Talento em clube pequeno **não morre ali**; demora. A transferência
vira aceleração, não salvação.

A alternativa considerada (fixar na entrada no clube) tornaria a estrutura uma sentença:
o mesmo jogador morreria em 55–65 e só uma venda o libertaria. Mais dramático, e
descartado.

**Onde a coluna ficou, e por que não onde eu havia proposto.** A candidata era
`PlayerDevelopment.baselineAbility`. Ao implementar, a tabela mostrou-se **vazia — zero
linhas** — com todas as colunas obrigatórias sem default: a base lá nasceria ausente para
todo jogador e a trava seguiria de pé com outra cara. Ficou em `Player`, ao lado de
`currentAbility`/`potentialAbility`, e os 1.400 jogadores existentes receberam a
habilidade atual como base.

**Prova:** `potential-layers.test.ts` fixa que o aproveitável **não muda** enquanto a
habilidade sobe (50 → 55 → 60 → 65 dão o mesmo teto 71), e reproduz a tabela publicada em
`04-estrutura-do-clube-e-staff.md:258-264` — potencial 85, base 35 → **55 / 70 / 83** nos
níveis 1 / 3 / 5, contra as faixas 55–65 / 70–80 / 80–88 do doc.

**Segue pendente:** `structureLevel` ainda não é conhecido no clamp e cai no provisório
(nível 3). Hoje clube nível 1 e nível 5 rendem igual — a curva da R-12 existe e está
testada, mas ninguém lhe passa o nível real. Destravar exige os níveis de CT, que a R-197
já registra como ausentes.

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

### Trava B-08 — o auto-disparo do treino depende de ciclo de vida de temporada, que não existe

`training:accrue-day` e `training:apply-season` funcionam e são provados por HTTP, mas são
commands **explícitos**: nada os chama quando o mundo avança um dia ou vira a temporada.
Ligá-los ao relógio (`world:advance-day` / `AdvanceWorldOneDay`) esbarra num gap real,
constatado no banco em 2026-07-19:

- `GameWorld.currentSeasonId` está **NULL** — a gênese e a ativação do mundo nunca o
  populam.
- A `Season` do mundo nasce **`PLANNED`** e nada a transiciona para `ACTIVE`.

O accrual e a virada são chaveados por `seasonId`, e o mundo **não sabe dizer qual é a
temporada corrente**. Sem essa plumbing (ativar a temporada na gênese, popular
`currentSeasonId`, transicioná-la na virada), o auto-disparo não tem em que se ancorar.
É um vertical próprio, com decisão de produto embutida (quando a temporada vira `ACTIVE`?),
e ficou para depois. Enquanto isso, o treino é dirigido pelos commands explícitos.
