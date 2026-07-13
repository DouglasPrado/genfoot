# Ledger, Conservação Econômica e Relógio de Progressão

> **Status:** CANÔNICO (Série R ratificada em 2026-07-13) · **Bloqueador:** B-04 (passo 5 da ordem de correção — parte econômica/demográfica) · **Fontes derivadas:** [`../01-game-design/03-economia.md`](../01-game-design/03-economia.md) (§14 economia global, §15 contabilidade), [`./02-modelo-de-dados.md`](./02-modelo-de-dados.md) (§6.3.9 finanças em partidas dobradas), [`./05-catalogo-de-regras-e-formulas.md`](./05-catalogo-de-regras-e-formulas.md) (regras `ECO-*`/`PLY-*`/`CMP-*`, invariantes `INV-3`/`INV-6`/`INV-7`), [`../01-game-design/02-sistema-de-jogadores.md`](../01-game-design/02-sistema-de-jogadores.md) (§6 evolução, `developmentGain`), [`../01-game-design/06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md) (§6 motor de virada), [`./03-multiplayer-e-mundos.md`](./03-multiplayer-e-mundos.md) (§5 fluxo de rodada), [`../BACKLOG-PENDENCIAS.md`](../BACKLOG-PENDENCIAS.md) (B-04, C-06, C-11) · **Revisão:** 2026-07-12

Este documento fecha a **semântica única de economia/ledger e de progressão/população** do **Grinta**, respondendo diretamente ao bloqueador **B-04** da auditoria de prontidão: *"a conservação monetária conflita com receitas e despesas sistêmicas; progressão pode ocorrer pós-partida e novamente no fechamento; aposentadoria gera 1,25 jogador sem precedência clara sobre o controlador populacional"* ([`../BACKLOG-PENDENCIAS.md`](../BACKLOG-PENDENCIAS.md)). Ele também consolida os achados críticos **C-06** (ledger de partidas dobradas vs. caixa editável) e **C-11** (causalidade suficiente para reconstrução).

> **Modo CANÔNICO.** Ledger, classes faucet/sink/transferência, ponto único de progressão e controlador demográfico foram ratificados em R-109..R-115.

## Sumário

1. [O problema em uma frase](#1-o-problema-em-uma-frase)
2. [Modelo de conservação monetária e contas sistêmicas](#2-modelo-de-conservação-monetária-e-contas-sistêmicas)
3. [Ledger de partidas dobradas: a conservação como invariante verificável](#3-ledger-de-partidas-dobradas-a-conservação-como-invariante-verificável)
4. [Oferta monetária rastreável e controle de inflação](#4-oferta-monetária-rastreável-e-controle-de-inflação)
5. [Relógio único de progressão: accrual vs. aplicação](#5-relógio-único-de-progressão-accrual-vs-aplicação)
6. [Equação demográfica: ordem, precedência e clamps](#6-equação-demográfica-ordem-precedência-e-clamps)
7. [Recomendações consolidadas (R-109..R-115)](#7-recomendações-consolidadas-r-109r-115)
8. [Rastreabilidade](#8-rastreabilidade)

---

## 1. O problema em uma frase

Três semânticas hoje colidem e, ao longo de dezenas de temporadas, produzem **inflação monetária**, **inflação de atributos** e **crescimento populacional descontrolado**:

1. **Conservação × contas sistêmicas.** `INV-3` afirma que "o dinheiro sai de uma entidade e entra em outra; não é criado nem destruído". Mas a economia real do jogo tem receitas que **entram de fora** (patrocínio, bilheteria, premiação) e despesas que **saem para fora** (impostos, juros a bancos, salários consumidos). Se essas entradas/saídas ferem `INV-3`, a invariante é falsa; se são proibidas, a economia não funciona. Falta declarar **o que conserva** (transferência entre clubes) e **o que altera a oferta** (faucet/sink), de forma rastreável.
2. **Progressão dupla.** A evolução/regressão de atributo é citada **pós-partida** (fluxo de rodada, [`./03-multiplayer-e-mundos.md`](./03-multiplayer-e-mundos.md) §5, passo 8 — "jogadores evoluem, cansam ou se lesionam") **e novamente no fechamento** (motor de virada, [`../01-game-design/06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md) §6, passo 7 — "Calcular evolução / regressão dos jogadores"). Aplicar nos dois pontos **duplica o ganho** e infla atributos.
3. **Reposição × controlador.** A regra "por aposentado, 1 reposição direta + fração 0.25 para o mercado" ([`../01-game-design/03-economia.md`](../01-game-design/03-economia.md) §14.5, R-44) gera **1,25 jogador por aposentadoria**. Somada ao controlador por déficit ([`../01-game-design/03-economia.md`](../01-game-design/03-economia.md) §14.9, R-49), sem precedência declarada, gera jogadores **duas vezes** e faz a população crescer sem teto.

As três seções seguintes resolvem, respectivamente, cada colisão. O princípio comum é o de `ECO-003`: **nada é gerado solto** — nem dinheiro, nem atributo, nem jogador.

---

## 2. Modelo de conservação monetária e contas sistêmicas

### 2.1 A distinção fundadora: transferência vs. faucet vs. sink

Todo movimento de dinheiro no mundo pertence a **exatamente uma** de três classes. Esta é a decisão que resolve o conflito "caixa conservado × receitas/despesas sistêmicas":

| Classe | Efeito na oferta monetária do mundo (`totalMoney`) | Contraparte do lançamento | Exemplos |
|---|---|---|---|
| **Transferência** (conserva) | **Zero** — sai de um clube, entra em outro | clube ↔ clube (ambos com conta de caixa modelada) | taxa/valor de transferência, parcelas, bônus por gatilho, % de venda futura, solidariedade/mecanismo de formação, parcela de salário paga pelo dono em empréstimo |
| **Faucet** (cria) | **+** — dinheiro entra no sistema vindo de um ator **não modelado** como saldo | clube ↔ conta sistêmica **de origem** (`SYS_*_FAUCET`) | bilheteria e sócio-torcedor, patrocínio/comercial, direitos de TV, premiação, aporte de diretoria/mecenas, caixa inicial (`ECO-001`) |
| **Sink** (destrói) | **−** — dinheiro sai do sistema para um ator **não modelado** como saldo | clube ↔ conta sistêmica **de destino** (`SYS_*_SINK`) | impostos/taxas, salários e comissão técnica (consumo), custos operacionais (manutenção, viagens, médico, base, treino, obra), juros a bancos externos, multas/punições, comissão de empresário |

**Regra de decisão (quem é "modelado como saldo"):** um ator é conservativo (transferência) se, e somente se, o jogo mantém para ele um **saldo de caixa rastreado** que pode voltar a circular. Clubes têm caixa modelado → movimentos entre clubes **conservam**. Torcedores, patrocinadores, emissoras, federação, bancos, governo, jogadores/staff enquanto pessoas físicas e o "resto do mundo" **não** têm saldo modelado → movimentos com eles **criam ou destroem** oferta e passam obrigatoriamente por uma conta sistêmica nomeada.

> **Correção da leitura ingênua de §14.7.** A lista Entradas/Saídas de [`../01-game-design/03-economia.md`](../01-game-design/03-economia.md) §14.7 é escrita **na ótica de um clube**, e por isso lista "venda de jogadores" (entrada) e "compra de jogadores" (saída) como fluxos distintos. Na ótica do **mundo**, comprar e vender jogador entre dois clubes é **uma** transferência que **conserva** — não é faucet nem sink. Só as pontas verdadeiramente externas (bilheteria, patrocínio, premiação; impostos, salários-consumo, juros externos) alteram a oferta. Esta é a fonte canônica dessa distinção.

### 2.2 Catálogo de contas sistêmicas nomeadas

As contas sistêmicas são **contas do razão de escopo mundial** (não de um clube) que servem de contraparte a todo faucet e sink. Nomeá-las torna a oferta monetária do mundo **auditável por construção**: cada centavo criado tem uma conta de origem, cada centavo destruído tem uma conta de destino.

| Conta sistêmica | Classe | Papel | Regra de origem / calibração |
|---|---|---|---|
| `SYS_INITIAL_ENDOWMENT` | faucet | dotação de caixa inicial na criação do mundo | `ECO-001`; único disparo por clube, no evento `WorldCreated` |
| `SYS_MATCHDAY_FAUCET` | faucet | bilheteria, sócio-torcedor, hospitalidade, produtos | público × preço (fórmula §5.2 de economia); regulado por `ECO-012` |
| `SYS_SPONSOR_FAUCET` | faucet | patrocínio e receita comercial | fórmula §5.4 de economia; banda por `MarketInflation.sponsorInflation` |
| `SYS_BROADCAST_FAUCET` | faucet | direitos de TV/transmissão | proporcional ao estágio da liga (§9.5) |
| `SYS_PRIZE_FAUCET` | faucet | premiação e participação em competições | orçado por temporada pelo balanceador (`CMP-005`/`CMP-015`) |
| `SYS_OWNER_INJECTION_FAUCET` | faucet | aporte de diretoria/mecenas | condicionado ao perfil e capacidade da diretoria (§15.5); **não** há resgate automático |
| `SYS_TAX_SINK` | sink | impostos e taxas | percentual sobre base tributável |
| `SYS_WAGE_SINK` | sink | salários de jogadores e comissão técnica (consumo) | folha efetivamente paga |
| `SYS_OPERATING_SINK` | sink | manutenção, viagens, médico, base, treino, obras, fornecedores | custo operacional realizado |
| `SYS_CREDIT_SINK` | sink | juros a bancos/credores externos | `ECO-012`; principal de crédito externo entra como faucet dedicado se/quando houver captação |
| `SYS_PENALTY_SINK` | sink | multas e punições financeiras | `ECO-011` |
| `SYS_AGENT_SINK` | sink | comissão de empresário | `PlayerContract.agentCommission` |

> **Nota de fronteira.** Salários e comissões saem para `SYS_WAGE_SINK`/`SYS_AGENT_SINK` porque, neste modelo, jogadores e empresários **não mantêm saldo de caixa recirculante** — a riqueza pessoal do atleta é um traço narrativo, não um cofre que volta ao mercado de clubes. Se, em versão futura, jogadores passarem a ter saldo modelado que reentra na economia, esses dois fluxos migram de **sink** para **transferência** sem alterar o restante do modelo — a classe muda, a mecânica de partidas dobradas não.

### 2.3 Uma moeda-base por mundo (decisão M-05 — monomoeda)

> **Decisão de produto (M-05) — cada mundo é MONOMOEDA.** Todo mundo opera com **uma única moeda-base**, fixada em `GameWorld.currencyId` na criação e herdada por toda conta, lançamento e linha do razão (`FinancialAccount.currencyId`, `JournalEntry.currencyId`, `JournalLine.currencyId`). Não há conversão cambial, câmbio histórico, nem contas em moedas distintas dentro de um mesmo mundo. Isso remove a ambiguidade que a re-auditoria apontou em **M-05** (multi vs. monomoeda sem justificativa): o produto atual é **monomoeda por padrão**.

As cláusulas **"por moeda"** que aparecem no modelo — `INV-3a` (`Σ débitos = Σ créditos` **por moeda**), o `currencyId` presente em cada conta/lançamento/linha e a segmentação de `totalMoney` — garantem que **mundos diferentes** possam usar moedas-base diferentes sem misturar ledgers. Dentro de um mundo existe exatamente um `currencyId`; não há maquinaria de FX nem caminho de ativação multimoeda. Alterar esse princípio exigiria nova decisão arquitetural e migração explícita.

---

## 3. Ledger de partidas dobradas: a conservação como invariante verificável

### 3.1 Reaproveitar o razão que já existe — não inventar outro

O razão de partidas dobradas **já é canônico** em [`./02-modelo-de-dados.md`](./02-modelo-de-dados.md) §6.3.9: `FinancialAccount`, `FinancialJournalEntry`, `FinancialJournalLine`, `FinancialAccountBalanceSnapshot`, com a constraint **"soma dos débitos = soma dos créditos por `journalEntry` e moeda"**, saldo **derivado** do razão (sem campo de caixa editável isolado — o que corrige **C-06**) e reversão por **novo** lançamento com `reversalOfJournalEntryId`. Este documento **não cria** entidades novas de ledger: apenas fixa **como** faucets, sinks e transferências se projetam nesse razão e **qual invariante** cada classe respeita.

`FinancialAccount` permite escopo mundial (`ownerScope = WORLD`) para as contas `SYS_*`, com `clubId` nulo; o campo já existe na baseline física. Toda outra conta permanece no escopo declarado pelo catálogo.

### 3.2 Como cada classe vira lançamento

Todo lançamento é **sempre** balanceado (débitos = créditos). A diferença entre as três classes está apenas em **quais contas** figuram nas linhas:

```
Transferência (clube A compra de clube B por V):
  Journal Entry T1
    Débito   A.caixa            V     (A perde caixa)
    Crédito  B.caixa            V     (B ganha caixa)
  → Σ saldos de clubes inalterada. Conserva. (INV-3 clássica.)

Faucet (patrocínio de valor P entra no clube A):
  Journal Entry F1
    Débito   A.caixa            P     (A ganha caixa)
    Crédito  SYS_SPONSOR_FAUCET  P    (origem sistêmica nomeada)
  → Σ saldos de clubes sobe P. Oferta cresce, mas com origem rastreável.

Sink (imposto de valor I sai do clube A):
  Journal Entry S1
    Débito   SYS_TAX_SINK       I     (destino sistêmico nomeado)
    Crédito  A.caixa            I     (A perde caixa)
  → Σ saldos de clubes cai I. Oferta encolhe, com destino rastreável.
```

O lançamento **nunca** cria dinheiro "solto": mesmo um faucet tem contraparte (a conta `SYS_*`). O que muda é que a contraparte de um faucet/sink é uma conta **sistêmica** cujo saldo **não** entra em `totalMoney` (a oferta em circulação = soma apenas das contas de **clube**).

### 3.3 Reformulação de INV-3 (resolvendo o conflito)

A leitura atual de `INV-3` ("não é criado nem destruído; nenhum dinheiro aparece sem origem") é **verdadeira ao nível do lançamento** e **falsa ao nível da oferta de clubes** — daí o conflito apontado pela auditoria. A recomendação é **desdobrar** `INV-3` em duas invariantes complementares, ambas testáveis:

- **INV-3a — Balanço do lançamento (conservação contábil).** Para todo `FinancialJournalEntry` em estado `POSTED`, `Σ débitos = Σ créditos` por moeda. *Nenhum lançamento desbalanceado existe.* (É a constraint que já está no schema; passa a ser a forma canônica de `INV-3`.)
- **INV-3b — Oferta rastreável (origem obrigatória).** A variação da oferta em circulação entre dois instantes é **exatamente** igual à soma líquida dos lançamentos de faucet menos os de sink no intervalo: `Δ totalMoney = Σ faucets − Σ sinks`. *Nenhum centavo entra ou sai da soma dos caixas de clube sem passar por uma conta `SYS_*` nomeada.*

Assim, a "conservação" deixa de ser uma proibição de receitas/despesas sistêmicas e passa a ser uma **invariante de rastreabilidade**: o dinheiro pode ser criado e destruído, mas **só** por portas nomeadas e contabilizadas. `INV-3a` protege o razão; `INV-3b` protege a oferta.

---

## 4. Oferta monetária rastreável e controle de inflação

### 4.1 Definição operacional de oferta

```
totalMoney(t) = Σ saldo(conta)  para toda conta de escopo CLUBE  (SYS_* não entram)
```

Como `INV-3b`, a evolução da oferta é fechada e auditável:

```
totalMoney(t+1) = totalMoney(t)
                + Σ faucets no período     (SYS_*_FAUCET debitados em contas de clube)
                − Σ sinks   no período     (SYS_*_SINK   creditados por contas de clube)
                ± 0 de transferências      (clube↔clube nunca move a soma)
```

Este é exatamente o `totalMoney` do `GameEconomyState` ([`../01-game-design/03-economia.md`](../01-game-design/03-economia.md) §14.9) e o alvo de `ECO-002`/`ECO-012`. A diferença é que agora ele é **derivável do razão** — não um número mantido à parte que pode divergir.

### 4.2 Alavancas do balanceador

O controle global de inflação (§14.7, `ECO-012`, banda de `totalMoney` ±15% do alvo por R-49) age **exclusivamente sobre as magnitudes de faucet e sink** — nunca reescrevendo saldos:

- **Oferta acima da banda** (dinheiro demais): reduzir faucets discricionários (congelar premiação `SYS_PRIZE_FAUCET`, estabilizar patrocínio) e/ou aumentar sinks (impostos `SYS_TAX_SINK`), deixando salários/preços subirem para absorver — coerente com §14.7.
- **Oferta abaixo da banda** (dinheiro de menos): elevar faucets (premiação ajuda mais), baixar preços de mercado, estabilizar salários e reduzir custos estruturais.

Como transferências não alteram a soma, **nenhum ajuste de mercado da bola** (por mais aquecido) move a oferta — só faucets/sinks o fazem. Isso torna o controle de inflação um problema de **duas alavancas** (torneira e ralo), não de mil fluxos.

---

## 5. Relógio único de progressão: accrual vs. aplicação

### 5.1 Separar estado transitório de atributo estrutural

A colisão pós-partida × fechamento se resolve com a distinção que `PLY-004` já faz (**atributo × estado × traço**):

- **Estado** (fadiga, moral, forma, momentum, lesão) é **transitório** e **é aplicado imediatamente** a cada partida/treino. Estado *deve* mudar pós-jogo — é o que faz o jogo respirar. Nada aqui muda o fluxo de rodada quanto a estados.
- **Atributo estrutural** (`PLY-004`: "estrutural, relativamente permanente, muda lentamente") **não** é mutado pós-partida. Pós-partida apenas **acumula evidência de desenvolvimento** (accrual) num buffer. A mutação estrutural ocorre em **um único ponto canônico** por temporada.

Esta é a resolução direta do "progressão pode ocorrer pós-partida e novamente no fechamento": pós-partida **acumula**, o fechamento **aplica** — uma vez.

### 5.2 Onde acumula (accrual)

A cada partida/treino processado no fluxo de rodada ([`./03-multiplayer-e-mundos.md`](./03-multiplayer-e-mundos.md) §5, passo 8), o motor:

1. Aplica **estados** (fadiga, moral, forma, lesão) — imediato, como hoje.
2. Calcula o incremento de desenvolvimento por atributo pela fórmula canônica `developmentGain` (`PLY-007`, `F(evolução)` — `remainingPotential × trainingQuality × playerCompatibility × minutesFactor × ageFactor × personalityFactor × supportFactor × moraleFactor − penalidades`) e o **soma** a um buffer de acumulação por jogador/atributo/temporada — **sem** tocar o atributo publicado.

O buffer é a estrutura `PlayerDevelopmentAccrual` (já materializada na baseline física): `{ playerId, seasonId, attributeCode, pendingDeltaMinor, evidenceCount, lastUpdatedTick, version }`. Ele é o "extrato de treino" da temporada — análogo ao razão financeiro, mas para desenvolvimento. Regressão negativa (indícios de declínio físico por carga/idade/lesão) também **acumula** aqui, com sinal negativo, para ser resolvida junto na aplicação.

### 5.3 Onde aplica (single canonical point) e o clamp

A aplicação ocorre **exclusivamente** no passo 7 do motor de virada (`CMP-005`, [`../01-game-design/06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md) §6 — "Calcular evolução / regressão dos jogadores"). É o **único** ponto onde um atributo estrutural muda. Ordem determinística por jogador e por atributo (resolve também a pendência A-05 sobre ordem de regressão):

```
Para cada jogador P, para cada atributo a:
  Δganho     = max(0,  pendingDeltaMinor⁺(P,a))            // evidência positiva acumulada
  Δregressão = regressãoIdadeLesão(P, a)                    // PLY-008: declínio por idade/lesão
  potFunc    = potencialFuncional(P, a)                     // PLY-006: teto efetivo por função
  ganhoAplic = min(Δganho, remainingPotential(P,a), capGanhoTemporada)   // clamp de subida
  perdaAplic = min(Δregressão + |pendingDeltaMinor⁻|, capPerdaTemporada) // clamp de descida
  attr'(P,a) = clamp( attr(P,a) + ganhoAplic − perdaAplic,  attrPiso(a),  potFunc )
  registrar Δ líquido em PlayerDevelopmentHistory (PLY-010)  // C-11: causalidade preservada
  zerar pendingDelta(P,a)                                    // buffer consumido
```

Regras do clamp (impedem inflação de atributos ao longo de muitas temporadas):

- **Teto de potencial** (`PLY-006`): a subida nunca ultrapassa `remainingPotential` nem o `potencialFuncional`. Um jogador no teto simplesmente não sobe, por mais evidência que acumule.
- **`capGanhoTemporada`** e **`capPerdaTemporada`**: variação estrutural máxima por atributo por temporada (proposta de 1ª passada: **±6 pontos** de atributo/temporada; auge jovem admite teto de subida maior, veterano teto de descida maior, modulados por `PLY-008`). Isto impede que uma temporada excepcional (ou uma sequência de treinos exploráveis) dispare o atributo.
- **Idempotência**: consumir o buffer (`zerar pendingDelta`) na aplicação garante que reprocessar a virada **não** reaplica ganho. Se a virada é reexecutada (recuperação), a aplicação é derivada do buffer **antes** do zeramento, registrada com `commandId` idempotente — nunca duas somas.

> **Ajuste de escopo em [`./03-multiplayer-e-mundos.md`](./03-multiplayer-e-mundos.md) §5 (a fazer na ratificação, fora deste documento):** o passo 8 ("jogadores evoluem, cansam ou se lesionam") deve ser lido como **"jogadores atualizam estado (fadiga/moral/lesão) e acumulam evidência de desenvolvimento"** — *não* como aplicação de evolução estrutural. A evolução estrutural é o passo 7 da virada. Sem esse alinhamento, o texto do fluxo de rodada contradiz o relógio único.

---

## 6. Equação demográfica: ordem, precedência e clamps

### 6.1 A raiz do "1,25 jogador"

R-44 propõe "por aposentado, 1 reposição direta + fração 0.25 para o mercado" (100 aposentados → 125 gerados). R-49 propõe um **controlador por déficit** que gera `targetActive − activePlayers`. **Os dois somam** se rodarem em paralelo: o controlador já repõe as aposentadorias (elas *reduzem* `activePlayers`, aumentando o gap), e a regra 1,25 gera **de novo** por cima. Resultado: a população cresce a cada temporada. A correção é declarar que **existe um só gerador** — o controlador por déficit — e que a regra "1,25" é apenas um **limite de ritmo em regime**, subordinado ao alvo.

### 6.2 Ordem de operações do controlador populacional

O controlador roda dentro do motor de virada (`CMP-005`), na ordem fixa abaixo. Cada etapa é concluída antes da seguinte — a geração enxerga o estado **já** líquido de aposentadorias e regressões:

```
1. Aposentadorias        → PLY-017: remover aposentados; medir retiredCount por faixa/posição
2. Regressão/progressão  → §5 deste doc: aplicar evolução/regressão (afeta ageDistribution)
3. Recomputar estado     → GameEconomyState: activePlayers', ageDistribution, positionDistribution, déficits
4. Geração de reposição/base → PLY-002: gerar a safra (equação §6.3), distribuída por déficit
5. Balanceamento de mercado → ECO-012: recalcular preços e salários com a nova população
```

Precedência entre etapas: **1 → 2 → 3 → 4 → 5**, sem reentrância. A geração (4) **nunca** roda antes do estado ser recomputado (3); o mercado (5) **nunca** roda antes da safra existir (4). Isto elimina a geração dupla: só a etapa 4 gera, e ela lê `activePlayers'` **após** as saídas.

### 6.3 A equação (gerador único, dirigido por gap)

```
retiredCount   = Σ aposentadorias da temporada            (PLY-017)
activePlayers' = activePlayers − retiredCount             (após etapa 1)
targetActive   = clubes × 48                              (R-49: 23 elenco + 10 mercado + 15 base)
band           = 0.10 × targetActive                      (banda de tolerância, INV-7)
gap            = targetActive − activePlayers'
capTemporada   = round(0.08 × activePlayers')             (teto anti-explosão por temporada)

generationNeed =
    se gap >  band :  clamp(gap, 0, capTemporada)                          // DÉFICIT real → controlador domina
    se |gap| ≤ band :  clamp(min(gap, 1.25 × retiredCount), 0, capTemporada) // REGIME → reposição limitada a 1,25/aposentado
    se gap < −band :  0                                                     // EXCEDENTE → não gera; atrito natural reduz
```

**Distribuição da safra** (`PLY-002`/R-44), reponderada por déficit, dentro de `generationNeed`:

```
safra_faixa_i    = generationNeed × ( gap_faixa_i / Σ gap_faixa )     // gap por faixa etária (pirâmide R-44)
safra_posição_j  = reponderar por déficit de posição (GK 8% … versáteis 8%, ajustado ao gap por posição)
safra_qualidade  = distribuição R-44 (comuns 60% … joias raras 1%), nível médio subindo lentamente com maturidade
```

### 6.4 Precedência: controlador de alvo > reposição 1,25

A regra que fecha B-04 na parte demográfica:

> **O controlador por gap tem precedência sobre a reposição por aposentado.** A fração 1,25/aposentado **não é aditiva**: ela só age como **teto de ritmo** quando a população está **dentro da banda** (regime estável), evitando que uma safra de reposição ultrapasse o necessário. Em **déficit real** (abaixo da banda), o controlador gera até `capTemporada`, ignorando o teto de 1,25 — é preciso encher a pirâmide. Em **excedente** (acima da banda), **não se gera nada**: o atrito natural (aposentadorias futuras) reduz a população em direção ao alvo. Assim, o mesmo número "1,25" que a auditoria flagrou passa a ser um **limite superior condicional**, não uma fonte independente de jogadores.

### 6.5 Clamps que impedem descontrole por muitas temporadas

- **`generationNeed ≥ 0`** — nunca negativo: não se "desgera" jogador; excedente é corrigido por atrito, não por remoção forçada (preserva `INV-6`: todo jogador tem origem e não some sem evento).
- **`capTemporada` (≤ 8% de `activePlayers'`)** — nenhuma temporada infla a população mais que isso, mesmo em déficit agudo; o gap grande é fechado ao longo de várias temporadas, monotonicamente (coerente com §14.3–14.5: o universo envelhecido converge por volta da 5ª temporada).
- **Banda dura `INV-7`** — `activePlayers ∈ [targetActive·0.90, targetActive·1.10]` é a invariante de equilíbrio populacional; o controlador é o mecanismo que a mantém.
- **Clamp por coorte** — cada `safra_faixa_i ∝ gap_faixa_i` e nenhuma coorte pode ultrapassar seu alvo de pirâmide (R-44) além da tolerância, evitando "bolhas etárias" que reapareceriam décadas depois.
- **Determinismo/idempotência** — a geração usa seed de temporada; reexecutar a virada não gera safra duplicada (mesma disciplina de `commandId` da §5.3).

Consequência de longo prazo: a soma de `generationNeed` ao longo do tempo tende ao total de saídas (aposentadorias + atrito), com a oferta de jogadores oscilando **dentro** da banda de `INV-7` — sem a deriva de +25% por temporada que o modelo aditivo produzia.

---

## 7. Recomendações consolidadas (R-109..R-115)

Todas **RATIFICADAS em 2026-07-13**, estendendo a [Série R](../99-decisoes/registro-de-decisoes.md). Nenhuma edita schema/catálogo; propõem refinamentos a esses artefatos.

- **R-109 — Classes de fluxo e contas sistêmicas.** Todo movimento monetário é **transferência** (conserva), **faucet** (cria) ou **sink** (destrói), pela regra "modelado como saldo" (§2.1). Adotar o catálogo de contas `SYS_*` (§2.2) como contraparte obrigatória de todo faucet/sink. Corrigir a leitura de §14.7: fluxos entre clubes conservam.
- **R-110 — Ledger de partidas dobradas como forma canônica.** Faucets, sinks e transferências projetam-se no razão; saldo é derivado e reversão cria novo lançamento. `FinancialAccount.ownerScope = WORLD` atende as `SYS_*`.
- **R-111 — Desdobrar INV-3.** Substituir `INV-3` por **INV-3a** (balanço do lançamento: Σdébitos = Σcréditos) + **INV-3b** (oferta rastreável: `Δ totalMoney = Σ faucets − Σ sinks`). A conservação vira invariante de **rastreabilidade**, não proibição de receita/despesa sistêmica (§3.3).
- **R-112 — Oferta derivada e controle por duas alavancas.** `totalMoney = Σ saldos de contas de clube`, derivável do razão; o controle de inflação (`ECO-012`, banda R-49 ±15%) age **só** sobre magnitudes de faucet/sink (§4). Transferências nunca movem a oferta.
- **R-113 — Relógio único de progressão (accrual vs. aplicação).** Estados aplicam-se pós-partida; atributos estruturais **apenas acumulam** em `PlayerDevelopmentAccrual` e são aplicados **uma vez** no passo 7 da virada (`CMP-005`), com clamps `capGanho/capPerdaTemporada` (1ª passada ±6) e teto de potencial (`PLY-006`). Reler §5 do doc de multiplayer como "acumula", não "aplica" (§5).
- **R-114 — Ordem de operações do controlador populacional.** Fixa `aposentadorias → regressão/progressão → recomputar estado → geração → balanceamento de mercado` dentro de `CMP-005`, sem reentrância; a geração lê `activePlayers'` após as saídas (§6.2).
- **R-115 — Gerador único e precedência sobre a reposição 1,25.** Um só gerador, dirigido por gap (equação §6.3). A fração 1,25/aposentado é **teto de ritmo em regime**, não fonte aditiva; controlador de alvo tem precedência; clamps `capTemporada` (≤8%/temporada), `generationNeed ≥ 0` e banda `INV-7` impedem crescimento/encolhimento descontrolado (§6.4–6.5).

---

## 8. Rastreabilidade

| Tema | Regras/invariantes do catálogo | Documentos de origem |
|---|---|---|
| Economia fechada, oferta, inflação | `ECO-002`, `ECO-003`, `ECO-012`, `ECO-013`, `ECO-014` · `INV-3` (→ INV-3a/3b) | [economia §14–15](../01-game-design/03-economia.md) |
| Ledger de partidas dobradas | (schema) `FinancialAccount`/`FinancialJournalEntry`/`FinancialJournalLine` | [modelo de dados §6.3.9](./02-modelo-de-dados.md) |
| Progressão (evolução/regressão) | `PLY-004`, `PLY-006`, `PLY-007`, `PLY-008`, `PLY-010` · `F(evolução)` | [sistema de jogadores §4–6](../01-game-design/02-sistema-de-jogadores.md), [temporada §6](../01-game-design/06-temporada-e-competicoes.md), [multiplayer §5](./03-multiplayer-e-mundos.md) |
| Demografia/população | `PLY-002`, `PLY-017`, `CMP-005` · `INV-6`, `INV-7` | [economia §14.4–14.9](../01-game-design/03-economia.md) |
| Balanceamento de 1ª passada relacionado | R-43, R-44, R-49 (números de largada, pirâmide, alvos do universo) | [Série R](../99-decisoes/registro-de-decisoes.md), [economia §14](../01-game-design/03-economia.md) |
| Achados da auditoria endereçados | B-04 (semântica única), C-06 (ledger/caixa editável), C-11 (causalidade) | [BACKLOG-PENDENCIAS](../BACKLOG-PENDENCIAS.md) |

> **R-109..R-115 estão ratificadas.** A topologia econômica e seus invariantes são normativos; bandas e coeficientes mudam somente por calibração e ruleset versionado.
