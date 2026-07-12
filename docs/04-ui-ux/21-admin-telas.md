# Admin — Telas

> **Status:** Rascunho consolidado · **Fontes:** docs/02-tecnico/09-operacao-e-admin-do-mundo.md, docs/02-tecnico/04-plataforma-seguranca-operacoes.md, docs/01-game-design/09-anti-abuso-e-onboarding.md, docs/01-game-design/03-economia.md, docs/01-game-design/06-temporada-e-competicoes.md · **Revisão:** 2026-07-11

Telas do **admin do mundo** (Next.js), IDs `A-*`. O admin é **primariamente diagnóstico**; toda escrita exige **motivo obrigatório**, grava no **audit log imutável** e respeita o **RBAC**. Fluxos em [doc 20](20-admin-fluxos.md). Layout: sidebar + top bar (operador, mundo, busca). Template em [00 §Template](00-visao-geral-e-design-system.md#template-de-especificação-de-tela).

> **Delimitação:** onde a definição canônica é técnica (matriz de permissões, contrato de correção, health checks de infra), esta tela **exibe** e **aponta** para [`../02-tecnico/04-plataforma-seguranca-operacoes.md`](../02-tecnico/04-plataforma-seguranca-operacoes.md); não a reespecifica. Limiares/valores são pendências da fonte.

---

## `A-LOGIN` — Login / RBAC / reautenticação

- **Objetivo:** autenticar o operador e carregar papel/permissões.
- **Componentes e dados:** SSO; papel efetivo (Visualização/Suporte/Revisão/Correção/Punição/Reversão); sessões administrativas; **reautenticação** para ações críticas; segregação de funções; exibição de **sessão elevada/temporária ativa** (escopo e validade).
- **Ações:** entrar; reautenticar; abrir `A-IAM` (operadores, papéis e sessões).
- **Estados:** sem papel → acesso negado; sessão sensível expira mais rápido.
- **Referências:** [`04-plataforma §2, §4`](../02-tecnico/04-plataforma-seguranca-operacoes.md); [`09-op §5`](../02-tecnico/09-operacao-e-admin-do-mundo.md).

## `A-WORLDS` — Seletor de mundo

- **Objetivo:** escolher o mundo a operar (define o escopo).
- **Componentes e dados:** lista de mundos (nome, temporada, nº de clubes/usuários, status: ativo/manutenção/arquivado, sinais de saúde resumidos); sinal de **backup `AT_RISK`** por mundo → `A-BACKUPS` [`04-plataforma §9, §10`].
- **Ações:** abrir mundo (`A-WORLD`); (com permissão) controles de **ciclo de vida operacional** do mundo — transições `HEALTHY…ARCHIVED`, entrar/sair de `READ_ONLY`, arquivar [`04-plataforma §9`].
- **Estados:** mundo em `WORLD_READ_ONLY` sinalizado.
- **Referências:** [`03-multiplayer-e-mundos`](../02-tecnico/03-multiplayer-e-mundos.md); [`09-op §8`](../02-tecnico/09-operacao-e-admin-do-mundo.md); [`04-plataforma §9, §10`](../02-tecnico/04-plataforma-seguranca-operacoes.md).

## `A-WORLD` — Painel do mundo

- **Objetivo:** acompanhar o estado vivo do mundo em um lugar.
- **Layout:** grade de 11 cartões monitorados + alertas ativos + resumo de saúde técnica.
- **Componentes e dados** (11 itens, [doc 09-op §2](../02-tecnico/09-operacao-e-admin-do-mundo.md)): saúde da economia; população/distribuição de jogadores; competições/calendários; partidas pendentes; clubes em crise; transferências suspeitas; W.O.; punições; processos de fim de temporada; falhas de processamento; integridade de inscrições/tabelas. Cada cartão com indicador e *drill-down*.
- **Ações:** abrir cada seção; filtrar alertas ativos vs. apenas visíveis.
- **Estados:** cartão em alerta destacado; resumo de infra (latência/filas/DLQ) como espelho não canônico, com **atalhos** para `A-OPS` (jobs/DLQ), `A-FLAGS` (kill switch) e `A-INCIDENTS`.
- **Referências:** [`09-op §2`](../02-tecnico/09-operacao-e-admin-do-mundo.md). > **Pendência:** layout fino, granularidade de drill-down e limiares de alerta.

## `A-ECONOMY` — Saúde econômica e demografia

- **Objetivo:** verificar equilíbrio econômico/demográfico e orientar correção sobre o futuro.
- **Componentes e dados** (`GameEconomyState` + eixos de verificação): totalClubs, totalMoney, averageClubCash; totalPlayers/active/free/youth/retiring; averagePlayerAge, ageDistribution, positionDistribution, averagePlayerPrice; inflationIndex, salaryIndex, generationNeed; **pirâmide etária** alvo vs. real; concentração de riqueza; quantidade de livres; quantidade de prodígios; incidência de lesões; saúde da base; equilíbrio de divisões.
- **Ações:** abrir eixo; propor ajuste de parâmetros (`A-RULES`).
- **Estados:** desvio destacado; correção **preferencial sobre gerações/regras futuras**, não retroativa.
- **Referências:** [`09-op §3`](../02-tecnico/09-operacao-e-admin-do-mundo.md); [`03-economia §14`](../01-game-design/03-economia.md).

## `A-COMPETITIONS` — Competições, calendário, inscrições

- **Objetivo:** acompanhar competições e garantir a integridade competitiva.
- **Componentes e dados:** andamento de ligas/copas, aderência ao calendário; **inscrições e tabelas** (consistência de chaveamentos/classificações); **processos de fim de temporada** (rebaixamento/acesso, premiação, virada); **homologação** (condições, provisório→oficial, correção livre antes vs. versão nova depois).
- **Ações:** homologar/confirmar; disparar correção de tabela/inscrição (`A-CORRECTIONS`); rodar auditoria de temporada.
- **Estados:** competição travada/represada; título provisório aguardando homologação.
- **Referências:** [`06-temporada §14, §15`](../01-game-design/06-temporada-e-competicoes.md); [`09-op §2 itens 3, 9, 11`](../02-tecnico/09-operacao-e-admin-do-mundo.md).

## `A-MATCHES` — Partidas pendentes / falhas

- **Objetivo:** ver jogos não processados e erros de simulação.
- **Componentes e dados:** partidas represadas/não concluídas; falhas em jobs de simulação/economia/fechamento (com estado do job).
- **Ações:** reprocessar partida (`A-CORRECTIONS`); investigar falha.
- **Estados:** partida interrompida como caso de correção; job em DLQ (espelho da plataforma).
- **Referências:** [`09-op §2 itens 4, 10`](../02-tecnico/09-operacao-e-admin-do-mundo.md); [`05-catalogo-de-regras-e-formulas`](../02-tecnico/05-catalogo-de-regras-e-formulas.md).

## `A-CLUBS` — Clubes (crise, licença, intervenção)

- **Objetivo:** monitorar clubes em risco e estados institucionais.
- **Componentes e dados:** clubes sob **plano de recuperação**, risco de insolvência; **licenciamento** (padrão mínimo, plano de adequação, restrições, multas, impedimento); estados de intervenção; clubes controlados pela IA.
- **Ações:** abrir clube; correção financeira (com papel); acompanhar licença.
- **Estados:** clube de usuário em crise entra em **recuperação, nunca encerramento**; clubes de IA podem ser encerrados/fundidos só entre temporadas (preservando histórico).
- **Referências:** [`04-estrutura`](../01-game-design/04-estrutura-do-clube-e-staff.md); [`01-mundo §1.3–1.5`](../01-game-design/01-mundo-persistente-e-clubes.md); [`09-op §2 item 5`](../02-tecnico/09-operacao-e-admin-do-mundo.md).

## `A-MODERATION` — Anti-abuso

- **Objetivo:** central de detecção e análise de abuso.
- **Layout:** abas — Risk score · Contas relacionadas · Mercado suspeito · Satélite/Farm · Manipulação esportiva · **Bot/Automação**.
- **Componentes e dados:** **RiskAssessment** por ação sensível e faixa (baixo/moderado/alto/crítico/grave); **contas relacionadas** (graus fraca/moderada/forte/confirmada + sinais: dispositivo, IP, login, transferências, empréstimos favoráveis, sincronização); **mercado suspeito** (valor real, venda-abaixo/compra-acima, troca, cláusulas/parcelamento abusivos, manipulação de referência); **clube satélite/farm/assédio a jovens**; **manipulação esportiva** (derrota intencional, escalação sabotada, monitoramento de jogo decisivo entre relacionados); **Bot/Automação** (Dec. 1916/1917/1945: frequência impossível, propostas em massa, scraping, timing robótico → rate limit, cooldown, **captcha**).
- **Ações:** marcar/reclassificar relação; enviar caso à fila (`A-QUEUES`); aplicar sanção (`A-WO-SANCTIONS`); **revelar dado sensível** para investigação (ação auditada de `A-AUDIT`).
- **Estados:** privacidade preservada por permissão; fórmula não exposta; **cooldown/captcha** por conta em atividade robótica.
- **Referências:** [`09-anti-abuso §1.2–1.6`](../01-game-design/09-anti-abuso-e-onboarding.md).

## `A-WO-SANCTIONS` — W.O. e catálogo de punições

- **Objetivo:** tratar W.O./abandono e aplicar sanções.
- **Componentes e dados:** W.O. por clube (ausências, abandonos, derrota por não comparecimento); distinção má-gestão vs. abuso; **catálogo de sanções** (escala progressiva; tipos esportiva/financeira/reputação; suspensão de conta; exploração de bug).
- **Ações:** aplicar sanção (papel de punição; motivo obrigatório); registrar W.O.
- **Estados:** sanção pública vira notícia no mundo; recorrível.
- **Referências:** [`09-anti-abuso §1.7, §1.12`](../01-game-design/09-anti-abuso-e-onboarding.md).

## `A-QUEUES` — Filas de revisão / recurso / quarentena / delay

- **Objetivo:** processar casos que exigem julgamento humano.
- **Componentes e dados:** **fila de revisão** (duvidosos marcados; falso positivo não é punido automaticamente); **fila de recurso** (contestação do usuário, decisão registrada); **quarentena de ação** (pendente: jogador não muda, dinheiro não move, prazo de revisão); **delay anti-fraude** (efetivação adiada em ações de risco); **inbox de aprovação em quatro olhos** (2º revisor para ações de alto impacto). (Report de bug e vulnerabilidades: `A-BUGS`.)
- **Ações:** aprovar/rejeitar; liberar/converter em sanção; responder recurso.
- **Estados:** SLA de revisão (pendente de plataforma); cada decisão auditada.
- **Referências:** [`09-anti-abuso §1.13 (Dec. 1935–1939)`](../01-game-design/09-anti-abuso-e-onboarding.md).

## `A-CORRECTIONS` — Correções / reprocessamento / reversão

- **Objetivo:** resolver falhas concretas de estado do mundo, de forma rastreável.
- **Componentes e dados:** casos (partida interrompida, duplicidade, tabela incorreta, contrato errado, premiação duplicada, transferência fraudulenta, falha de encerramento); contrato técnico da correção (tipo, escopo, reversibilidade, ao vivo vs. pós-partida); **estado anterior + motivo + responsável** obrigatórios; reprocessamento seguro; **reversão** (máximo privilégio); estado **`AWAITING_APPROVAL`** (quatro olhos) para alto impacto [`04-plataforma §4`].
- **Ações:** aplicar correção; reprocessar; reverter (reautenticação); passo final de **comunicação ao usuário** via `A-BROADCAST` (o que/canal/detalhe — pendência de [`09-op §4`](../02-tecnico/09-operacao-e-admin-do-mundo.md)).
- **Estados:** correção nunca apaga (append-only no audit); comunica usuário quando aplicável; alto impacto aguarda 2º revisor (`AWAITING_APPROVAL`) antes de efetivar.
- **Referências:** [`09-op §4`](../02-tecnico/09-operacao-e-admin-do-mundo.md); [`04-plataforma §5, §6`](../02-tecnico/04-plataforma-seguranca-operacoes.md).

## `A-AUDIT` — Audit log imutável

- **Objetivo:** rastrear toda ação administrativa/sensível.
- **Componentes e dados:** por evento — quem, quando, clube, entidade afetada, **valor anterior/novo**, contexto, IP/dispositivo (por permissão), risk score, justificativa automática, **versão da regra**; append-only; correção cria novo log referenciando o anterior.
- **Ações:** buscar/filtrar; exportar; abrir entidade referenciada; ação **"revelar dado sensível"** (e-mail/token/documento) com **permissão + reautenticação + motivo + duração curta + auditoria** — usada por `A-MODERATION`/`A-SUPPORT` [`04-plataforma §5`].
- **Estados:** somente leitura; distinção auditoria (verdade) vs. narrativa (derivada); **buscas por dado sensível são auditadas**.
- **Referências:** [`09-anti-abuso (Dec. 1877, 1933, 1957)`](../01-game-design/09-anti-abuso-e-onboarding.md); [`04-plataforma §5`](../02-tecnico/04-plataforma-seguranca-operacoes.md).

## `A-SUPPORT` — Suporte e recursos

- **Objetivo:** atender usuários e conduzir recursos.
- **Componentes e dados:** casos de suporte; recursos abertos (motivo geral ao usuário); histórico do usuário/clube (por permissão); procedimentos de atendimento; **máquina de estados do ticket** (`OPEN…REOPENED/DUPLICATE/INVALID`); contrato de **impersonação** (`READ_ONLY_IMPERSONATION` padrão / `ASSISTED_IMPERSONATION`) com `supportAccessSessionId` visível/temporário/aprovado, **notificação ao usuário**, **verificação de identidade** e **proibições** durante impersonação [`04-plataforma §6`].
- **Ações:** responder; encaminhar à revisão (`A-QUEUES`); registrar decisão; iniciar impersonação (contrato + aprovação); **revelar dado sensível** ao usuário (ação auditada de `A-AUDIT`).
- **Estados:** impersonação sinalizada e temporária; > **Pendência:** procedimentos de atendimento/recurso e prazos de revisão (fonte em aberto).
- **Referências:** [`09-op §5, §8`](../02-tecnico/09-operacao-e-admin-do-mundo.md); [`04-plataforma §5, §6`](../02-tecnico/04-plataforma-seguranca-operacoes.md).

## `A-BALANCE` — Testes de equilíbrio / SimulationLab

- **Objetivo:** observar comportamento emergente antes/depois de mudanças de regra.
- **Componentes e dados:** execuções de simulação massiva; métricas (distribuição de placares, eficácia de estilos, lesões, evolução, mercado, finanças, IA de clubes, abusos emergentes, encerramento em massa); **SimulationLab** de cenários de abuso; verificações de saúde periódicas.
- **Ações:** disparar simulação; comparar resultados; promover mudança (via `A-RULES`, com *gate*).
- **Estados:** resultados alimentam correção **sobre o futuro**.
- **Referências:** [`09-op §6`](../02-tecnico/09-operacao-e-admin-do-mundo.md); [`09-anti-abuso (Dec. 1953)`](../01-game-design/09-anti-abuso-e-onboarding.md); [`04-plataforma §12`](../02-tecnico/04-plataforma-seguranca-operacoes.md).

## `A-RULES` — Versionamento de regras

- **Objetivo:** ajustar regras de geração/economia e anti-abuso para o futuro.
- **Componentes e dados:** versões de regra (versão, pesos, data, mundo, temporada, motivo); histórico de mudanças; diferença entre versões.
- **Ações:** criar nova versão; aplicar a partir de agora (não retroativa); registrar no audit log.
- **Estados:** mudança governada por permissão máxima; ligada a `A-ECONOMY`/`A-BALANCE`.
- **Referências:** [`09-anti-abuso (Dec. 1952)`](../01-game-design/09-anti-abuso-e-onboarding.md); [`09-op §3, §7`](../02-tecnico/09-operacao-e-admin-do-mundo.md).

---

> **IA generativa (regra fechada, transversal a todo o admin):** nenhuma IA generativa decide resultados ou estados competitivos no admin — placares, evolução, finanças, punições, correções e classificações são do motor autoritativo. A camada generativa só transforma **fatos já definidos** em narrativa. Ver [`09-op §7`](../02-tecnico/09-operacao-e-admin-do-mundo.md).
