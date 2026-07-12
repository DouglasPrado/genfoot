# Mobile — Fluxos

> **Status:** Rascunho consolidado · **Fontes:** docs/01-game-design/15-fluxos-completos.md, docs/01-game-design/10-experiencia-e-telas.md, docs/02-tecnico/08-frontend-cliente-e-tempo-real.md · **Revisão:** 2026-07-11

Este documento descreve **todos os fluxos** do app do jogador (Expo), ponta a ponta, mapeando cada passo às telas (`M-*`) e aos *commands* da API oficial. Ele traduz os 16 *golden paths* do jogo ([`../01-game-design/15-fluxos-completos.md`](../01-game-design/15-fluxos-completos.md)) em navegação real, acrescentando os fluxos de plataforma que o GDD não cobre (autenticação, sessão, tempo real, offline).

**Como ler.** Cada fluxo tem: **gatilho** (o que inicia), **passos** (tela → ação → efeito), **ramos/bordas** (exceções relevantes) e **referências**. O caminho descrito é o feliz; regras finas ficam nos docs de origem. IDs de tela seguem o [sitemap](01-navegacao-e-arquitetura-de-informacao.md#4-sitemap-completo--mobile).

## Índice de fluxos

**P. Plataforma e sessão**
- [MF-00 — Bootstrap, autenticação e sessão](#mf-00--bootstrap-autenticação-e-sessão)
- [MF-0A — Sincronização, offline e reconexão](#mf-0a--sincronização-offline-e-reconexão)
- [MF-0B — Notificações e navegação por contexto](#mf-0b--notificações-e-navegação-por-contexto)

**A. Entrada e ciclo de vida** (golden paths 1–3)
- [MF-01 — Criação e entrada em clube](#mf-01--criação-e-entrada-em-clube)
- [MF-02 — Retorno após ausência longa](#mf-02--retorno-após-ausência-longa)
- [MF-03 — Abandono ou troca de clube](#mf-03--abandono-ou-troca-de-clube)

**B. Ciclo da temporada** (4–6)
- [MF-04 — Início de temporada / pré-temporada](#mf-04--início-de-temporada--pré-temporada)
- [MF-05 — Ciclo semanal de gestão](#mf-05--ciclo-semanal-de-gestão)
- [MF-06 — Encerramento de temporada](#mf-06--encerramento-de-temporada)

**C. Partida** (7)
- [MF-07 — Preparação e partida](#mf-07--preparação-e-partida)

**D. Mercado, elenco e base** (8–11)
- [MF-08 — Contratação de jogador](#mf-08--contratação-de-jogador)
- [MF-09 — Venda de jogador](#mf-09--venda-de-jogador)
- [MF-10 — Empréstimo de jogador](#mf-10--empréstimo-de-jogador)
- [MF-11 — Jornada de um jovem](#mf-11--jornada-de-um-jovem)

**E. Elenco e saúde** (12)
- [MF-12 — Lesão e recuperação](#mf-12--lesão-e-recuperação)

**F. Finanças e estrutura** (13–14)
- [MF-13 — Ciclo financeiro mensal](#mf-13--ciclo-financeiro-mensal)
- [MF-14 — Projeto de infraestrutura](#mf-14--projeto-de-infraestrutura)

**G. Crises** (15–16)
- [MF-15 — Crise esportiva](#mf-15--crise-esportiva)
- [MF-16 — Crise financeira](#mf-16--crise-financeira)

**H. Micro-fluxos de gestão**
- [MF-17 — Treino e condição](#mf-17--treino-e-condição)
- [MF-18 — Conversa com atleta](#mf-18--conversa-com-atleta)
- [MF-19 — Imprensa e comunicação](#mf-19--imprensa-e-comunicação)
- [MF-20 — Renovação de contrato](#mf-20--renovação-de-contrato)
- [MF-21 — Convocação para seleção](#mf-21--convocação-para-seleção)
- [MF-22 — Configurar automações / delegar](#mf-22--configurar-automações--delegar)
- [MF-23 — Estádio: preço, manutenção e mando](#mf-23--estádio-preço-manutenção-e-mando)
- [MF-24 — Ação bloqueada por anti-abuso](#mf-24--ação-bloqueada-por-anti-abuso)
- [MF-25 — Personalização e loja](#mf-25--personalização-e-loja)

---

## P. Plataforma e sessão

### MF-00 — Bootstrap, autenticação e sessão

**Gatilho:** abertura do app.

1. **`M-SPLASH`** — carrega token de sessão do *secure storage*, versão de cliente e *feature flags*; abre WebSocket. Verifica compatibilidade de contrato (`clientVersion`); se `BREAKING`, mostra "atualize o app" e bloqueia commands críticos ([doc 08](../02-tecnico/08-frontend-cliente-e-tempo-real.md)).
2. Sem sessão → **`M-LOGIN`**. Ações: entrar (e-mail/senha ou provedor), ir a **`M-SIGNUP`** ou **`M-RECOVER`**.
3. Com sessão e **sem clube ativo** → entra no fluxo [MF-01](#mf-01--criação-e-entrada-em-clube).
4. Com sessão e **clube ativo** → detecta ausência: se longa, dispara [MF-02](#mf-02--retorno-após-ausência-longa); senão vai à **`M-HOME`**.

**Bordas:** relógio local diferente do mundo não altera prazos (relógio do mundo é do servidor). Logout limpa cache local e fecha o socket. Sessão expirada volta a `M-LOGIN` preservando o *deep link* pendente.

**Referências:** [doc 08](../02-tecnico/08-frontend-cliente-e-tempo-real.md) (versionamento, sessão, WebSocket).

### MF-0A — Sincronização, offline e reconexão

**Gatilho:** perda/retorno de conectividade; qualquer tela.

1. **Online:** TanStack Query serve dados frescos; WebSocket entrega eventos por stream (`club/user/world/match Sequence`).
2. **Queda:** *badge* "offline" no `Header`; telas mostram último cache (SQLite) marcado como possivelmente desatualizado; **commands são enfileirados** (com `idempotencyKey`).
3. **Retorno:** app envia `lastKnownSequence` por stream → recebe **eventos perdidos**, **snapshot** ou **ressync completa**; a fila de commands é reenviada (idempotência evita efeito duplicado).
4. Conflitos de versão (`CONFLICT`) recarregam o agregado com `currentVersion` antes do reenvio; rejeições (`REJECTED`) revertem o otimismo e mostram o `errorCode`.

**Referências:** [doc 08 — recuperação/idempotência](../02-tecnico/08-frontend-cliente-e-tempo-real.md); [design system §8–9](00-visao-geral-e-design-system.md#8-contratos-de-command-na-ótica-da-ui).

### MF-0B — Notificações e navegação por contexto

**Gatilho:** chegada de notificação (push ou in-app).

1. Evento chega por WebSocket ou push (APNs/FCM). Classificado em **Crítica / Importante / Informativa / Narrativa** ([doc 13, §2](../01-game-design/13-relatorios-notificacoes-e-memoria.md)).
2. **Crítica** → interrompe (banner/alerta) e/ou vira item na **`M-DECISIONS`** com prazo; **Importante** → *badge* no sino e na aba; **Informativa/Narrativa** → entram em **`M-NOTIFS`**/**`M-FEED`** sem interromper.
3. Toque no push abre o *deep link* correspondente (ver [§3](01-navegacao-e-arquitetura-de-informacao.md#3-deep-links-e-notificações)).

**Bordas:** anti-inundação — só o relevante interrompe; a qualidade da comissão filtra melhor. Prazo perdido aplica a **ação padrão** e o mundo segue ([MF-05](#mf-05--ciclo-semanal-de-gestão), [doc 13, §3](../01-game-design/13-relatorios-notificacoes-e-memoria.md)).

---

## A. Entrada e ciclo de vida do usuário

### MF-01 — Criação e entrada em clube

*Golden path 1. Como o usuário entra no mundo e assume um clube.*

1. **`M-WORLD-PICK`** — escolhe um **mundo/tipo de liga**: nova, em andamento, ou temática ([`08-estadio`/`09-anti-abuso §2.9`](../01-game-design/09-anti-abuso-e-onboarding.md)). Mostra vagas e elegibilidade.
2. O jogo **verifica elegibilidade e vagas** (cooldowns, contas relacionadas). Bloqueios explicados sem revelar fórmula.
3. Ramo **assumir** → **`M-CLUB-PICK`** (lista de clubes disponíveis) · Ramo **criar** → **`M-CLUB-CREATE`** + **`M-REGION-PICK`** (região/cidade que definem torcida, rivais, clima, base, custos).
4. **`M-CLUB-PREVIEW`** — estado inicial: divisão, elenco, estrutura, **dívidas e políticas herdadas**, torcida, riscos.
5. **`M-SLOT-RESERVE`** — **aporte inicial fixo** (igualdade competitiva, sem vantagem por dinheiro real) e **reserva de vaga** por prazo curto. Command `ReserveClubSlot`.
6. **`M-CONTROL-ACTIVATE`** — controle ativado na data válida: clube novo entra em divisão de expansão + pré-temporada; clube assumido mantém todo o estado. Command `ActivateClubControl`.
7. **`M-ONBOARD-REVIEW`** — revisão inicial: **autoridade**, **objetivos da diretoria**, orçamento, elenco, plano automático (política offline) e **pendências herdadas** que exigem ação imediata. Banner do **Programa de Clube Novo** quando aplicável.
8. Finaliza na **`M-HOME`**, com a Central de decisões já populada pelas pendências herdadas.

**Bordas:** assumir clube recém-abandonado por conta relacionada é bloqueado; assumir clube forte passa por auditoria de contexto. Vaga expira se não confirmada.

**Referências:** [`01-mundo-persistente §4.5`](../01-game-design/01-mundo-persistente-e-clubes.md) · [`09-anti-abuso §2`](../01-game-design/09-anti-abuso-e-onboarding.md) · [`08-estadio §10`](../01-game-design/08-estadio-regiao-e-clima.md) (região).

### MF-02 — Retorno após ausência longa

*Golden path 2. Reintegra sem punir e sem esconder o que mudou.*

1. Bootstrap detecta ausência → **`M-RETURN`**.
2. Tela consolida em blocos: **mudanças do mundo** (competições, mercado, economia), **mudanças do clube** (resultados, elenco, finanças, estrutura), **decisões automáticas** tomadas pela IA e **prazos perdidos** (com a ação padrão aplicada).
3. **Ações urgentes** listadas com prazo; botão "abrir na Central".
4. **Ordem de recuperação sugerida** (checklist priorizado) leva o usuário passo a passo.
5. "Assumir o controle" → **`M-HOME`**.

**Referências:** [`15-fluxos §2`](../01-game-design/15-fluxos-completos.md) · [`13-relatorios`](../01-game-design/13-relatorios-notificacoes-e-memoria.md) · [`07-ia`](../01-game-design/07-inteligencia-artificial.md).

### MF-03 — Abandono ou troca de clube

*Golden path 3. Encerra o vínculo preservando o clube.*

1. **`M-CLUB-LEAVE`** (via `M-SETTINGS` ou `M-CLUB-PROFILE`). Sistema **audita ações recentes** (proteção antiabuso).
2. Tela de confirmação explicita que o clube **mantém tudo** (dívidas, contratos, moral, histórico, promessas) e que a **IA assume imediatamente**. `HighRiskConfirm`.
3. Command `LeaveClub`. Aplica **cooldown / restrições de negociação** com o clube antigo.
4. Após o período de espera, novo vínculo em clube elegível reinicia [MF-01](#mf-01--criação-e-entrada-em-clube).

**Bordas:** abandono com destruição proposital de elenco pode ser **bloqueado**; troca preferencialmente entre temporadas.

**Referências:** [`15-fluxos §3`](../01-game-design/15-fluxos-completos.md) · [`09-anti-abuso §1.7–1.8`](../01-game-design/09-anti-abuso-e-onboarding.md).

---

## B. Ciclo da temporada

### MF-04 — Início de temporada / pré-temporada

*Golden path 4.*

1. Notificação "nova temporada" → **`M-HOME`** mostra a fase **Pré-temporada**.
2. **`M-COMPETITION`/`M-CALENDAR`** — divisões e participantes confirmados; calendário e **regulamentos publicados**; janelas e inscrições abertas.
3. **`M-BUDGET`/`M-BOARD`** — define orçamento, prioridades e **objetivos** com a diretoria.
4. **`M-SQUAD`/`M-TRAINING`/`M-TACTICS`/`M-ACADEMY`** — define elenco, treino, táticas e base.
5. **`M-REGISTRATION`** — inscreve elenco dentro dos limites (estrangeiros, idade, cota de formados).
6. **`M-NEXTMATCH`** — amistosos de preparação (pré-temporada).
7. Temporada oficial começa; ciclo passa a [MF-05](#mf-05--ciclo-semanal-de-gestão).

**Referências:** [`15-fluxos §4`](../01-game-design/15-fluxos-completos.md) · [`06-temporada §1,§2,§15`](../01-game-design/06-temporada-e-competicoes.md).

### MF-05 — Ciclo semanal de gestão

*Golden path 5. O loop central do jogo.*

1. **`M-HOME`** — abre a Central; **revisa urgências e agenda** (o que mudou / o que exige ação).
2. **`M-DECISIONS`** — resolve pendências com prazo (cada card: prazo, impacto, recomendação, ação padrão).
3. **`M-SQUAD`/`M-MEDICAL`** — avalia condição do elenco (físico, moral, disponibilidade).
4. **`M-TRAINING`** — ajusta treino e recuperação ([MF-17](#mf-17--treino-e-condição)).
5. **`M-MARKET`/`M-CONTRACT`** — trata contratos e mercado (renovações, propostas, alvos).
6. **`M-FINANCE`/`M-STRUCTURE`** — revisa finanças e estrutura quando necessário.
7. **`M-NEXTMATCH`** — prepara a próxima partida ([MF-07](#mf-07--preparação-e-partida)).
8. **`M-LINEUP`/`M-GAMEPLAN`** — define escalação e **políticas offline** (delegação).
9. Acompanha ao vivo ([MF-07](#mf-07--preparação-e-partida)) **ou** recebe o resultado.
10. **`M-POSTMATCH`/`M-FEED`** — processa consequências (moral, lesões, suspensões, finanças, imprensa).

**Referências:** [`15-fluxos §5`](../01-game-design/15-fluxos-completos.md) · [`10-experiencia`](../01-game-design/10-experiencia-e-telas.md).

### MF-06 — Encerramento de temporada

*Golden path 6. Vira o ciclo sem reiniciar o mundo.*

1. Notificação "fim de temporada" → **`M-SEASON-CLOSE`** (wizard sequencial, espelhando os ~20 passos do motor de virada).
2. Etapas exibidas: **homologação** (provisório→oficial), **títulos/acessos/rebaixamentos**, **`M-AWARDS`** (premiações e prêmios individuais), avaliação da **diretoria** e da **torcida**, **evolução/regressão** do elenco (deltas por atributo), **aposentadorias/reaproveitamento**, **contratos** (transição escalonada), **mercado**, **finanças**, **base** (promoções + novos talentos), realocação de divisões.
3. **`M-HISTORY`** registra recordes e legado; **briefing da nova temporada** encadeia [MF-04](#mf-04--início-de-temporada--pré-temporada).

**Bordas:** na ausência, a inteligência do clube processa efeitos automáticos com **limites de autoridade** (não vender jogador-chave, não assumir grande dívida, não alterar identidade), preservando o estratégico para o retorno.

**Referências:** [`15-fluxos §6`](../01-game-design/15-fluxos-completos.md) · [`06-temporada §6,§7,§14`](../01-game-design/06-temporada-e-competicoes.md).

---

## C. Partida

### MF-07 — Preparação e partida

*Golden path 7. Da agenda ao relatório pós-jogo.*

1. Partida entra na agenda → **`M-NEXTMATCH`**.
2. **`M-SCOUT-OPP`** — a comissão prepara o **dossiê** do adversário (estimativas com confiança conforme nível da comissão) e leitura do árbitro.
3. **`M-PREMATCH`** — analisa contexto: clima, gramado, torcida, arbitragem, importância, calendário, condição.
4. **`M-TRAINING`** — treinos específicos para o confronto (quando aplicável).
5. **`M-MEDICAL`** — confirma estado médico/logística.
6. **`M-LINEUP` + `M-TACTICS` + `M-GAMEPLAN`** — titulares, banco, tática e **plano automático** (offline: gatilhos de substituição, respostas a cenários, nível de autonomia).
7. O jogo **valida elegibilidade** (inscrição, suspensão, saúde, limite de estrangeiros, elenco mínimo). Bloqueios impedem entrar em campo; tenta escalação automática antes de W.O.
8. Partida começa com **estado oficial congelado** → **`M-LIVE`**.
9. Ao vivo: motor atualiza setores/físico/moral/eventos; **`M-DECISION-POINT`** surge nos momentos certos; **`M-HALFTIME`** no intervalo.
10. Usuário **ou** a IA autorizada envia decisões (ações rápidas, substituições, mudança tática). Cada opção é um command validado pelo servidor.
11. Substituições, lesões e cartões alteram o plano; se aplicável, **`M-PENALTIES`**.
12. Partida encerra e homologa; resultado consolidado.
13. **`M-POSTMATCH`** — estatísticas, notas, mapa de pressão, xG, **fatores explicativos**; consequências alimentam elenco/saúde/imprensa/finanças.

**Bordas:** desconexão durante a partida — o motor continua e a `M-LIVE` mostra o **resumo estruturado do período offline** ao reconectar; comando fora da janela retorna `MATCH_COMMAND_WINDOW_CLOSED`.

**Referências:** [`15-fluxos §7`](../01-game-design/15-fluxos-completos.md) · [`05-motor-de-partida`](../01-game-design/05-motor-de-partida.md) · [doc 08 — partida ao vivo](../02-tecnico/08-frontend-cliente-e-tempo-real.md).

---

## D. Mercado, elenco e base

### MF-08 — Contratação de jogador

*Golden path 8.*

1. **`M-MARKET`/`M-SQUAD`** — identifica necessidade (via relatório de elenco/mercado).
2. **`M-SCOUTING`** — cria missão de observação; recebe **relatórios com confiança/incerteza** e recomendação (contratar/monitorar/evitar/emprestar).
3. Compara candidatos (**`M-PLAYER`** lado a lado) e consulta disponibilidade.
4. **`M-NEGOTIATION`** — envia proposta ao clube detentor (ou direto ao **livre**); recebe aceite/contra-proposta; negocia termos esportivos e financeiros (valor, parcelas, bônus, cláusulas).
5. Command reserva **recursos financeiros** (evita comprometer o mesmo orçamento duas vezes).
6. **`M-CONTRACT` + `M-AGENT`** — jogador e empresário negociam o contrato pessoal (salário, luvas, comissão, direitos de imagem).
7. **`M-MEDICAL`** — exame médico verifica riscos.
8. Validação de **situação financeira e integridade competitiva**; contrato assinado (`SignTransfer`).
9. Transferência registrada, pagamentos concluídos.
10. **`M-REGISTRATION`** — inscrição quando o regulamento permitir.
11. Jogador integrado ao elenco; moral, hierarquia, torcida e orçamento atualizados (**`M-FEED`** narra).

**Bordas:** orçamento insuficiente → `TRANSFER_BUDGET_UNAVAILABLE`; proposta fora da faixa plausível → sinalização de risco/anti-abuso ([MF-24](#mf-24--ação-bloqueada-por-anti-abuso)); fora da janela → sem inscrição até a próxima.

**Referências:** [`15-fluxos §8`](../01-game-design/15-fluxos-completos.md) · [`03-economia §7,§11`](../01-game-design/03-economia.md) · [`02-jogadores §18`](../01-game-design/02-sistema-de-jogadores.md).

### MF-09 — Venda de jogador

*Golden path 9.*

1. Chega consulta/proposta → notificação → **`M-NEGOTIATION`**.
2. **`M-PLAYER`** — clube avalia valor, papel e reposição; **funcionários apresentam recomendação**.
3. Usuário aceita, rejeita ou contrapropõe.
4. Quando exige aval, **`M-CONVO`** — o jogador avalia o destino.
5. Acordo formalizado (`SignTransfer` na ponta vendedora); registro, contrato e pagamentos processados.
6. Saída afeta elenco, torcida, finanças e história (**`M-FEED`**, **`M-FANS`**).

**Bordas:** vender ídolo/ao rival gera reação forte da torcida; venda abaixo do valor sinaliza anti-abuso.

**Referências:** [`15-fluxos §9`](../01-game-design/15-fluxos-completos.md) · [`03-economia`](../01-game-design/03-economia.md) · [`11-torcida §7`](../01-game-design/11-torcida-imprensa-e-narrativa.md).

### MF-10 — Empréstimo de jogador

*Golden path 10.*

1. **`M-LOAN`** — origem e destino negociam duração, divisão de salário e condições de uso (minutos mínimos).
2. **`M-CONVO`** — jogador aceita o projeto.
3. Regras de inscrição validadas (**`M-REGISTRATION`**).
4. Jogador atua pelo destino mantendo vínculo com a origem; **minutos/condição/promessas** acompanhados.
5. Opção/obrigação de compra pode ser ativada (quando existir na regra do mundo).
6. Ao fim: compra, prorrogação ou retorno.

**Referências:** [`15-fluxos §10`](../01-game-design/15-fluxos-completos.md) · [`03-economia §7.4`](../01-game-design/03-economia.md).

### MF-11 — Jornada de um jovem

*Golden path 11.*

1. **`M-YOUTH-INTAKE`** — jovem encontrado por canal de captação; clube observa/chama para teste.
2. **`M-CAREER-PLAN`** — define vínculo/proteção (contrato de formação) e plano de carreira.
3. **`M-ACADEMY`** — treina e disputa a categoria; **`M-MENTORING`** dá mentoria e avaliações.
4. Pode treinar com o profissional (**`M-TRAINING`**).
5. **`M-PROMOTE`** — promovido, emprestado, vendido ou liberado conforme prontidão; profissionalização altera contrato e expectativas.
6. Trajetória permanece registrada (**`M-PLAYER-MEMORY`**).

**Referências:** [`15-fluxos §11`](../01-game-design/15-fluxos-completos.md) · [`02-jogadores §15,§17`](../01-game-design/02-sistema-de-jogadores.md).

---

## E. Elenco e saúde

### MF-12 — Lesão e recuperação

*Golden path 12.*

1. Evento de lesão (treino/partida) → notificação crítica → **`M-MEDICAL-CASE`**.
2. Avaliação inicial da gravidade; **exames** refinam diagnóstico e prazo.
3. Usuário **escolhe o tratamento** dentro das recomendações médicas.
4. Reabilitação (estágios 1–7); restrições reduzidas progressivamente.
5. Comissão avalia retorno ao treino; medicina avalia retorno competitivo.
6. Usuário **administra minutos e risco** de recaída (integra com escalação/`M-GAMEPLAN`).

**Referências:** [`15-fluxos §12`](../01-game-design/15-fluxos-completos.md) · [`02-jogadores §16`](../01-game-design/02-sistema-de-jogadores.md) · [`04-estrutura §3.4`](../01-game-design/04-estrutura-do-clube-e-staff.md).

---

## F. Finanças e estrutura

### MF-13 — Ciclo financeiro mensal

*Golden path 13.*

1. Virada de mês → **`M-FINANCE`** consolida receitas reconhecidas e obrigações.
2. **`M-ACCOUNTING`** — folha e custos processados; reservas e orçamentos atualizados; **projeção de caixa recalculada**.
3. **Riscos e desvios** apresentados; a diretoria pode **exigir correção** (**`M-BOARD`**).
4. Usuário ajusta gastos, vendas, crédito ou projetos (**`M-BUDGET`/`M-DEBT`/`M-MARKET`**).

**Bordas:** projeção de ruptura encadeia [MF-16](#mf-16--crise-financeira).

**Referências:** [`15-fluxos §13`](../01-game-design/15-fluxos-completos.md) · [`03-economia §15`](../01-game-design/03-economia.md).

### MF-14 — Projeto de infraestrutura

*Golden path 14.*

1. Necessidade (capacidade, instalação, modernização) → **`M-STRUCTURE`** ou **`M-STADIUM`**.
2. Avalia capacidade, custo e impacto; **estudo de viabilidade**.
3. Busca aprovação/financiamento (**`M-DEBT`/`M-BOARD`**).
4. Contrata fornecedor; **`M-DEPARTMENT`/`M-STADIUM-WORKS`** programam a obra (instalações alternativas durante o período).
5. Acompanha marcos, custo e atraso; **inspeção e licenciamento** (**`M-LICENSING`**).
6. Instalação entra em operação; manutenção e deterioração passam a ser acompanhadas.

**Referências:** [`15-fluxos §14`](../01-game-design/15-fluxos-completos.md) · [`04-estrutura §7`](../01-game-design/04-estrutura-do-clube-e-staff.md) · [`08-estadio §4`](../01-game-design/08-estadio-regiao-e-clima.md).

---

## G. Crises

### MF-15 — Crise esportiva

*Golden path 15. O usuário permanece no comando.*

1. Resultados abaixo da expectativa → moral/torcida/imprensa reagem (**`M-MORALE`/`M-FANS`/`M-FEED`**).
2. Diretoria revisa objetivos e confiança (**`M-BOARD`**); comissão identifica causas (relatórios).
3. Usuário ajusta tática, elenco, treino e comunicação (**`M-TACTICS`/`M-SQUAD`/`M-TRAINING`/`M-PRESS`**).
4. Se persiste, a diretoria pode **reduzir autonomia** ou exigir um plano — nunca demitir.
5. Usuário conduz a recuperação.

**Referências:** [`15-fluxos §15`](../01-game-design/15-fluxos-completos.md) · [`11-torcida`](../01-game-design/11-torcida-imprensa-e-narrativa.md) · [`01-mundo §1.3`](../01-game-design/01-mundo-persistente-e-clubes.md).

### MF-16 — Crise financeira

*Golden path 16.*

1. Projeção indica falta de caixa → alerta crítico (**`M-FINANCE`/`M-DECISIONS`**).
2. Financeiro detalha prazos, obrigações, risco e projeção; **gastos discricionários podem ser congelados**.
3. Usuário avalia vendas, renegociação, crédito, cortes ou uso da base (**`M-MARKET`/`M-DEBT`/`M-ACADEMY`**).
4. Diretoria aprova/impõe medidas; **plano de recuperação** define metas (**`M-BOARD`**).
5. Atrasos geram moral baixa e reputação ruim; inadimplência gera restrições de mercado/sanções.
6. Em insolvência, o clube entra em **reestruturação sem remover o usuário**.

**Referências:** [`15-fluxos §16`](../01-game-design/15-fluxos-completos.md) · [`03-economia §15.5`](../01-game-design/03-economia.md) · [`09-anti-abuso`](../01-game-design/09-anti-abuso-e-onboarding.md).

---

## H. Micro-fluxos de gestão

### MF-17 — Treino e condição
1. **`M-TRAINING`** — define foco coletivo (técnico/físico/tático/mental) e carga.
2. **`M-TRAINING-INDIV`** — plano individual (posição, recuperação, mentoria).
3. Efeitos aparecem em **`M-PLAYER-DEV`** (evolução) e **`M-MEDICAL`** (risco por sobrecarga). Command `SetTrainingPlan`.

**Referências:** [`02-jogadores §6,§8`](../01-game-design/02-sistema-de-jogadores.md).

### MF-18 — Conversa com atleta
1. Gatilho: jogador pede aumento / reclama de minutos / quer sair, ou o usuário inicia. → **`M-CONVO`**.
2. Tela mostra o **perfil mental** do jogador e o motivo; usuário escolhe uma opção de resposta.
3. Consequência aplicada em moral/promessas/relação; pode abrir renovação ([MF-20](#mf-20--renovação-de-contrato)) ou promessa registrada em **`M-PROMISES`**.

> **Recomendação (a ratificar — R-96):** a árvore fina de opções de resposta do `M-CONVO` e seus efeitos numéricos — proposta: cada opção mapeia deltas em moral/relação/promessa modulados pelo perfil mental do jogador (atributos 0–100) e por `CoachTrust`; efeitos calibrados junto ao sistema de jogadores (R-03/R-08).

**Referências:** [`07-ia §3.4,§6`](../01-game-design/07-inteligencia-artificial.md).

### MF-19 — Imprensa e comunicação
1. Evento/pauta gera pergunta da imprensa → **`M-PRESS`**.
2. Usuário escolhe uma das **8 posturas** (assumir responsabilidade, proteger elenco, cobrar, explicar venda, pedir paciência, reforçar projeto, criticar arbitragem, prometer reação).
3. *Preview* de impacto (torcida/imprensa/vestiário) modulado pelo nível da comunicação; consequência narrada em **`M-FEED`**; promessas públicas vão a **`M-PUBLIC-PROMISES`**.

**Referências:** [`11-torcida §10–13`](../01-game-design/11-torcida-imprensa-e-narrativa.md).

### MF-20 — Renovação de contrato
1. Gatilho: contrato vencendo (notificação crítica) ou iniciativa do usuário → **`M-CONTRACT`**.
2. Ajusta salário, tempo, luvas, bônus, cláusulas; **`M-AGENT`** intermedia.
3. Jogador avalia (perfil econômico/ambição/lealdade); aceita/recusa/contrapõe. Command `RenewContract` (com `expectedVersion`).

**Bordas:** conflito de versão → `CONTRACT_VERSION_CONFLICT` recarrega e reenvia.

**Referências:** [`03-economia §3.2,§8`](../01-game-design/03-economia.md).

### MF-21 — Convocação para seleção
1. Data de seleção no calendário → notificação → **`M-NATIONAL`**.
2. Mostra jogador convocado, período de ausência, viagem, fadiga que retorna, valorização, risco de lesão.
3. Clube **não pode impedir** (exceto recomendação médica reconhecida); usuário **planeja rotação** (**`M-LINEUP`/`M-GAMEPLAN`**).
4. Retorno pode vir com fadiga/lesão ([MF-12](#mf-12--lesão-e-recuperação)); compensação parcial quando a regra do mundo prevê.

**Referências:** [`12-selecoes §2,§3,§5,§6`](../01-game-design/12-selecoes-e-calendario-internacional.md).

### MF-22 — Configurar automações / delegar
1. **`M-AUTOMATIONS`** — lista políticas ativas (escalação offline, substituições, mercado, treino, respostas de crise) e seu histórico de execução.
2. **`M-AUTOMATION-EDIT`** — anatomia da automação: gatilho, condição, ação, nível (sugerir/executar), limites; **ações de alto risco** exigem confirmação e não são totalmente delegáveis.
3. Salvar valida idempotência e precedência; desativa automaticamente na troca de controlador.

**Referências:** [`10-experiencia §6`](../01-game-design/10-experiencia-e-telas.md) · [`07-ia §7`](../01-game-design/07-inteligencia-artificial.md).

### MF-23 — Estádio: preço, manutenção e mando
1. **`M-STADIUM`** — define **preço de ingresso** (trade-off ocupação×receita), agenda **manutenção** (estádio e gramado), acompanha **mando de campo** e clima previsto.
2. **`M-MATCHDAY-REVENUE`** — projeção de público e receita líquida por jogo.
3. Negligência de manutenção → deterioração/interdição (**`M-LICENSING`**).

**Referências:** [`08-estadio §2,§3,§9`](../01-game-design/08-estadio-regiao-e-clima.md).

### MF-24 — Ação bloqueada por anti-abuso
1. Usuário tenta ação sensível (proposta extrema, escalação irregular, spam de sondagens).
2. UI mostra **bloqueio/quarentena** com motivo geral (sem revelar fórmula): "fora dos parâmetros seguros"; ação pode ficar **pendente** com prazo de revisão.
3. Para ações graves, o usuário vê o motivo e pode **recorrer** (**`M-SUPPORT`**).

**Referências:** [`09-anti-abuso §1.2,§1.5,§1.13`](../01-game-design/09-anti-abuso-e-onboarding.md).

### MF-25 — Personalização e loja
1. **`M-STORE`** — cosméticos, temas de UI, personalização de estádio (sem efeito esportivo), passe de temporada, slots.
2. Compra confirma que **nada altera resultado/economia/potencial** (sem pay-to-win); itens proibidos nem aparecem.
3. **`M-IDENTITY`** aplica escudo/cores/uniforme/homenagens.

**Referências:** [`14-monetizacao`](../01-game-design/14-monetizacao.md) · [`11-torcida §21`](../01-game-design/11-torcida-imprensa-e-narrativa.md).

---

> **Cobertura:** os 16 golden paths de [`15-fluxos-completos.md`](../01-game-design/15-fluxos-completos.md) estão em MF-01…MF-16; MF-00/0A/0B cobrem a plataforma (doc 08); MF-17…MF-25 detalham micro-fluxos de gestão citados no ciclo semanal e nos sistemas. Cada tela citada é especificada nos docs 03–12.
