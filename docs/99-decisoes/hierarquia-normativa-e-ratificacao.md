# Hierarquia Normativa e Painel de Ratificação

> **Status:** CANÔNICO · **Escopo:** hierarquia, precedência e histórico dos lotes · **Revisão:** 2026-07-13
>
> **Ratificação concluída:** R-01..R-148 estão RATIFICADAS, exceto os IDs reservados R-35..R-40 e R-108. O ato, o ajuste C-04 e os gates pós-implementação constam em [`baseline-ratificada-2026-07-13.md`](baseline-ratificada-2026-07-13.md). Checklists vazios na §3 são preservados como histórico e não representam pendência atual.

Este documento, junto ao ato de ratificação, fecha **B-01** e responde qual fonte prevalece, quais decisões valem, como mudanças futuras invalidam derivados e quais materiais são apenas históricos.

Ele tem quatro partes:

1. [Hierarquia de fontes da verdade](#1-hierarquia-de-fontes-da-verdade) — quem vence quem, por assunto.
2. [Status por documento](#2-status-por-documento) — cada doc rotulado `CANÔNICO`, `PROPOSTO`, `REFERÊNCIA` ou `SUPERADO`.
3. [Lotes de ratificação da Série R](#3-lotes-de-ratificação-da-série-r) — histórico do painel aprovado em lote.
4. [Protocolo de promoção](#4-protocolo-de-promoção) — como um `R-##` vira `CANÔNICO`.

---

## 1. Hierarquia de fontes da verdade

### 1.1 Princípios

Quando dois documentos divergem, o conflito é resolvido pela combinação de **três eixos**, aplicados nesta ordem:

1. **Eixo de status normativo (vence primeiro).** Uma afirmação `CANÔNICO` vence uma `PROPOSTO`, que vence uma `REFERÊNCIA`, que vence um material `SUPERADO`. Um `R-##` ainda **RECOMENDADO** nunca vence uma decisão **RATIFICADA** nem um invariante já fechado por reconciliação.
2. **Eixo de especialidade (vence o doc dono do assunto).** Para um dado assunto, existe **um** documento canônico dono. Ele vence os que apenas *mencionam* o assunto. A tabela §1.2 fixa o dono de cada assunto.
3. **Eixo de executabilidade (vence o artefato que compila/roda).** Em questões de **sintaxe e forma executável**, o artefato executável (`prisma/schema.prisma`) vence os snippets ilustrativos de qualquer doc. Em questões de **domínio** (cardinalidade conceitual, invariantes, ~250 models de referência), o documento de modelo de dados vence o schema executável (que é, hoje, um subconjunto/scaffold de ~51 models — ver B-06).

> Regra de ouro: **o dono do assunto define a regra; o artefato executável define a forma; o status define se aquilo já vale como verdade ou ainda é proposta.** Nenhum dos três eixos, sozinho, resolve todos os casos — aplique-os na ordem acima.

### 1.2 Tabela assunto → documento canônico

| Assunto / domínio | Documento canônico (dono) | Vence sobre | Observação de status |
|---|---|---|---|
| **Decisões de produto/design** | [`./registro-de-decisoes.md`](./registro-de-decisoes.md) + [`baseline-ratificada-2026-07-13.md`](baseline-ratificada-2026-07-13.md) | qualquer doc derivado | Série R ratificada; fonte única do estado de cada decisão. |
| **Governança/hierarquia normativa** | **este documento** | qualquer suposição implícita de precedência entre docs | Instrumento de trabalho; não ratifica R-##. |
| **Sintaxe / forma executável do banco** | [`../../prisma/schema.prisma`](../../prisma/schema.prisma) | snippets ` ```prisma ` de qualquer doc | Autoridade de sintaxe. Como **baseline de domínio** é scaffold (~51 models) — B-06. |
| **Modelo de domínio: entidades, cardinalidades, invariantes, os ~250 models** | [`../02-tecnico/02-modelo-de-dados.md`](../02-tecnico/02-modelo-de-dados.md) | GDD e UI sobre "que dados existem" | Referência de domínio comentada; prevalece no **domínio**, não na sintaxe. |
| **Fórmulas, coeficientes, IDs de regra, máquinas de estado, invariantes numéricos** | [`../02-tecnico/05-catalogo-de-regras-e-formulas.md`](../02-tecnico/05-catalogo-de-regras-e-formulas.md) | GDD sobre números/fórmulas | Fórmulas F1–F21 e coeficientes ratificados (R-15..R-24); tuning é versionado. |
| **Integridade referencial, transações, FKs compostas, particionamento** | [`../02-tecnico/01-arquitetura-de-dados.md`](../02-tecnico/01-arquitetura-de-dados.md) | outros docs sobre concorrência/locks | Decisões 19.7–19.10 preservadas (canônicas). |
| **Stack, topologia, paradigma do core, broker, busca** | [`../02-tecnico/00-arquitetura-geral.md`](../02-tecnico/00-arquitetura-geral.md) + [`../02-tecnico/07-arquitetura-do-core-ecs.md`](../02-tecnico/07-arquitetura-do-core-ecs.md) | UI/GDD sobre tecnologia | Ratificado por R-77..R-82 e complementado por R-160. |
| **Nomes canônicos de commands (contratos de ação)** | [`../02-tecnico/10-catalogo-de-commands.md`](../02-tecnico/10-catalogo-de-commands.md) | UI sobre nomes de ação | Commands e limites ratificados (R-25..R-29/R-153). |
| **Multiplayer, mundos, divisões, rodadas assíncronas, dimensionamento** | [`../02-tecnico/03-multiplayer-e-mundos.md`](../02-tecnico/03-multiplayer-e-mundos.md) | GDD sobre topologia de mundo | Interação divisões×ligas e dimensionamento `PROPOSTO` (R-83/R-84). Escala 1–10 daqui é **superada** por 1–5 (R-10). |
| **Plataforma, segurança, operações, RPO/RTO** | [`../02-tecnico/04-plataforma-seguranca-operacoes.md`](../02-tecnico/04-plataforma-seguranca-operacoes.md) | outros docs sobre broker/DR | Ratificado (R-78, R-85..R-88, R-154/R-168); prova R-136 é gate de produção. |
| **Design de cada sistema de jogo ("o quê" e "o porquê")** | GDD [`../01-game-design/`](../01-game-design/) (doc do sistema) | UI e guia sobre a regra do sistema | Perde para 02/05 em **dados** e **fórmulas**. Amplamente `PROPOSTO` (R-02..R-76, R-89..R-96). |
| **Vocabulário conceitual de entidades** | [`../01-game-design/16-glossario-de-entidades.md`](../01-game-design/16-glossario-de-entidades.md) | uso informal de termos | Canônico como glossário; termos conflitantes (M-01) a fechar no passo 3. |
| **Design system, tokens, componentes, telas, fluxos** | [`../04-ui-ux/00-visao-geral-e-design-system.md`](../04-ui-ux/00-visao-geral-e-design-system.md) e demais `04-ui-ux/*` | — (camada de apresentação) | Nunca vence regra/dado/fórmula. Ratificado por R-98..R-100 e coberto pelos docs 23–24. |
| **Posicionamento, pitch, pilares de produto** | [`../00-produto/01-visao-e-pitch.md`](../00-produto/01-visao-e-pitch.md) | — | `REFERÊNCIA (produto)`; não é fonte de regra executável. |
| **Papel do usuário (Gestor + Técnico)** | [`./registro-de-decisoes.md` — R-01](./registro-de-decisoes.md) | GDD/UI/schema que mantenham técnico-NPC contratável p/ clube humano | **CANÔNICO** (única RATIFICADA). Resolve C-03. |
| **Referência histórica (Brasfoot)** | [`../00-produto/03-referencia-brasfoot.md`](../00-produto/03-referencia-brasfoot.md) | — | `REFERÊNCIA` histórica; nunca normativa. |
| **Conteúdo dos chats de brainstorming e "definitivos"** | [`../../chats/`](../../chats/) | — | `REFERÊNCIA / SUPERADO`; a consolidação em `docs/` prevalece (ver §2.4). |

### 1.3 Regra de desempate rápida (resumo operacional)

- **Sintaxe de schema** → `prisma/schema.prisma`.
- **Domínio/entidades/invariantes** → `02-modelo-de-dados`.
- **Números/fórmulas/estados** → `05-catalogo-de-regras-e-formulas`.
- **Que decisão vale** → `registro-de-decisoes` (Série R).
- **Regra de um sistema** → o doc-dono no GDD, salvo dado/fórmula (acima).
- **Aparência/tela** → `04-ui-ux/*`, que **nunca** cria regra nem dado.
- **`docs/` sempre vence `chats/`.**
- **RATIFICADA vence RECOMENDADA vence REFERÊNCIA vence SUPERADO.**

---

## 2. Status por documento

Rótulos:

- **`CANÔNICO`** — fechado; vale como verdade. Não depende de ratificação pendente.
- **`PROPOSTO`** — depende de um ou mais `R-##` ainda RECOMENDADOS. Direção de trabalho, não verdade final.
- **`REFERÊNCIA`** — contexto histórico/produto; nunca normativo sobre regra executável.
- **`SUPERADO`** — substituído; mantido apenas por rastreabilidade.

> **Estado atual:** todos os documentos derivados exclusivamente de R-01..R-148 são `CANÔNICO`. As palavras `PROPOSTO` ainda preservadas no racional dos lotes descrevem o estado histórico anterior à ratificação e são superadas pelo ato de 2026-07-13. Valores continuam versionáveis por ruleset.

### 2.1 Produto (`00-produto/`)

| Documento | Status | Nota |
|---|---|---|
| `01-visao-e-pitch.md` | CANÔNICO | Visão e posicionamento do produto. |
| `02-identidade-e-nome.md` | CANÔNICO | Nome escolhido; a verificação de marca é ação externa, não lacuna funcional. |
| `03-referencia-brasfoot.md` | REFERÊNCIA HISTÓRICA | Contexto de gênero; nunca normativo. |
| `marca/` | REFERÊNCIA | Ativos visuais seguem a governança do design system. |

### 2.2 Game Design (`01-game-design/`)

| Documentos | Status | Nota |
|---|---|---|
| `00..16` | CANÔNICO | Regras R-01..R-170 ratificadas; coeficientes identificados como calibráveis mudam apenas por ruleset versionado. |

### 2.3 Técnico (`02-tecnico/`)

| Documentos | Status | Nota |
|---|---|---|
| `00..05`, `07..20` | CANÔNICO | Arquitetura e contratos ratificados; docs 17–20 definem os gates executáveis. |
| `06-roadmap-de-implementacao.md` | REFERÊNCIA DE PLANEJAMENTO | Sequência de trabalho; não redefine regra. |
| `../../prisma/schema.prisma` | BASELINE FÍSICA PRÉ-MIGRATION | Autoridade sintática; DB-01..DB-16 e validação em CI bloqueiam a primeira migration de produção. |

### 2.4 Guia, UI/UX e legado

| Documentos | Status | Nota |
|---|---|---|
| `03-guia-do-jogador/*` | CANÔNICO | Deriva das decisões ratificadas. |
| `04-ui-ux/00..24` | CANÔNICO | Contratos UX/API e layouts cobrem 114 telas mobile e 24 admin. |
| [`../BACKLOG-PENDENCIAS.md`](../BACKLOG-PENDENCIAS.md) | CANÔNICO | Fechamento da auditoria e gates executáveis. |
| [`../AUDITORIA-PRONTIDAO-2.md`](../AUDITORIA-PRONTIDAO-2.md) | REFERÊNCIA HISTÓRICA | Fotografia de 2026-07-12; o adendo registra o encerramento. |
| [`../README.md`](../README.md) | CANÔNICO (índice) | Navegação e convenções. |
| `../../chats/*` e "definitivos" | REFERÊNCIA / SUPERADO | Arquivo-fonte; `docs/` prevalece. |

---

## 3. Lotes de ratificação da Série R

Os itens da Série R foram agrupados em 12 lotes e **aprovados em conjunto com ajuste em C-04 em 2026-07-13**. A distribuição abaixo permanece para rastrear dependências e impacto. `R-35..R-40` e `R-108` são reservados e não utilizados.

### 3.1 Grafo de dependências entre lotes

```
Lote 0 (papel do usuário) ── RATIFICADO ─ base de todos
   │
   ├─► Lote 1  Mundo/onboarding ──────────┐
   ├─► Lote 2  Jogador/atributos ──┐       │
   │                               ▼       │
   ├─► Lote 3  Estrutura/staff ───►┤       │
   │                               ▼       ▼
   │                        Lote 4 Economia/ledger ─► Lote 5 Temporada
   │                               │                        │
   │                               ├─► Lote 7 Torcida ◄──────┤
   │                               ├─► Lote 9 Estádio        │
   │                               ▼                         │
   └─► Lote 6 Partida (usa 2,3,4) ◄──────────────────────────┘
Lote 8  Plataforma/stack ── espinha técnica paralela (implementação de TODOS depende dela)
Lote 10 Monetização ── depende de 0 (e fecha com R-75 do Lote 7)
Lote 11 UI/design system/guia ── depende de TODOS os lotes de domínio (vem por último)
```

> **Regra de leitura:** os lotes de **domínio/valor** (1–7, 9, 10) podem ser **ratificados** em qualquer ordem que respeite as setas — a decisão de produto não espera a stack. Mas a **implementação** de qualquer lote depende do **Lote 8** (stack/core) estar ratificado. Por isso o Lote 8 é uma espinha paralela, não o fim da fila. O **Lote 11 (UI/guia)** vem por último porque só deve refletir regra já ratificada (M-10).

### 3.2 Painel de aprovação (checklist lote a lote)

Para cada lote, marque **uma** opção e assine. Ações possíveis: **[ ] APROVAR** (ratifica todos os R-## do lote como estão) · **[ ] APROVAR C/ AJUSTE** (liste os R-## e o valor alterado) · **[ ] REJEITAR** (liste os R-## e a direção substituta) · **[ ] ADIAR**.

---

#### ✅ Lote 0 — Papel do usuário · **RATIFICADO**

- **Inclui:** `R-01` (Gestor + Técnico).
- **Depende de:** nada.
- **Estado:** **RATIFICADA** por Douglas na consolidação de 2026-07-11. **Não requer nova ação.**
- **Impacto (já vigente):** o usuário comanda gestão **e** tática; comissão técnica assessora; IA cobre o offline; **não há técnico-NPC contratável que retire o comando tático** do clube humano. `CoachTrust` refere-se ao usuário-técnico. Base de C-03, do Lote 6 (partida) e das telas de tática/staff.
- Checklist: **N/A — já ratificado.**

---

#### Lote 1 — Mundo, onboarding e anti-abuso

- **Inclui:** `R-50` (clube disponível), `R-51` (caixa inicial fixo — *valor unificado em R-43*), `R-52` (entrada em temporada em andamento não reescreve tabela), `R-53` (anti-captura de clubes fortes), `R-54` (Programa de Clube Novo), `R-55` (**Decisão 3 = C**: liga nova/andamento/temática), `R-56` (arquivamento de mundo), `R-57` (elenco inicial 23 jogadores / 26–33 anos / **1.380 pts, média-alvo 60**).
- **Depende de:** Lote 0. **Cross-dep:** `R-51` (valor do caixa) é definido por `R-43` no **Lote 4** — ratifique o valor lá; aqui ratifica-se a **regra** "fixo e idêntico".
- **Ratificar → impacto:** destrava onboarding, entrada tardia, clube disponível, arquivamento e Decisão 3; canoniza fluxos MF-01 e `03-guia parte-01`. Fecha pontas soltas de "Primeiro acesso" e "Entrada tardia".
- **Rejeitar → impacto:** telas de onboarding (`04-ui-ux/03`), anti-captura e o guia de entrada permanecem `PROPOSTO`; reabre a Decisão 3.
- Checklist: `[ ] APROVAR  [ ] APROVAR C/ AJUSTE  [ ] REJEITAR  [ ] ADIAR` — assinatura: ____________

---

#### Lote 2 — Jogador e atributos

- **Inclui:** `R-02` (compatibilidade jogador-clube), `R-03` (clima de vestiário), `R-04` (bandas de incerteza do ScoutReport), `R-05` (retorno de empréstimo), `R-06` (CareerEvent + decaimento), `R-07` (química/entrosamento), `R-08` (empresário/Agent), `R-09` (pesos de overall por posição). Escala canônica de atributos: **0–100** (reconciliação).
- **Depende de:** Lote 0.
- **Ratificar → impacto:** publica o **dicionário único de atributos/derivados** — resolve **C-01** (grids incompatíveis GDD/UI/Prisma). Habilita entradas de economia (overall→valor), partida (F1) e scouting. Insumo obrigatório do passo 3 (dicionário de variáveis).
- **Rejeitar → impacto:** atributos seguem contraditórios entre motor, UI e banco; bloqueia Lotes 4 e 6 de fato.
- Checklist: `[ ] APROVAR  [ ] APROVAR C/ AJUSTE  [ ] REJEITAR  [ ] ADIAR` — assinatura: ____________

---

#### Lote 3 — Estrutura do clube e staff

- **Inclui:** `R-10` (modelo canônico único — **escala 1–5**, 6 núcleos, infra fora da escala), `R-11` (fórmula de nível geral 60/20/10/10), `R-12` (curva de aproveitamento por nível), `R-13` (capacidade operacional do CT), `R-14` (teto de contratação por nível).
- **Depende de:** Lote 0; usa Lote 2 (qualidade de staff afeta desenvolvimento do jogador).
- **Ratificar → impacto:** fixa a **escala 1–5** e remove a 1–10 — resolve **C-02**. Canoniza `M-STRUCTURE`/`M-STAFF` e o remapeamento de `R-83`. Insumo de custos (Lote 4) e de `staffLevel` na F21 (Lote 6).
- **Rejeitar → impacto:** persistem duas escalas (1–5 vs 1–10) em GDD/multiplayer/UI; reescrita de progressão e telas.
- Checklist: `[ ] APROVAR  [ ] APROVAR C/ AJUSTE  [ ] REJEITAR  [ ] ADIAR` — assinatura: ____________

---

#### Lote 4 — Economia, caixa e ledger

- **Inclui:** `R-41` (fórmulas conceituais §5), `R-42` (financialHealth), `R-43` (**caixa inicial R$ 5.000.000 = `500000000` amountMinor** + elenco **1.380 pts/23 jogadores/média-alvo 60**), `R-44` (pirâmide de geração), `R-45` (estágios de crise), `R-46` (índices de inflação), `R-47` (custo de scouting × precisão), `R-48` (limiares de exame médico), `R-49` ("fórmula do universo").
- **Onda de prontidão (ledger e conservação):** `R-109..R-115` — classes de fluxo e contas sistêmicas `SYS_*`, ledger de partidas dobradas, `INV-3a`/`INV-3b`, oferta derivada, relógio único de progressão (accrual × aplicação) e controlador demográfico. Fonte: [`../02-tecnico/13-ledger-e-conservacao-economica.md`](../02-tecnico/13-ledger-e-conservacao-economica.md). Fecha **B-04**.
- **Depende de:** Lote 2 (overall→valor de mercado), Lote 3 (estrutura→custos). **Fonte única do valor de caixa** referenciado por `R-51` (Lote 1).
- **Ratificar → impacto:** unifica o caixa inicial e os alvos econômicos; base do ledger, contas sistêmicas (faucets/sinks) e da calibração econômica. Endereça B-04 no eixo de valores.
- **Rejeitar → impacto:** caixa inicial e saúde financeira seguem `PROPOSTO`; `01-mundo`, `04-estrutura`, `09-anti-abuso` mantêm apenas a nota "R$ 1.000.000 superada"; bloqueia Lotes 5, 7 e 9.
- **C-04 resolvida:** R-43/R-57 fixam média-alvo 60 e máximo médio 62; o teto da Liga Inicial permanece ≤62. Ver ato de ratificação de 2026-07-13.
- Checklist: `[ ] APROVAR  [ ] APROVAR C/ AJUSTE  [ ] REJEITAR  [ ] ADIAR` — assinatura: ____________

---

#### Lote 5 — Temporada, competições e seleções

- **Inclui:** `R-58` (duração das fases), `R-59` (pesos por campeonato), `R-60` (pós-temporada Δ=[−4,+4]), `R-61` (prêmios/AwardScore), `R-62` (tetos por divisão), `R-63` (limites de inscrição — squad 26, estrangeiros 5, cota 2 formados), `R-64` (fadiga de convocação), `R-65` (limiar de reputação p/ seleção ≥85), `R-66` (compensação por lesão em convocação), `R-67` (dispensa médica como estado).
- **Onda de prontidão (calendário-âncora):** `R-101..R-107` — 16 clubes/30 rodadas/~63 dias, descanso mínimo, precedência de competições, buffer de adiamentos, datas FIFA, três camadas de estado de temporada e `seasonDays` por tamanho de mundo. Fonte: [`../01-game-design/06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md) + [`../02-tecnico/03-multiplayer-e-mundos.md`](../02-tecnico/03-multiplayer-e-mundos.md). Fecha **B-03** (calendário) e a divergência de camadas de estado.
- **Depende de:** Lote 1 (mundo), Lote 4 (prêmios/tetos).
- **Ratificar → impacto:** fecha fases, tetos, inscrição/elegibilidade e regras de seleção; insumo de Torcida (Lote 7) e da máquina de temporada (passo 6). Relaciona-se ao calendário inviável (**B-03**) — o valor de `R-58` deve ser fechado junto à incompatibilidade 38 rodadas × ~26 slots.
- **Rejeitar → impacto:** competições/inscrição/desempates seguem parciais; convocações e virada de temporada indefinidas.
- Checklist: `[ ] APROVAR  [ ] APROVAR C/ AJUSTE  [ ] REJEITAR  [ ] ADIAR` — assinatura: ____________

---

#### Lote 6 — Partida: fórmulas, design e comandos ao vivo

- **Inclui:** `R-15..R-24` (fórmulas **F1–F21** — atributo efetivo, fadiga, moral/momentum, tático, duelo/softmax/Poisson, chance de gol F11, cartões/lesão, nota/decisionScore, staffLevel, versionamento); `R-32` (cera emergente, sem command), `R-33` (curva de adaptação tática), `R-34` (suíte de calibração ~10.000 partidas); `R-25..R-29` (contratos de command: TTL de reserva, faixa de oferta [40%,250%], preço de ingresso [25%,400%], renovação/scouting, janela ao vivo — 5 subs, rate-limit); `R-96` (árvore de diálogo de `M-CONVO`).
- **Onda de prontidão (ruleset/replay):** `R-143..R-147` — kernel único + timestep canônico (1 tick = 60 s), protocolo de commands (`matchSequence`), `SimulationManifest` imutável + `MatchCommandLog`, RNG PCG + streams por finalidade e retenção manifesto×ticks. Fonte: [`../02-tecnico/15-ruleset-e-replay.md`](../02-tecnico/15-ruleset-e-replay.md). Fecha **B-05** (eixo de replay).
- **Depende de:** Lote 2 (atributos), Lote 3 (staffLevel na F21), Lote 4 (faixa de oferta em % do valor de mercado).
- **Ratificar → impacto:** torna o motor **executável e reprodutível**; define runtime único de partida (resolve C-09 pausa vs. contínuo vs. expiry) e a política de cera (resolve R-32 vs. M-LIVE). É a base de calibração (F1–F21 são "1ª passada" até o lote de ~10.000 partidas). Endereça B-05 no eixo de fórmulas.
- **Rejeitar → impacto:** partida não reproduzível; fairness incerta; reescrita de runtime; `M-LIVE`/catálogo/motor seguem divergentes.
- Checklist: `[ ] APROVAR  [ ] APROVAR C/ AJUSTE  [ ] REJEITAR  [ ] ADIAR` — assinatura: ____________

---

#### Lote 7 — Torcida, imprensa, reputação e relatórios

- **Inclui:** `R-68` (segmentos de torcida), `R-69` (satisfação assimétrica), `R-70` (rivalidade 0–100 + decay), `R-71` (8 posturas de comunicação), `R-72` (rótulos de reputação + histerese), `R-73` (crescimento/esfriamento ±20%/temporada), `R-74` (rebranding), `R-75` (**relatórios NÃO-PAGOS** — fecha o conflito com monetização), `R-76` (detalhe/frequência por comissão 1–5).
- **Depende de:** Lote 4 (receita/torcida), Lote 5 (resultados).
- **Ratificar → impacto:** fecha torcida/reputação/relatórios; `R-75` **remove** o conflito pay-to-win (relatórios diferenciados só por qualidade da comissão) — pré-requisito lógico do Lote 10.
- **Rejeitar → impacto:** crescimento composto da torcida (A-10) sem saturação aprovada; reabre o dilema de relatórios pagos.
- Checklist: `[ ] APROVAR  [ ] APROVAR C/ AJUSTE  [ ] REJEITAR  [ ] ADIAR` — assinatura: ____________

---

#### Lote 8 — Plataforma, arquitetura e operação (stack) · *espinha técnica paralela*

- **Inclui:** `R-77` (API = NestJS + TS), `R-78` (broker = Redis + BullMQ→RabbitMQ/NATS), `R-79` (busca = Postgres FTS+trigram→Meili/OpenSearch), `R-80` (**core = ECS** + event sourcing híbrido), `R-81` (gramática de efeitos + ordem determinística), `R-82` (escalas internas base 10000), `R-83` (divisões×ligas), `R-84` (dimensionamento de mundo), `R-85` (OIDC Google/Apple + drenagem), `R-86` (painel de saúde + governança de verificações), `R-87` (comunicação pós-correção + 6 níveis de papéis), `R-88` (metodologia de testes de equilíbrio); `R-30` (versão de ruleset no schema), `R-31` (quiet hours); `R-95` (credencial efêmera JWT ~15 min + refresh rotativo).
- **Onda de prontidão (infra e prontidão):** `R-125..R-130` (capacidade e custo — [`../02-tecnico/18-capacidade-e-custo.md`](../02-tecnico/18-capacidade-e-custo.md)), `R-131..R-137` (segurança/DR/HA — [`../02-tecnico/19-seguranca-dr-ha.md`](../02-tecnico/19-seguranca-dr-ha.md)), `R-138..R-142` (sagas e workflows — [`../02-tecnico/16-sagas-e-workflows.md`](../02-tecnico/16-sagas-e-workflows.md), fecha **B-07**), `R-148` (context map, aggregate roots, ownership de escrita e quebras de ciclo — [`../02-tecnico/12-context-map-e-blueprint.md`](../02-tecnico/12-context-map-e-blueprint.md)) e `R-116..R-124` (critérios de aceite, bandas e gate de promoção — [`../02-tecnico/17-criterios-de-aceite-e-bandas.md`](../02-tecnico/17-criterios-de-aceite-e-bandas.md), passos 8/10/13 da ordem de correção). Os critérios/bandas são a espinha de qualidade que atravessa partida, economia e demografia.
- **Depende de:** Lote 0. É pré-condição de **implementação** de todos os demais lotes (não de ratificação deles).
- **Ratificar → impacto:** resolve **P0.2** (paradigma do core) e **P0.4** (stack); habilita context map/aggregates (passo 4), ruleset/replay (passo 8) e o schema executável (passo 9). Fixa broker, busca e escalas fixed-point.
- **Rejeitar → impacto:** stack, core e broker seguem `PROPOSTO`; nenhum domínio pode ser implementado como produção; `00`/`07`/`04`/`03` técnicos permanecem propostas.
- Checklist: `[ ] APROVAR  [ ] APROVAR C/ AJUSTE  [ ] REJEITAR  [ ] ADIAR` — assinatura: ____________

---

#### Lote 9 — Estádio, região e valores numéricos

- **Inclui:** `R-89` (setores-padrão + preço por setor), `R-90` (valores de estádio/região — capacidade por divisão, deterioração, manutenção, mando, elasticidade), `R-91` (granularidade de exibição de indicadores).
- **Depende de:** Lote 4 (receita de bilheteria), Lote 1 (região).
- **Ratificar → impacto:** fecha os valores numéricos de estádio (`08-estadio`) e a regra de exibição de indicadores por qualidade de comissão.
- **Rejeitar → impacto:** bilheteria, mando e telas de estádio/finanças seguem com números `PROPOSTO`.
- Checklist: `[ ] APROVAR  [ ] APROVAR C/ AJUSTE  [ ] REJEITAR  [ ] ADIAR` — assinatura: ____________

---

#### Lote 10 — Monetização e loja

- **Inclui:** `R-92` (catálogo de cosméticos de lançamento), `R-93` (passe de temporada cosmético).
- **Depende de:** Lote 0; **pré-requisito lógico:** `R-75` (Lote 7) já garante relatórios não-pagos.
- **Ratificar → impacto:** fecha o catálogo comercial cosmético sem pay-to-win; canoniza `14-monetizacao` e a Loja.
- **Rejeitar → impacto:** Loja e passe seguem `PROPOSTO`; superfícies de loja marcadas como pendentes na UI.
- Checklist: `[ ] APROVAR  [ ] APROVAR C/ AJUSTE  [ ] REJEITAR  [ ] ADIAR` — assinatura: ____________

---

#### Lote 11 — UI, design system e guia · *vem por último*

- **Inclui:** `R-98` (design tokens concretos), `R-99` (specs de API dos 10 componentes + 6 wireframes densos), `R-100` (site do guia — template Astro + 42 capítulos), `R-97` (spec do site do guia — subdomínio/rotas/PDF), `R-94` (apêndice de fluxos de exceção).
- **Depende de:** **todos os lotes de domínio** (a UI e o guia só devem refletir regra ratificada — M-10) e do Lote 8 (frontend/realtime).
- **Ratificar → impacto:** canoniza tokens, componentes, wireframes e o guia; encerra a divergência marca vs. verde provisório (M-08) e "guia com regras não fechadas".
- **Rejeitar → impacto:** design system, wireframes e guia seguem `PROPOSTO`; retrabalho de telas centrais que hoje refletem regras erradas (M-STRUCTURE/M-STAFF/M-LIVE).
- Checklist: `[ ] APROVAR  [ ] APROVAR C/ AJUSTE  [ ] REJEITAR  [ ] ADIAR` — assinatura: ____________

---

### 3.3 Índice rápido `R-##` → Lote

| Faixa | Lote | Faixa | Lote |
|---|---|---|---|
| R-01 | 0 (RATIFICADO) | R-50..R-57 | 1 |
| R-02..R-09 | 2 | R-58..R-67 | 5 |
| R-10..R-14 | 3 | R-68..R-76 | 7 |
| R-15..R-24 | 6 | R-77..R-88 | 8 |
| R-25..R-29 | 6 | R-89..R-91 | 9 |
| R-30..R-31 | 8 | R-92..R-93 | 10 |
| R-32..R-34 | 6 | R-94 | 11 |
| R-35..R-40 | *reservados* | R-95 | 8 |
| R-41..R-49 | 4 | R-96 | 6 |
| — | — | R-97..R-100 | 11 |
| R-101..R-107 | 5 (temporada) | R-125..R-130 | 8 (capacidade) |
| R-108 | *reservado* | R-131..R-137 | 8 (segurança/DR) |
| R-109..R-115 | 4 (ledger) | R-138..R-142 | 8 (sagas) |
| R-116..R-124 | 8 (critérios/bandas) | R-143..R-147 | 6 (replay) |
| R-148 | 8 (blueprint de domínio) | — | — |

---

## 4. Protocolo de promoção

Como um `R-##` sai de **RECOMENDADA (a ratificar)** e vira **CANÔNICO** (ou é encerrado). O gatilho é **sempre** uma decisão explícita do dono — nada é promovido em silêncio.

### 4.1 Fluxo (por lote, de preferência)

1. **Revisão no painel.** O dono lê o card do lote (§3.2) e escolhe uma ação: **APROVAR**, **APROVAR C/ AJUSTE**, **REJEITAR** ou **ADIAR** — assinando.
2. **Registro no ADR.** Em [`./registro-de-decisoes.md`](./registro-de-decisoes.md), a entrada de cada `R-##` do lote muda de estado:
   - APROVAR → **RATIFICADA** (acrescentar `· RATIFICADA por <dono> em <data>`);
   - APROVAR C/ AJUSTE → **RATIFICADA** com o valor final anotado (o valor proposto vira nota "valor original: …");
   - REJEITAR → **REJEITADA** + direção substituta (nova entrada `R-148+` se houver decisão nova);
   - ADIAR → permanece **RECOMENDADA** com nota de adiamento.
   A nota de fechamento da Série R (§6 do ADR, *"Estado da Série R"*) é atualizada.
3. **Propagação do rótulo aos docs derivados.** Nos documentos que codificam aquele `R-##`, o marcador `> **Recomendação (a ratificar — R-##):**` é reescrito:
   - ratificada → vira nota canônica (remove o disclaimer "a ratificar"; opcionalmente `> **Canônico (R-## RATIFICADA):**`);
   - rejeitada → o trecho vira `> **SUPERADO (R-## REJEITADA):**` apontando a direção substituta.
4. **Atualização das tabelas de status.** A §2 deste documento moveu os documentos afetados de `PROPOSTO` para `CANÔNICO` após a ratificação conjunta de 2026-07-13. O registro de fechamento está em [`../BACKLOG-PENDENCIAS.md`](../BACKLOG-PENDENCIAS.md).
5. **Append-only.** Nenhuma versão anterior é apagada (resolução 27.10.6 do ADR: *"a história pode ser corrigida, mas a versão anterior nunca é apagada"*). Rejeições e ajustes ficam registrados.

### 4.2 Regras de integridade da promoção

- **Um lote só é totalmente `CANÔNICO` quando todos os seus `R-##` estão ratificados** e as **cross-deps** (ex.: `R-51`←`R-43`; `R-83`←`R-10`) estão consistentes.
- **Ratificar um lote não ratifica os lotes dos quais ele depende** — se houver dependência não ratificada, o lote fica `RATIFICADA C/ PENDÊNCIA DE DEPENDÊNCIA` até a base fechar.
- **Valores de "1ª passada" (F1–F21, coeficientes econômicos) podem ser ratificados como *estrutura*** e recalibrados depois via versão de ruleset (`R-24`/`R-30`, `R-34`/`R-88`) **sem** reabrir a decisão de produto — a calibração muda número, não princípio.
- **Contradições C-01..C-12 foram decididas** nos atos de 2026-07-13; mudanças futuras exigem novo ID e análise de impacto.
- **A promoção de UI/guia (Lote 11) exige que os lotes de domínio referenciados já estejam ratificados** (M-10): a interface não pode canonizar regra que o ADR ainda trata como proposta.

### 4.3 Estados normativos (referência de rótulo)

| Rótulo | Significado | Onde aparece |
|---|---|---|
| **RATIFICADA** | decidida pelo dono; canônica | ADR (estado do `R-##`) |
| **RECOMENDADA (a ratificar)** | proposta com valor sugerido; direção de trabalho | ADR + marcador nos docs |
| **REJEITADA** | descartada; direção substituta registrada | ADR |
| **SUPERADO** | substituído por decisão/versão posterior | docs derivados, legado |
| **CANÔNICO / PROPOSTO / REFERÊNCIA** | status **do documento** (agregado dos `R-##`) | §2 deste documento |

---

> **Encerramento honesto (B-01):** enquanto os Lotes 1–11 não forem ratificados, **a baseline do projeto continua PROPOSTA**. Este documento é o painel para fechar isso lote a lote; a "prontidão" plena depende da ratificação **e** da nova auditoria (passo 16 da ordem de correção). A única verdade fechada hoje é o **Lote 0 (R-01)**.
