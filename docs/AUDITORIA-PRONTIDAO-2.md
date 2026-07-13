# Auditoria de Prontidão Final (Passo 16) — Grinta

> **Auditor:** revisão de arquitetura sênior, independente · **Data:** 2026-07-12 · **Escopo:** reavaliar os 7 bloqueadores (B-01..B-07), as contradições da auditoria original (§6 de [`BACKLOG-PENDENCIAS.md`](BACKLOG-PENDENCIAS.md)), a executabilidade e a consistência da Série R, **considerando que a rodada de resolução deixou tudo em modo `PROPOSTO`** (decisão do dono: nada ratificado além de R-01).
>
> **Método:** leitura integral dos 11 artefatos novos + schema executável + ADR §6 + tracker; validação do schema com `prisma validate`; verificação cruzada de afirmações "CANÔNICO (schema)" contra o `prisma/schema.prisma` real; busca por resíduos de contradição não propagados. **Postura: não-complacente.** Onde o artefato fecha a lacuna, é reconhecido; onde apenas a organiza para decisão futura, é dito; onde sobra resíduo, é apontado com arquivo e linha.

> **Estado do relatório:** fotografia histórica da reavaliação, preservada como evidência. Seu veredito e suas notas descrevem o corpus em **2026-07-12**, antes dos atos de ratificação e dos fechamentos abaixo; não devem ser usados como status corrente.

> **Adendo final — 2026-07-13:** B-01 foi fechado pela [baseline ratificada](99-decisoes/baseline-ratificada-2026-07-13.md); C-04 foi fixado em 23 jogadores, força total 1.380, média-alvo 60 e teto 62; B-06 foi fechado no nível de especificação pelo [modelo físico, constraints e ownership](02-tecnico/20-modelo-fisico-constraints-e-ownership.md), reconciliado com a baseline atual de 75 models/57 enums e gate DB-01..DB-16; e as 138 telas receberam layout canônico em [UI/UX 24](04-ui-ux/24-layouts-canonicos-e-cobertura.md). R-34/R-88, migrations e R-136 são provas da implementação/produção, registradas no [backlog de gates](BACKLOG-PENDENCIAS.md), não decisões documentais abertas. **Resultado corrente: documentação pronta para iniciar o desenvolvimento; produção continua condicionada aos gates executáveis.**

---

## 1. Veredito atualizado

**O desenvolvimento pode começar — na trilha reversível/fundacional — e agora com muito mais segurança do que na auditoria original. O congelamento do domínio normativo continua bloqueado por B-01, por escolha explícita do dono (tudo `PROPOSTO`).**

A distinção que a auditoria original fez (trabalho reversível vs. domínio congelado) permanece a régua correta, mas o **conteúdo de cada lado mudou materialmente**:

- **Trilha fundacional/reversível — LIBERADA e substancialmente de-riscada.** Existe agora um **context map canônico com ownership de escrita e ciclos quebrados** ([`02-tecnico/12-context-map-e-blueprint.md`](02-tecnico/12-context-map-e-blueprint.md)), um **schema executável que valida** (`prisma validate` → *"The schema is valid 🚀"*, exit 0, **69 models / 55 enums**) e já cobre as famílias que faltavam (eventing/outbox, ledger de partidas dobradas, sagas+idempotência, histórico, replay), **sete máquinas de estado formalizadas** ([`14-maquinas-de-estado.md`](02-tecnico/14-maquinas-de-estado.md)), um **kernel de simulação determinístico com replay bit-a-bit** ([`15-ruleset-e-replay.md`](02-tecnico/15-ruleset-e-replay.md)), **cinco sagas fechadas** ([`16-sagas-e-workflows.md`](02-tecnico/16-sagas-e-workflows.md)) e um **gate de promoção G1..G8 com 56 critérios de aceite e 45 bandas** ([`17-criterios-de-aceite-e-bandas.md`](02-tecnico/17-criterios-de-aceite-e-bandas.md)). Isso é a "harness descartável + context map + catálogo de estados" que a auditoria original já autorizava — mas agora **construído e coerente**, não esboçado.

- **Domínio normativo — CONTINUA CONGELADO por B-01.** Pela decisão do dono, **nenhuma recomendação `R-02..R-148` foi promovida a canônica**. Logo: (a) o schema permanece rotulado **SCAFFOLD** e **não deve gerar migrations de produção** (auto-declarado no cabeçalho do `prisma/schema.prisma`); (b) fórmulas F1–F21, coeficientes econômicos, bandas, RPO/RTO e custos são **valores de 1ª passada**; (c) telas de produção não devem ser cristalizadas (Lote 11 vem por último, corretamente). Cristalizar qualquer regra de domínio agora reintroduz exatamente o risco que a auditoria original nomeou.

**A mudança de estado desde a auditoria original, em uma frase:** os **seis bloqueadores técnicos (B-02..B-07) foram substancialmente resolvidos em modo `PROPOSTO`** — os artefatos existem, são sólidos e derivam de decisões já registradas; **B-01 permanece formalmente ABERTO**, mas **o aparato para fechá-lo está pronto** (painel de 12 lotes, protocolo de promoção, hierarquia de precedência). O que resta não é mais "escrever a especificação"; é **ratificar** (ato do dono) e **limpar resíduos** (abaixo).

> **Risco de reescrita futura:** rebaixado de **Alto** para **Médio-baixo** — condicional à ratificação. As divergências estruturais que a auditoria original citava (tempo, escalas, estados, transações, fronteiras, conservação) estão **reconciliadas no papel**; o risco remanescente é de **calibração** (números de 1ª passada que os lotes R-34/R-88 vão ajustar sem reabrir princípio) e de **propagação** (resíduos de texto ainda não alinhados — §4).

---

## 2. Tabela de bloqueadores: antes → agora

| # | Bloqueador | Original | Agora (modo PROPOSTO) | Justificativa (artefato + evidência) |
|---|-----------|----------|------------------------|--------------------------------------|
| **B-01** | Baseline normativa não aprovada | ABERTO (só R-01 ratificada) | **ABERTO** — *aparato pronto* (**PARCIAL**) | Só o dono fecha. [`hierarquia-normativa-e-ratificacao.md`](99-decisoes/hierarquia-normativa-e-ratificacao.md) entrega hierarquia de 3 eixos (status→especialidade→executabilidade), status por documento e **12 lotes de ratificação** com grafo de dependências, checklist de assinatura e protocolo de promoção. **É sólido e suficiente para ratificar lote a lote.** Mas o ADR ([`registro-de-decisoes.md:451`](99-decisoes/registro-de-decisoes.md)) confirma: **R-02..R-147 RECOMENDADAS**. Formalmente aberto até a assinatura. *Defeito:* ver R-148 em §5. |
| **B-02** | Blueprint de domínio inexistente | ABERTO | **RESOLVIDO** (proposto) | [`12-context-map-e-blueprint.md`](02-tecnico/12-context-map-e-blueprint.md): 12 bounded contexts + 3 concerns, ~45 aggregate roots com **dono de escrita único**, **DAG de leitura acíclico** com **8 ciclos quebrados (Q1–Q8)** rebaixando uma direção a evento, catálogo de eventos públicos produtor→consumidores, 3 níveis de fronteira transacional. Fecha os entregáveis de B-02. Deriva de decisões 19.7–19.10. Pende de ratificação como **R-148** (não registrado — §5). |
| **B-03** | Calendário/relógio/temporada não fecham | ABERTO | **RESOLVIDO** (proposto) | R-101..R-107: **16 clubes → 30 rodadas → ~63 dias** substitui 20/38/45 ([`03-multiplayer-e-mundos.md:399`](02-tecnico/03-multiplayer-e-mundos.md)); descanso mínimo (R-102), precedência (R-103), buffer de adiamento (R-104), datas FIFA (R-105), `seasonDays` por tamanho (R-107). As **3 camadas de estado de temporada (7 fases / 6 máquina / 4 `SeasonStatus`)** reconciliadas como **eixos distintos com mapeamento canônico** ([`14-maquinas §3`](02-tecnico/14-maquinas-de-estado.md), [`11-dicionario §2.2`](02-tecnico/11-dicionario-canonico.md)). |
| **B-04** | Economia/evolução sem semântica única | ABERTO | **RESOLVIDO** (proposto) | [`13-ledger-e-conservacao-economica.md`](02-tecnico/13-ledger-e-conservacao-economica.md): 3 classes de fluxo (**transferência conserva / faucet cria / sink destrói**) + contas `SYS_*`; **INV-3 → INV-3a (Σdébitos=Σcréditos) + INV-3b (Δoferta = Σfaucets−Σsinks)**; **relógio único de progressão** (accrual pós-partida × aplicação única no passo 7 da virada, R-113); **gerador demográfico único** com ordem fixa e precedência sobre a reposição 1,25 (R-114/R-115). Testável e sem contradição residual. Schema já tem `PlayerDevelopmentAccrual` e `FinancialAccount.ownerScope`. |
| **B-05** | Motor de partida/replay não executáveis | ABERTO | **RESOLVIDO** (proposto) | [`15-ruleset-e-replay.md`](02-tecnico/15-ruleset-e-replay.md): **kernel único `O=K(I,R,A,s,C)`**, tick canônico (60 s, R-143), protocolo de commands (`matchSequence` server-assigned, aplicação next-cycle, R-144), **`SimulationManifest` imutável + `MatchCommandLog`** (R-145), **RNG PCG com streams por finalidade** (R-146), retenção manifesto-permanente × ticks-regeneráveis (R-147). Prova de equivalência online↔offline. F1–F21 seguem PROPOSTO (calibráveis via `rulesetVersion`, sem reescrever o passado). |
| **B-06** | Modelo de dados normativo não executável | ABERTO (51 exec × ~250 conceituais) | **PARCIAL** (executável e rotulado; ERD/constraints por fechar) | Schema **valida**, cresceu **51→69 models**, rotulado **SCAFFOLD**, e a divergência "250 × 51" foi **reconciliada por rótulo + precedência** (sintaxe→schema; domínio→[`02-modelo-de-dados.md`](02-tecnico/02-modelo-de-dados.md); a hierarquia §1 fixa a regra). Cobre as famílias antes ausentes (eventing, ledger dobrado, inscrições, sagas, histórico, replay). **Ainda scaffold:** ERD/constraints/ownership/histórico "não fecham por completo"; **não gerar migrations de produção** (auto-declarado). O inventário de ~250 permanece **referência**, não materializado. |
| **B-07** | Workflows multiagregado sem máquina completa | ABERTO | **RESOLVIDO** (proposto) | [`16-sagas-e-workflows.md`](02-tecnico/16-sagas-e-workflows.md): **5 sagas fechadas** (SAGA-01 transferência, 02 virada, 03 onboarding, 04 obra, 05 empréstimo) com passos, estados, **timeouts, compensação em ordem reversa, idempotência por passo, fencing token monotônico, authority e terminais**. Mapeia cada defeito de B-07 (pagamento/prêmio duplicado, reserva presa, contrato duplicado, temporada parcial) a um mecanismo. Schema tem `SagaInstance`/`SagaStep`/`IdempotencyKey`/`OutboxEvent`/`InboxDedup` + enums. Params (timeouts) PROPOSTO (R-138..R-142). |

**Placar:** de 7 abertos → **5 RESOLVIDOS (proposto)** · **1 PARCIAL** (B-06, executável mas scaffold) · **1 ABERTO com aparato pronto** (B-01, ato do dono).

> **Ressalva metodológica sobre "RESOLVIDO (proposto)":** significa que **a especificação fecha a lacuna e é internamente sólida**, mas **não** que a regra é verdade final — depende da ratificação (B-01) e, para os números, da calibração (lotes R-34/R-88, que exigem implementação e ainda **não rodaram**). Nenhum critério de aceite ou banda foi **executado**: são oráculos escritos, não resultados verdes.

---

## 3. Contradições da auditoria original: fechadas × remanescentes

A auditoria original (§6) listou contradições **estruturais**, não de tuning. Estado uma a uma:

### 3.1 Fechadas (reconciliadas em modo PROPOSTO)

| Contradição original | Como foi fechada | Onde |
|---|---|---|
| **Calendário 38 rodadas × ~26 slots** (20 clubes/45 dias) | 16 clubes/30 rodadas/~63 dias (R-101/R-107); o par antigo aparece só como *superado* | [`03-multiplayer §389–401`](02-tecnico/03-multiplayer-e-mundos.md), R-101 |
| **Estados de temporada 7 × 6 × 4** | 3 eixos distintos (fase narrativa / máquina / `SeasonStatus` persistido) com mapeamento canônico A→B→C | [`11-dicionario §2.2`](02-tecnico/11-dicionario-canonico.md), [`14-maquinas §3`](02-tecnico/14-maquinas-de-estado.md) |
| **Partida "pausa × continua × expira"** | `PAUSED_FOR_DECISION` é **janela local time-boxed do runtime de uma partida**; o `WorldStatus` fica `ACTIVE`, as outras partidas seguem, e a janela **sempre** volta a `LIVE` (resposta ou timeout→IA). Uma única máquina de runtime | [`14-maquinas §9`](02-tecnico/14-maquinas-de-estado.md) (resolve C-09) |
| **Conservação monetária × receitas/despesas sistêmicas** | INV-3 desdobrada em **INV-3a** (balanço do lançamento) + **INV-3b** (oferta rastreável por contas `SYS_*`); conservação vira *rastreabilidade*, não proibição | [`13-ledger §3.3`](02-tecnico/13-ledger-e-conservacao-economica.md) (resolve INV-3, C-06) |
| **Progressão dupla** (pós-partida e no fechamento) | **Accrual** pós-partida (buffer) × **aplicação única** no passo 7 da virada, com clamp de potencial; buffer zerado na aplicação (idempotente) | [`13-ledger §5`](02-tecnico/13-ledger-e-conservacao-economica.md), R-113 |
| **Aposentadoria "1,25 jogador" vs. controlador populacional** | **Gerador único** dirigido por gap; a fração 1,25 vira **teto de ritmo em regime**, não fonte aditiva; ordem fixa e precedência do controlador; clamps `capTemporada` ≤8% | [`13-ledger §6`](02-tecnico/13-ledger-e-conservacao-economica.md), R-114/R-115 |
| **Atributos: grids incompatíveis** (GDD/UI/Prisma) | Escala **0–100** canônica (E1); overall **derivado, não persistido**; dicionário único de variáveis. Resolve C-01 *ao ratificar R-02/R-09* | [`11-dicionario §1.1/§3`](02-tecnico/11-dicionario-canonico.md) |
| **Técnico NPC contratável vs. R-01** (C-03) | R-01 é canônica; `HEAD_COACH` permanece como papel de staff (clubes IA/assessoria), sem retirar o comando tático do usuário humano | [`registro-de-decisoes R-01`](99-decisoes/registro-de-decisoes.md), [`11-dicionario §2.5`](02-tecnico/11-dicionario-canonico.md) |
| **`medicalCleared` no payload do cliente** (C-07) | Liberação médica **server-side** (evento `MedicallyCleared`), caminho **único** de contrato (só `SignTransfer` ativa vínculo) | [`14-maquinas §7.3`](02-tecnico/14-maquinas-de-estado.md), [`16-sagas §2.5`](02-tecnico/16-sagas-e-workflows.md) |
| **Homologação antes/depois de pagar** (C-10) | Ordem normativa fixada na SAGA-02: homologar (passos 1–3) **sempre antes** de pagar (passo 4); fase `VERIFYING` antes de concluir | [`16-sagas §3.1`](02-tecnico/16-sagas-e-workflows.md) |
| **~250 models conceituais × 51 executáveis** | Rótulo **scaffold** + regra de precedência (sintaxe×domínio); schema cresceu a 69 e cobre as famílias críticas | [`hierarquia §1`](99-decisoes/hierarquia-normativa-e-ratificacao.md), cabeçalho do `prisma/schema.prisma` |

**11 das ~13 contradições estruturais estão reconciliadas** no papel (modo PROPOSTO).

### 3.2 Remanescentes (genuínas — não fechadas por reconciliação)

| Contradição | Estado | Detalhe |
|---|---|---|
| **Escalas 1–5 × 1–10** | **Fechada no cânone, RESÍDUO na propagação** | O dicionário fixa **1–5** (E3) e marca **1–10 CONVERTIDA**; a GDD de estrutura ([`04-estrutura §10/§511`](01-game-design/04-estrutura-do-clube-e-staff.md)) usa 1–5. **Mas persistem duas ocorrências de "1–10":** (a) a tela [`04-ui-ux/09:66`](04-ui-ux/09-mobile-telas-financas-estrutura-estadio.md) ainda mostra *"nível atual (1–10)"*; (b) o **R-83** em [`03-multiplayer:379`](02-tecnico/03-multiplayer-e-mundos.md) ainda descreve *"nível estrutural do clube (1–10)"* como eixo de liga. A hierarquia admite isso (UI/03 = PROPOSTO, "remapeamento de R-83" pendente do Lote 3). **Contradição textual viva até Lotes 3 e 11.** |
| **Força inicial ≈65 × teto Liga Inicial ≤62** (C-04) | **ABERTA — deferida à ratificação** | R-43 fixa média inicial **≈65**; a Liga Inicial propõe teto **≤62**. A própria hierarquia (Lote 4) manda **"decidir na ratificação: força, teto ou regra de alocação"** ([`hierarquia §3.2 Lote 4`](99-decisoes/hierarquia-normativa-e-ratificacao.md)). Não é reconciliada — é **empurrada para o ato de decisão**. Genuíno resíduo. |
| **Broker BullMQ × RabbitMQ/NATS** | Encaminhada, não fechada | R-78 propõe Redis+BullMQ na fundação → RabbitMQ/NATS na evolução, com gatilho quantitativo. Depende de ratificação (Lote 8); não é contradição viva, é decisão a ratificar. |

---

## 4. Executabilidade

| Dimensão | Resultado |
|---|---|
| **Schema valida** | ✅ `prisma validate` → *"The schema at prisma/schema.prisma is valid 🚀"* (exit 0). **69 models, 55 enums.** |
| **Afirmações "CANÔNICO (schema)" conferem** | ✅ Verificados presentes: `SagaInstance`/`SagaStep`/`IdempotencyKey`/`OutboxEvent`/`InboxDedup`, enums `SagaType/SagaStatus/SagaStepStatus`, `MatchRuntimeStatus`/`MatchResultStatus`/`HomologationStatus`, `FinancialAccount` (+`ownerScope`/`AccountOwnerScope`), `SagaInstance.fencingToken`, `MatchSimulation.tickIntervalSeconds`/`rulesetVersionId`, `MatchCommandLog`, `PlayerDevelopmentAccrual`. **Nenhuma afirmação de existência foi encontrada falsa.** |
| **Replay determinístico especificado** | ✅ Kernel puro, tick fixo, `commandLog` ordenado por `matchSequence`, streams RNG isoladas por finalidade (impedem deslocamento de índice), `inputHash`/`resultHash`, recusa por `rulesetVersion` incompatível. Verificação de replay = teste de aceite central (CA-SIM-01/02, BS-22). |
| **Fórmulas especificadas** | ⚠️ **Estrutura** de F1–F21 fixada (termos, ordem de resolução por tick); **coeficientes PROPOSTO** (R-15..R-24), calibráveis pelo lote R-34 (~10.000 partidas) **ainda não executado**. |
| **Sagas fechadas** | ✅ 5 sagas com passos/estados/timeouts/compensações/idempotência/fencing/authority/terminais; kernel de saga comum derivado do schema; ponto-de-não-retorno declarado por saga. |
| **Invariantes testáveis** | ✅ 39 invariantes (INV-1..37 + 3a/3b) mapeadas a **56 critérios CA-\*** determinísticos (Given/When/Then, tolerância zero) e **45 bandas** (BS/BE/BD) estatísticas, sob **gate conjuntivo G1..G8**. **Mas são oráculos escritos, não resultados** — nenhum lote rodou. |
| **Congelamento seguro** | ✅ `rulesetVersion` + data efetiva permitem calibrar números **sem reescrever o passado**; promoção a canônico é atômica por mundo e gated pelo G1..G8 + auditoria (passo 16). |

**Conclusão de executabilidade:** o corpus passou de "conceitual" para "executável no papel + scaffold que compila". O que **não** é executável ainda: migrations de produção (scaffold), números finais (calibração não rodou), e a "recuperação comprovada" (R-136 é critério, nunca exercido — não há sistema para o gameday).

---

## 5. Consistência da Série R (amostragem)

Amostrei R-101, R-109/110/111, R-113/114/115, R-125..R-130, R-131..R-137, R-138..R-142, R-143/145/146: **cada ID resolve a uma definição única**, com fonte canônica declarada e resumo no ADR ([`registro-de-decisoes §6.1`](99-decisoes/registro-de-decisoes.md)) coincidente com o doc-fonte. `R-35..R-40` e `R-108` reservados (coerente). Unicidade de ID: sem colisão detectada. **Consistência alta — com uma exceção material:**

> ### ⚠️ Defeito R-148 (registro incompleto + tracker superestima)
> - [`12-context-map-e-blueprint.md:7,427`](02-tecnico/12-context-map-e-blueprint.md) referencia **R-148** como "este documento (Context Map e Blueprint)" a ratificar.
> - O rastreador temporário da resolução, depois absorvido e removido, afirmava *"R-101..R-148 no ADR, unicidade PASS ... R-02..R-148 RECOMENDADAS"*.
> - **Porém o ADR não tem entrada R-148:** o bloco enumerado termina em R-147 e [`registro-de-decisoes.md:451`](99-decisoes/registro-de-decisoes.md) diz literalmente *"R-02..R-147 RECOMENDADAS"* e trata "R-148+" como **hipótese futura** (*"seriam acrescentadas se novas decisões surgirem"*). Grep confirma: **nenhum bloco `R-148` registrado**.
> - Além disso, o **índice `R-## → Lote`** ([`hierarquia §3.3`](99-decisoes/hierarquia-normativa-e-ratificacao.md)) vai só até R-147 — **R-148 não está atribuído a nenhum lote de ratificação**.
>
> **Efeito:** a decisão de arquitetura mais transversal (context map, ownership, quebra de ciclos) **não tem caminho formal de ratificação** e o tracker **declara concluído algo que o ADR não registra**. É pequeno em esforço (registrar R-148 no ADR e encaixá-lo num lote — naturalmente o Lote 8), mas é exatamente o tipo de "backlog diz concluído, ADR diz não" que a auditoria original penalizou (contradição ADR×backlog). **Deve ser corrigido antes de a ratificação começar.**

**Deriva de documentação (menor, mas real):** docs [`13-ledger §3.1/5.2`](02-tecnico/13-ledger-e-conservacao-economica.md) e [`15-ruleset §3.1`](02-tecnico/15-ruleset-e-replay.md) descrevem `PlayerDevelopmentAccrual`, `MatchCommandLog`, `rulesetVersionId`, `ownerScope=WORLD` como **"a adicionar / não criado aqui"** — mas o schema **já os contém**. O agente de schema implementou as propostas; a prosa não foi atualizada. Não é erro de correção (o ID R-145/R-110/R-113 cobre a adição), mas **confunde o leitor** sobre o estado real do scaffold. Alinhar a prosa ao schema.

---

## 6. Checklist de prontidão atualizado

| Área | Original | Agora | Motivo |
|---|---|---|---|
| **Regras** | não pronto | **parcialmente pronto** | Máquinas de estado, invariantes (39) e catálogos completos — mas tudo PROPOSTO; valores 1ª passada. |
| **Economia** | não pronto | **parcialmente pronto** | Ledger dobrado, INV-3a/3b, faucet/sink, relógio de progressão, controlador demográfico — semântica única fechada; números por calibrar (B-04 resolvido em proposta). |
| **Simulação** | parcialmente pronto | **quase pronto (proposto)** | Kernel único, tick canônico, manifesto imutável, RNG determinístico, prova online/offline; F1–F21 por calibrar. |
| **Competições** | não pronto | **parcialmente pronto** | Calendário fecha (R-101), máquina de competição, desempate, disciplina atribuída a C7; valores PROPOSTO; C-04 aberto. |
| **IA** | parcialmente pronto | **parcialmente pronto** | Q6 fixa "IA emite os mesmos commands"; CA-IA-01..05 definem determinismo/autoridade/conhecimento; pesos ainda PROPOSTO. |
| **Arquitetura** | parcialmente pronto | **quase pronto (proposto)** | Context map, ownership, DAG com ciclos quebrados, fronteiras transacionais, sagas, capacidade. Falta ratificar (R-148 nem registrado) e HA é fase 5. |
| **Dados** | não pronto | **parcialmente pronto** | Schema valida (69), cobre famílias críticas, rotulado scaffold com precedência. ERD/constraints/ownership/histórico por fechar; sem migrations de produção. |
| **Infraestrutura** | parcialmente pronto | **parcialmente pronto** | [`18-capacidade-e-custo.md`](02-tecnico/18-capacidade-e-custo.md): dimensionamento/mundo, retenção por família, throughput, limites WS, gatilhos, custo — todos 1ª passada, sem telemetria. |
| **Segurança** | parcialmente pronto | **parcialmente pronto** | [`19-seguranca-dr-ha.md`](02-tecnico/19-seguranca-dr-ha.md): AuthN concreto, matriz RBAC executável, auditoria hash-chain, RPO/RTO por classe, HA, DR. "Recuperação comprovada" é **critério nunca executado**; single-host na fundação. |
| **UX** | parcialmente pronto | **parcialmente pronto** | Rastreabilidade ação→query→command→evento→erro (49 ações + 7 fluxos), CA-UX-01..06. UI ainda reflete regra não ratificada. |
| **UI** | parcialmente pronto | **parcialmente pronto (pouca mudança)** | Ainda **6 wireframes não canônicos**; 101/138 telas sem layout (inalterado); tela `04-ui-ux/09` ainda mostra escala 1–10 errada. Lote 11 (UI) vem por último, corretamente. |
| **Testes** | parcialmente pronto | **parcialmente pronto (forte avanço)** | 56 oráculos CA-\* + 45 bandas + gate G1..G8. Mas **nenhum executado** — falta o sistema e os lotes R-34/R-88. |
| **Operação** | parcialmente pronto | **parcialmente pronto** | Runbook de restore, gameday mensal/trimestral, commands admin (0→37), matriz papel→ação. Números 1ª passada; gamedays não rodaram. |

Nenhuma área passa a **"pronto"** — coerente com o modo PROPOSTO. A massa migrou de **"não pronto"** para **"parcialmente / quase pronto (proposto)"**.

---

## 7. Notas finais (reavaliadas 0–10)

| Dimensão | Original | Agora | Justificativa |
|---|---:|---:|---|
| Clareza da documentação | 5,0 | **7,5** | Hierarquia de fontes, dicionário único de escalas/estados/variáveis, rótulos `CANÔNICO/PROPOSTO` explícitos. Descontos: deriva prosa×schema (§5) e defeito R-148. |
| Completude das regras | 3,0 | **6,5** | 7 máquinas, ledger, demografia, sagas, replay, critérios. Valores 1ª passada; algumas pontas (disciplina/cartões, catch-up) só *atribuídas* a um dono, não plenamente especificadas. |
| Consistência entre sistemas | 2,5 | **7,0** | Calendário, estados de temporada, conservação, progressão, pausa reconciliados. Resíduos: escala 1–10 em UI/R-83, C-04 aberto, R-148. |
| Economia e balanceamento | 2,5 | **6,5** | Conservação/ledger/faucet-sink/progressão/demografia fechados e testáveis. Números não calibrados (R-88 não rodou); C-04 aberto. |
| Simulação de partidas | 4,0 | **7,0** | Kernel único, determinismo bit-a-bit, manifesto imutável, streams RNG, equivalência online/offline. F1–F21 por calibrar. |
| Arquitetura | 5,5 | **7,5** | Context map + ownership + DAG + fronteiras transacionais + sagas + capacidade/HA. Desconto: R-148 não registrado; HA é fase 5; tudo PROPOSTO. |
| Modelo de dados | 2,5 | **6,0** | Schema valida (69), cobre famílias críticas, scaffold rotulado com precedência. Ainda scaffold: sem constraints/ownership/ERD fechados nem migrations de produção; ~250 permanece referência. |
| Escalabilidade | 3,0 | **6,5** | Dimensionamento/mundo, retenção, throughput, WS, gatilhos, custo. Tudo 1ª passada, sem telemetria. |
| Segurança e confiabilidade | 4,5 | **7,0** | AuthN/RBAC/auditoria hash-chain/RPO-RTO/HA/DR materializados como fluxos e tabelas. Desconto: recuperação comprovada nunca exercida; single-host; campos como `previousIntegrityHash` propostos, não presentes. |
| UX | 5,0 | **6,5** | Rastreabilidade UX/API + critérios CA-UX. UI reflete regra não ratificada; estados/offline parciais. |
| UI | 4,0 | **5,0** | Avanço mínimo: 6 wireframes não canônicos, 101/138 sem layout, escala errada viva em tela. Lote 11 por último. |
| Testabilidade | 3,0 | **7,0** | 56 oráculos determinísticos + 45 bandas + gate G1..G8 conjuntivo. Desconto forte: **oráculos escritos, zero executados**. |
| **Prontidão geral p/ desenvolvimento** | **3,0** | **5,5** | Fundação reversível liberada e de-riscada; domínio congelado por B-01 (aberto por escolha); schema scaffold sem migrations; calibração e ratificação pendentes. |

**Média das 12 dimensões (excluindo "prontidão geral"): ~3,7 → ~6,7.** Prontidão geral: **3,0 → 5,5**.

---

## 8. O que ainda falta para prontidão plena

**Bloqueador dominante (só o dono fecha):**

1. **B-01 — Ratificação da Série R por lotes.** É o gate de tudo. O painel de 12 lotes está pronto ([`hierarquia §3`](99-decisoes/hierarquia-normativa-e-ratificacao.md)); falta o **ato de assinatura** lote a lote. Enquanto não ratificado, **todo o domínio permanece PROPOSTO** e o schema não gera migrations de produção. **No ato, o dono deve resolver as contradições marcadas** (notadamente **C-04** média ≈65 vs teto ≤62 no Lote 4).

**Resíduos genuínos a limpar (baratos, mas reais — vários deveriam preceder a ratificação):**

2. **Registrar R-148 no ADR e encaixá-lo num lote** (§5). Hoje o context map/blueprint não tem caminho de ratificação e o tracker declara "R-101..R-148 no ADR" — o que o ADR não confirma. Corrigir a nota de fechamento (`R-02..R-147` → incluir R-148) e o índice `R-## → Lote`.
3. **Propagar a escala 1–5** para [`04-ui-ux/09:66`](04-ui-ux/09-mobile-telas-financas-estrutura-estadio.md) (ainda "1–10") e **remapear R-83** em [`03-multiplayer:379`](02-tecnico/03-multiplayer-e-mundos.md) (ainda "nível estrutural 1–10"). Contradição de escala **viva no texto**, embora resolvida no cânone.
4. **Alinhar a prosa ao schema** nos docs 13/15/16: `PlayerDevelopmentAccrual`, `MatchCommandLog`, `rulesetVersionId`, `ownerScope` são descritos como "a adicionar" mas **já existem** no schema (§5).
5. **Fechar B-06 de fato:** ERD final, constraints (exclusion constraint "1 contrato ativo", FKs compostas em toda relação world-scoped — C-05), ownership por tabela e projeções históricas, antes de sair do rótulo scaffold e gerar migrations.

**Resíduos que exigem implementação (esperado nesta fase, mas honestamente pendente):**

6. **Calibração:** os lotes **R-34 (~10.000 partidas)** e **R-88 (≥1.000 mundos × ≥10 temporadas)** ainda **não rodaram** — logo as 45 bandas e os coeficientes F1–F21 são alvos, não resultados. O **gate G1..G8 nunca foi avaliado**.
7. **Recuperação comprovada (R-136):** é um **critério** de gameday que **nunca foi exercido** (não há sistema). Até um gameday verde, "DR comprovada" é aspiração, não fato — exatamente a distinção que a própria auditoria original exigiu.
8. **UI:** ainda o elo mais fraco — 6 wireframes não canônicos, maioria das telas sem layout, telas centrais refletindo regra não ratificada. Correto adiar (Lote 11), mas continua sendo trabalho substancial não iniciado.

---

## 9. Resumo executivo

- **Veredito:** desenvolvimento **pode começar na trilha reversível/fundacional** (context map, schema scaffold que valida, kernel headless, harness de simulação, protótipos, CI/observabilidade) — e agora com risco de reescrita **médio-baixo**, não alto. O **congelamento do domínio normativo continua bloqueado por B-01**, aberto por escolha do dono. O aparato para fechar B-01 está **pronto e sólido**.
- **Bloqueadores:** B-02, B-03, B-04, B-05, B-07 **RESOLVIDOS em modo PROPOSTO**; **B-06 PARCIAL** (executável e rotulado, faltam ERD/constraints/migrations); **B-01 ABERTO** com aparato completo (ato do dono).
- **Contradições:** **11/13 estruturais reconciliadas** no papel; remanescentes genuínas: **escala 1–10 residual** em UI/R-83 (fechada no cânone, não propagada) e **C-04** (força ≈65 × teto ≤62, deferida à ratificação).
- **Executabilidade:** schema **valida** (69 models); replay determinístico, sagas, invariantes e gate **especificados** — mas **nenhum executado** (calibração e gamedays pendem de implementação).
- **Consistência R-##:** alta, exceto o **defeito R-148** (referenciado e declarado concluído, mas não registrado no ADR nem atribuído a lote) e a **deriva prosa×schema** (docs dizem "a adicionar" o que o schema já tem).
- **O que falta para prontidão plena:** ratificar a Série R por lotes (**B-01**, ato do dono, decidindo C-04); registrar R-148; propagar escala 1–5 e alinhar prosa/schema; fechar constraints/ERD (B-06); e — já com implementação — **rodar** os lotes de calibração (R-34/R-88) e o **gameday de recuperação** (R-136) para converter oráculos em resultados verdes.
