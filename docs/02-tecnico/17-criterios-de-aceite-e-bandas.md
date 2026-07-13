# Critérios de Aceite e Bandas de Simulação/Economia

> **Status:** CANÔNICO (Série R ratificada em 2026-07-13) · **Bloqueador endereçado:** passo **15** da ordem de correção ([`../BACKLOG-PENDENCIAS.md`](../BACKLOG-PENDENCIAS.md)) — *"Adicionar critérios de aceitação mensuráveis e bandas de simulação/economia"* — respondendo à nota **Testabilidade 3,0** (§16, *"faltam oráculos, resultados esperados, bandas e critérios por fluxo/tela"*) e ao risco **"QA sem oráculo"** (§12) · **Liga ao passo 16** (nova auditoria de prontidão) via [gate de promoção](#8-gate-de-promoção-a-canônico) · **Fontes derivadas:** [`./05-catalogo-de-regras-e-formulas.md`](./05-catalogo-de-regras-e-formulas.md) (F1–F21, INV-1..INV-37, §2.4 Série R), [`../99-decisoes/registro-de-decisoes.md`](../99-decisoes/registro-de-decisoes.md) (R-34 lote de calibração; R-88 testes de equilíbrio; R-41..R-49 economia; R-58..R-63 temporada), [`./13-ledger-e-conservacao-economica.md`](./13-ledger-e-conservacao-economica.md) (INV-3a/3b, oferta, controlador demográfico), [`./15-ruleset-e-replay.md`](./15-ruleset-e-replay.md) (determinismo/`resultHash`), [`./09-operacao-e-admin-do-mundo.md`](./09-operacao-e-admin-do-mundo.md) (§6 testes de equilíbrio, R-88), [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) (§12 estratégia de testes), [`../01-game-design/03-economia.md`](../01-game-design/03-economia.md) (§6, §14–15), [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md) (§18), [`../01-game-design/06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md) · **Revisão:** 2026-07-12

Este documento transforma a **estratégia de testes** (dez tipos, já definida em [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) §12) em **oráculos executáveis**: para cada módulo, *o que é "pronto"* (critério de aceite mensurável), *qual faixa numérica o motor/economia/demografia deve respeitar* (banda) e *quando um conjunto de regras pode ser promovido a `CANÔNICO`* (gate). Ele fecha a lacuna apontada pela auditoria — a taxonomia de testes existe, mas **sem oráculos, resultados esperados e bandas** os testes não podem falhar por um motivo objetivo.

> **Modo CANÔNICO.** Invariantes, oráculos e bandas de primeira passada foram ratificados em R-116..R-124. R-34/R-88 medem e calibram a baseline durante a implementação; não são decisões documentais pendentes.

## Sumário

1. [O problema em uma frase](#1-o-problema-em-uma-frase)
2. [Convenções: oráculo, critério, banda, gate](#2-convenções-oráculo-critério-banda-gate)
3. [Metodologia dos lotes (R-34 motor · R-88 mundos)](#3-metodologia-dos-lotes-r-34-motor--r-88-mundos)
4. [Critérios de aceitação mensuráveis por módulo](#4-critérios-de-aceitação-mensuráveis-por-módulo)
5. [Bandas de simulação (oráculos do motor)](#5-bandas-de-simulação-oráculos-do-motor)
6. [Bandas de economia (multi-temporada)](#6-bandas-de-economia-multi-temporada)
7. [Bandas demográficas](#7-bandas-demográficas)
8. [Gate de promoção a CANÔNICO](#8-gate-de-promoção-a-canônico)
9. [Recomendações consolidadas (R-116..R-124)](#9-recomendações-consolidadas-r-116r-124)
10. [Rastreabilidade](#10-rastreabilidade)

---

## 1. O problema em uma frase

A auditoria deu **3,0 em Testabilidade** com um diagnóstico preciso: *"Há boa taxonomia de testes, mas faltam oráculos, resultados esperados, bandas e critérios por fluxo/tela"* ([`../BACKLOG-PENDENCIAS.md`](../BACKLOG-PENDENCIAS.md) §16). Um teste sem **oráculo** (o resultado esperado) não distingue "passou" de "não sei"; um motor estocástico sem **banda** não distingue "realista" de "quebrado"; e uma mudança de regra sem **gate** não distingue "pode ir para mundos vivos" de "vai inflar a economia na 40ª temporada". Este documento entrega os três: **critérios** (determinísticos, resultado exato esperado), **bandas** (estatísticos, faixa aceitável) e o **gate** (a condição booleana de promoção).

---

## 2. Convenções: oráculo, critério, banda, gate

| Termo | Definição operacional |
|---|---|
| **Oráculo** | A fonte-de-verdade do resultado esperado de um teste: um valor exato (replay: `resultHash`), uma projeção reconstruível (standings a partir de `MatchFinished`), uma constraint (Σdébitos=Σcréditos) ou uma faixa (banda). |
| **Critério de aceite (CA-\*)** | Condição **determinística** e binária de "pronto", escrita no estilo **Given/When/Then**. Passa em **100%** dos casos ou o módulo **não** está pronto. Tolerância, quando não indicada, é **zero**. |
| **Banda (BS/BE/BD-\*)** | Faixa numérica aceitável para uma métrica **estatística** (emergente de muitas execuções). A métrica agregada do lote deve cair **dentro** da banda. Bandas são de **1ª passada** e recalibradas pelo lote. |
| **Gate de promoção** | Condição booleana única que autoriza um `RuleSetVersion` a virar `CANÔNICO` e sair para mundos vivos: **todas** as bandas dentro do alvo **e** nenhuma invariante violada **e** determinismo preservado **e** sem regressão (ver [§8](#8-gate-de-promoção-a-canônico)). |
| **Seed fixa** | Semente de RNG gravada no manifesto ([`./15-ruleset-e-replay.md`](./15-ruleset-e-replay.md) §3, `pcg32`), que torna cada execução do lote **reproduzível bit-a-bit** — pré-condição de qualquer oráculo. |
| **Checkpoint** | Instante de medição de banda multi-temporada: fim de cada temporada simulada (o motor de virada `CMP-005` é a fronteira natural). |

**Como ler as tabelas.** Critérios (§4) têm colunas *ID · Given/When/Then · Oráculo (como medir) · Invariante/Regra · Tipo de teste* (nomes de [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) §12). Bandas (§5–7) têm *ID · Métrica · Banda de 1ª passada · Âncora (real/regra) · Onde falha*. Todo `INV-##` remete ao [catálogo §5](./05-catalogo-de-regras-e-formulas.md#5-invariantes).

---

## 3. Metodologia dos lotes (R-34 motor · R-88 mundos)

Dois lotes complementares produzem os números. Ambos usam **seeds fixas** e são **determinísticos**; a diferença é a escala de tempo observada.

| Dimensão | **Lote de motor (R-34)** | **Lote de mundos (R-88)** |
|---|---|---|
| Objeto | uma **partida** isolada, com entradas controladas | um **mundo** completo evoluindo por temporadas |
| Amostra (1ª passada) | **~10.000 partidas por cenário** | **≥ 1.000 mundos × ≥ 10 temporadas** (estender a 50 e 100 para bandas de longo prazo) |
| Cenários | equilibradas · favorito×azarão · chuva · pressão alta · comissão nível 1 vs 5 · **online e offline** (R-34) | mundos com composição de liga variada, seeds distintas |
| Alimenta | bandas de **simulação** ([§5](#5-bandas-de-simulação-oráculos-do-motor)); calibração de `F1`–`F21` (`R-15..R-24`) | bandas de **economia** ([§6](#6-bandas-de-economia-multi-temporada)) e **demografia** ([§7](#7-bandas-demográficas)); comportamento emergente |
| Origem | R-34 ([`../99-decisoes/registro-de-decisoes.md`](../99-decisoes/registro-de-decisoes.md)), [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md) §18 | R-88 ([`./09-operacao-e-admin-do-mundo.md`](./09-operacao-e-admin-do-mundo.md) §6) |

**Regras comuns dos dois lotes:**

1. **Determinismo primeiro.** Antes de medir qualquer banda, o lote valida `INV-27`/`INV-28`: re-executar o mesmo manifesto reproduz o `resultHash` em **100%**. Se não reproduz, é bug bloqueante — o lote **para** e nenhuma banda é medida ([`./15-ruleset-e-replay.md`](./15-ruleset-e-replay.md) §4).
2. **Invariantes durante, não só no fim.** `INV-1..INV-37` são verificadas em **todo** checkpoint; uma única violação **invalida** o lote (não é "outlier estatístico").
3. **Amostra fixa por seed-set.** O mesmo conjunto de seeds é reusado entre versões de ruleset para que a comparação A/B (regressão) seja pareada, não ruidosa.
4. **Banda mede o agregado, não o caso.** Uma partida 7×0 não viola a banda de goleadas; a **frequência** de goleadas no lote é que precisa cair na faixa.

---

## 4. Critérios de aceitação mensuráveis por módulo

Nove módulos, no estilo Given/When/Then. Todos **determinísticos** (100% ou reprova). As sementes das linhas em *itálico* vêm da tabela *"Critérios de aceitação mínimos por módulo"* do backlog (§11) e da matriz de rastreabilidade (§11), aqui tornadas mensuráveis.

### 4.1 Regras (invariantes, relógio, idempotência, homologação)

| ID | Given / When / Then | Oráculo (como medir) | Inv./Regra | Teste |
|---|---|---|---|---|
| CA-REG-01 | *Dado* duas réplicas do scheduler no mesmo mundo, *quando* ambas tentam avançar o relógio, *então* exatamente **1** tick oficial e **1** `fencing epoch` são produzidos. | contagem de `WorldClock` ticks = 1; `runtimeEpoch`/`worldSequence` monotônico sem gap/duplicata | INV-31 | Concorrência |
| CA-REG-02 | *Dado* um `commandId` já executado, *quando* reenviado, *então* devolve o resultado anterior **sem** reexecutar efeito. | 0 efeitos colaterais no 2º envio; `CommandExecution.unique(commandId)` | INV-30 | Concorrência/Propriedade |
| CA-REG-03 | *Dado* um mundo em `PAUSED`/`FINISHED`/`ARCHIVED`/`READ_ONLY`, *quando* chega escrita de jogador, *então* retorna `WORLD_READ_ONLY` e **nada** muda. | 0 mutações de estado; código de erro exato | INV-35 | Contrato |
| CA-REG-04 | *Dado* qualquer transição não listada nas máquinas de estado (doc 14), *quando* solicitada, *então* é **rejeitada**; terminais são absorventes. | 0 transições fora do grafo; `RETIRED/PROCESSED/ARCHIVED/COMPLETED` não saem | INV-32/INV-2/INV-4 | Propriedade |
| CA-REG-05 | *Dado* um campeão em campo, *quando* a competição ainda não homologou, *então* premiação e registro oficial **não** ocorrem (título fica `PROVISIONAL`). | ordem interna da SAGA-02; 0 pagamentos pré-homologação | INV-33 (CMP-013/014) | E2E |
| CA-REG-06 | *Dado* o motor de virada, *quando* um atributo estrutural muda, *então* muda **só** no passo 7 (accrual pós-partida, buffer zerado na aplicação). | 1 aplicação por atributo/temporada; buffer `PlayerDevelopmentAccrual` consumido | INV-29 (R-113) | Propriedade |

### 4.2 Economia (ledger, faucet/sink, reservas)

| ID | Given / When / Then | Oráculo (como medir) | Inv./Regra | Teste |
|---|---|---|---|---|
| CA-ECO-01 | *Dado* qualquer `FinancialJournalEntry` `POSTED`, *quando* somados os débitos e créditos por moeda, *então* **Σdébitos = Σcréditos** em **100%** dos lançamentos. | residual do lançamento = 0 | INV-3a | Propriedade |
| CA-ECO-02 | *Dado* um intervalo entre dois checkpoints, *quando* medida a variação da oferta, *então* **Δ totalMoney = Σ faucets − Σ sinks** (residual = 0). | reconciliação de oferta (doc 13 §4) | INV-3b | Propriedade |
| CA-ECO-03 | *Dado* uma transferência interna clube→clube, *quando* liquidada, *então* a oferta global **não** muda (0 faucet/sink). | ΔtotalMoney da transferência = 0 | INV-3b (R-109) | Propriedade |
| CA-ECO-04 | *Dado* qualquer criação/destruição de caixa de clube, *quando* registrada, *então* passa por uma conta **`SYS_*` nomeada**; movimentos não classificados = **0**. | contagem de lançamento sem classe faucet/sink/transferência = 0 | INV-3b (R-109) | Propriedade |
| CA-ECO-05 | *Dado* o caixa de um clube, *quando* consultado, *então* é **derivado do razão** (`saldo = Σ lançamentos`); não existe campo de caixa editável isolado. | ausência de coluna mutável; `saldo` reconciliável (fecha C-06) | INV-8 | Contrato |
| CA-ECO-06 | *Dado* uma correção financeira, *quando* aplicada, *então* é um **novo** lançamento com `reversalOfJournalEntryId`; nunca `UPDATE`/`DELETE` do original. | razão append-only; 0 mutações destrutivas | INV-13 | Propriedade |
| CA-ECO-07 | *Dado* um orçamento com reserva ativa, *quando* uma 2ª reserva tenta comprometer o mesmo valor, *então* é **bloqueada**; `SetBudget` nunca desfinancia reserva ativa. | `FinancialReservation`; `BUDGET_BELOW_COMMITTED` | INV-10/INV-11 | Concorrência |

### 4.3 Simulação (motor de partida, replay, online/offline)

| ID | Given / When / Then | Oráculo (como medir) | Inv./Regra | Teste |
|---|---|---|---|---|
| CA-SIM-01 | *Dado* o mesmo `(snapshot, ruleset, seed, commands ordenados)`, *quando* re-executado, *então* produz o **mesmo `resultHash`** em **100%** dos replays. | `K(I,R,A,s,C)` reproduz `resultHash` (doc 15 §4) | INV-27/INV-28 | Motor/golden |
| CA-SIM-02 | *Dada* a mesma entrada, *quando* rodada **online** (ticks) e **offline** (bloco), *então* o `resultHash` é **idêntico**. | equivalência `O = K(...)`; bloco = mesmos ticks sem stream (R-143) | INV-27 | Motor/golden |
| CA-SIM-03 | *Dado* um command ao vivo que chegou **após** o fechamento da janela de aceitação, *quando* processado, *então* **não** altera o estado da partida. | `matchSequence` atribuído no aceite; comando vencido descartado | MAT-014/INV-2 | Concorrência |
| CA-SIM-04 | *Dada* uma partida interrompida por crash, *quando* retomada de checkpoint, *então* **nenhum** gol, cartão ou substituição é perdido ou duplicado. | reconciliação de `MatchEvent.eventSequence`; 0 perda/duplicata | INV-20/INV-30 | Recuperação |
| CA-SIM-05 | *Dada* a versão do motor `engineVersion`, *quando* uma seed conhecida roda, *então* reproduz o **golden file** de eventos daquela versão. | golden files por `engineVersion`; mudança intencional bumpa versão | (doc 15 §6.2) | Motor/golden |
| CA-SIM-06 | *Dado* um resultado oficial, *quando* uma partida termina, *então* existe **1** runtime ativo e **1** resultado oficial por partida. | `MatchRuntime` (1/partida, `runtimeEpoch`); unique result version | INV-20 | Concorrência |

### 4.4 Competições (calendário, rollover, standings, disciplina, inscrição)

| ID | Given / When / Then | Oráculo (como medir) | Inv./Regra | Teste |
|---|---|---|---|---|
| CA-CMP-01 | *Dado* um calendário gerado, *quando* validado, *então* **nenhum** fixture viola descanso mínimo, prioridade de competição ou disponibilidade do local. | solver de conflito; 0 violações de descanso/prioridade/venue | (R-58) | Propriedade |
| CA-CMP-02 | *Dados* os `MatchFinished` processados, *quando* a tabela é projetada, *então* é **reconstruível e determinística** a partir só dos resultados. | `Standings` = projeção de `MatchFinished`; rebuild idêntico | INV-5 | Propriedade |
| CA-CMP-03 | *Dado* um empate de **três** clubes (ou vaga duplicada), *quando* aplicado o desempate, *então* a resolução é **determinística** e reproduzível. | mesma ordem para o mesmo input; 0 ambiguidade | (CMP-003) | Propriedade |
| CA-CMP-04 | *Dado* um passo do rollover que falha, *quando* o motor de virada é retomado, *então* **não** duplica promoção, prêmio nem geração de safra. | Process Manager idempotente; checkpoints por passo | INV-30/INV-36 | Recuperação |
| CA-CMP-05 | *Dado* um jogador suspenso/lesionado/não inscrito/transferido, *quando* a escalação é congelada no pré-jogo, *então* ele **não** entra (11 elegíveis ou W.O. evitado). | `PRE_MATCH` (MAT-024); `PLAYER_INELIGIBLE_FOR_MATCH` | INV-25 | Contrato |
| CA-CMP-06 | *Dada* uma baixa de contrato (transferência/expiração/aposentadoria), *quando* processada, *então* a **inscrição** correspondente é baixada (contratar ≠ poder jogar). | reação a `TransferSigned`/`ContractExpired`/`PlayerRetired` | INV-26 (CMP-018) | Propriedade |
| CA-CMP-07 | *Dados* cartões acumulados, *quando* atingem o limiar da competição, *então* a suspensão é aplicada e **limpa** de forma determinística (sem carry-over indevido). | máquina disciplinar por competição; acúmulo/limpeza reproduzível | (A-13) | Propriedade |

### 4.5 IA (decisão, autoridade, conhecimento permitido)

| ID | Given / When / Then | Oráculo (como medir) | Inv./Regra | Teste |
|---|---|---|---|---|
| CA-IA-01 | *Dados* os mesmos inputs e seed, *quando* a IA decide, *então* produz a **mesma decisão e o mesmo log** (auditável). | determinismo por seed; `AIDecision` reproduzível | INV-27 | Motor/golden |
| CA-IA-02 | *Dada* uma ação da IA, *quando* executada, *então* passa pelos **mesmos commands e invariantes** de um humano; **nunca** escreve agregado alheio. | mesmos handlers/guards; 0 SQL cruzado | INV-17 | Arquitetura |
| CA-IA-03 | *Dada* informação oculta (potencial, faixa de scouting), *quando* a IA decide, *então* consulta **somente a projeção autorizada** (não a verdade). | acesso restrito a projeção; informação oculta nunca vaza ao cliente | (A-11, PLY-012) | Contrato |
| CA-IA-04 | *Dado* o balanceamento mundial, *quando* a IA age, *então* ajusta **somente parâmetros sistêmicos transparentes** (geração/regras futuras), **nunca** direciona crise/lesão a indivíduo. | escopo do ajuste = geração/regra; 0 mutação individual dirigida | (A-11, R-86) | Propriedade |
| CA-IA-05 | *Dada* uma decisão offline da IA tática, *quando* aplicada, *então* usa o **mesmo kernel** e o mesmo timestep do online (sem motor "resumido" próprio). | `O = K(...)` (R-143); paridade online/offline | INV-27 | Motor/golden |

### 4.6 Dados (persistência histórica, isolamento de mundo, segurança/privacidade)

| ID | Given / When / Then | Oráculo (como medir) | Inv./Regra | Teste |
|---|---|---|---|---|
| CA-DAT-01 | *Dado* o histórico de um mundo, *quando* reconstruído, *então* **standings, ledger e evolução** são reconstruíveis **sem** depender dos valores atuais. | rebuild a partir de eventos/lançamentos; igualdade com o oficial | INV-5/INV-8 | Propriedade |
| CA-DAT-02 | *Dada* qualquer relação world-scoped, *quando* gravada, *então* usa chave `(gameWorldId, id)`; **nenhum** vínculo atravessa mundos. | FK composta; teste de isolamento negativo (fecha C-05) | INV-15 | Propriedade |
| CA-DAT-03 | *Dado* um agregado, *quando* escrito, *então* **só** o contexto dono grava; os demais reagem por evento ou leem por query. | teste de acesso; 0 escrita cruzada | INV-14 | Arquitetura |
| CA-DAT-04 | *Dada* uma correção, *quando* registrada na auditoria, *então* **cria novo** `GameAuditLog` encadeado por hash; nunca apaga o anterior. | trilha append-only; cadeia de hash íntegra | INV-34 | Propriedade |
| CA-DAT-05 | *Dado* um refresh token reutilizado, *quando* detectado, *então* a **família** é revogada; um aprovador **não** pode ser o proponente. | detecção de replay de token; segregação de funções (R-95/R-87) | (§11 Segurança) | Segurança/Contrato |
| CA-DAT-06 | *Dada* uma exclusão de conta, *quando* processada, *então* respeita retenção/legal hold e **anonimiza** sem apagar fatos competitivos. | dado pessoal removido; fato competitivo preservado | (§11 Privacidade) | E2E |

### 4.7 Jogadores (geração, progressão, treino, medicina, população pontual)

| ID | Given / When / Then | Oráculo (como medir) | Inv./Regra | Teste |
|---|---|---|---|---|
| CA-PLY-01 | *Dada* uma alteração de atributo, *quando* aplicada, *então* registra **valor anterior, posterior, causa, ruleset e momento**. | `PlayerDevelopmentHistory` completo; 0 delta sem causa (fecha C-11) | INV-29 (PLY-010) | Propriedade |
| CA-PLY-02 | *Dado* um `Player`, *quando* existe, *então* existe um `PlayerGenerated` correspondente (todo jogador tem origem). | teste populacional; único ponto de criação = job de geração | INV-6 | Propriedade |
| CA-PLY-03 | *Dada* a mesma seed de temporada, *quando* a safra é gerada, *então* produz a **mesma população** (determinístico); reprocessar a virada **não** duplica a safra. | seed de temporada; idempotência por `commandId` | INV-36/INV-30 | Motor/golden |
| CA-PLY-04 | *Dada* uma sessão de treino incompatível com jogo/lesão, *quando* agendada, *então* **falha explicitamente**; job repetido **não** duplica efeito. | guard de conflito; erro explícito; idempotência | (§11 Training) | Contrato/Concorrência |
| CA-PLY-05 | *Dada* uma fase médica, *quando* reprocessada (retry), *então* **não** duplica a fase; o retorno respeita o guard de recuperação. | máquina médica; retry idempotente | (§11 Medical) | Recuperação |
| CA-PLY-06 | *Dado* um jogador no teto de potencial, *quando* acumula evidência, *então* **não** sobe além de `potencialFuncional`/`remainingPotential`. | clamp `PLY-006`; subida ≤ `capGanhoTemporada` (±6) | INV-29 (R-113) | Propriedade |
| CA-PLY-07 | *Dado* um menor de idade, *quando* movimentado/escalado/negociado, *então* respeita as restrições por idade/vínculo. | guard `PLY-019` em empréstimo/transferência de jovem | INV-37 | Contrato |

### 4.8 Mercado (transferências, contratos, empréstimos)

| ID | Given / When / Then | Oráculo (como medir) | Inv./Regra | Teste |
|---|---|---|---|---|
| CA-MKT-01 | *Dadas* rejeição, expiração, falha médica **ou** cancelamento de uma proposta, *quando* qualquer uma ocorre, *então* a reserva é liberada **exatamente uma vez**. | ledger de reserva; 0 reserva presa, 0 dupla liberação | INV-10 | Concorrência |
| CA-MKT-02 | *Dados* dois aceites concorrentes pelo mesmo jogador, *quando* processados, *então* geram **no máximo um** acordo. | `TransferCase` `expectedVersion`; `≤1` acordo | INV-23 | Concorrência |
| CA-MKT-03 | *Dado* um acordo de transferência, *quando* liquidado, *então* o pagamento ocorre **uma única vez** (idempotência por `commandId`). | `TRANSFER_PAYMENT_NOT_DUPLICATED` | INV-12 | Concorrência |
| CA-MKT-04 | *Dado* um jogador, *quando* consultados seus vínculos, *então* existe **≤1** contrato principal ativo; `SquadMembership`/`currentClubId` são **projeções** do contrato. | exclusion constraint em `PlayerContract`; reconciliação projeção↔contrato | INV-1/INV-16 | Propriedade |
| CA-MKT-05 | *Dada* uma contraproposta, *quando* enviada, *então* cria **nova** `TransferOfferVersion`; nunca sobrescreve a anterior. | versionamento de oferta; histórico preservado | INV-23 | Propriedade |
| CA-MKT-06 | *Dado* um empréstimo, *quando* encerrado, *então* recall/retorno/opção/obrigação são **determinísticos** e a liberação médica é **server-side**. | máquina de loan; `medicalCleared` server-side (fecha C-07) | (ECO-007/017) | E2E |

### 4.9 UX (offline, realtime, estados, acessibilidade, onboarding)

| ID | Given / When / Then | Oráculo (como medir) | Inv./Regra | Teste |
|---|---|---|---|---|
| CA-UX-01 | *Dado* um command **não permitido** offline, *quando* o usuário o dispara sem conexão, *então* **nunca** entra na fila; um command **expirado** exige reconfirmação. | whitelist + TTL de intent; 0 command vencido reenviado | (A-04) | Contrato |
| CA-UX-02 | *Dado* um evento realtime **duplicado**, *quando* recebido, *então* **não** duplica a UI; um **gap** de sequência recupera ou força snapshot. | dedupe por `matchSequence`; recuperação de gap | (§11 Realtime) | Contrato |
| CA-UX-03 | *Dada* uma reserva de vaga **expirada**, *quando* o usuário tenta ativar, *então* **não** ativa; retry **não** cria 2ª reserva; revisão pendente **não** abre a Home. | TTL de reserva; `≤1` reserva; gate de Home | INV-19 (R-53) | E2E |
| CA-UX-04 | *Dado* um command assíncrono, *quando* aceito/pendente/falho, *então* a tela reflete o **estado específico** (aceito/pendente/falhou/expirado/bloqueado). | estados globais de query/command instanciados por tela | (§10 UX) | E2E |
| CA-UX-05 | *Dado* um fluxo crítico com drag/swipe, *quando* percorrido só por toque/teclado, *então* é **completável** sem drag/swipe; o leitor anuncia mudanças sem inundar. | alternativa a gesto; semântica de placar/countdown/feed | (§10 Acessibilidade, M-09) | Acessibilidade |
| CA-UX-06 | *Dada* uma ação de alto risco (dívida, contrato comercial, identidade, exclusão), *quando* disparada, *então* exige `HighRiskConfirm`; o servidor valida mesmo com UI stale. | confirmação consistente; validação server-side | (§10 Prevenção de erro) | E2E |

> **Whitelist e TTL de intent offline (A-04/R-153) — oráculo de CA-UX-01.** Offline é leitura por padrão; somente a whitelist fechada entra na fila. Tudo o mais é bloqueado no cliente.
>
> | Enfileira offline? | Commands | Regra |
> |---|---|---|
> | **✅ Whitelist** | `SetNotificationPreferences`, `SetOfflinePlan`, `SetTrainingPlan`, `SetLineup`, `SetTactics`, `SetGamePlan`, `SetPlayerCareerPlan`, `SetTransferStrategy` | Reenvio com `idempotencyKey` + `expectedVersion`; mudança relevante vira reconfirmação. |
> | **⛔ Nunca enfileira** | pagamento, contrato, transferência/empréstimo, demissão, obra, crédito, inscrição, abandono, ação ao vivo ou admin | Exige conexão e validação server-side no ato; disparo offline retorna erro local, sem fila. |
>
> **TTL de intent — R-153:** uma intent expira no menor entre **15 minutos reais** e o prazo do domínio. Ao expirar, ou ao detectar versão/custo/elegibilidade/lock alterado, exige reconfirmação explícita. Oráculo de CA-UX-01: `0` command fora da whitelist enfileirado e `0` command vencido reenviado sem reconfirmação.

> **Cross-cutting (plataforma/segurança/carga).** Além dos 9 módulos, os gates exigem throughput, lag, p95/p99, capacidade de rollover e restore isolado de um mundo comprovados. Owners e evidências estão no [`BACKLOG-PENDENCIAS.md`](../BACKLOG-PENDENCIAS.md); metas estão nos docs 18–19. São pré-condições de produção, não decisões documentais abertas.

---

## 5. Bandas de simulação (oráculos do motor)

Medidas no **lote de motor (R-34)**, ~10.000 partidas/cenário. Números de **1ª passada** ancorados no futebol real (ligas de topo, ordem de grandeza) — os finais saem da calibração. Referência conceitual: [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md) §18, R-34.

### 5.1 Distribuição de placar (cenário equilibrado)

| ID | Métrica | Banda de 1ª passada | Âncora | Onde falha |
|---|---|---|---|---|
| BS-01 | Gols por partida (média, ambos os times) | **[2,4 ; 3,2]** (alvo ≈ 2,7) | futebol real ≈ 2,5–2,9 | motor "chuveiro de gols" ou travado |
| BS-02 | Frequência de **0×0** | **[5% ; 12%]** | real ≈ 7–9% | 0×0 raro demais / comum demais |
| BS-03 | Vitória do mandante | **[40% ; 50%]** | real ≈ 43–46% | mando irrelevante ou dominante |
| BS-04 | Empate | **[20% ; 32%]** | real ≈ 24–28% | empates de menos/mais |
| BS-05 | Vitória do visitante | **[24% ; 36%]** | real ≈ 28–32% | — |
| BS-06 | Vantagem de mando (win mandante − win visitante) | **[+5 p.p. ; +22 p.p.]** | real ≈ +12–16 p.p. | sem mando / mando exagerado |
| BS-07 | **Goleadas** (margem ≥ 4 gols) | **[2% ; 8%]** | real ≈ 3–5% | goleada banal ou impossível |
| BS-08 | Jogos de placar alto (total ≥ 6 gols) | **[2% ; 8%]** | real ≈ 3–6% | — |
| BS-09 | Cartões amarelos por partida | **[2,5 ; 5,5]** | real ≈ 3,5–4,5 | arbitragem frouxa/rígida demais |
| BS-10 | Cartões vermelhos por partida | **[0,10 ; 0,50]** | real ≈ 0,2–0,3 | expulsões de menos/mais |
| BS-11 | Novas lesões por partida (ambos os times) | **[0,3 ; 1,0]** | proposta (calibrar) | epidemia ou ausência de lesão |

### 5.2 Ausência de bola de neve (anti-snowball)

| ID | Métrica | Banda de 1ª passada | Racional | Onde falha |
|---|---|---|---|---|
| BS-12 | P(vitória \| marcou o 1º gol) | **[0,55 ; 0,72]** | 1º gol é vantagem **real**, não sentença | ≥0,72 ⇒ bola de neve; ≤0,55 ⇒ 1º gol inócuo |
| BS-13 | Correlação "gol antes do min. 15" × saldo final (point-biserial \|r\|) | **≤ 0,35** | gol cedo não deve **prever** o resultado | \|r\| alto ⇒ jogo decidido cedo |
| BS-14 | P(quem sofreu o 1º gol **não** perde: empata ou vira) | **≥ 0,28** | viradas precisam existir | < 0,28 ⇒ sem comeback, jogo morto |

### 5.3 Equilíbrio favorito × azarão e consistência entre ligas

| ID | Métrica | Banda de 1ª passada | Racional | Onde falha |
|---|---|---|---|---|
| BS-15 | Win do favorito, gap de overall ≈ 0 (espelho) | **[40% ; 45%]** cada lado | resto = empates | assimetria em jogo espelhado ⇒ viés |
| BS-16 | Win do favorito, gap ≈ +10 overall | **[55% ; 70%]** | favoritismo perceptível, não garantido | fora ⇒ força mal calibrada |
| BS-17 | Win do favorito, gap ≈ +20 overall | **[68% ; 82%]** | forte domina, mas azarão pontua | ≥ 95% ⇒ zerou a zebra |
| BS-18 | Piso da zebra: P(azarão **não** perde) com gap +20 | **≥ 12%** | upset sempre possível | < 12% ⇒ determinismo por força |
| BS-19 | Consistência entre ligas: desvio de BS-01/BS-02/BS-03 entre níveis de divisão (só escala de força muda) | **≤ ±10% relativo** | uma divisão inferior não é "outro esporte" | fora ⇒ regra depende do nível |
| BS-20 | **Equilíbrio de estilos** (R-88): win-rate de cada tática/estilo legal em confronto de força espelhada | **[45% ; 55%]** | nenhum estilo dominante nem inútil (relações contra permitidas) | fora ⇒ meta-jogo quebrado |
| BS-21 | Posse × resultado (posse perigosa ≠ posse): correlação(posse%, vitória) | **≤ 0,35** | "mais posse = vitória" é proibido (§5 do motor) | alto ⇒ posse vira determinante |
| BS-22 | Paridade online/offline: fração de replays com `resultHash` idêntico entre modos | **= 100%** (critério, não banda) | R-143 — kernel único | < 100% ⇒ bug bloqueante |

---

## 6. Bandas de economia (multi-temporada)

Medidas no **lote de mundos (R-88)**, ≥1.000 mundos × ≥10 temporadas (e 50/100 para deriva de longo prazo), a cada checkpoint de fim de temporada. Ancoradas em R-42, R-43, R-45, R-46 e R-49; oferta e reconciliação em [`./13-ledger-e-conservacao-economica.md`](./13-ledger-e-conservacao-economica.md).

| ID | Métrica | Banda de 1ª passada | Âncora | Onde falha |
|---|---|---|---|---|
| BE-01 | Reconciliação de oferta: \|`totalMoney` derivado − Σ saldos de contas de clube\| | **= 0** (tolerância zero) | INV-8 | ≠0 ⇒ caixa fantasma |
| BE-02 | Conservação de fluxo: \|Δ`totalMoney` − (Σfaucets − Σsinks)\| por temporada | **= 0** (tolerância zero) | INV-3b | ≠0 ⇒ dinheiro sem porta |
| BE-03 | `totalMoney` vs alvo (`clubes × caixaMédioAlvo`, R-49) | **∈ [alvo·0,85 ; alvo·1,15]** todo checkpoint | R-49 (±15%) | fora ⇒ controlador falhou |
| BE-04 | Deriva de longo prazo: CAGR de `totalMoney`/clube em 50 temporadas | **\|CAGR\| ≤ 3%/temporada** | sem hiperinflação/deflação | fora ⇒ runaway |
| BE-05 | Índice de preços gerais (acumulado) | **∈ [0,90 ; 1,30]**; var./temporada ±3% | R-46 | fura banda ⇒ inflação de preços |
| BE-06 | Índice salarial (acumulado) | **∈ [0,95 ; 1,50]**; var. 0…+5% | R-46 | fura ⇒ folha explode |
| BE-07 | Índice de transferências (acumulado) | **∈ [0,85 ; 1,60]**; var. −5…+8% | R-46 | fura ⇒ mercado descola |
| BE-08 | Índice de construção (acumulado) | **∈ [1,00 ; 1,40]**; var. +1…+4% | R-46 | — |
| BE-09 | Estabilidade de preço de mercado (cesta de qualidade constante), Δ/temporada sem choque | **∈ [−10% ; +12%]** | segue banda de inflação | fora ⇒ bolha/colapso de valor |
| BE-10 | Saúde financeira mediana da liga (`financialHealth`) | **∈ [45 ; 70]** em regime | R-42 (índice 0–100) | fora ⇒ liga rica/quebrada demais |
| BE-11 | Clubes em insolvência/reestruturação (share em regime) | **≤ 10%** | R-45 | > 10% sustentado ⇒ colapso |
| BE-12 | Clubes "excelente" (`financialHealth ≥ 90`) | **≤ 20%** | evita estado absorvente rico | > 20% ⇒ economia sem tensão |
| BE-13 | Folha/receita mediana (`wageBill/revenue`) | **∈ [0,45 ; 0,70]**; ≤15% dos clubes > 0,90 sustentado | R-42 (peso 0,18) | fora ⇒ insustentável |
| BE-14 | Ausência de estado absorvente | 0 mundos convergem a **todos** falidos **ou** **todos** ricos | equilíbrio dinâmico | convergência ⇒ economia morta |

---

## 7. Bandas demográficas

Medidas no **lote de mundos (R-88)** em 10, 50 e 100 temporadas. Ancoradas em R-44 (pirâmide/posição/qualidade) e no controlador demográfico de [`./13-ledger-e-conservacao-economica.md`](./13-ledger-e-conservacao-economica.md) §6 (INV-7, INV-36, R-114/R-115).

| ID | Métrica | Banda de 1ª passada | Âncora | Onde falha |
|---|---|---|---|---|
| BD-01 | População ativa vs alvo (`clubes × 48`) | **∈ [alvo·0,90 ; alvo·1,10]** todo checkpoint, até 100 temporadas | INV-7 (R-49) | fora ⇒ explosão/colapso |
| BD-02 | Pirâmide etária: share de cada coorte vs alvo R-44 (25/25/30/15/5) | **±5 p.p.** por coorte após ≥10 temporadas | R-44 | fora ⇒ pirâmide deformada |
| BD-03 | Idade média do universo, deriva em 50 temporadas | **≤ ±1,5 ano** | pirâmide estável | fora ⇒ universo envelhece/rejuvenesce |
| BD-04 | Geração por temporada | **≤ `capTemporada` (8% de `activePlayers'`)** e **`generationNeed ≥ 0`** | INV-36 (R-115) | fora ⇒ safra explosiva/negativa |
| BD-05 | Balanço de longo prazo: \|Σ gerados − Σ saídas (aposentadoria+atrito)\| / Σ saídas em 50 temporadas | **≤ 10%** | reposição segue saídas | fora ⇒ deriva populacional |
| BD-06 | Ausência de bolha etária: desvio-padrão temporal do share de cada coorte | **≤ 3 p.p.** | sem "onda" que reaparece décadas depois | alto ⇒ bolha geracional |
| BD-07 | Distribuição por posição vs alvo R-44 (GK 8% … versáteis 8%) | **±3 p.p.** por posição | R-44 | fora ⇒ falta/excesso de posição |
| BD-08 | Distribuição por qualidade vs alvo R-44 (60/25/10/4/1) | **±3 p.p.** por faixa | R-44 | fora ⇒ inflação/deflação de talento |
| BD-09 | Reposição por aposentado (a "1,25") atua **só** como teto de ritmo em regime, não como fonte aditiva | gerador **único**; 0 caso de dupla geração | INV-36 (R-115) | dupla geração ⇒ +25%/temporada |

---

## 8. Gate de promoção a CANÔNICO

O **gate** é a condição booleana única que autoriza um `RuleSetVersion` a virar `CANÔNICO` e ser promovido a mundos vivos (feature flag / versão de ruleset com **data efetiva**; partidas antigas permanecem na versão anterior — [`./15-ruleset-e-replay.md`](./15-ruleset-e-replay.md) §6.2). Consolida R-88 (*"uma mudança de regra só sai para mundos vivos se todas as métricas ficarem dentro da banda e nenhuma invariante falhar; regressões bloqueiam a promoção"*) e o critério de replay de R-34/R-143.

**Um `RuleSetVersion` é promovível se, e somente se, sobre o lote combinado (R-34 + R-88 com seeds fixas):**

| # | Condição de gate | Verificação | Bloqueia se |
|---|---|---|---|
| G1 | **Determinismo** | `resultHash` reproduzido em **100%** dos replays; golden files estáveis ou bumpados conscientemente (`engineVersion`) | qualquer não-reprodução (INV-27/INV-28) |
| G2 | **Bandas de simulação** | **todas** BS-01..BS-22 dentro do alvo | 1 banda fora |
| G3 | **Bandas de economia** | **todas** BE-01..BE-14 dentro do alvo; reconciliação BE-01/BE-02 = 0 | 1 banda fora / residual ≠ 0 |
| G4 | **Bandas demográficas** | **todas** BD-01..BD-09 dentro do alvo; INV-7 em todo checkpoint | 1 banda fora |
| G5 | **Zero invariante violada** | `INV-1..INV-37` sem violação em nenhum checkpoint do lote | 1 violação (não é outlier) |
| G6 | **Critérios de aceite** | **100%** dos CA-\* determinísticos (§4) verdes | 1 critério vermelho |
| G7 | **Sem regressão** | nenhuma banda que estava **dentro** na versão canônica atual sai **para fora** (comparação pareada por seed) | 1 regressão |
| G8 | **Pré-condições operacionais** | metas de carga (p95/p99, throughput, lag) e RPO/RTO **definidas e atingidas** (cross-cutting §4) | meta ausente/não atingida |

**Semântica do gate.** É **conjuntivo e absoluto**: `promovível = G1 ∧ G2 ∧ … ∧ G8`. Não há "quase pronto" — uma única banda fora ou uma única invariante violada reprova o lote inteiro. Ajustes de calibração agem **só** sobre geração/regras futuras via nova `RuleSetVersion` (R-86), nunca reescrevendo estado de mundo vivo. A promoção é **atômica por mundo** através da data efetiva.

**Ligação ao passo 16 (auditoria de prontidão).** O gate é a **pré-condição verificável por máquina**; a auditoria de prontidão (passo 16 da ordem de correção) é a **assinatura humana** que a consome. Um trecho derivado (F1–F21, coeficientes econômicos, bandas) só passa de `BASELINE RATIFICADA` a `CANÔNICO` **depois** de o gate fechar sobre a versão que o materializa — daí a ratificação congelar o primeiro ruleset canônico `v1.0.0` ([`./15-ruleset-e-replay.md`](./15-ruleset-e-replay.md) §6.3) sem reabrir a decisão de produto (a calibração muda número, não princípio).

---

## 9. Recomendações consolidadas (R-116..R-124)

Todas **RATIFICADAS em 2026-07-13**, estendendo a [Série R](../99-decisoes/registro-de-decisoes.md) (última entrada anterior: R-115). Nenhuma edita schema/catálogo/ledger; propõem oráculos, bandas e o gate a esses artefatos.

- **R-116 — Framework de oráculos e critérios de aceite.** Todo módulo tem critérios `CA-*` **determinísticos** no estilo Given/When/Then (§4), com oráculo explícito e tolerância zero salvo indicação. Resolve o risco "QA sem oráculo" (§12 do backlog) e a nota Testabilidade 3,0.
- **R-117 — Bandas de simulação do motor (BS-01..BS-22).** Adotar as faixas de 1ª passada de §5 como alvo do lote R-34 (~10.000 partidas/cenário), cobrindo distribuição de placar, anti-snowball, favorito×azarão, consistência entre ligas e equilíbrio de estilos. Calibração final no lote.
- **R-118 — Bandas de economia multi-temporada (BE-01..BE-14).** Adotar as faixas de §6 (reconciliação de oferta com tolerância zero; `totalMoney` ±15%; índices de inflação nas bandas de R-46; saúde financeira da liga; sem estado absorvente) como alvo do lote R-88.
- **R-119 — Bandas demográficas (BD-01..BD-09).** Adotar as faixas de §7 (INV-7; pirâmide ±5 p.p.; `capTemporada` ≤8%; balanço reposição↔saídas; sem bolha etária; gerador único) como alvo do lote R-88 em 10/50/100 temporadas.
- **R-120 — Gate de promoção a CANÔNICO.** Adotar o gate conjuntivo G1..G8 (§8): todas as bandas dentro do alvo **e** zero invariante violada **e** determinismo **e** critérios verdes **e** sem regressão **e** pré-condições operacionais ⇒ ruleset promovível, por versão com data efetiva.
- **R-121 — Metodologia dos lotes.** Consolidar R-34 (motor) e R-88 (mundos) como os **dois** lotes que alimentam as bandas, com seeds fixas, cenários de §3 e a regra "determinismo antes de banda; invariante durante".
- **R-122 — Determinismo/replay como aceite bloqueante.** `resultHash` reproduzido em 100% (CA-SIM-01/02, BS-22) é **pré-condição** de qualquer medição de banda; falha é bug bloqueante, não azar (deriva de R-143/INV-27).
- **R-123 — Reconciliação de ledger com tolerância zero.** BE-01/BE-02 (INV-3a/3b/INV-8) são aceites **exatos** (residual = 0), não bandas — a economia não "quase fecha".
- **R-124 — Matriz critério↔teste↔invariante.** Manter a rastreabilidade de §4/§10 (cada `CA-*`/banda ligado a um tipo de teste de [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) §12 e a um `INV-##`), consumida pela auditoria de prontidão (passo 16).

---

## 10. Rastreabilidade

| Tema | IDs deste doc | Regras/invariantes | Documentos de origem |
|---|---|---|---|
| Oráculos e critérios por módulo | CA-REG/ECO/SIM/CMP/IA/DAT/PLY/MKT/UX-\* | INV-1..INV-37 | [catálogo §5](./05-catalogo-de-regras-e-formulas.md), [backlog §11](../BACKLOG-PENDENCIAS.md) (matriz + critérios mínimos) |
| Bandas de simulação | BS-01..BS-22 | F1–F21 (R-15..R-24), MAT-014, R-34, R-143 | [motor §18](../01-game-design/05-motor-de-partida.md), [ruleset/replay](./15-ruleset-e-replay.md), [decisões R-32..R-34](../99-decisoes/registro-de-decisoes.md) |
| Bandas de economia | BE-01..BE-14 | INV-3a/3b, INV-8, ECO-002/003/012, R-42/43/45/46/49 | [economia §6,§14–15](../01-game-design/03-economia.md), [ledger §2–4](./13-ledger-e-conservacao-economica.md) |
| Bandas demográficas | BD-01..BD-09 | INV-6, INV-7, INV-36, PLY-002/017, CMP-005, R-44/114/115 | [economia §14.4–14.9](../01-game-design/03-economia.md), [ledger §6](./13-ledger-e-conservacao-economica.md) |
| Metodologia dos lotes | §3 | R-34, R-88 | [motor §18](../01-game-design/05-motor-de-partida.md), [operação §6](./09-operacao-e-admin-do-mundo.md), [plataforma §12](./04-plataforma-seguranca-operacoes.md) |
| Gate de promoção | G1..G8 | INV-27/28, INV-1..INV-37 | [operação §6 (R-88)](./09-operacao-e-admin-do-mundo.md), [ruleset/replay §6](./15-ruleset-e-replay.md) |
| Achados da auditoria endereçados | — | Testabilidade 3,0 (§16), "QA sem oráculo" (§12), passos 15–16 (§14) | [BACKLOG-PENDENCIAS](../BACKLOG-PENDENCIAS.md) |

> **R-116..R-124 estão ratificadas.** Critérios, catálogo de bandas e gate são normativos; números podem ser recalibrados pelo processo versionado sem reabrir o princípio. Executar os oráculos é responsabilidade da implementação.
