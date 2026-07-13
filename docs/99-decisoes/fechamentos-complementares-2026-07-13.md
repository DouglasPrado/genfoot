# Fechamentos complementares da auditoria — R-149..R-170

> **Status:** CANÔNICO / RATIFICADO · **Data:** 2026-07-13 · **Autoridade:** ordem do dono do produto para resolver as pendências remanescentes · **Escopo:** produto completo planejado

## Decisões ratificadas

### R-149 — Vocabulário normativo

`GameWorld` é **mundo de jogo**; “universo” é sinônimo editorial permitido, nunca nome de entidade/API. **Competição** é o conceito geral; liga, copa e torneio são formatos. **Divisão** é nível esportivo; **série/grupo** é subdivisão de uma edição. “Sala” é termo superado. APIs, banco e UX usam os termos canônicos.

### R-150 — Seleções completas

O escopo inclui seleções principal, sub-20 e sub-17, convocações, dupla elegibilidade, naturalização, datas internacionais, compensação por lesão e cargos de seleção. Gestor com reputação ≥85 pode aceitar cargo de seleção sem abandonar o clube; conflitos de agenda obedecem a prioridade internacional e delegação explícita. O mesmo kernel de partida e ruleset vale para clubes e seleções.

### R-151 — Uma moeda por mundo

Cada mundo opera com **uma única moeda-base**. `currencyId` é obrigatório para integridade, formatação e possibilidade de mundos com moedas distintas; não existe câmbio, saldo multi-FX nem arbitragem dentro de um mundo. Monetização usa a moeda da loja da plataforma e não entra no ledger esportivo.

### R-152 — Clientes oficiais

Clientes oficiais: app do jogador em Expo/React Native e admin em Next.js. A antiga PWA do jogador está **SUPERADA** e não coexistirá como terceiro cliente. Web pública limita-se a site institucional, autenticação de apoio e guia; não envia commands de gestão esportiva.

### R-153 — Offline e fila de commands

Offline é leitura por padrão. Podem ser enfileirados, com `idempotencyKey`, somente `SetNotificationPreferences`, `SetOfflinePlan`, `SetTrainingPlan`, `SetLineup`, `SetTactics`, `SetGamePlan`, `SetPlayerCareerPlan` e `SetTransferStrategy`. TTL = menor entre 15 minutos reais e o prazo do domínio. Ao reconectar, mudança de custo, versão, elegibilidade ou lock exige reconfirmação. Pagamento, contrato, transferência, demissão, obra, crédito, inscrição, abandono e ação admin nunca são enfileirados.

### R-154 — Isolamento de R2 e backup

Arquivos de usuário, snapshots/replays e backups usam buckets, credenciais e políticas independentes. Backups têm conta/credencial off-host, versionamento, retenção imutável/Object Lock quando suportado e negação de delete à aplicação. Restore lê somente o bucket de backup; CDN nunca recebe acesso a snapshots ou backup.

### R-155 — Disciplina por competição

Cartões pertencem à edição da competição. Padrão: três amarelos acumulados geram uma partida de suspensão; o contador reduz exatamente pelo limiar, preservando excedente. Vermelho direto gera uma partida mínima e abre revisão conforme gravidade. Reset entre fases só ocorre se o regulamento declarar; suspensão já adquirida nunca é apagada pelo reset e carry-over entre edições é proibido salvo sanção disciplinar global explícita. C7/Competition é o owner.

### R-156 — Finality e cascata de correção

Antes da homologação, correção recompõe resultado, tabela, prêmios, suspensões, estatísticas, reputação e ledger provisório. Depois da homologação, o fato anterior permanece: cria-se nova versão `OVERTURNED`, lançamentos compensatórios e títulos/classificações corrigidos. Contratos já executados, partidas e temporadas seguintes não são apagados; consequências futuras recebem eventos compensatórios prospectivos. Toda cascata possui `correctionCaseId`, causalidade e comunicação antes→depois.

### R-157 — Estados da pessoa e do jogador

Separar: `PersonStatus` (viva, falecida, anonimizada), `PlayerCareerStatus` (base, profissional, aposentado) e `PlayerAvailabilityStatus` (apto, lesionado, suspenso, convocado, indisponível). Disponibilidade pode combinar causas; a UI deriva a prioridade de bloqueio, sem sobrescrever carreira ou pessoa.

### R-158 — Idade e vínculo atual

`birthDate` no calendário virtual é a fonte; idade é derivada do relógio do mundo e não persistida como verdade concorrente. Clube atual é derivado do contrato primário ativo e da inscrição/elenco; `Player.clubId`, se mantido por desempenho, é projeção reconciliável e nunca autoriza transferência ou escalação.

### R-159 — Estatísticas por competição

Stats de temporada carregam `competitionSeasonId` quando representam competição. Totais da temporada são projeções agregadas das linhas por competição. Unicidade do jogador/clube inclui mundo, temporada e edição; rankings nunca misturam competições sem agregação declarada.

### R-160 — Gatilho de evolução do broker

BullMQ deixa de ser suficiente quando, por 14 dias, ocorrer qualquer condição: p95 de lag >5 s em jobs críticos; >100 mil jobs/min sustentados; necessidade de roteamento interserviço com ≥3 consumidores independentes; retenção/replay de mensagens >24 h; ou blast radius do Redis impedir SLO. Migração para RabbitMQ quorum é padrão para comandos duráveis; NATS JetStream só vence se fan-out/streaming dominar. Contratos Outbox/Inbox e testes de ack, ordering, redelivery e DLQ são independentes do broker.

### R-161 — Catch-up sem farming

Benefícios pertencem ao clube criado, não à conta, e só podem ser concedidos uma vez por `clubId`. Um participante recebe benefício de criação no máximo uma vez por mundo em janela móvel de três temporadas. Abandono não reinicia nem transfere benefício; retorno ao mesmo clube continua o cronômetro. Transferências entre contas relacionadas durante proteção são bloqueadas/auditadas. Benefício indevido é revertido por lançamento compensatório, nunca edição de saldo.

### R-162 — Técnico e staff

`HEAD_COACH` em clube humano é assessor/coordenador da comissão: melhora leitura, treino e recomendações, mas nunca retira autoridade tática do usuário. Em clube IA, pode representar o agente decisor. A UI usa “Coordenador técnico” no clube humano e “Técnico” em clube IA/seleção.

### R-163 — Mensagens entre gestores

Mensagens são por mundo, opt-in e sem chat global aberto. Escopos: negociação vinculada a caso, mensagem direta aceita e canal administrativo de competição. Filtros, bloqueio, denúncia, rate limit, retenção de 180 dias e moderação aplicam-se; mensagens não alteram oferta/contrato sem command oficial.

### R-164 — Amistosos

Amistoso nasce de convite com data, mando e regras; adversário aceita/recusa até TTL de 24 h ou prazo do calendário. Limitado a dois por pré-temporada e um por semana sem competição oficial; respeita descanso de três dias. Não concede prêmio, reputação estrutural nem progressão acima do teto de treino e entra no anti-farm.

### R-165 — Decisões, lembretes e notificações

Dependências de decisão são DAG; item bloqueado mostra pré-requisito. Lembrete pode ser único ou recorrente até o deadline, máximo três por item. Notificações agrupam por entidade+tipo+janela de 15 minutos, preservando `CRITICAL` isolada. Cores usam tokens semânticos ratificados e nunca são o único sinal.

### R-166 — Rótulos de reputação

Há um rótulo primário exclusivo por eixo (clube e gestor), calculado com histerese. Conquistas/traços históricos aparecem como badges acumuláveis e não competem com o rótulo atual.

### R-167 — Monetização

Não existe moeda premium própria nem assinatura recorrente que conceda vantagem. Compra usa IAP/store e entrega cosméticos/slots organizacionais. Passe de temporada é compra cosmética por temporada, com catálogo R-93; todos os relatórios e informações competitivas são gratuitos.

### R-168 — Operação e atendimento

Alertas admin usam limiares de R-125..R-137; drill-down segue os layouts L-A*. Primeira resposta de suporte: 24 h; recurso: 7 dias; revisão de punição crítica: 48 h. Impersonação dura no máximo 30 minutos, exige consentimento ou incidente justificado, banner permanente e audit log.

### R-169 — Nacionalidade e elegibilidade

`PersonNationality` é entidade temporal com país, tipo (nascimento, ascendência, naturalização), início e fim. `NationalTeamEligibility` é projeção versionada por ruleset e registra seleção vinculante, partidas oficiais e fundamento. Mudança nunca reescreve convocação passada.

### R-170 — Governança documental

Todo documento possui status e revisão; o owner é o contexto/módulo declarado no context map e no modelo físico, evitando nomes pessoais voláteis em cada arquivo. CI valida links, IDs R/ECO/PLY/F/CA/INV, duplicidade de tela, termos proibidos e marcadores de lacuna normativa. Exemplo e primeira passada ratificada são baseline versionável, não “indefinição”.

## Efeito

Estas decisões fecham A-01, A-07, A-09, A-12, A-13, A-14, M-01..M-07 e os resíduos de UX associados. Implementações físicas continuam sujeitas aos gates de schema, testes e produção, mas não dependem mais de decisão improvisada.
