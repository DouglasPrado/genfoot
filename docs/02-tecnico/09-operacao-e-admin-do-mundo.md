# Operação e Administração do Mundo

> **Status:** Rascunho consolidado · **Fontes:** chats/documento-definitivo-escopo.md (Seção 21) · **Revisão:** 2026-07-10

Este documento consolida a visão de **operação e administração do mundo** do **Grinta** (manager de futebol online, jogadores únicos, mundo persistente): o painel de gestão do mundo, as verificações periódicas de saúde econômica e demográfica, as correções administrativas sobre o estado do jogo, os níveis de permissão administrativa, os testes de equilíbrio em grande volume e a regra que limita o papel da IA generativa.

O foco aqui é a **saúde e o balanceamento do MUNDO/JOGO** — economia, população de jogadores, equilíbrio de divisões, integridade competitiva. Ele é **complementar** à plataforma técnica: a mecânica de permissões por função, o log de auditoria imutável, o contrato de correções e os *health checks* de infraestrutura já estão especificados em [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md). Onde algo já vive na plataforma, este documento **aponta** em vez de reespecificar, e descreve apenas a camada de mundo.

O princípio que atravessa todas as seções é único: **a administração corrige falhas, aplica regras e preserva a competição — nunca altera resultados de forma discricionária.** O mundo deve permanecer consistente, auditável e recuperável.

## Sumário

- [1. Princípio operacional](#1-principio-operacional)
- [2. Painel administrativo do mundo](#2-painel-administrativo-do-mundo)
- [3. Verificações de saúde periódicas](#3-verificacoes-de-saude-periodicas)
- [4. Correções administrativas](#4-correcoes-administrativas)
- [5. Permissões administrativas em níveis](#5-permissoes-administrativas-em-niveis)
- [6. Testes de equilíbrio em grande volume](#6-testes-de-equilibrio-em-grande-volume)
- [7. IA generativa: fronteira de decisão](#7-ia-generativa-fronteira-de-decisao)
- [8. Pendências consolidadas](#8-pendencias-consolidadas)
- [9. Documentos relacionados](#9-documentos-relacionados)

---

## 1. Princípio operacional

O mundo do Grinta precisa permanecer **consistente, auditável e recuperável**. A administração atua para corrigir falhas, aplicar regras e preservar a competição — **não para alterar resultados discricionariamente**.

Desse princípio derivam três posturas que valem para todo este documento:

- **Correção sobre o futuro, não sobre o passado.** Ajustes de balanceamento (econômico, demográfico, competitivo) devem atuar sobre gerações e regras futuras, evitando alterar retroativamente jogadores e resultados legítimos.
- **Rastreabilidade total.** Toda ação administrativa é registrada com estado anterior, motivo e responsável (ver [§4](#4-correcoes-administrativas)), sobre a auditoria imutável descrita na plataforma técnica.
- **Autoridade do servidor.** O painel e as ferramentas de operação leem e corrigem o estado do mundo, mas as regras oficiais permanecem executadas pelo backend autoritativo.

> **Nota:** a distinção entre **saúde técnica** (jobs, filas, latência, integridade de dados) e **saúde de mundo** (economia, demografia, equilíbrio competitivo) é deliberada. A primeira é da plataforma; a segunda é o objeto deste documento.

---

## 2. Painel administrativo do mundo

O painel administrativo é a superfície de gestão que permite à operação **acompanhar o estado vivo do mundo**. A operação precisa acompanhar continuamente os seguintes **11 itens monitorados**:

| # | Item monitorado | O que observa | Referência de domínio |
| --- | --- | --- | --- |
| 1 | **Saúde da economia** | Inflação/deflação, liquidez, temperatura de mercado | [`../01-game-design/03-economia.md`](../01-game-design/03-economia.md) |
| 2 | **População e distribuição de jogadores** | Volume, pirâmide etária, distribuição por posição | [`../01-game-design/02-sistema-de-jogadores.md`](../01-game-design/02-sistema-de-jogadores.md) |
| 3 | **Competições e calendários** | Andamento de ligas/copas, aderência ao calendário | [`../01-game-design/06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md) |
| 4 | **Partidas pendentes** | Jogos não processados ou represados | [`./05-catalogo-de-regras-e-formulas.md`](./05-catalogo-de-regras-e-formulas.md) |
| 5 | **Clubes em crise** | Clubes sob plano de recuperação, risco de insolvência | [`../01-game-design/04-estrutura-do-clube-e-staff.md`](../01-game-design/04-estrutura-do-clube-e-staff.md) |
| 6 | **Transferências suspeitas** | Negociações sinalizadas por anti-abuso | [`../01-game-design/09-anti-abuso-e-onboarding.md`](../01-game-design/09-anti-abuso-e-onboarding.md) |
| 7 | **W.O.** | Ausências, abandonos e derrotas por não comparecimento | [`../01-game-design/09-anti-abuso-e-onboarding.md`](../01-game-design/09-anti-abuso-e-onboarding.md) |
| 8 | **Punições** | Sanções ativas, filas de revisão e recurso | [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) |
| 9 | **Processos de fim de temporada** | Rebaixamento/acesso, premiação, virada de ciclo | [`../01-game-design/06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md) |
| 10 | **Falhas de processamento** | Erros em jobs de simulação, economia e fechamento | [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) |
| 11 | **Integridade das inscrições e tabelas** | Consistência de inscrições, chaveamentos e classificações | [`../01-game-design/06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md) |

O painel é **primariamente de visão e diagnóstico do mundo**. Ele consolida sinais que orientam decisões de balanceamento (via geração/regras futuras) e de correção pontual (via [§4](#4-correcoes-administrativas)).

> **Delimitação com a plataforma:** métricas de infraestrutura (latência, saturação de filas, DLQ, estado de deploy, *feature flags*, *kill switches*) **não** são reespecificadas aqui — vivem em [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) (§7 a §9). O painel de mundo pode **exibir** um resumo desses sinais, mas a definição canônica é técnica.

> **Recomendação (a ratificar — R-86):** painel de saúde do mundo. **Layout:** grade de **11 cards** (um por item da tabela), cada card com valor atual, mini-tendência e semáforo (verde/amarelo/vermelho); o clique abre **drill-down** de dois níveis (agregado do mundo → lista de entidades afetadas: clubes, competições, partidas, contas). **Alerta ativo vs. visível:** um indicador **vira alerta ativo** (notifica o operador, entra na fila de operação) ao cruzar o limiar **vermelho**; o **amarelo** fica apenas **visível** no painel, sem notificar. **Limiares por item:** derivam das faixas-alvo dos eixos de saúde (R-86 no §3) e dos critérios econômicos de [`../01-game-design/03-economia.md`](../01-game-design/03-economia.md); itens operacionais (partidas represadas, falhas de processamento, W.O., integridade de tabelas) alertam em **qualquer ocorrência não resolvida**. Racional: separar "ativo" de "visível" evita fadiga de alerta e prioriza o que exige ação. Compartilha **R-86** com as verificações periódicas (§3).

---

## 3. Verificações de saúde periódicas

O mundo realiza **verificações periódicas de saúde** para detectar desvios de balanceamento antes que comprometam a competição. Os eixos verificados são:

- **Inflação e deflação** — variação do poder de compra e do valor da moeda do mundo.
- **Concentração de riqueza** — quão desigual está a distribuição de caixa entre clubes; excesso de clubes ricos ou pobres.
- **Quantidade de livres** — volume de jogadores sem clube (agentes livres) em relação à demanda.
- **Idade e posição dos jogadores (pirâmide etária)** — distribuição demográfica e por posição, evitando escassez ou excesso estrutural.
- **Equilíbrio das divisões** — dispersão de força competitiva entre e dentro das divisões.
- **Quantidade de prodígios** — frequência de jogadores excepcionais gerados, para não inflar nem esvaziar o topo de talento.
- **Lesões** — incidência agregada, para detectar desvios do esperado.
- **Base** — saúde das categorias de base e do funil de formação.
- **Partidas e calendário** — aderência do processamento ao calendário oficial.
- **Abuso e contas relacionadas** — sinais agregados de manipulação, multi-conta e clubes satélite.

### Postura de correção: futuro, não retroativo

A regra central deste eixo: **a correção deve atuar sobre gerações e regras futuras, evitando alterar retroativamente jogadores e resultados legítimos.**

Na prática, quando uma verificação aponta desvio (por exemplo, inflação acima do alvo ou excesso de prodígios), a resposta preferencial é **ajustar parâmetros de geração e regras** aplicadas dali para frente — não reescrever o histórico. Isso preserva a legitimidade do que já aconteceu no mundo.

> **Delimitação:**
> - Os **critérios econômicos** (alvos de inflação, saúde financeira, temperatura de mercado, oferta/demanda de livres) são governados por [`../01-game-design/03-economia.md`](../01-game-design/03-economia.md). Este documento trata da **verificação operacional** desses indicadores, não da sua definição de design.
> - As verificações de **abuso e contas relacionadas** apoiam-se no *risk score* global e nas detecções de [`../01-game-design/09-anti-abuso-e-onboarding.md`](../01-game-design/09-anti-abuso-e-onboarding.md); aqui elas entram como sinal de saúde de mundo, não como (re)definição das regras anti-abuso.

> **Recomendação (a ratificar — R-86):** verificações de saúde — periodicidade, faixas-alvo e governança. **Periodicidade:** eixos econômicos e demográficos (inflação/deflação, concentração de riqueza, livres, pirâmide etária, prodígios) verificados a **cada virada de dia do mundo**; equilíbrio de divisões e base a **cada rodada/semana**; partidas/calendário **continuamente**; abuso/contas relacionadas **contínuo + varredura diária**. **Faixas-alvo (1ª passada, a calibrar):** inflação do mundo em banda-alvo estreita; concentração de riqueza abaixo de um teto de desigualdade; livres dentro de uma razão saudável oferta/demanda; prodígios como fração-alvo pequena das safras — os valores numéricos são governados por [`../01-game-design/03-economia.md`](../01-game-design/03-economia.md) e pelo catálogo de fórmulas, não fixados aqui. **Governança do "atuar sobre o futuro":** os parâmetros ajustáveis são os de **geração e regras** (versão de ruleset + data efetiva, ver `./00-arquitetura-geral.md` §8), alterados por operador de nível **≥ Correção** (R-87 no §5), sempre por **versão de regulamento com data efetiva e comunicação** — nunca de forma retroativa sobre jogadores/resultados legítimos. Compartilha **R-86** com o painel (§2). Calibrar faixas no lote de testes de equilíbrio (§6).

---

## 4. Correções administrativas

Correções administrativas resolvem **falhas concretas de estado do mundo**, sempre de forma rastreável. Os casos cobertos incluem:

- **Partida interrompida** — jogo que não concluiu processamento.
- **Duplicidade** — entidades ou eventos duplicados (registros, inscrições, transações).
- **Tabela incorreta** — classificação, chaveamento ou pontuação inconsistente.
- **Contrato processado de forma errada** — erro no processamento de contrato de jogador.
- **Premiação duplicada** — pagamento de prêmio contabilizado mais de uma vez.
- **Transferência fraudulenta** — negociação identificada como abuso/fraude.
- **Falha no encerramento da temporada** — erro no fechamento de ciclo (acesso/rebaixamento, premiação, virada).

### Garantia de rastreabilidade

**Toda correção preserva registro do estado anterior, motivo e responsável.** Esses três elementos são obrigatórios e não opcionais: uma correção sem estado anterior preservado, sem motivo declarado ou sem responsável identificado não é admissível.

> **Delimitação com a plataforma:** o **contrato técnico da correção** — tipos, estados, escopo, reversibilidade, correção em partida ao vivo versus pós-partida, e o evento de auditoria imutável — já está especificado em [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) (§5 Auditoria e §6 Correções administrativas). Este documento **não reespecifica** esse contrato; descreve apenas **quais falhas de mundo** justificam correção e reafirma a exigência de estado anterior/motivo/responsável no vocabulário de operação de jogo.

> **Recomendação (a ratificar — R-87):** comunicação ao usuário após correções administrativas. Proposta: toda correção que **altera estado percebido pelo usuário** (tabela, saldo, contrato, resultado, punição) gera uma **notificação in-app** ao(s) afetado(s), com **motivo em linguagem clara, o que mudou (antes → depois) e referência do caso** — sem expor dados internos de outros usuários nem a fórmula anti-abuso; correções **puramente técnicas** e invisíveis ao jogador (ex.: dedup de evento sem efeito no estado percebido) **não** notificam, apenas ficam na trilha de auditoria. Canal: notificação do app (+ e-mail quando crítico, ex.: punição/reversão). Racional: transparência proporcional ao impacto, preservando a confiança sem vazar operação. Compartilha **R-87** com os níveis de permissão (§5).

---

## 5. Permissões administrativas em níveis

Ações administrativas são **limitadas por função**. Nem todo operador pode fazer tudo: **visualização, suporte, revisão, correção financeira, punição e reversão devem possuir níveis de acesso diferentes.**

Os níveis conceituais de permissão são:

| Nível | Escopo típico | Pode alterar estado do mundo? |
| --- | --- | --- |
| **Visualização** | Ler painel, métricas e histórico | Não |
| **Suporte** | Atendimento ao usuário, consulta de casos | Não (ou ações de baixo impacto) |
| **Revisão** | Analisar casos sinalizados, instruir decisões | Não diretamente |
| **Correção (financeira)** | Aplicar correções de estado (ex.: financeiro, tabela) | Sim, dentro do escopo |
| **Punição** | Aplicar sanções previstas | Sim |
| **Reversão** | Reverter ações/estados sob controle rígido | Sim, máximo privilégio |

O ordenamento vai da menor à maior capacidade de impacto: visualização e suporte são de leitura ou baixo impacto; correção, punição e reversão alteram o estado do mundo e exigem controle mais estrito.

> **Delimitação com a plataforma:** o **modelo de permissões por função** (matriz de ações, escopo, contas e sessões administrativas, reautenticação para ações críticas, segregação de funções e conflito de interesse) é canônico em [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) (§2 e §4). Esta seção descreve os **níveis na ótica de operação de mundo**; a implementação de papéis e a matriz efetiva de permissões vivem na plataforma técnica. As punições em si seguem o catálogo de sanções de [`../01-game-design/09-anti-abuso-e-onboarding.md`](../01-game-design/09-anti-abuso-e-onboarding.md).

> **Recomendação (a ratificar — R-87):** mapeamento definitivo papel → ações e processo. Proposta: consolidar os seis níveis (Visualização, Suporte, Revisão, Correção, Punição, Reversão) como **papéis cumulativos** (cada um herda o anterior), com a **matriz efetiva de ações/escopo canônica na plataforma** ([`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) §2/§4) — este documento fixa a **ótica de operação de mundo**. **Segregação de funções:** quem **revisa** um caso não é quem **aplica** a punição/reversão dele (conflito de interesse); ações de nível ≥ Correção exigem **reautenticação** (§4 da plataforma). **Atendimento e recurso:** caso aberto pelo usuário → triagem por Suporte → análise por Revisão → decisão pelo nível competente; **recurso** reabre o caso para um revisor distinto do original. **Prazos-alvo (1ª passada):** primeira resposta de atendimento e janela de recurso definidas por SLA operacional a ratificar com produto. Compartilha **R-87** com a comunicação de correções (§4). Fonte: §25.4 do escopo.

---

## 6. Testes de equilíbrio em grande volume

O jogo precisa ser **testado em grande volume** (simulações massivas de mundos/temporadas) para observar o comportamento emergente antes e depois de mudanças de regra. Os fenômenos observados são:

- **Distribuição de placares** — se os resultados seguem uma distribuição plausível.
- **Eficácia de estilos** — se estilos de jogo/táticas ficam equilibrados (nenhum dominante ou inútil).
- **Lesões** — incidência e impacto agregados.
- **Evolução** — curvas de desenvolvimento e declínio de jogadores.
- **Mercado** — formação de preços, liquidez e comportamento de transferências.
- **Finanças** — sustentabilidade econômica dos clubes ao longo de temporadas.
- **Comportamento dos clubes controlados pelo jogo** — decisões da IA de gestão dos clubes não controlados por humanos.
- **Manipulações e abusos** — se explorações conhecidas emergem sob escala.
- **Encerramento de temporadas** — se a virada de ciclo processa corretamente em massa.

Estes testes alimentam a postura de correção **sobre o futuro** (ver [§3](#3-verificacoes-de-saude-periodicas)): desvios observados em simulação orientam ajustes de parâmetros de geração e regras antes de afetarem mundos vivos.

> **Delimitação:** a infraestrutura de execução desses testes (ambientes, *harness* de simulação, testes como parte da arquitetura) está em [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) (§12). O comportamento dos clubes controlados pelo jogo é especificado em [`../01-game-design/07-inteligencia-artificial.md`](../01-game-design/07-inteligencia-artificial.md).

> **Recomendação (a ratificar — R-88):** metodologia dos testes de equilíbrio em grande volume (1ª passada). Cada **rodada de teste** simula **≥ 1.000 mundos × ≥ 10 temporadas** (amostra estatística alinhada ao lote de calibração do motor, ver `./05-catalogo-de-regras-e-formulas.md` §2.4), com **seeds fixas** para reprodutibilidade (§4.1 de `./00-arquitetura-geral.md`). **Métricas de aceitação:** distribuição de placares dentro de bandas plausíveis; nenhum estilo/tática com *win-rate* fora de faixa (nem dominante nem inútil); incidência de lesões, curvas de evolução, formação de preços, sustentabilidade financeira e virada de temporada dentro dos alvos do §3. **Gate de promoção:** uma mudança de regra só sai para mundos vivos se **todas** as métricas ficarem dentro da banda e **nenhuma invariante** falhar no lote; regressões bloqueiam a promoção (feature flag/versão de ruleset com data efetiva). Racional: transforma "testar em grande volume" em critério objetivo de release de regra. Calibrar tamanho da amostra e bandas com o histórico de execuções.

---

## 7. IA generativa: fronteira de decisão

Regra fechada e inegociável do Grinta:

> **Nenhuma inteligência generativa decide resultados ou estados competitivos. Ela pode ser usada apenas para transformar fatos já definidos em texto narrativo.**

Ou seja, a IA generativa **nunca decide o resultado — só transforma fatos em texto**. Placares, evolução de jogadores, finanças, punições, correções, classificações e qualquer estado competitivo são determinados exclusivamente pelo motor autoritativo do jogo. A camada generativa recebe fatos **já definidos** e produz narrativa (relatos de partida, notícias, resumos) sobre eles — sem poder alterá-los.

Isso mantém a fronteira clara entre **decisão** (sempre determinística e do servidor) e **apresentação** (narrativa, que pode ser generativa). A distinção **auditoria vs. narrativa** também é reforçada na plataforma técnica ([`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md), §5): o registro de fatos é a fonte de verdade; a narrativa é derivada e não-autoritativa.

---

## 8. Pendências consolidadas

Além das pendências pontuais indicadas por seção, permanecem abertos (fonte: Seção 25.4 do escopo definitivo, "Operação administrativa"):

- **Procedimentos de atendimento e recurso** — fluxo formal de suporte e contestação de decisões.
- **Prazos de revisão** — SLAs para análise de casos e recursos.
- **Níveis finais de permissão** — mapeamento definitivo papel↔ação (ver [§5](#5-permissoes-administrativas-em-niveis)).
- **Política de manutenção de mundo** — janelas, comunicação e impacto de manutenções.
- **Comunicação ao usuário após correções** — o que e como notificar (ver [§4](#4-correcoes-administrativas)).
- **Critérios de arquivamento de mundo inativo** — quando e como aposentar um mundo.

---

## 9. Documentos relacionados

- **Plataforma, segurança e auditoria técnica:** [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) — roles/permissões por função, auditoria imutável, contrato de correções, health checks técnicos, feature flags/kill switches, backups e recuperação. Fonte canônica da camada técnica; este documento é a visão de mundo/jogo complementar.
- **Anti-abuso e onboarding (design):** [`../01-game-design/09-anti-abuso-e-onboarding.md`](../01-game-design/09-anti-abuso-e-onboarding.md) — risk score, contas relacionadas, mercado suspeito, W.O., catálogo de punições.
- **Economia e balanceamento global:** [`../01-game-design/03-economia.md`](../01-game-design/03-economia.md) — modelo econômico, inflação, saúde financeira, mercado; base para as verificações de saúde econômica.
- **Temporada e competições:** [`../01-game-design/06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md) — calendário, encerramento de temporada, inscrições e tabelas.
- **Inteligência artificial (clubes controlados pelo jogo):** [`../01-game-design/07-inteligencia-artificial.md`](../01-game-design/07-inteligencia-artificial.md).
