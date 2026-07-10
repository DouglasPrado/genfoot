hoje 11:43
Bloco 24 — Administração Técnica, Segurança, Auditoria e Operações do Mundo

A administração técnica será responsável por manter o mundo disponível, consistente, seguro e recuperável.

Ela não será uma ferramenta para facilitar resultados, favorecer usuários ou editar o jogo arbitrariamente.

Toda ação administrativa deverá responder:

Quem executou?
Em qual ambiente?
Em qual mundo?
Em qual entidade?
Por qual motivo?
Com qual autorização?
Qual era o estado anterior?
Qual foi o novo estado?
Quais jogadores ou clubes foram afetados?
A ação pode ser revertida?
Houve revisão independente?
O usuário precisa ser informado?

A regra principal será:

A administração técnica pode corrigir o funcionamento do mundo,
mas não pode administrar secretamente a competição.
1. Objetivo do bloco

Garantir que:

A equipe interna possua ferramentas seguras.
Nenhum funcionário interno receba acesso total por padrão.
Permissões sejam concedidas por função.
Acesso a produção seja restrito.
Ações críticas exijam autorização adicional.
Administradores não possam alterar resultados livremente.
Suporte não possa assumir contas sem processo.
Sessões de suporte sejam visíveis e auditáveis.
Dados confidenciais sejam protegidos.
Segredos não sejam expostos em interfaces administrativas.
Toda alteração administrativa utilize comandos estruturados.
Edições diretas de banco sejam evitadas.
Correções possuam justificativa.
Correções preservem o histórico anterior.
Ferramentas internas validem regras e invariantes.
Incidentes técnicos possuam processo.
Falhas sejam classificadas.
Usuários afetados sejam comunicados.
Serviços possuam monitoramento.
Métricas técnicas não revelem segredos competitivos.
Logs possuam correlação.
Logs não armazenem dados sensíveis desnecessários.
Alertas técnicos possuam responsável.
Alertas duplicados sejam agrupados.
Backups sejam automáticos.
Backups sejam testados.
Restaurações sejam praticadas.
Um backup existente não seja considerado válido sem teste.
Snapshots sejam consistentes.
Restaurações não dupliquem eventos.
Desastres possam ser recuperados.
Falhas de um mundo não corrompam os demais.
Falhas de um serviço não derrubem toda a plataforma.
Manutenções sejam planejadas.
Mudanças técnicas sejam versionadas.
Migrações de banco sejam controladas.
Feature flags possuam escopo e prazo.
Flags antigas sejam removidas.
Deployments possuam rollback.
Jobs administrativos sejam idempotentes.
Jobs longos possuam progresso.
Jobs interrompidos possam ser retomados.
Filas possuam dead letter handling.
Dados corrompidos sejam isolados.
Suporte consiga investigar sem editar arbitrariamente.
Denúncias e segurança possuam acesso segregado.
Evidências sejam preservadas.
Ações internas suspeitas sejam detectadas.
Contas internas também estejam sujeitas a segurança.
Acesso emergencial seja excepcional.
Todo acesso emergencial gere alerta.
O usuário seja informado quando sua conta for acessada por suporte, quando aplicável.
Dados possam ser anonimizados conforme política.
Exclusões não destruam integridade competitiva.
Ambientes de teste não usem dados pessoais de produção sem proteção.
A administração do mundo seja diferente da administração da plataforma.
Organizadores de mundos privados possuam poderes limitados.
Nenhuma ação técnica crie dinheiro, jogadores ou resultados sem processo oficial.
Nenhuma correção aconteça silenciosamente.
Toda operação relevante seja auditável, recuperável e explicável.
2. Domínios administrativos
PLATFORM_ADMINISTRATION
WORLD_OPERATIONS
TECHNICAL_OPERATIONS
CUSTOMER_SUPPORT
SECURITY_OPERATIONS
MODERATION_OPERATIONS
DATA_OPERATIONS
FINANCIAL_OPERATIONS
COMPETITION_OPERATIONS
INCIDENT_RESPONSE
COMPLIANCE_OPERATIONS
3. Administração da plataforma

Responsável por:

Configurações globais.
Ambientes.
Serviços.
Contas internas.
Segurança.
Deployments.
Capacidade.
Integrações.
Políticas globais.
4. Administração do mundo

Responsável por:

Estado do mundo.
Entrada.
Calendário.
Manutenções específicas.
Regras permitidas.
Comunicação.
Incidentes do mundo.
Processos administrativos.
Regra fechada

Administrar um mundo não concede acesso global à plataforma.

5. Administração técnica e competição

Serão separadas.

Administração técnica

Corrige:

Falhas.
Dados inconsistentes.
Serviços.
Jobs.
Processamentos.
Integrações.
Administração competitiva

Resolve:

Recursos.
Resultados administrativos.
Licenças.
Punições.
Regulamentos.
Regra fechada

Um engenheiro não deverá decidir sozinho um resultado competitivo.

6. Princípio de menor privilégio

Cada operador terá somente:

Sistemas necessários.
Mundos necessários.
Ações necessárias.
Período necessário.
Dados necessários.
7. Funções administrativas
PLATFORM_OWNER
PLATFORM_ADMIN
SECURITY_ADMIN
SECURITY_ANALYST
SITE_RELIABILITY_ENGINEER
DATABASE_OPERATOR
DEPLOYMENT_OPERATOR
DATA_ENGINEER
WORLD_OPERATOR
COMPETITION_OPERATOR
SUPPORT_AGENT
SUPPORT_SUPERVISOR
MODERATOR
MODERATION_SUPERVISOR
COMPLIANCE_REVIEWER
AUDITOR
READ_ONLY_ANALYST
8. Papel PLATFORM_OWNER

Poderá:

Gerenciar administradores principais.
Aprovar políticas globais.
Autorizar mudanças de alto impacto.
Ativar acesso emergencial.

Não deverá realizar operações rotineiras.

9. Papel PLATFORM_ADMIN

Poderá:

Configurar serviços.
Gerenciar ambientes.
Coordenar manutenção.
Aprovar operações técnicas.

Não deverá possuir automaticamente:

Acesso a mensagens privadas.
Acesso a dados médicos.
Poder para alterar competição.
Poder para assumir usuários.
10. Papel de segurança

Poderá investigar:

Sessões suspeitas.
Acesso indevido.
Vazamentos.
Credenciais.
Automação maliciosa.
Fraude.
Incidentes internos.
11. Papel de operações

Poderá:

Consultar saúde dos serviços.
Reiniciar workers.
Retomar jobs.
Abrir manutenção.
Restaurar componentes.
Executar runbooks autorizados.
12. Papel de suporte

Poderá:

Consultar estado da conta.
Consultar erros.
Consultar processos.
Orientar o usuário.
Reenviar comunicação.
Solicitar correção.

Não poderá, por padrão:

Alterar saldo.
Transferir jogador.
Assinar contrato.
Editar resultado.
Ler mensagens privadas.
Ver segredos.
Executar ação competitiva pelo usuário.
13. Papel de auditor

Possuirá acesso somente leitura a:

Ações administrativas.
Aprovações.
Correções.
Incidentes.
Acessos.
Alterações.
Evidências permitidas.
14. Matriz administrativa de ações

Cada ação será classificada como:

VIEW
INVESTIGATE
PROPOSE
APPROVE
EXECUTE
ROLLBACK
EXPORT
DELETE
ANONYMIZE
IMPERSONATE
BREAK_GLASS
15. Escopo das permissões

Uma permissão poderá ser limitada por:

environment
gameWorldId
service
entityType
entityId
operation
dataClassification
validFrom
validUntil
16. Ambientes
LOCAL
DEVELOPMENT
TEST
STAGING
PRODUCTION
DISASTER_RECOVERY
Regra fechada

Permissão em teste não concede permissão em produção.

17. Contas administrativas separadas

Operadores deverão possuir:

Conta comum.
Conta administrativa separada.
Autenticação reforçada.
Sessões independentes.
Histórico próprio.
Regra fechada

A conta administrativa não será utilizada para jogar normalmente.

18. Autenticação administrativa

Deverá exigir:

Senha forte ou autenticação corporativa.
Segundo fator.
Dispositivo confiável quando aplicável.
Sessão curta.
Renovação periódica.
Confirmação para ações críticas.
19. Sessão administrativa
adminSessionId
operatorId
roleIds
environment
deviceId
authenticationStrength
startedAt
lastActivityAt
expiresAt
riskState
20. Estados da sessão administrativa
ACTIVE
IDLE
REAUTHENTICATION_REQUIRED
RESTRICTED
SUSPICIOUS
REVOKED
EXPIRED
21. Reautenticação

Será exigida para:

Exportar dados.
Acessar dados sensíveis.
Assumir sessão de suporte.
Aplicar correção.
Executar rollback.
Alterar permissão.
Utilizar acesso emergencial.
22. Aprovação dupla

Ações de alto impacto poderão exigir:

FOUR_EYES_APPROVAL

Exemplos:

Restaurar mundo.
Corrigir resultado oficial.
Reverter transferências em massa.
Excluir grande volume de dados.
Alterar economia global.
Ativar acesso emergencial.
Modificar histórico homologado.
23. Segregação de funções

A mesma pessoa não deverá:

Propor e aprovar sua própria correção crítica.
Investigar e julgar denúncia contra si.
Criar e validar seu próprio acesso emergencial.
Executar e auditar a mesma ação crítica como único responsável.
24. Conflito de interesse interno

Um operador deverá declarar conflito quando:

Participa do mundo afetado.
Controla clube no mundo.
Conhece pessoalmente participante envolvido.
Está envolvido em incidente.
Possui interesse no resultado.
25. Bloqueio por conflito

O sistema poderá impedir automaticamente a operação quando detectar:

Operador participante do mundo.
Operador denunciado no caso.
Operador autor da ação investigada.
Clube relacionado à sua conta comum.
26. Acesso temporário

Permissões elevadas deverão possuir:

Motivo.
Aprovação.
Escopo.
Expiração.
Ticket.
Responsável.
27. Acesso permanente

Será limitado a funções estritamente necessárias.

Regra fechada

Acesso permanente amplo à produção será evitado.

28. Acesso emergencial

Também chamado de:

BREAK_GLASS

Será permitido somente quando:

Existe incidente grave.
O acesso normal é insuficiente.
A demora aumenta o dano.
A ação necessária está documentada.
29. Requisitos do acesso emergencial
Motivo obrigatório.
Duração curta.
Alerta imediato.
Registro de tudo.
Revisão posterior.
Revogação automática.
Aprovação posterior quando aprovação prévia for impossível.
30. Uso indevido de acesso emergencial

Gerará:

Incidente de segurança.
Suspensão de acesso.
Investigação.
Preservação de evidências.
Possível medida disciplinar.
31. Console administrativo

A interface deverá organizar:

[Visão geral]
[Mundos]
[Usuários]
[Clubes]
[Processamentos]
[Incidentes]
[Segurança]
[Auditoria]
32. Visão geral operacional

Exemplo:

PLATAFORMA

Serviços saudáveis:
18 de 20

Mundos ativos:
342

Mundos degradados:
3

Jobs críticos falhando:
2

Incidentes abertos:
4

Ações aguardando aprovação:
7
33. Visão de um mundo

Deverá mostrar:

Estado.
Data oficial.
Temporada.
Último processamento.
Fila.
Partidas.
Mercado.
Integridade.
Incidentes.
Backups.
Versões.
Capacidade.
34. Barra de risco administrativo

A interface deverá alertar antes de ações em:

PRODUCTION
ACTIVE_WORLD
LIVE_MATCH
SEASON_TRANSITION
TRANSFER_WINDOW_CLOSING
35. Identificação visual do ambiente

Produção deverá possuir diferenciação clara para evitar:

Comando no ambiente errado.
Uso de dados reais em testes.
Confusão de mundos.
Operação acidental.
36. Busca administrativa

Poderá localizar:

Usuário.
Mundo.
Clube.
Jogador.
Comando.
Evento.
Incidente.
Sessão.
Job.
Correção.
Ticket.
37. Busca por dado sensível

Consultas por:

E-mail.
Telefone.
Endereço técnico.
Identificador de pagamento.

Deverão exigir permissão específica e gerar auditoria.

38. Classificação dos dados
PUBLIC
INTERNAL
CONFIDENTIAL
RESTRICTED
HIGHLY_RESTRICTED
39. Dados públicos

Exemplos:

Resultados.
Tabelas.
Perfis públicos.
Títulos.
Transferências anunciadas.
40. Dados internos

Exemplos:

Métricas de serviço.
Configurações não sensíveis.
Estado de filas.
Versões.
41. Dados confidenciais

Exemplos:

Finanças privadas do clube.
Estratégias.
Relatórios de observação.
Contratos não publicados.
Diagnósticos médicos.
42. Dados restritos

Exemplos:

Mensagens privadas.
Evidências de moderação.
Informações de segurança.
Dados pessoais.
Sessões.
43. Dados altamente restritos

Exemplos:

Segredos.
Chaves.
Tokens.
Material de recuperação.
Credenciais.
Dados financeiros externos completos.
44. Mascaramento

Interfaces internas deverão mascarar:

E-mails.
Telefones.
Tokens.
Documentos.
Endereços.
Dados de pagamento.
Segredos.
45. Revelação temporária

Quando necessária:

Exige permissão.
Exige reautenticação.
Exige motivo.
Possui duração curta.
Gera auditoria.
46. Segredos

Segredos não deverão ser:

Armazenados em código.
Exibidos em logs.
Copiados para tickets.
Enviados em mensagens.
Incluídos em snapshots comuns.
47. Gestão de segredos

Deverá suportar:

Armazenamento seguro.
Rotação.
Versões.
Escopo.
Revogação.
Auditoria.
Acesso por serviço.
48. Rotação de segredo

A rotação deverá:

Criar nova versão.
Atualizar consumidores.
Manter período de sobreposição quando necessário.
Revogar versão antiga.
Verificar falhas.
49. Logs

Tipos:

APPLICATION_LOG
SECURITY_LOG
AUDIT_LOG
ACCESS_LOG
DATABASE_LOG
JOB_LOG
INTEGRATION_LOG
INCIDENT_LOG
50. Estrutura mínima do log
timestamp
environment
service
severity
traceId
requestId
gameWorldId
userId
operatorId
entityType
entityId
eventCode
message
metadata
51. Dados proibidos em logs comuns
Senhas.
Tokens completos.
Chaves.
Diagnósticos completos.
Mensagens privadas completas.
Dados de cartão.
Documentos pessoais completos.
Conteúdo confidencial desnecessário.
52. Correlação

Uma operação deverá ser rastreável por:

traceId
requestId
commandId
eventId
jobId
incidentId
53. Severidade de log
TRACE
DEBUG
INFO
WARN
ERROR
CRITICAL
Regra fechada

Eventos competitivos normais não deverão ser registrados como erros técnicos.

54. Log de auditoria

Será diferente do log de aplicação.

O log de auditoria será:

Durável.
Estruturado.
Imutável por operação comum.
Consultável.
Exportável com permissão.
Ligado à ação e ao ator.
55. Evento de auditoria
auditEventId
actorType
actorId
sessionId
action
targetType
targetId
environment
gameWorldId
reason
beforeReference
afterReference
approvalReferences
occurredAt
result
56. Atores possíveis
USER
STAFF_AI
SYSTEM
ADMIN_OPERATOR
SUPPORT_AGENT
MODERATOR
INTEGRATION
MIGRATION
RECOVERY_PROCESS
57. Imutabilidade da auditoria

Correções no log de auditoria deverão criar:

Evento complementar.
Explicação.
Referência ao evento anterior.

Nunca sobrescrever o evento original.

58. Retenção de auditoria

A retenção deverá considerar:

Relevância competitiva.
Segurança.
Legislação aplicável.
Política de privacidade.
Ciclo do mundo.
Necessidade de investigação.
59. Detecção de ação interna suspeita

Sinais:

Grande volume de consultas.
Acesso fora do horário.
Acesso a mundo em que joga.
Exportações incomuns.
Repetição de dados sensíveis.
Uso frequente de BREAK_GLASS.
Correções fora do processo.
Tentativas bloqueadas.
60. Alertas de comportamento interno

Poderão gerar:

Reautenticação.
Sessão restrita.
Revogação.
Investigação.
Notificação à segurança.
Preservação de logs.
61. Suporte ao usuário

Fluxo:

Solicitação recebida
    ↓
Identificação do problema
    ↓
Verificação de conta
    ↓
Consulta de estado
    ↓
Orientação ou escalonamento
    ↓
Correção, quando aprovada
    ↓
Resposta e encerramento
62. Estados do ticket
OPEN
TRIAGED
WAITING_USER
WAITING_INTERNAL
IN_PROGRESS
ESCALATED
RESOLVED
CLOSED
REOPENED
DUPLICATE
INVALID
63. Categorias de suporte
ACCOUNT
LOGIN
WORLD_ENTRY
CLUB_CONTROL
MATCH
TRANSFER
CONTRACT
FINANCIAL
TECHNICAL_ERROR
NOTIFICATION
MODERATION
SECURITY
DATA_PRIVACY
PURCHASE
OTHER
64. Verificação de identidade

Antes de operações sobre conta, o suporte deverá verificar:

Sessão autenticada.
Fatores de segurança.
Propriedade da conta.
Contexto.
Risco.
Regra fechada

Informações fornecidas em conversa não serão suficientes para operações de alto risco.

65. Visualização assistida

O suporte poderá receber uma visão limitada do estado visto pelo usuário.

Essa visão deverá:

Respeitar permissões.
Mascarar dados.
Registrar acesso.
Não permitir ações competitivas.
66. Impersonação de suporte

Quando estritamente necessária, deverá ser:

READ_ONLY_IMPERSONATION
ASSISTED_IMPERSONATION
67. Impersonação somente leitura

Permite visualizar a interface como o usuário, sem executar comandos.

68. Impersonação assistida

Poderá permitir navegação guiada, mas ações críticas continuarão exigindo confirmação do usuário.

69. Requisitos para impersonação
Ticket aberto.
Motivo.
Aprovação.
Tempo limitado.
Banner visível.
Auditoria.
Revogação automática.
Notificação ao usuário, quando aplicável.
70. Ações proibidas durante impersonação
Transferir jogador.
Alterar senha.
Aceitar contrato.
Gastar recursos.
Excluir conta.
Enviar mensagem como usuário.
Controlar partida.
Desativar segurança.
71. Sessão de suporte visível

A interface poderá mostrar:

Sessão de suporte ativa

Agente:
Suporte técnico

Modo:
somente leitura

Expira em:
12 minutos
72. Correção administrativa

Uma correção poderá ser necessária por:

Bug.
Processamento incompleto.
Duplicidade.
Integração falha.
Migração.
Dado inválido.
Erro humano administrativo.
Recuperação.
73. Tipos de correção
DATA_CORRECTION
STATE_REPAIR
EVENT_REPLAY
EVENT_COMPENSATION
PROJECTION_REBUILD
TRANSACTION_REVERSAL
HISTORICAL_CORRECTION
ACCESS_CORRECTION
CONFIGURATION_CORRECTION
74. Correção de projeção

Quando o fato oficial está correto, mas a tela ou estatística está errada:

Reconstruir projeção.
Invalidar cache.
Reindexar busca.
Manter fatos intactos.
75. Correção de fato-base

Quando o evento oficial está incorreto:

Processo reforçado.
Avaliação de dependências.
Nova versão.
Compensações.
Comunicação.
Auditoria.
76. Edição direta no banco

Será proibida como procedimento normal.

Exceções emergenciais exigirão:

Incidente aberto.
Script revisado.
Backup.
Aprovação.
Registro.
Validação posterior.
Evento de correção equivalente.
77. Scripts administrativos

Deverão ser:

Versionados.
Revisados.
Testados.
Reexecutáveis com segurança.
Parametrizados.
Limitados por escopo.
Auditáveis.
78. Dry run

Toda correção em lote deverá oferecer, quando possível:

DRY_RUN

Mostrando:

Entidades afetadas.
Alterações.
Riscos.
Tempo estimado internamente.
Dependências.
Invariantes.
79. Limite de escopo

Um job administrativo deverá exigir:

Mundo.
Temporada.
Tipo.
Filtro.
Quantidade máxima.
Confirmação do total.
80. Operação em lote de alto impacto

Exigirá:

Dry run.
Aprovação dupla.
Snapshot.
Janela operacional.
Plano de rollback.
Monitoramento.
Relatório final.
81. Estado da correção
DRAFT
VALIDATING
DRY_RUN_COMPLETED
AWAITING_APPROVAL
APPROVED
SCHEDULED
EXECUTING
PARTIALLY_COMPLETED
COMPLETED
FAILED
ROLLING_BACK
ROLLED_BACK
CANCELLED
82. Plano de correção

Deverá conter:

Problema.
Causa.
Escopo.
Entidades.
Passos.
Riscos.
Validações.
Rollback.
Comunicação.
Responsáveis.
83. Compensação

Quando não for possível apagar a ação original:

Criar evento compensatório.
Reverter efeito.
Preservar histórico.
Atualizar projeções.
84. Reversão de transferência inválida

Deverá tratar:

Contratos.
Registros.
Valores.
Parcelas.
Salários.
Partidas já disputadas.
Estatísticas.
Inscrições.
Relações.
Mercado.
Regra fechada

Não será uma simples troca de clubId.

85. Correção financeira

Deverá utilizar:

Estorno.
Ajuste.
Novo lançamento.
Referência ao lançamento anterior.
Conta contábil adequada.
Regra fechada

Um saldo não será sobrescrito sem lançamentos explicativos.

86. Correção de jogador duplicado

Deverá:

Identificar registro principal.
Migrar relações.
Consolidar contratos.
Consolidar estatísticas.
Resolver conflitos.
Criar redirecionamentos.
Preservar auditoria.
87. Correção de resultado

Será controlada pelo processo competitivo, mesmo quando causada por bug técnico.

A equipe técnica poderá:

Fornecer evidências.
Corrigir cálculo.
Reprocessar dependências.

Não poderá decidir sozinha:

Campeão.
Pontuação administrativa.
Sanção esportiva.
88. Operação manual em partida ao vivo

Será extremamente restrita.

A equipe poderá:

Pausar tecnicamente.
Reiniciar transmissão.
Reconectar serviço.
Recuperar snapshot.
Marcar incidente.

Não poderá:

Inserir gol.
Remover cartão.
Ordenar substituição.
Alterar aleatoriedade.
Mudar tática.
89. Correção pós-partida

Caso o motor produza estado inválido:

Resultado fica pendente.
Incidente é aberto.
Eventos são analisados.
Recuperação segue regra.
Competição decide efeitos oficiais.
90. Jobs

Tipos:

SCHEDULED_JOB
EVENT_CONSUMER
BATCH_JOB
MIGRATION_JOB
REBUILD_JOB
CLEANUP_JOB
RECONCILIATION_JOB
BACKUP_JOB
RESTORE_JOB
91. Contrato mínimo do job
jobId
jobType
environment
gameWorldId
status
parameters
checkpoint
progress
attemptCount
startedAt
lastHeartbeatAt
completedAt
failureReason
idempotencyKey
version
92. Estados do job
CREATED
QUEUED
STARTING
RUNNING
PAUSED
WAITING_DEPENDENCY
RETRYING
PARTIALLY_COMPLETED
COMPLETED
FAILED
CANCELLED
DEAD_LETTERED
93. Heartbeat

Jobs longos deverão atualizar:

Estado.
Progresso.
Última atividade.
Partição atual.
Itens processados.
Erros.
94. Job sem heartbeat

Poderá ser classificado como:

STALLED

E então:

Ser investigado.
Retomado.
Cancelado.
Reatribuído.
95. Checkpoint

Jobs deverão registrar progresso suficiente para retomar sem repetir efeitos.

96. Cancelamento de job

Poderá ser:

GRACEFUL
IMMEDIATE
AFTER_CURRENT_ITEM
97. Job parcialmente concluído

A interface deverá indicar:

Itens concluídos.
Itens falhos.
Itens pendentes.
Possibilidade de retomada.
Efeitos já persistidos.
98. Reconciliation job

Deverá verificar:

Contratos e registros.
Lançamentos e saldos.
Partidas e tabelas.
Jogadores e clubes.
Eventos e projeções.
Locks.
Filas.
Notificações.
Ativos comerciais.
99. Frequência da conciliação

Poderá ser:

Contínua.
Diária.
Semanal.
Na transição.
Sob demanda.
Após incidente.
100. Resultado da conciliação
CONSISTENT
MINOR_DIFFERENCES
REPAIRABLE
CRITICAL_INCONSISTENCY
MANUAL_REVIEW_REQUIRED
101. Fila de mensagens

Cada fila deverá possuir:

Nome.
Tipo de evento.
Produtores.
Consumidores.
Retenção.
Retry.
Dead letter.
Monitoramento.
102. Dead letter queue

Eventos que falharem repetidamente serão movidos para:

DEAD_LETTER_QUEUE

Com:

Motivo.
Payload protegido.
Tentativas.
Serviço.
Data.
Reprocessamento autorizado.
103. Reprocessamento de dead letter

Deverá:

Revalidar schema.
Revalidar estado.
Preservar eventId.
Impedir duplicidade.
Registrar operador.
Registrar resultado.
104. Poison message

Um evento que sempre causa falha deverá ser isolado para não bloquear toda a fila.

105. Ordenação

Filas críticas poderão exigir ordenação por:

Mundo.
Entidade.
Agregado.
Partida.
Contrato.
106. Backpressure

Quando consumidores estiverem sobrecarregados:

Reduzir produção não crítica.
Aumentar workers.
Priorizar eventos críticos.
Agrupar atualizações.
Alertar operações.
107. Observabilidade

Será composta por:

METRICS
LOGS
TRACES
EVENTS
AUDIT
SYNTHETIC_CHECKS
BUSINESS_INVARIANTS
108. Métricas técnicas

Exemplos:

Latência.
Taxa de erro.
Uso de CPU.
Memória.
Disco.
Conexões.
Fila.
Tempo de job.
Disponibilidade.
Cache.
109. Métricas de negócio operacionais

Exemplos:

Partidas iniciadas.
Partidas travadas.
Transferências concluídas.
Pagamentos duplicados bloqueados.
Mundos atrasados.
Jobs diários.
Erros de inscrição.
Conflitos de versão.
110. Métricas competitivas protegidas

Métricas internas não deverão permitir que operadores ou usuários obtenham vantagem como:

Potencial real dos jogadores.
Seeds futuros.
Aleatoriedade de partidas.
Estratégias privadas.
Alvos de mercado.
111. Tracing distribuído

Uma ação deverá ser rastreável entre:

API.
Serviço.
Banco.
Fila.
Worker.
Notificação.
Integração.
112. Dashboards

Poderão existir por:

Plataforma.
Mundo.
Serviço.
Competição.
Partida.
Transição.
Mercado.
Segurança.
Backups.
113. Dashboard de mundo

Exemplo:

MUNDO 38

Data oficial:
Temporada 17, dia 42

Atraso de processamento:
0 minutos

Partidas em andamento:
8

Filas pendentes:
1.240 eventos

Jobs falhos:
1

Invariantes críticas:
0
114. Health checks

Tipos:

LIVENESS
READINESS
DEPENDENCY
DEEP_HEALTH
115. LIVENESS

Verifica se o processo está funcionando.

116. READINESS

Verifica se pode receber tráfego.

117. Verificação profunda

Pode testar:

Banco.
Fila.
Cache.
Storage.
Integrações.
Consistência mínima.

Não deverá ser executada excessivamente.

118. Synthetic checks

Simulam fluxos controlados como:

Login técnico.
Consulta de mundo.
Criação em ambiente de teste.
Leitura de calendário.
Processamento de evento sintético.
119. Alertas técnicos

Cada alerta deverá possuir:

Serviço.
Severidade.
Estado.
Responsável.
Runbook.
Deduplicação.
Escalonamento.
Silenciamento controlado.
120. Severidade do incidente
SEV_5_INFORMATIONAL
SEV_4_MINOR
SEV_3_MAJOR
SEV_2_CRITICAL
SEV_1_CATASTROPHIC
121. Exemplo de severidade
SEV 5

Erro sem impacto visível.

SEV 4

Parte pequena da interface degradada.

SEV 3

Função relevante indisponível para grupo de usuários.

SEV 2

Mundo ou serviço crítico comprometido.

SEV 1

Risco de perda ampla de dados, segurança ou indisponibilidade geral.

122. Estados do incidente
DETECTED
ACKNOWLEDGED
INVESTIGATING
MITIGATING
MONITORING
RESOLVED
POST_INCIDENT_REVIEW
CLOSED
REOPENED
123. Comando do incidente

Um incidente relevante terá:

Incident commander.
Responsável técnico.
Comunicação.
Especialistas.
Registro temporal.
Decisões.
Próximos passos.
124. Timeline do incidente

Deverá registrar:

Detecção.
Primeira resposta.
Escalonamento.
Mitigação.
Recuperação.
Resolução.
Comunicação.
125. Comunicação durante incidente

Deverá ser:

Clara.
Baseada em fatos.
Atualizada.
Sem promessas não confirmadas.
Diferenciada por impacto.
Disponível no jogo quando necessário.
126. Estado público do serviço

Poderá mostrar:

INVESTIGATING
IDENTIFIED
MITIGATING
MONITORING
RESOLVED
127. Impacto por mundo

Um incidente poderá afetar:

Plataforma inteira.
Região.
Serviço.
Um mundo.
Uma competição.
Uma partida.
Um usuário.
128. Comunicação segmentada

Somente usuários afetados receberão alertas específicos, salvo incidente global.

129. Mitigação

Pode incluir:

Desativar função.
Entrar em somente leitura.
Pausar fila.
Reduzir carga.
Trocar dependência.
Restaurar réplica.
Reverter deployment.
Aplicar feature flag.
130. Resolução

Um incidente será resolvido quando:

Serviço estiver estável.
Integridade estiver validada.
Processamentos pendentes forem tratados.
Usuários estiverem informados.
Riscos imediatos estiverem controlados.
131. Post-incident review

Deverá identificar:

Impacto.
Linha do tempo.
Causa.
Fatores contribuintes.
Detecção.
Resposta.
O que funcionou.
O que falhou.
Ações preventivas.
132. Cultura sem culpabilização simplista

A revisão deverá focar:

Sistema.
Processo.
Barreiras.
Decisões.
Contexto.

Sem impedir responsabilização quando houver abuso deliberado.

133. Ações corretivas

Deverão possuir:

Responsável.
Prioridade.
Prazo.
Estado.
Evidência de conclusão.
Incidente de origem.
134. Estados da ação corretiva
OPEN
PLANNED
IN_PROGRESS
BLOCKED
COMPLETED
CANCELLED
OVERDUE
135. Manutenção

Tipos:

PLANNED
EMERGENCY
WORLD_SPECIFIC
SERVICE_SPECIFIC
DATABASE
MIGRATION
SECURITY
136. Janela de manutenção

Deverá definir:

Início.
Duração planejada.
Serviços.
Mundos.
Prazos.
Partidas.
Mercado.
Modo de acesso.
Comunicação.
137. Congelamento de prazo

Durante manutenção, prazos poderão:

Continuar.
Ser estendidos.
Ser congelados.
Ser reabertos.

A política deverá ser definida antes, quando possível.

138. Manutenção emergencial

Pode começar sem aviso longo, mas deverá:

Informar assim que possível.
Registrar motivo.
Proteger partidas e prazos.
Produzir revisão posterior.
139. Deployment

Estados:

PLANNED
APPROVED
DEPLOYING
VERIFYING
COMPLETED
FAILED
ROLLING_BACK
ROLLED_BACK
CANCELLED
140. Estratégias de deployment

Poderão incluir:

ROLLING
BLUE_GREEN
CANARY
RECREATE

Conforme capacidade técnica.

141. Verificação após deployment

Deverá verificar:

Health checks.
Taxa de erro.
Latência.
Jobs.
Filas.
Invariantes.
Fluxos críticos.
Logs.
142. Rollback de deployment

Será iniciado quando:

Erros críticos aumentarem.
Invariantes falharem.
Processamento quebrar.
Migração for incompatível.
Segurança for afetada.
143. Código antigo e schema novo

Compatibilidade deverá ser planejada para permitir rollback seguro.

144. Migração de banco

Estados:

DRAFT
REVIEWED
TESTED
APPROVED
SCHEDULED
RUNNING
VALIDATING
COMPLETED
FAILED
ROLLED_BACK
MANUAL_INTERVENTION_REQUIRED
145. Princípios de migração
Compatibilidade.
Idempotência.
Checkpoints.
Monitoramento.
Backup.
Dry run quando possível.
Validação.
Rollback ou compensação.
146. Migração destrutiva

Alterações como remoção de coluna deverão ocorrer em etapas:

Parar escrita
    ↓
Migrar leitura
    ↓
Validar
    ↓
Arquivar dado
    ↓
Remover posteriormente
147. Backfill

Preenchimentos retroativos deverão:

Ser particionados.
Ser retomáveis.
Não bloquear produção.
Validar valores.
Registrar progresso.
Evitar duplicidade.
148. Feature flags

Poderão controlar:

Nova interface.
Novo processamento.
Nova regra técnica.
Experimento.
Migração.
Kill switch.
149. Escopo da flag
GLOBAL
ENVIRONMENT
REGION
WORLD
USER_COHORT
USER
SERVICE
150. Flags competitivas

Mudanças que afetem regras competitivas não poderão ser ativadas apenas para alguns clubes de um mesmo contexto oficial.

151. Kill switch

Permite desativar rapidamente:

Mercado.
Chat.
Notificações externas.
Nova funcionalidade.
Integração.
Job defeituoso.
152. Validade da flag

Toda flag deverá possuir:

Responsável.
Motivo.
Data de criação.
Data de revisão.
Plano de remoção.
Estado.
153. Dívida de flags

Flags antigas deverão ser detectadas e removidas.

154. Configuração

Configurações deverão possuir:

Schema.
Validação.
Ambiente.
Versão.
Histórico.
Autor.
Data efetiva.
155. Configuração dinâmica

Mudanças sem deployment deverão respeitar:

Validação.
Aprovação.
Escopo.
Rollback.
Auditoria.
156. Configuração competitiva

Regras de jogo não serão alteradas por configuração técnica sem processo de versionamento do regulamento.

157. Backup

Tipos:

FULL
INCREMENTAL
TRANSACTION_LOG
SNAPSHOT
CONFIGURATION
OBJECT_STORAGE
AUDIT_ARCHIVE
158. Política de backup

Deverá definir:

Frequência.
Retenção.
Local.
Criptografia.
Redundância.
Teste.
Responsável.
RPO.
RTO.
159. RPO
RECOVERY_POINT_OBJECTIVE

Representa a quantidade máxima de dados que se aceita perder em um desastre.

160. RTO
RECOVERY_TIME_OBJECTIVE

Representa o tempo-alvo para restaurar o serviço.

161. Backups isolados

Backups deverão possuir proteção contra:

Exclusão acidental.
Credencial comprometida.
Ransomware.
Corrupção.
Falha regional.
162. Criptografia do backup

Deverá existir:

Em trânsito.
Em repouso.
Com gestão separada de chaves.
Com teste de recuperação.
163. Teste de restauração

Deverá ocorrer periodicamente.

Um teste deverá validar:

Arquivo legível.
Checksum.
Schema.
Eventos.
Invariantes.
Dados relacionados.
Tempo de recuperação.
164. Backup não testado

Será marcado como:

UNVERIFIED_BACKUP
Regra fechada

Um arquivo existente não será considerado recuperação garantida.

165. Estados do backup
SCHEDULED
RUNNING
COMPLETED
VALIDATING
VALID
INVALID
FAILED
EXPIRED
DELETED
166. Snapshot do mundo

Deverá representar estado consistente de:

Data.
Temporada.
Competições.
Clubes.
Jogadores.
Contratos.
Finanças.
Eventos.
Jobs.
Locks.
Versões.
167. Snapshot durante partida

Poderá excluir ou tratar separadamente partidas em andamento.

Regra fechada

A política deverá impedir restauração em estado incompleto não compreendido.

168. Restauração

Tipos:

FULL_PLATFORM_RESTORE
WORLD_RESTORE
SERVICE_RESTORE
DATABASE_RESTORE
ENTITY_REPAIR
POINT_IN_TIME_RECOVERY
169. Pré-condições da restauração
Incidente aberto.
Backup validado.
Escopo.
Plano.
Comunicação.
Aprovação.
Ambiente de validação.
Estratégia para eventos posteriores.
170. Restauração em ambiente isolado

Antes de substituir produção, poderá ser necessário:

Restaurar em ambiente separado.
Validar consistência.
Comparar.
Escolher ponto.
Preparar replay.
171. Replay de eventos

Eventos posteriores ao backup poderão ser reaplicados quando:

Estiverem íntegros.
Forem idempotentes.
O schema for compatível.
Não incluírem corrupção.
172. Evento suspeito no replay

Será isolado e analisado antes da continuação.

173. Restauração de mundo único

Deverá impedir:

Afetar outros mundos.
Duplicar identificadores globais.
Reenviar notificações indevidas.
Reprocessar pagamentos externos.
Duplicar integrações.
174. Efeitos externos

Durante replay, integrações externas deverão utilizar modo seguro para não:

Cobrar novamente.
Enviar e-mail novamente.
Criar pagamento duplicado.
Publicar mensagem duplicada.
175. Estado da restauração
REQUESTED
PLANNING
AWAITING_APPROVAL
RESTORING_TO_ISOLATED_ENVIRONMENT
VALIDATING
READY_TO_APPLY
APPLYING
REPLAYING_EVENTS
VERIFYING
COMPLETED
FAILED
ROLLED_BACK
176. Disaster recovery

Deverá considerar:

Perda de região.
Perda de banco.
Perda de storage.
Credencial comprometida.
Corrupção ampla.
Falha de provedor.
Exclusão acidental.
177. Runbook de desastre

Deverá conter:

Critério de ativação.
Responsáveis.
Ordem.
Dependências.
Comunicação.
RPO.
RTO.
Verificações.
Retorno à operação normal.
178. Exercícios de desastre

Deverão ocorrer sem afetar o mundo real, sempre que possível.

179. Continuidade degradada

Em desastre parcial, a plataforma poderá priorizar:

Segurança.
Estado dos mundos.
Partidas em andamento.
Processamentos críticos.
Consultas.
Mercado.
Comunicação social.
Recursos secundários.
180. Integridade antes da disponibilidade

Quando houver conflito:

É preferível manter o mundo temporariamente indisponível
a reabri-lo em estado competitivo inconsistente.
181. Segurança da aplicação

Controles deverão incluir:

Validação de entrada.
Autorização por servidor.
Proteção de sessão.
Rate limiting.
Proteção contra abuso.
Atualização de dependências.
Revisão de código.
Gestão de vulnerabilidades.
182. Cliente não confiável

Toda informação enviada pelo cliente será tratada como não confiável.

O servidor validará:

Identidade.
Autoridade.
Estado.
Valor.
Versão.
Prazo.
Regras.
Recursos.
183. IDs enviados pelo cliente

O cliente não poderá obter autoridade apenas por conhecer um identificador.

184. Rate limiting

Poderá existir por:

Conta.
Sessão.
Endereço.
Mundo.
Comando.
Serviço.
Risco.
185. Rate limit competitivo

Deverá impedir abuso sem prejudicar ações legítimas próximas de prazo.

186. Proteção contra replay de comando

Comandos críticos utilizarão:

commandId.
idempotencyKey.
Timestamp.
Sessão.
Assinatura ou token.
Janela de validade.
187. Vulnerabilidades

Estados:

REPORTED
TRIAGED
CONFIRMED
MITIGATING
PATCHED
VERIFYING
RESOLVED
DUPLICATE
NOT_APPLICABLE
188. Severidade de vulnerabilidade

Poderá considerar:

Impacto.
Explorabilidade.
Dados.
Privilégio.
Escopo.
Disponibilidade de exploração.
189. Divulgação responsável

Relatos externos deverão possuir canal próprio e proteção contra retaliação a pesquisadores legítimos.

190. Dependências

O sistema deverá monitorar:

Vulnerabilidades conhecidas.
Versões obsoletas.
Licenças.
Integridade de pacotes.
Atualizações.
191. Atualização de dependência

Deverá passar por:

Testes.
Compatibilidade.
Staging.
Verificação.
Rollback.
192. Segurança da cadeia de build

Deverá proteger:

Código.
Pipelines.
Artefatos.
Credenciais.
Assinaturas.
Dependências.
Deployments.
193. Artefato de deployment

Deverá possuir:

Versão.
Commit.
Build.
Checksum.
Ambiente.
Aprovação.
Data.
194. Integridade do artefato

Um artefato alterado ou não reconhecido não será implantado.

195. Dados em ambiente de teste

Produção não deverá ser copiada integralmente para teste sem:

Anonimização.
Mascaramento.
Redução.
Autorização.
Proteção.
196. Dados sintéticos

Serão preferidos para:

Testes.
Desenvolvimento.
Demonstrações.
Treinamento interno.
197. Privacidade

Solicitações poderão envolver:

Acesso aos dados.
Correção.
Exportação.
Exclusão.
Restrição.
Anonimização.
198. Separação entre dado pessoal e fato competitivo

Ao excluir ou anonimizar dados:

Nome pessoal pode ser removido.
Identidade da conta pode ser anonimizada.
Resultados permanecem.
Clube permanece.
Transferências permanecem.
Controle histórico fica anonimizado.
Auditoria essencial permanece conforme política.
199. Exportação de dados do usuário

Deverá incluir apenas dados permitidos e pertencentes ao usuário.

Não deverá incluir:

Segredos de outros clubes.
Mensagens de terceiros sem base.
Evidências internas protegidas.
Atributos ocultos.
Dados de segurança.
200. Exclusão em processamento

Estados:

REQUESTED
IDENTITY_VERIFICATION
UNDER_REVIEW
WAITING_RETENTION_PERIOD
ANONYMIZING
COMPLETED
REJECTED
CANCELLED
201. Legal hold

Uma exclusão poderá ser parcialmente suspensa quando dados precisarem ser preservados por:

Investigação.
Disputa.
Segurança.
Integridade competitiva.
Obrigação aplicável.
202. Acesso de terceiros

Integrações ou fornecedores deverão possuir:

Contrato.
Escopo.
Dados mínimos.
Chaves próprias.
Auditoria.
Revogação.
Limite de retenção.
203. Integração comprometida

O sistema deverá:

Revogar credencial.
Bloquear tráfego.
Avaliar dados.
Abrir incidente.
Rotacionar segredos.
Informar afetados quando necessário.
204. Pagamentos externos

Operações externas deverão utilizar:

Identificador idempotente.
Estado.
Reconciliação.
Webhook verificado.
Auditoria.
Não duplicação.
Regra fechada

Dinheiro real da plataforma e economia fictícia do mundo serão domínios separados.

205. Webhooks

Deverão ser:

Autenticados.
Validados.
Idempotentes.
Reexecutáveis.
Monitorados.
Limitados.
206. Webhook fora de ordem

O sistema deverá utilizar:

Versão.
Estado.
Timestamp.
Identificador externo.

Para impedir regressão incorreta do processo.

207. Administração de organizadores

Organizadores de mundos privados poderão:

Convidar.
Gerir canais.
Publicar anúncios.
Configurar regras permitidas.
Solicitar correções.
Moderar casos leves.
208. Limites do organizador

Não poderá:

Consultar dados pessoais internos.
Ver atributos secretos.
Criar dinheiro.
Editar jogadores.
Alterar resultados.
Apagar dívidas.
Executar restore.
Acessar banco.
Ver logs de segurança.
Assumir conta.
209. Ação administrativa do organizador

Toda ação será ligada a:

Mundo.
Função.
Regra.
Participante.
Data.
Resultado.
210. Organizador que compete

Terá restrições adicionais:

Não moderar caso próprio.
Não acessar informação privada de rival.
Não alterar regras durante disputa sem processo.
Não remover concorrente sem revisão.
Não controlar calendário arbitrariamente.
211. Ferramenta de suporte ao mundo

Poderá permitir:

Verificar estado.
Reenviar convite.
Corrigir associação.
Retomar onboarding.
Abrir investigação.
Solicitar operação técnica.
212. Correção de associação de clube

Exigirá:

Verificação.
Histórico.
Sessões revogadas.
Ausência de conflito.
Aprovação.
Notificação.
213. Suporte não decide propriedade disputada

Disputas entre usuários sobre controle de clube deverão seguir processo específico de conta e governança.

214. Reprocessamento de notificações

Poderá:

Reconstruir notificações internas.
Evitar reenvio externo.
Respeitar estado lido.
Atualizar threads.
Impedir duplicidade.
215. Reprocessamento de estatísticas

Poderá reconstruir:

Partida.
Jogador.
Clube.
Competição.
Temporada.
Recordes.

Sem alterar o fato-base, salvo correção autorizada.

216. Reprocessamento de finanças

Deverá ser baseado em lançamentos e eventos, não em redefinição arbitrária de saldo.

217. Reprocessamento de tabela

Deverá:

Recalcular partidas oficiais.
Aplicar sanções.
Aplicar critérios.
Comparar versão.
Solicitar homologação quando houver mudança.
218. Reprocessamento do mercado

Poderá reconstruir:

Índices.
Valores estimados.
Projeções.
Busca.
Relatórios públicos.

Não deverá mudar contratos concluídos.

219. Reprocessamento populacional

Será altamente restrito para não:

Duplicar jogadores.
Alterar carreiras.
Recriar aposentados.
Mudar potencial.
Apagar identidade.
220. Ferramentas de leitura de eventos

Operadores poderão pesquisar por:

aggregateId.
eventId.
commandId.
causationId.
correlationId.
worldSequence.
221. Replay de agregado

Poderá reconstruir uma entidade em ambiente de análise para comparar:

Estado esperado.
Estado persistido.
Projeções.
Divergências.
222. Replay não autorizado em produção

O replay direto em produção exigirá job formal e aprovação.

223. Invariantes técnicas

Exemplos:

Um mundo possui uma data oficial ativa.
Um clube possui um controlador principal.
Um jogador possui vínculos compatíveis.
Um pagamento não é liquidado duas vezes.
Um contrato não está ativo e expirado simultaneamente.
Uma partida oficial possui resultado consistente.
Um título possui uma versão oficial.
Um job concluído não volta a executar sem nova tentativa registrada.
224. Verificação contínua de invariantes

Poderá ocorrer:

Após comando.
Após evento.
Em job periódico.
Durante transição.
Após deployment.
Após restauração.
225. Invariante crítica violada

A ação deverá:

Bloquear novas operações relacionadas.
Criar incidente.
Preservar estado.
Notificar operações.
Iniciar diagnóstico.
Evitar correção automática arriscada.
226. Auto-repair

Será permitido somente para situações:

Bem definidas.
Reversíveis.
Testadas.
Sem impacto competitivo subjetivo.

Exemplo:

Reconstruir cache.
Recriar projeção.
Liberar lock expirado.
Reenfileirar evento seguro.
227. Auto-repair proibido

Não poderá decidir automaticamente:

Quem foi campeão.
Qual clube deve receber dinheiro controverso.
Qual usuário possui razão em disputa.
Qual transferência deve ser anulada.
Qual jogador deveria ter marcado gol.
228. Locks administrativos

Operações poderão adquirir locks sobre:

Mundo.
Competição.
Entidade.
Job.
Transição.
Backup.
Restauração.
229. Lock órfão

Deverá possuir:

Expiração.
Dono.
Heartbeat.
Processo de liberação segura.
Auditoria.
230. Capacidade

O sistema deverá monitorar:

Crescimento do banco.
Eventos.
Arquivos.
Partidas.
Mundos.
Usuários.
Filas.
Cache.
Conexões.
231. Planejamento de capacidade

Deverá utilizar:

Tendência.
Sazonalidade.
Picos de partidas.
Fechamento de janela.
Transição de temporada.
Lançamentos.
Crescimento histórico.
232. Escalonamento

Poderá ser:

VERTICAL
HORIZONTAL
SCHEDULED
EVENT_DRIVEN
MANUAL
233. Priorização sob carga

Ordem recomendada:

Segurança.
Comandos competitivos.
Partidas.
Processamentos obrigatórios.
Consultas essenciais.
Mercado.
Notificações.
Estatísticas agregadas.
Recursos sociais.
Rebuilds históricos.
234. Degradação graciosa

Exemplos:

Desativar gráficos avançados.
Atrasar rankings.
Agrupar notificações.
Pausar rebuilds.
Limitar busca histórica.
Manter partida e mercado ativos.
235. Proteção contra efeito cascata

Deverá utilizar:

Timeouts.
Circuit breakers.
Filas.
Limites.
Isolamento.
Fallbacks.
Bulkheads.
236. Dependência externa indisponível

O serviço deverá:

Usar retry controlado.
Abrir circuito.
Preservar comandos.
Informar degradação.
Evitar avalanche.
237. Cache

A administração poderá:

Invalidar.
Reaquecer.
Reconstruir.
Inspecionar chaves de forma segura.

Não deverá editar fato oficial via cache.

238. Storage de arquivos

Deverá armazenar:

Relatórios.
Imagens.
Snapshots.
Backups.
Documentos.
Exportações.

Com:

Controle de acesso.
Versionamento.
Checksum.
Retenção.
Criptografia.
239. Arquivo infectado ou inválido

Deverá ser:

Isolado.
Bloqueado.
Verificado.
Removido ou recuperado.
Associado a incidente quando necessário.
240. Exportações administrativas

Deverão possuir:

Escopo mínimo.
Expiração.
Criptografia.
Identificação do solicitante.
Motivo.
Registro de download.
Revogação.
241. Link de exportação

Deverá:

Expirar.
Ser de uso controlado.
Não ser público.
Não conter segredo permanente.
Registrar acesso.
242. Exclusão de exportações

Arquivos temporários deverão ser removidos após o período definido.

243. Relatórios operacionais

Poderão incluir:

Disponibilidade.
Incidentes.
Backups.
Restaurações.
Vulnerabilidades.
Correções.
Acessos emergenciais.
Capacidade.
Ações pendentes.
244. Relatório de integridade do mundo

Deverá mostrar:

Invariantes:
válidas

Processamento diário:
concluído

Partidas pendentes:
0

Lançamentos não conciliados:
0

Jobs falhos:
1 não crítico

Último backup validado:
há 6 horas
245. Relatório de acesso interno

Poderá listar:

Operador.
Função.
Ações.
Dados sensíveis acessados.
Acesso emergencial.
Aprovações.
Sessões suspeitas.
246. Alertas de auditoria

Exemplos:

Ação sem ticket.
Acesso fora de escopo.
Aprovação própria.
Exportação excessiva.
Correção sem dry run.
Flag sem responsável.
Backup não validado.
Migração atrasada.
247. Runbooks

Cada operação recorrente deverá possuir instrução oficial para:

Diagnóstico.
Mitigação.
Verificação.
Escalonamento.
Comunicação.
Encerramento.
248. Execução de runbook

Poderá ser:

Manual.
Assistida.
Automatizada.
Automatizada com aprovação.
249. Runbook obsoleto

Deverá ser revisado após:

Incidente.
Mudança de arquitetura.
Falha de execução.
Mudança de fornecedor.
Alteração de regra.
250. Estado operacional do mundo
HEALTHY
DEGRADED
AT_RISK
MAINTENANCE
READ_ONLY
RECOVERING
SUSPENDED
ARCHIVED
251. Estado AT_RISK

Indica que o mundo ainda funciona, mas possui:

Fila crescente.
Backup atrasado.
Falha de conciliação.
Capacidade próxima do limite.
Dependência instável.
Job crítico em retry.
252. Entrada automática em somente leitura

Poderá ocorrer quando:

Integridade financeira falhar.
Duplicidade de jogadores for detectada.
Sequência de eventos quebrar.
Banco ficar inconsistente.
Segurança exigir contenção.
253. Saída de somente leitura

Exigirá:

Causa resolvida.
Invariantes válidas.
Jobs conciliados.
Aprovação.
Comunicação.
Monitoramento reforçado.
254. Estados vazios
Nenhum incidente
Nenhum incidente operacional ativo.

Último incidente resolvido:
há 12 dias
Nenhuma ação aguardando aprovação
Nenhuma operação administrativa pendente.
Nenhum job falho
Todos os jobs críticos estão saudáveis.
255. Erro parcial administrativo
As métricas históricas estão temporariamente atrasadas.

Partidas, mercado e finanças continuam operando.
256. Falha crítica administrativa
A consistência do mundo não pôde ser confirmada.

O mundo foi colocado em modo somente leitura
até a conclusão da recuperação.
257. Contrato mínimo do operador
adminOperatorId
userIdentityId
status
roleIds
environmentPermissions
worldScopes
dataAccessScopes
authenticationPolicy
conflictDeclarations
createdAt
lastReviewedAt
version
258. Contrato mínimo da função administrativa
adminRoleId
name
permissions
environmentScopes
dataClassificationScopes
approvalRequirements
sessionPolicy
breakGlassEligibility
createdAt
updatedAt
version
259. Contrato mínimo da sessão administrativa
adminSessionId
operatorId
environment
roleSnapshot
authenticationStrength
deviceId
riskState
startedAt
lastActivityAt
expiresAt
revokedAt
version
260. Contrato mínimo da operação administrativa
administrativeOperationId
environment
gameWorldId
operationType
status
requestedBy
approvedByIds
executedBy
reason
ticketReference
targetEntityType
targetEntityIds
dryRunResult
beforeSnapshotReference
afterSnapshotReference
rollbackPlan
startedAt
completedAt
version
261. Contrato mínimo da correção
administrativeCorrectionId
environment
gameWorldId
type
status
problemDescription
rootCauseReference
targetEntityIds
proposedChanges
competitiveImpact
financialImpact
privacyImpact
dryRunReference
approvalIds
executionJobId
rollbackJobId
communicationPlan
createdAt
completedAt
version
262. Contrato mínimo do incidente
operationalIncidentId
environment
gameWorldIds
severity
status
title
description
affectedServices
affectedUserEstimate
incidentCommanderId
responderIds
timelineEvents
mitigationActions
publicCommunicationIds
rootCause
correctiveActionIds
detectedAt
resolvedAt
closedAt
version
263. Contrato mínimo da ação corretiva
incidentCorrectiveActionId
incidentId
title
description
priority
status
ownerId
dueAt
completedAt
verificationReference
version
264. Contrato mínimo do job
administrativeJobId
environment
gameWorldId
jobType
status
parameters
idempotencyKey
checkpoint
progress
attemptCount
heartbeatAt
requestedBy
approvedBy
startedAt
completedAt
failureReason
version
265. Contrato mínimo do backup
backupId
environment
scopeType
scopeId
backupType
status
storageReference
encryptionKeyReference
checksum
startedAt
completedAt
validatedAt
expiresAt
recoveryPoint
version
266. Contrato mínimo da restauração
restoreOperationId
environment
scopeType
scopeId
status
backupId
targetRecoveryPoint
isolatedValidationEnvironment
eventReplayPolicy
externalSideEffectPolicy
approvalIds
startedAt
completedAt
validationResults
version
267. Contrato mínimo da manutenção
maintenanceWindowId
environment
gameWorldIds
type
status
affectedServices
deadlinePolicy
matchPolicy
startsAt
plannedEndsAt
actualEndsAt
communicationIds
approvedBy
version
268. Contrato mínimo do deployment
deploymentId
environment
serviceIds
artifactVersions
strategy
status
approvedBy
featureFlagIds
migrationIds
startedAt
completedAt
verificationResults
rollbackDeploymentId
version
269. Contrato mínimo da migração
databaseMigrationId
environment
serviceId
name
status
schemaVersionFrom
schemaVersionTo
migrationType
dryRunReference
backupId
checkpoint
validationResults
rollbackStrategy
startedAt
completedAt
version
270. Contrato mínimo da feature flag
featureFlagId
name
description
status
scopeType
scopeIds
ownerId
createdAt
reviewAt
expiresAt
removalPlan
competitiveImpact
version
271. Contrato mínimo do ticket
supportTicketId
userId
gameWorldId
category
status
priority
subject
description
assignedAgentId
relatedEntityIds
identityVerificationState
administrativeOperationIds
createdAt
resolvedAt
version
272. Contrato mínimo do acesso de suporte
supportAccessSessionId
ticketId
agentId
userId
mode
status
permissions
approvedBy
startedAt
expiresAt
endedAt
userNotificationId
version
273. Contrato mínimo do evento de auditoria
auditEventId
environment
actorType
actorId
sessionId
action
targetType
targetId
gameWorldId
reason
ticketReference
approvalReferences
beforeReference
afterReference
result
occurredAt
integrityHash
version
274. Eventos necessários
ADMIN_OPERATOR_CREATED
ADMIN_OPERATOR_STATUS_CHANGED
ADMIN_ROLE_CREATED
ADMIN_ROLE_UPDATED
ADMIN_PERMISSION_GRANTED
ADMIN_PERMISSION_REVOKED
ADMIN_TEMPORARY_ACCESS_GRANTED
ADMIN_TEMPORARY_ACCESS_EXPIRED

ADMIN_SESSION_STARTED
ADMIN_SESSION_REAUTHENTICATION_REQUIRED
ADMIN_SESSION_MARKED_SUSPICIOUS
ADMIN_SESSION_REVOKED
ADMIN_SESSION_EXPIRED

ADMIN_CONFLICT_OF_INTEREST_DECLARED
ADMIN_OPERATION_BLOCKED_BY_CONFLICT
ADMIN_BREAK_GLASS_REQUESTED
ADMIN_BREAK_GLASS_ACTIVATED
ADMIN_BREAK_GLASS_EXPIRED
ADMIN_BREAK_GLASS_REVIEW_COMPLETED

ADMINISTRATIVE_OPERATION_CREATED
ADMINISTRATIVE_OPERATION_DRY_RUN_COMPLETED
ADMINISTRATIVE_OPERATION_APPROVAL_REQUESTED
ADMINISTRATIVE_OPERATION_APPROVED
ADMINISTRATIVE_OPERATION_REJECTED
ADMINISTRATIVE_OPERATION_STARTED
ADMINISTRATIVE_OPERATION_COMPLETED
ADMINISTRATIVE_OPERATION_FAILED
ADMINISTRATIVE_OPERATION_ROLLBACK_STARTED
ADMINISTRATIVE_OPERATION_ROLLED_BACK

ADMINISTRATIVE_CORRECTION_CREATED
ADMINISTRATIVE_CORRECTION_VALIDATED
ADMINISTRATIVE_CORRECTION_COMPETITIVE_REVIEW_REQUIRED
ADMINISTRATIVE_CORRECTION_APPROVED
ADMINISTRATIVE_CORRECTION_EXECUTED
ADMINISTRATIVE_CORRECTION_FAILED
ADMINISTRATIVE_CORRECTION_REVERTED

SUPPORT_TICKET_CREATED
SUPPORT_TICKET_TRIAGED
SUPPORT_TICKET_ASSIGNED
SUPPORT_TICKET_ESCALATED
SUPPORT_TICKET_RESOLVED
SUPPORT_TICKET_REOPENED
SUPPORT_IDENTITY_VERIFIED

SUPPORT_ACCESS_REQUESTED
SUPPORT_ACCESS_APPROVED
SUPPORT_ACCESS_STARTED
SUPPORT_ACCESS_ENDED
SUPPORT_ACCESS_EXPIRED
SUPPORT_ACCESS_REVOKED
SUPPORT_ACCESS_USER_NOTIFIED

OPERATIONAL_INCIDENT_DETECTED
OPERATIONAL_INCIDENT_ACKNOWLEDGED
OPERATIONAL_INCIDENT_ESCALATED
OPERATIONAL_INCIDENT_MITIGATION_STARTED
OPERATIONAL_INCIDENT_MONITORING_STARTED
OPERATIONAL_INCIDENT_RESOLVED
OPERATIONAL_INCIDENT_REOPENED
POST_INCIDENT_REVIEW_STARTED
POST_INCIDENT_REVIEW_COMPLETED

INCIDENT_CORRECTIVE_ACTION_CREATED
INCIDENT_CORRECTIVE_ACTION_STARTED
INCIDENT_CORRECTIVE_ACTION_BLOCKED
INCIDENT_CORRECTIVE_ACTION_COMPLETED
INCIDENT_CORRECTIVE_ACTION_OVERDUE

ADMINISTRATIVE_JOB_CREATED
ADMINISTRATIVE_JOB_QUEUED
ADMINISTRATIVE_JOB_STARTED
ADMINISTRATIVE_JOB_CHECKPOINT_CREATED
ADMINISTRATIVE_JOB_STALLED
ADMINISTRATIVE_JOB_RETRYING
ADMINISTRATIVE_JOB_PARTIALLY_COMPLETED
ADMINISTRATIVE_JOB_COMPLETED
ADMINISTRATIVE_JOB_FAILED
ADMINISTRATIVE_JOB_CANCELLED
ADMINISTRATIVE_JOB_DEAD_LETTERED

RECONCILIATION_STARTED
RECONCILIATION_DIFFERENCE_DETECTED
RECONCILIATION_REPAIR_STARTED
RECONCILIATION_COMPLETED
CRITICAL_INVARIANT_VIOLATION_DETECTED
CRITICAL_INVARIANT_RESTORED
AUTO_REPAIR_EXECUTED
AUTO_REPAIR_BLOCKED

QUEUE_BACKLOG_THRESHOLD_REACHED
DEAD_LETTER_CREATED
DEAD_LETTER_REPROCESSING_STARTED
DEAD_LETTER_REPROCESSED
POISON_MESSAGE_ISOLATED

PLATFORM_SERVICE_DEGRADED
PLATFORM_SERVICE_RECOVERED
WORLD_OPERATIONAL_STATE_CHANGED
WORLD_ENTERED_READ_ONLY_AUTOMATICALLY
WORLD_EXITED_READ_ONLY

MAINTENANCE_WINDOW_CREATED
MAINTENANCE_WINDOW_APPROVED
MAINTENANCE_WINDOW_STARTED
MAINTENANCE_WINDOW_EXTENDED
MAINTENANCE_WINDOW_COMPLETED
EMERGENCY_MAINTENANCE_STARTED

DEPLOYMENT_CREATED
DEPLOYMENT_APPROVED
DEPLOYMENT_STARTED
DEPLOYMENT_VERIFICATION_STARTED
DEPLOYMENT_COMPLETED
DEPLOYMENT_FAILED
DEPLOYMENT_ROLLBACK_STARTED
DEPLOYMENT_ROLLED_BACK

DATABASE_MIGRATION_CREATED
DATABASE_MIGRATION_TESTED
DATABASE_MIGRATION_APPROVED
DATABASE_MIGRATION_STARTED
DATABASE_MIGRATION_CHECKPOINT_CREATED
DATABASE_MIGRATION_COMPLETED
DATABASE_MIGRATION_FAILED
DATABASE_MIGRATION_ROLLED_BACK

FEATURE_FLAG_CREATED
FEATURE_FLAG_ACTIVATED
FEATURE_FLAG_SCOPE_CHANGED
FEATURE_FLAG_DISABLED
FEATURE_FLAG_EXPIRED
FEATURE_FLAG_REMOVED
FEATURE_FLAG_REVIEW_REQUIRED

BACKUP_STARTED
BACKUP_COMPLETED
BACKUP_VALIDATION_STARTED
BACKUP_VALIDATED
BACKUP_INVALIDATED
BACKUP_FAILED
BACKUP_EXPIRED

RESTORE_REQUESTED
RESTORE_APPROVED
RESTORE_ISOLATED_VALIDATION_STARTED
RESTORE_VALIDATION_COMPLETED
RESTORE_APPLICATION_STARTED
RESTORE_EVENT_REPLAY_STARTED
RESTORE_COMPLETED
RESTORE_FAILED
RESTORE_ROLLED_BACK

DISASTER_RECOVERY_ACTIVATED
DISASTER_RECOVERY_SERVICE_RESTORED
DISASTER_RECOVERY_COMPLETED
DISASTER_RECOVERY_EXERCISE_STARTED
DISASTER_RECOVERY_EXERCISE_COMPLETED

SECURITY_VULNERABILITY_REPORTED
SECURITY_VULNERABILITY_CONFIRMED
SECURITY_VULNERABILITY_MITIGATION_STARTED
SECURITY_VULNERABILITY_PATCHED
SECURITY_VULNERABILITY_RESOLVED

SECRET_ROTATION_STARTED
SECRET_ROTATION_COMPLETED
SECRET_ROTATION_FAILED
INTERNAL_ACCESS_ANOMALY_DETECTED
INTERNAL_ACCOUNT_RESTRICTED

USER_DATA_EXPORT_REQUESTED
USER_DATA_EXPORT_CREATED
USER_DATA_EXPORT_DOWNLOADED
USER_DATA_EXPORT_EXPIRED
USER_DATA_DELETION_REQUESTED
USER_DATA_ANONYMIZATION_STARTED
USER_DATA_ANONYMIZATION_COMPLETED
LEGAL_HOLD_APPLIED
LEGAL_HOLD_REMOVED
275. Comandos necessários
CREATE_ADMIN_OPERATOR
UPDATE_ADMIN_OPERATOR
CREATE_ADMIN_ROLE
UPDATE_ADMIN_ROLE
GRANT_ADMIN_PERMISSION
REVOKE_ADMIN_PERMISSION
GRANT_TEMPORARY_ADMIN_ACCESS
REVOKE_ADMIN_SESSION

REQUEST_BREAK_GLASS_ACCESS
ACTIVATE_BREAK_GLASS_ACCESS
REVIEW_BREAK_GLASS_USAGE

CREATE_ADMINISTRATIVE_OPERATION
RUN_ADMINISTRATIVE_OPERATION_DRY_RUN
REQUEST_ADMINISTRATIVE_OPERATION_APPROVAL
APPROVE_ADMINISTRATIVE_OPERATION
REJECT_ADMINISTRATIVE_OPERATION
EXECUTE_ADMINISTRATIVE_OPERATION
ROLLBACK_ADMINISTRATIVE_OPERATION

CREATE_ADMINISTRATIVE_CORRECTION
VALIDATE_ADMINISTRATIVE_CORRECTION
REQUEST_COMPETITIVE_CORRECTION_REVIEW
APPROVE_ADMINISTRATIVE_CORRECTION
EXECUTE_ADMINISTRATIVE_CORRECTION
REVERT_ADMINISTRATIVE_CORRECTION

CREATE_SUPPORT_TICKET
TRIAGE_SUPPORT_TICKET
ASSIGN_SUPPORT_TICKET
ESCALATE_SUPPORT_TICKET
RESOLVE_SUPPORT_TICKET
REOPEN_SUPPORT_TICKET
VERIFY_SUPPORT_IDENTITY

REQUEST_SUPPORT_ACCESS
APPROVE_SUPPORT_ACCESS
START_SUPPORT_ACCESS
END_SUPPORT_ACCESS
REVOKE_SUPPORT_ACCESS

CREATE_OPERATIONAL_INCIDENT
ACKNOWLEDGE_OPERATIONAL_INCIDENT
ESCALATE_OPERATIONAL_INCIDENT
APPLY_INCIDENT_MITIGATION
MARK_INCIDENT_MONITORING
RESOLVE_OPERATIONAL_INCIDENT
REOPEN_OPERATIONAL_INCIDENT
START_POST_INCIDENT_REVIEW
COMPLETE_POST_INCIDENT_REVIEW

CREATE_INCIDENT_CORRECTIVE_ACTION
UPDATE_INCIDENT_CORRECTIVE_ACTION
COMPLETE_INCIDENT_CORRECTIVE_ACTION

CREATE_ADMINISTRATIVE_JOB
START_ADMINISTRATIVE_JOB
PAUSE_ADMINISTRATIVE_JOB
RESUME_ADMINISTRATIVE_JOB
CANCEL_ADMINISTRATIVE_JOB
RETRY_ADMINISTRATIVE_JOB
REPROCESS_DEAD_LETTER

START_RECONCILIATION
EXECUTE_RECONCILIATION_REPAIR
VERIFY_WORLD_INVARIANTS
EXECUTE_SAFE_AUTO_REPAIR

CREATE_MAINTENANCE_WINDOW
APPROVE_MAINTENANCE_WINDOW
START_MAINTENANCE_WINDOW
EXTEND_MAINTENANCE_WINDOW
COMPLETE_MAINTENANCE_WINDOW
START_EMERGENCY_MAINTENANCE

CREATE_DEPLOYMENT
APPROVE_DEPLOYMENT
START_DEPLOYMENT
VERIFY_DEPLOYMENT
START_DEPLOYMENT_ROLLBACK

CREATE_DATABASE_MIGRATION
TEST_DATABASE_MIGRATION
APPROVE_DATABASE_MIGRATION
START_DATABASE_MIGRATION
RESUME_DATABASE_MIGRATION
ROLLBACK_DATABASE_MIGRATION

CREATE_FEATURE_FLAG
ACTIVATE_FEATURE_FLAG
UPDATE_FEATURE_FLAG_SCOPE
DISABLE_FEATURE_FLAG
REMOVE_FEATURE_FLAG

START_BACKUP
VALIDATE_BACKUP
INVALIDATE_BACKUP
EXPIRE_BACKUP

REQUEST_RESTORE
APPROVE_RESTORE
START_ISOLATED_RESTORE_VALIDATION
APPLY_RESTORE
START_EVENT_REPLAY
VERIFY_RESTORE
ROLLBACK_RESTORE

ACTIVATE_DISASTER_RECOVERY
COMPLETE_DISASTER_RECOVERY
START_DISASTER_RECOVERY_EXERCISE

REPORT_SECURITY_VULNERABILITY
TRIAGE_SECURITY_VULNERABILITY
CONFIRM_SECURITY_VULNERABILITY
APPLY_SECURITY_MITIGATION
RESOLVE_SECURITY_VULNERABILITY

ROTATE_SECRET
REVOKE_INTEGRATION_CREDENTIAL
RESTRICT_INTERNAL_ACCOUNT

REQUEST_USER_DATA_EXPORT
CREATE_USER_DATA_EXPORT
EXPIRE_USER_DATA_EXPORT
REQUEST_USER_DATA_DELETION
START_USER_DATA_ANONYMIZATION
APPLY_LEGAL_HOLD
REMOVE_LEGAL_HOLD
276. Idempotência

Comandos administrativos críticos utilizarão:

commandId
idempotencyKey
expectedVersion
environment
operatorId
gameWorldId
administrativeOperationId
ticketReference
issuedAt

Aplicável a:

Correções.
Backups.
Restaurações.
Jobs.
Migrações.
Deployments.
Permissões.
Anonimizações.
Reprocessamentos.
Operações de suporte.
277. Auditoria obrigatória

Serão auditados:

Login administrativo.
Falhas de autenticação.
Permissões.
Elevação temporária.
Acesso emergencial.
Dados sensíveis visualizados.
Exportações.
Impersonação.
Correções.
Scripts.
Jobs.
Backups.
Restaurações.
Migrações.
Deployments.
Feature flags.
Incidentes.
Alterações de mundo.
Anonimizações.
Exclusões.
Ações de organizadores.
Tentativas bloqueadas.
278. Telemetria operacional
Disponibilidade.
Latência.
Erros.
Capacidade.
Filas.
Jobs.
Incidentes.
Tempo de resposta.
Tempo de recuperação.
Backups válidos.
Testes de restauração.
Falhas de migration.
Rollbacks.
Correções.
Acessos emergenciais.
Tickets.
Sessões de suporte.
Violações de invariantes.
Dead letters.
Vulnerabilidades.
Segredos rotacionados.
Exportações.
Anonimizações.
279. Casos extremos fechados
Um suporte tenta alterar o saldo do clube

A permissão não existe para sua função. A tentativa é bloqueada e auditada.

Um engenheiro joga no mundo afetado

O conflito de interesse impede operações competitivamente sensíveis.

Um operador tenta aprovar a própria correção

A segregação de funções bloqueia.

Um administrador acessa produção com conta comum

O acesso é recusado.

A sessão administrativa fica aberta sem uso

Expira automaticamente.

Uma ação crítica ocorre sem reautenticação

É bloqueada.

Acesso emergencial é usado sem incidente real

Gera investigação de segurança.

Um operador exporta dados em grande volume

A ação exige permissão, motivo e pode gerar alerta.

Um ticket pede leitura de mensagens privadas

O suporte comum não possui acesso.

O usuário pede que o suporte faça uma transferência por ele

O suporte não pode executar a ação competitiva.

O suporte precisa reproduzir erro visual

Utiliza impersonação somente leitura.

O agente esquece de encerrar a sessão de suporte

A sessão expira automaticamente.

O usuário exclui a conta durante investigação

Os dados pessoais elegíveis são tratados, preservando evidências sob retenção aplicável.

Um bug duplica um pagamento

A correção usa estorno e conciliação, não edição silenciosa de saldo.

Um bug duplica um jogador

O processo de união de registros preserva contratos, partidas e histórico.

Uma partida trava ao vivo

Operações pode recuperar serviço, mas não inventar o resultado.

O motor produz resultado inválido

A partida fica pendente e o processo competitivo decide os efeitos.

Um operador altera diretamente o banco em emergência

A ação exige script, backup, aprovação e evento compensatório posterior.

Um script de correção afeta mais entidades que o esperado

O limite de escopo bloqueia a execução.

O dry run mostra impacto competitivo

A correção exige revisão da autoridade esportiva.

Um job para no item 700 de 1.000

Retoma a partir do checkpoint.

Um job é iniciado duas vezes

A chave de idempotência mantém uma execução lógica.

Uma mensagem sempre quebra o consumidor

É movida para dead letter sem bloquear a fila inteira.

Uma fila cresce durante fechamento da janela

Eventos críticos recebem prioridade e capacidade adicional.

O cache possui saldo antigo

O cache é invalidado; o razão financeiro continua sendo a autoridade.

Um dashboard está atrasado

Não altera o estado real do mundo.

Um alerta técnico dispara cem vezes

É agrupado em um único incidente.

O serviço de mensagens cai

Partidas e mercado continuam quando isolados corretamente.

Uma dependência externa começa a falhar

O circuit breaker impede efeito cascata.

Um deployment aumenta erros

O rollback é iniciado.

A migration conclui parcialmente

O checkpoint e o plano de recuperação determinam a retomada.

Código antigo não funciona com o novo schema

A validação prévia deve impedir o deployment ou exigir migração compatível.

Uma feature flag afeta apenas um clube em competição

É bloqueada se gerar diferença competitiva.

Uma flag permanece ativa sem responsável

Entra em revisão obrigatória.

Um backup termina com sucesso, mas está corrompido

A validação o marca como inválido.

O backup mais recente é inválido

A restauração utiliza o último backup validado adequado.

A restauração dispara novamente pagamentos externos

A política de efeitos externos e a idempotência bloqueiam.

Um mundo é restaurado sem afetar outros

O isolamento por mundo preserva as demais instâncias.

Um evento posterior ao backup está corrompido

O replay para antes dele e exige análise.

A região principal é perdida

O plano de recuperação de desastre é ativado.

A plataforma pode voltar rapidamente, mas sem validar dados

Permanece fechada até a integridade mínima ser confirmada.

Uma credencial de integração vaza

É revogada e rotacionada.

Um webhook antigo chega depois do novo

A versão impede regressão de estado.

Dados de produção são usados em teste

Somente após anonimização e autorização.

Um organizador tenta apagar dívida de amigo

A função não possui esse comando.

Um organizador remove adversário durante disputa

A ação exige revisão independente e pode ser bloqueada por conflito.

Um reprocessamento de estatísticas altera recorde

O recorde é recalculado e versionado.

Um reprocessamento populacional tenta recriar aposentados

As invariantes bloqueiam.

Um lock permanece após falha de worker

Expira ou é liberado por processo seguro.

O armazenamento está quase cheio

O estado AT_RISK é ativado antes da falha.

A carga fica extrema durante rodada decisiva

Recursos secundários são degradados para preservar partidas e comandos críticos.

Uma vulnerabilidade crítica é descoberta

A mitigação pode desativar temporariamente o recurso afetado.

Um operador interno tenta acessar seeds futuras

O dado altamente restrito é bloqueado e a tentativa é registrada.

O usuário pede exportação de seus dados

Recebe apenas dados permitidos, sem segredos de outros clubes.

Uma correção antiga precisa ser auditada

O evento original, aprovações e versão corrigida permanecem disponíveis.

280. Critérios de aceite

O bloco será considerado correto quando:

Administração da plataforma e do mundo forem separadas.
Administração técnica e competitiva forem separadas.
Permissões seguirem menor privilégio.
Funções administrativas possuírem escopos.
Permissão em teste não valer em produção.
Contas administrativas forem separadas das contas comuns.
Segundo fator ser obrigatório para administração.
Sessões administrativas possuírem expiração.
Ações críticas exigirem reautenticação.
Aprovação dupla ser suportada.
Propor e aprovar a mesma ação crítica ser bloqueado.
Conflitos de interesse serem declarados.
Operadores participantes do mundo serem restringidos.
Permissões temporárias possuírem expiração.
Acesso permanente amplo ser evitado.
Acesso emergencial possuir processo.
Acesso emergencial gerar alerta.
Uso emergencial ser revisado.
Interfaces identificarem claramente produção.
Buscas por dados sensíveis serem auditadas.
Dados possuírem classificação.
Dados sensíveis serem mascarados.
Revelações temporárias exigirem justificativa.
Segredos não aparecerem em logs.
Segredos possuírem rotação.
Logs possuírem correlação.
Logs comuns não armazenarem dados desnecessários.
Auditoria ser diferente de log técnico.
Auditoria ser imutável por operação comum.
Correções da auditoria gerarem eventos adicionais.
Ações internas suspeitas serem detectadas.
Suporte possuir permissões limitadas.
Verificação de identidade ser exigida.
Visualização assistida respeitar privacidade.
Impersonação somente leitura ser suportada.
Sessões de suporte serem temporárias.
Sessões de suporte serem auditadas.
Ações competitivas serem proibidas em impersonação.
Correções administrativas possuírem tipos.
Projeções poderem ser reconstruídas sem alterar fatos.
Correções de fato-base exigirem processo reforçado.
Edições diretas de banco serem excepcionais.
Scripts administrativos serem versionados.
Correções em lote possuírem dry run.
Operações em lote possuírem limite de escopo.
Operações de alto impacto possuírem rollback.
Correções possuírem estados.
Correções financeiras usarem lançamentos.
Transferências inválidas não serem revertidas apenas mudando clube.
Jogadores duplicados poderem ser consolidados.
Resultados oficiais dependerem da autoridade competitiva.
Operações técnicas não poderem inserir gols.
Jobs possuírem estados.
Jobs longos possuírem heartbeat.
Jobs sem heartbeat serem detectados.
Jobs possuírem checkpoint.
Jobs poderem ser cancelados com segurança.
Resultados parciais serem apresentados.
Conciliações serem periódicas.
Diferenças críticas gerarem incidentes.
Filas possuírem dead letter.
Poison messages serem isoladas.
Reprocessamentos preservarem identificadores.
Filas críticas preservarem ordenação necessária.
Backpressure ser controlado.
Observabilidade combinar métricas, logs e traces.
Métricas de negócio operacionais existirem.
Métricas não revelarem segredos competitivos.
Tracing distribuído ser suportado.
Dashboards existirem por mundo e serviço.
Health checks possuírem níveis.
Synthetic checks serem suportados.
Alertas possuírem responsáveis.
Incidentes possuírem severidade.
Incidentes possuírem estados.
Incidentes possuírem comando e timeline.
Comunicação ser baseada em fatos.
Impacto poder ser segmentado por mundo.
Mitigações poderem desativar recursos.
Resolução exigir validação de integridade.
Revisões pós-incidente serem obrigatórias para casos relevantes.
Ações corretivas possuírem responsáveis e prazos.
Manutenções possuírem políticas de prazo.
Manutenções emergenciais serem comunicadas.
Deployments possuírem estados.
Verificação pós-deployment ser obrigatória.
Rollbacks serem suportados.
Schemas serem compatíveis com rollback quando planejado.
Migrações possuírem estados.
Migrações serem testadas.
Migrações destrutivas ocorrerem em etapas.
Backfills serem retomáveis.
Feature flags possuírem escopo.
Flags competitivas não criarem desigualdade.
Kill switches existirem.
Flags possuírem responsável e expiração.
Flags antigas serem removidas.
Configurações possuírem schema e versão.
Regras competitivas não mudarem como simples configuração técnica.
Backups possuírem frequência e retenção.
RPO e RTO serem definidos.
Backups serem isolados.
Backups serem criptografados.
Backups serem testados.
Backups não testados serem identificados.
Snapshots do mundo serem consistentes.
Partidas em andamento terem política de snapshot.
Restaurações possuírem tipos.
Restaurações exigirem plano.
Restaurações poderem ser validadas em isolamento.
Eventos posteriores poderem ser reaplicados.
Eventos suspeitos interromperem replay.
Restauração de um mundo não afetar os demais.
Efeitos externos não serem duplicados.
Restaurações possuírem estados.
Recuperação de desastre possuir runbook.
Exercícios de desastre serem realizados.
Serviços críticos serem priorizados.
Integridade ter precedência sobre disponibilidade.
O cliente ser tratado como não confiável.
Autorização sempre ocorrer no servidor.
Conhecer um identificador não conceder acesso.
Rate limiting existir.
Replay de comandos ser impedido.
Vulnerabilidades possuírem processo.
Dependências serem monitoradas.
Atualizações passarem por testes.
Pipelines e artefatos serem protegidos.
Artefatos possuírem checksum e versão.
Produção não ser copiada para teste sem proteção.
Dados sintéticos serem preferidos.
Privacidade possuir processos de acesso e exclusão.
Dados pessoais e fatos competitivos serem separados.
Exportações não incluírem segredos de terceiros.
Legal hold ser suportado.
Integrações possuírem credenciais próprias.
Credenciais comprometidas poderem ser revogadas.
Pagamentos externos serem idempotentes.
Economia fictícia e dinheiro real serem separados.
Webhooks serem autenticados.
Webhooks fora de ordem serem tratados.
Organizadores possuírem poderes limitados.
Organizadores não acessarem dados internos.
Organizadores competidores possuírem restrições extras.
Correções de associação serem auditadas.
Suporte não decidir disputas de propriedade sozinho.
Notificações poderem ser reprocessadas sem spam.
Estatísticas poderem ser reconstruídas.
Finanças serem reprocessadas por lançamentos.
Tabelas reprocessadas exigirem nova homologação quando alteradas.
Mercado reprocessado não mudar contratos concluídos.
População não poder ser regenerada arbitrariamente.
Eventos poderem ser consultados por correlação.
Agregados poderem ser reconstruídos para análise.
Replay em produção exigir operação formal.
Invariantes técnicas serem declaradas.
Invariantes serem verificadas continuamente.
Violações críticas bloquearem operações relacionadas.
Auto-repair ser limitado a situações seguras.
Auto-repair não decidir resultados.
Locks administrativos possuírem expiração.
Locks órfãos serem recuperáveis.
Capacidade ser monitorada.
Planejamento considerar picos do jogo.
Escalonamento horizontal ser suportado.
Prioridade sob carga ser definida.
Degradação graciosa preservar funções críticas.
Efeitos cascata serem limitados.
Dependências externas utilizarem circuit breaker.
Cache não ser fonte de verdade.
Storage possuir acesso e versionamento.
Arquivos inválidos serem isolados.
Exportações administrativas serem temporárias.
Relatórios operacionais existirem.
Integridade do mundo possuir relatório.
Acessos internos possuírem relatório.
Alertas de auditoria detectarem processos incompletos.
Runbooks existirem.
Runbooks serem revisados.
Mundos possuírem estado operacional.
Estado AT_RISK existir antes da falha.
Somente leitura poder ser ativado automaticamente.
Saída de somente leitura exigir validação.
Todas as entidades críticas possuírem contratos.
Todos os comandos críticos possuírem idempotência.
Toda correção possuir autor e motivo.
Todo acesso sensível possuir auditoria.
Todo backup possuir checksum.
Toda restauração possuir validação.
Todo incidente possuir timeline.
Nenhum suporte alterar competição.
Nenhum administrador alterar resultado arbitrariamente.
Nenhum operador possuir acesso total por padrão.
Nenhum segredo aparecer em log.
Nenhuma correção crítica ser silenciosa.
Nenhuma restauração duplicar efeitos externos.
Nenhuma feature flag gerar vantagem competitiva seletiva.
Nenhum backup ser confiado sem teste.
Nenhum mundo ser reaberto sem integridade mínima.
A operação da plataforma ser segura, rastreável, resiliente e recuperável.
Decisões fechadas do Bloco 24
Administração técnica e competitiva serão separadas.
Administração da plataforma e de mundos serão separadas.
Permissões seguirão menor privilégio.
Operadores usarão contas administrativas separadas.
Acesso à produção exigirá autenticação reforçada.
Sessões administrativas serão curtas e auditadas.
Ações críticas exigirão reautenticação.
Operações de alto impacto poderão exigir duas aprovações.
Conflitos de interesse bloquearão ações sensíveis.
Permissões temporárias terão expiração.
Acesso emergencial será excepcional.
Todo acesso emergencial será revisado.
Produção terá identificação visual própria.
Dados serão classificados por sensibilidade.
Interfaces internas mascararão informações sensíveis.
Segredos não serão exibidos em logs.
Segredos serão rotacionáveis.
Logs possuirão correlação distribuída.
Auditoria será separada dos logs técnicos.
Registros de auditoria não serão sobrescritos.
Ações internas suspeitas serão monitoradas.
Suporte terá acesso limitado.
Suporte não poderá jogar pelo usuário.
Impersonação será somente leitura por padrão.
Sessões de suporte serão visíveis e temporárias.
Correções administrativas utilizarão comandos estruturados.
Edição direta de banco será excepcional.
Scripts administrativos serão versionados e revisados.
Correções em lote terão dry run.
Ações críticas terão plano de rollback.
Correções financeiras usarão estornos e lançamentos.
Correções de transferências tratarão todas as dependências.
Equipe técnica não decidirá resultados esportivos.
Operações em partidas ao vivo serão apenas técnicas.
Jobs possuirão estados, heartbeat e checkpoint.
Jobs serão idempotentes.
Jobs parcialmente concluídos poderão ser retomados.
Conciliações validarão os principais domínios.
Filas possuirão dead letter.
Mensagens defeituosas serão isoladas.
Reprocessamentos não duplicarão eventos.
Observabilidade combinará métricas, logs, traces e invariantes.
Métricas internas não revelarão segredos competitivos.
Alertas técnicos serão agrupados.
Incidentes possuirão severidade e comando.
Usuários afetados receberão comunicação contextual.
Incidentes relevantes terão revisão posterior.
Ações corretivas terão responsáveis e prazos.
Manutenções terão políticas para partidas e prazos.
Deployments possuirão verificação e rollback.
Migrações serão testadas e retomáveis.
Migrações destrutivas serão divididas em etapas.
Feature flags possuirão escopo e expiração.
Flags não poderão favorecer clubes específicos.
Kill switches serão suportados.
Configurações dinâmicas serão versionadas.
Regras competitivas não serão alteradas como simples configuração técnica.
Backups serão automáticos.
Backups serão criptografados.
Backups serão validados.
Testes de restauração serão periódicos.
Backups não testados serão marcados.
Snapshots do mundo serão consistentes.
Restaurações serão validadas em ambiente isolado quando necessário.
Eventos posteriores poderão ser reaplicados.
Efeitos externos não serão repetidos em replay.
Mundos poderão ser restaurados isoladamente.
Recuperação de desastre possuirá runbook.
Exercícios de desastre serão realizados.
Integridade terá prioridade sobre reabertura rápida.
O servidor nunca confiará no cliente.
Todos os comandos serão autorizados no servidor.
Rate limiting protegerá contra abuso.
Comandos repetidos serão idempotentes.
Vulnerabilidades terão processo próprio.
Dependências serão monitoradas.
Artefatos de deployment serão verificáveis.
Dados de produção não serão usados em testes sem proteção.
Dados sintéticos serão preferidos.
Dados pessoais poderão ser anonimizados sem apagar fatos competitivos.
Exportações respeitarão privacidade de terceiros.
Legal hold será suportado.
Integrações terão credenciais isoladas.
Webhooks serão autenticados e idempotentes.
Dinheiro real e economia do jogo serão separados.
Organizadores de mundos terão poderes limitados.
Organizadores não poderão alterar resultados ou saldos.
Organizadores que competem terão restrições adicionais.
Estatísticas poderão ser reconstruídas.
Tabelas alteradas exigirão nova validação oficial.
População de jogadores não poderá ser regenerada arbitrariamente.
Eventos terão identificadores de correlação.
Replays em produção exigirão operação formal.
Invariantes serão monitoradas continuamente.
Auto-repair será permitido apenas em situações seguras.
Capacidade e armazenamento serão monitorados.
A plataforma utilizará degradação graciosa.
Cache nunca será fonte de verdade.
Toda ação administrativa relevante será auditável.
A administração técnica protegerá o mundo sem possuir poder secreto sobre a competição.

Bloco 24 encerrado.

Faltam 4 blocos no roteiro principal. O próximo será Arquitetura Técnica, Serviços, Dados e Integrações, consolidando fronteiras de domínio, APIs, eventos, filas, bancos, cache, armazenamento, consistência, versionamento e implantação inicial no EasyPanel.

vamos seguir 
Bloco 25 — Arquitetura Técnica, Serviços, Dados e Integrações

A arquitetura inicial será construída para permitir desenvolvimento rápido sem sacrificar consistência, segurança ou capacidade de evolução.

O projeto não começará com dezenas de microsserviços.

A decisão arquitetural será:

Monólito modular
    +
processos especializados
    +
eventos duráveis
    +
workers assíncronos
    +
banco relacional central

O sistema será implantado inicialmente no EasyPanel, utilizando contêineres Docker e rede interna privada.

A infraestrutura inicial utilizará:

Frontend web:
Next.js

Backend:
NestJS com TypeScript

Banco principal:
PostgreSQL

ORM:
PrismaJS

Cache e dados temporários:
Redis

Mensageria:
RabbitMQ

Armazenamento de arquivos:
Cloudflare R2

Tempo real:
WebSocket com Socket.IO

Observabilidade:
OpenTelemetry, Prometheus, Grafana, Loki e Tempo

Implantação:
Docker, GitHub Actions, GHCR e EasyPanel

A arquitetura será projetada para começar em uma única infraestrutura operacional e posteriormente permitir:

Replicação de processos.
Separação de workers.
Separação do motor de partidas.
Separação de bancos por mundo.
Distribuição regional.
Extração gradual de serviços.
Migração futura para infraestrutura orquestrada mais complexa.
Regra fechada

O projeto não adotará microsserviços prematuramente.

1. Objetivo do bloco

Garantir que:

A arquitetura suporte todas as regras já definidas.
O servidor seja autoritativo.
O cliente não execute regras oficiais.
O código seja organizado por domínio.
Os módulos possuam fronteiras claras.
O monólito modular possa ser dividido futuramente.
As operações críticas utilizem transações.
Eventos sejam publicados de forma confiável.
Consumidores sejam idempotentes.
Falhas de mensageria não percam eventos.
Retries não dupliquem efeitos.
O motor de partidas seja isolado da API comum.
A simulação seja determinística quando necessário.
Partidas possam continuar sem usuário conectado.
O relógio dos mundos seja controlado pelo servidor.
Diferentes mundos possam ser processados isoladamente.
Um mundo possa ser movido futuramente para outro banco.
O PostgreSQL permaneça a fonte principal de verdade.
O Redis nunca seja fonte definitiva para dados competitivos.
O RabbitMQ seja utilizado para trabalho assíncrono e integração interna.
O R2 armazene arquivos e objetos pesados.
O banco não armazene arquivos binários desnecessariamente.
A API possua contratos versionados.
O WebSocket não substitua a API oficial.
A perda da conexão em tempo real seja recuperável.
O frontend funcione inicialmente como aplicação web responsiva.
A aplicação possa ser instalada como PWA.
O mobile seja tratado como prioridade de interface.
O sistema tenha ambientes de desenvolvimento, homologação e produção.
As configurações sejam externas ao código.
Segredos permaneçam protegidos.
Deployments sejam reproduzíveis.
Migrações sejam controladas.
Backups sejam enviados para armazenamento externo.
A observabilidade exista desde o início.
Testes cubram regras, integração, concorrência e simulação.
A arquitetura evite acoplamentos circulares.
Os módulos compartilhem apenas primitivas essenciais.
O histórico seja reconstruível.
O sistema suporte projeções de leitura.
Consultas pesadas não prejudiquem comandos críticos.
O jogo continue operacional durante rebuilds não críticos.
Consistência forte seja utilizada onde necessária.
Consistência eventual seja utilizada onde aceitável.
Nenhuma transação distribuída dependa de confirmação simultânea entre serviços.
Processos longos utilizem sagas e compensações.
A estrutura inicial caiba operacionalmente no EasyPanel.
A evolução da infraestrutura não exija reescrever as regras do jogo.
2. Princípio arquitetural principal

A arquitetura será dividida em três camadas conceituais:

Domínio
    ↓
Aplicação
    ↓
Infraestrutura
Domínio

Contém:

Entidades.
Agregados.
Objetos de valor.
Políticas.
Regras.
Invariantes.
Eventos de domínio.
Erros de domínio.

Não dependerá diretamente de:

NestJS.
Prisma.
Redis.
RabbitMQ.
HTTP.
WebSocket.
R2.
EasyPanel.
Aplicação

Contém:

Casos de uso.
Commands.
Queries.
Handlers.
Orquestrações.
Sagas.
Autorizações de negócio.
Portas de entrada.
Interfaces de repositório.
Infraestrutura

Contém:

Prisma.
PostgreSQL.
RabbitMQ.
Redis.
R2.
HTTP.
WebSocket.
E-mail.
Logs.
Métricas.
Implementações de repositório.
3. Estilo arquitetural inicial
MODULAR_MONOLITH

O backend principal será uma aplicação única em termos de código e implantação lógica, mas internamente dividido em módulos independentes.

Processos especializados utilizarão o mesmo código-base e pacotes compartilhados, porém serão executados como contêineres separados.

4. Por que não iniciar com microsserviços

A utilização imediata de microsserviços aumentaria:

Complexidade de deployment.
Chamadas de rede.
Falhas parciais.
Manutenção.
Observabilidade.
Migrações.
Testes.
Transações distribuídas.
Custo operacional.
Tempo de desenvolvimento.
Decisão fechada

Os domínios serão preparados para extração futura, mas permanecerão inicialmente no mesmo repositório e banco.

5. Processos executáveis iniciais

A implantação inicial possuirá os seguintes processos:

web
api
realtime-gateway
world-scheduler
simulation-worker
async-worker
notification-worker

Componentes de infraestrutura:

postgres
redis
rabbitmq
otel-collector
prometheus
grafana
loki
tempo

Armazenamento externo:

Cloudflare R2
6. Processo web

Responsável por:

Interface.
PWA.
Navegação.
Renderização.
Cache local.
Sincronização.
Experiência offline limitada.
Comunicação com API.
Comunicação WebSocket.

Não será responsável por:

Simular partidas.
Validar negociações.
Calcular finanças oficiais.
Resolver prazos.
Gerar resultados.
Aplicar regras competitivas.
7. Processo api

Responsável por:

Autenticação.
Commands síncronos.
Queries.
Validação de entrada.
Autorização.
Transações.
Criação de eventos.
Consultas imediatas.
Administração comum do clube.
8. Processo realtime-gateway

Responsável por:

Conexões WebSocket.
Salas por usuário.
Salas por clube.
Salas por mundo.
Salas de partida.
Presença.
Entrega de eventos em tempo real.
Recuperação de sequência.
Regra fechada

O gateway não será fonte de verdade.

9. Processo world-scheduler

Responsável por:

Relógios dos mundos.
Processamentos diários.
Disparo de partidas.
Prazos.
Expirações.
Transições.
Tarefas agendadas.
Detecção de jobs vencidos.
10. Processo simulation-worker

Responsável por:

Simulação de partidas.
IA durante partidas.
Atualização do runtime da partida.
Processamento de comandos ao vivo.
Checkpoints.
Geração de eventos esportivos.
Conclusão da partida.
11. Processo async-worker

Responsável por:

Processamento de eventos.
Projeções.
Conciliações.
Rebuilds.
Mercado.
Histórico.
Atualizações secundárias.
Jobs administrativos comuns.
12. Processo notification-worker

Responsável por:

Criação de notificações derivadas.
Agrupamentos.
Digests.
Push.
E-mail.
Retentativas.
Preferências de entrega.
13. Replicação futura

Os processos poderão possuir várias réplicas:

api × N
realtime-gateway × N
simulation-worker × N
async-worker × N
notification-worker × N

O scheduler será distribuído por leases para impedir que dois processos avancem o mesmo mundo simultaneamente.

14. Monorepo

O projeto utilizará:

pnpm
Turborepo
TypeScript

Estrutura inicial:

/apps
  /web
  /api
  /realtime-gateway
  /world-scheduler
  /simulation-worker
  /async-worker
  /notification-worker

/packages
  /domain
  /application
  /contracts
  /database
  /infrastructure
  /observability
  /configuration
  /testing
  /ui
15. Organização por domínio

Dentro do backend, o código será dividido por contexto:

identity
world
club
person
player
squad
training
tactics
match
competition
calendar
market
scouting
transfer
contract
staff
finance
infrastructure
commercial
supporter
communication
history
notification
automation
administration
16. Estrutura de um módulo

Exemplo:

/modules/transfer
  /domain
  /application
  /infrastructure
  /api
  /contracts
  /tests
17. Dependências entre módulos

Módulos não poderão acessar diretamente:

Tabelas privadas de outro módulo.
Classes internas.
Repositórios internos.
Serviços concretos internos.

A comunicação deverá ocorrer por:

Interface de aplicação.
Contrato público.
Command.
Query.
Evento.
18. Shared kernel

O núcleo compartilhado será pequeno.

Poderá conter:

EntityId.
GameWorldId.
ClubId.
Money.
Percentage.
DateRange.
WorldDate.
Version.
Result.
Erros básicos.
Metadados de evento.
Regra fechada

Regras de negócio específicas não serão colocadas em um pacote genérico compartilhado.

19. Acoplamentos proibidos

Não será permitido:

Finance importar implementação de transferência.
Partida escrever diretamente no banco de contratos.
Notificação alterar estado de jogador.
Histórico decidir resultado.
Frontend acessar banco.
Worker ignorar camada de aplicação.
Um módulo executar SQL direto sobre tabelas de outro módulo sem operação administrativa formal.
20. Stack de backend

Será utilizado:

Node.js LTS
TypeScript em modo strict
NestJS
PrismaJS
Zod para validação de contratos externos
21. TypeScript

Configurações obrigatórias:

strict: true
noImplicitAny: true
strictNullChecks: true
noUncheckedIndexedAccess: true
exactOptionalPropertyTypes: true
22. Contratos externos

Payloads de:

API.
Mensageria.
WebSocket.
Variáveis de ambiente.
Arquivos importados.

Serão validados em runtime.

Regra fechada

Tipos TypeScript não serão tratados como validação suficiente.

23. Frontend

O frontend utilizará:

Next.js
React
TanStack Query
Zustand apenas para estado local de interface
Socket.IO Client
IndexedDB para cache offline
24. Estado no frontend

Será separado em:

Estado do servidor

Gerenciado pelo TanStack Query.

Estado de interface

Gerenciado localmente ou por Zustand.

Estado offline

Persistido em IndexedDB.

Regra fechada

Dados oficiais do clube não serão mantidos como fonte definitiva em stores globais do cliente.

25. PWA

A primeira versão será uma aplicação web progressiva.

Deverá suportar:

Instalação.
Ícone.
Tela inicial.
Cache do shell.
Leitura offline limitada.
Push quando suportado.
Atualização controlada.
26. Aplicativo nativo futuro

Um aplicativo nativo poderá ser criado posteriormente utilizando a mesma API e os mesmos contratos.

Regra fechada

A arquitetura de backend não dependerá de recursos exclusivos da web.

27. API

O padrão principal será:

REST para comandos e consultas
WebSocket para atualizações em tempo real

GraphQL não será necessário na arquitetura inicial.

28. Rotas

Estrutura:

/api/v1/worlds
/api/v1/clubs
/api/v1/players
/api/v1/matches
/api/v1/transfers
/api/v1/contracts
/api/v1/notifications
29. Versionamento da API

Mudanças serão classificadas como:

ADDITIVE
COMPATIBLE
DEPRECATED
BREAKING

Mudanças incompatíveis exigirão nova versão.

30. Contrato de command HTTP
commandId
idempotencyKey
expectedVersion
gameWorldId
clubId
payload
clientTimestamp
clientVersion
31. Resposta de command
commandId
status
entityId
newVersion
result
generatedTaskIds
generatedEventIds
warnings
32. Estados de command
ACCEPTED
COMPLETED
REJECTED
CONFLICT
PENDING
FAILED
33. Erro padronizado
errorCode
message
details
fieldErrors
currentVersion
correlationId
retryable
34. Códigos de erro

Os códigos serão estáveis e independentes do texto traduzido.

Exemplos:

TRANSFER_BUDGET_UNAVAILABLE
PLAYER_ALREADY_REGISTERED
MATCH_COMMAND_WINDOW_CLOSED
CONTRACT_VERSION_CONFLICT
WORLD_READ_ONLY
35. Paginação

Consultas utilizarão preferencialmente cursor.

cursor
limit
nextCursor
hasMore

Paginação por offset ficará restrita a consultas pequenas ou administrativas.

36. Filtros

Filtros deverão:

Ser validados.
Possuir limites.
Utilizar índices.
Evitar consultas arbitrárias.
Respeitar o mundo.
37. WebSocket

O WebSocket será utilizado para:

Partidas.
Presença.
Notificações.
Atualizações de negociação.
Mudança de tabela.
Eventos do mundo.
Estado de jobs relevantes.
38. Eventos WebSocket

Contrato mínimo:

eventId
eventType
schemaVersion
gameWorldId
subjectType
subjectId
sequence
occurredAt
payload
39. Sequência em tempo real

Cada stream relevante terá sequência.

Exemplos:

userSequence
clubSequence
matchSequence
worldSequence
40. Recuperação após desconexão

O cliente enviará:

lastKnownSequence

O servidor poderá responder com:

Eventos perdidos.
Snapshot atualizado.
Indicação de ressincronização completa.
41. Eventos temporários e oficiais

O gateway poderá transportar:

Evento oficial.
Evento de projeção.
Evento de presença.
Evento transitório de interface.

A categoria deverá ser explícita.

42. Socket.IO e escalabilidade

O gateway utilizará Redis Adapter quando houver mais de uma réplica.

O Redis será utilizado apenas para:

Roteamento.
Presença.
Pub/sub transitório.
Coordenação não autoritativa.
43. Autenticação

A autenticação inicial será própria da plataforma, com possibilidade de provedores externos futuros.

Utilizará:

Senhas com Argon2id.
Access token curto.
Refresh token rotativo.
Sessões persistidas.
Revogação.
Segundo fator opcional para usuários e obrigatório para administradores.
44. Access token

Deverá possuir curta duração e conter apenas:

Identificador.
Sessão.
Escopos mínimos.
Versão de autenticação.

Não deverá conter:

Permissões de clube completas.
Dados privados.
Estado mutável extenso.
45. Refresh token

Será:

Rotativo.
Armazenado de forma protegida.
Vinculado à sessão.
Revogável.
Detectável em caso de reutilização.
46. Autorização

A autorização será calculada no servidor utilizando:

Usuário.
Sessão.
Mundo.
Clube.
Função.
Autonomia.
Estado.
Sanções.
Ação solicitada.
47. Middleware de mundo

Toda requisição relacionada ao jogo deverá resolver:

gameWorldId
participantId
clubControlId
authorityProfile
48. Isolamento de mundo

Todas as entidades competitivas deverão possuir ou derivar claramente um gameWorldId.

Consultas sem escopo de mundo serão bloqueadas em módulos competitivos.

49. Banco principal

O PostgreSQL será a fonte de verdade para:

Mundos.
Clubes.
Jogadores.
Contratos.
Finanças.
Competições.
Partidas oficiais.
Eventos.
Jobs.
Notificações.
Auditoria.
50. Banco inicial

A arquitetura começará com:

Um cluster PostgreSQL
Um banco principal
Schemas lógicos por domínio quando útil

Não haverá um banco por microsserviço na primeira fase.

51. Evolução futura do banco

A divisão futura ocorrerá preferencialmente por mundo.

Mundos 1–100 → cluster A
Mundos 101–200 → cluster B
Regra fechada

O gameWorldId será considerado chave de particionamento desde o início.

52. Identificadores

Entidades utilizarão preferencialmente:

UUIDv7

Vantagens:

Unicidade distribuída.
Ordenação temporal aproximada.
Geração fora do banco.
Migração entre clusters.
Menor dependência de sequência global.
53. Identificadores públicos

Quando necessário, uma entidade poderá possuir:

UUID interno.
Código público curto.
Nome legível.
Slug não autoritativo.
54. Campos padrão

Entidades persistentes utilizarão, quando aplicável:

id
gameWorldId
createdAt
updatedAt
version
deletedAt
55. Concorrência otimista

Agregados críticos possuirão campo:

version

Atualizações utilizarão:

WHERE id = ? AND version = expectedVersion
56. Conflito de versão

Quando a versão não corresponder:

A operação não será aplicada.
O estado atual será retornado quando seguro.
O cliente deverá revisar.
Nenhuma sobrescrita silenciosa ocorrerá.
57. Exclusão lógica

Será utilizada apenas quando houver necessidade de:

Recuperação.
Auditoria.
Retenção.
Histórico.
Regra fechada

Nem todas as tabelas usarão deletedAt automaticamente.

58. Valores monetários

Dinheiro será armazenado em unidade mínima:

amountMinor: bigint
currencyCode: string

Exemplo:

R$ 10,50
amountMinor = 1050
currencyCode = BRL
59. Valores do mundo

A moeda interna poderá utilizar código próprio quando não representar moeda real.

60. Ponto flutuante

Não será usado para:

Dinheiro.
Percentuais contratuais.
Parcelas.
Pontos.
Saldos.
61. Percentuais

Serão armazenados em:

Pontos-base.
Inteiro escalado.
Decimal controlado.

A escala será definida no contrato do valor.

62. Datas reais

Serão armazenadas em UTC.

Exemplos:

Login.
Criação.
Deployment.
Entrega de notificação.
Auditoria.
63. Tempo do mundo

Será armazenado separadamente.

Poderá utilizar:

worldDate
worldDay
worldMinute
worldTick
seasonId
64. Tempo real e tempo simulado

Uma entidade poderá possuir ambos:

occurredAtReal
occurredAtWorld
65. JSONB

Será utilizado para:

Payloads de eventos.
Snapshots.
Metadados.
Configurações versionadas.
Resultados de simulação.
Dados extensíveis.

Não será utilizado para substituir indiscriminadamente relações centrais.

66. Relações importantes

Dados como:

Contratos.
Participantes.
Proprietários.
Jogadores inscritos.
Parcelas.
Títulos.

Serão modelados relacionalmente.

67. Índices

Serão criados com base em:

gameWorldId.
Estados.
Datas.
Prazos.
Entidades.
Sequências.
Foreign keys.
Consultas reais.
68. Índices compostos

Exemplos:

(gameWorldId, status, deadlineAt)
(gameWorldId, clubId, createdAt)
(gameWorldId, matchId, sequence)
(gameWorldId, aggregateId, aggregateVersion)
69. Particionamento de tabelas

Tabelas de grande volume poderão ser particionadas por:

Mundo.
Temporada.
Data.
Tipo.

Candidatas:

Eventos.
Logs de auditoria.
Estatísticas de partida.
Notificações.
Histórico.
Telemetria operacional.
70. PrismaJS

O Prisma será utilizado para:

CRUD relacional.
Transações.
Migrações.
Tipagem.
Consultas comuns.
71. SQL direto

Será permitido quando necessário para:

Locks.
FOR UPDATE SKIP LOCKED.
Particionamento.
Consultas analíticas.
Operações em lote.
CTEs.
Otimização.
Extensões PostgreSQL.
Regra fechada

SQL direto deverá permanecer encapsulado na infraestrutura.

72. Transações

Serão utilizadas para comandos que alterem:

Contrato.
Finanças.
Transferência.
Inscrição.
Controle do clube.
Resultado oficial.
Estado de job.
Outbox.
73. Limite das transações

Transações deverão ser:

Curtas.
Sem chamada externa.
Sem envio de e-mail.
Sem espera de usuário.
Sem operação de R2.
Sem chamada ao RabbitMQ dentro da transação.
74. Outbox transacional

Toda operação que precise publicar evento deverá gravar:

Estado do domínio
+
registro na outbox

Na mesma transação PostgreSQL.

75. Contrato da outbox
outboxEventId
gameWorldId
aggregateType
aggregateId
aggregateVersion
eventType
schemaVersion
payload
correlationId
causationId
createdAt
publishedAt
attemptCount
status
76. Publicação da outbox

Um publisher:

Busca eventos não publicados.
Adquire lote com lock.
Publica no RabbitMQ.
Registra confirmação.
Repete em caso de falha.
77. Garantia da mensageria

A arquitetura trabalhará com:

AT_LEAST_ONCE_DELIVERY

Não dependerá de “exactly once”.

78. Idempotência dos consumidores

Cada consumidor possuirá uma inbox.

consumerName
eventId
processedAt
result
79. Inbox

Antes de aplicar efeito:

Verifica se o evento já foi processado.
Processa dentro de transação.
Registra a inbox.
Confirma a mensagem.
80. Evento duplicado

Será reconhecido e descartado sem repetir efeitos.

81. Ordem de eventos

Eventos de um mesmo agregado utilizarão:

aggregateVersion

Eventos de um mundo utilizarão:

worldSequence
82. Evento fora de ordem

O consumidor poderá:

Aguardar versão anterior.
Reenfileirar.
Solicitar snapshot.
Marcar inconsistência.
Reconstruir projeção.
83. RabbitMQ

Será utilizado para:

Eventos de domínio.
Commands assíncronos.
Jobs distribuídos.
Notificações.
Simulação.
Rebuilds.
Integrações internas.
84. Exchanges

Estrutura recomendada:

domain.events
application.commands
simulation.commands
notifications.events
operations.jobs
dead.letters
85. Routing keys

Exemplos:

match.started
match.command.submitted
transfer.completed
contract.expired
world.day.advanced
notification.requested
86. Filas duráveis

Filas críticas serão:

Duráveis.
Com mensagens persistentes.
Com dead letter.
Com limites.
Com monitoramento.
87. RabbitMQ inicial

Na primeira infraestrutura:

RabbitMQ em nó único com volume persistente

Na evolução:

cluster com filas quorum
88. Redis

Será utilizado para:

Cache.
Sessões temporárias.
Rate limiting.
Presença.
Socket.IO Adapter.
Locks não críticos.
Chaves de curta duração.
Dados efêmeros.
89. Redis não autoritativo

Não serão mantidos exclusivamente no Redis:

Saldo.
Contrato.
Resultado.
Proprietário de jogador.
Inscrição.
Título.
Pagamento.
Prazo oficial.
90. Persistência do Redis

Na implantação inicial, o Redis utilizará AOF.

Mesmo assim, a perda total do Redis deverá ser recuperável a partir do PostgreSQL.

91. Cache

Cada cache deverá possuir:

Chave.
Escopo de mundo.
TTL.
Versão.
Estratégia de invalidação.
Fonte oficial.
92. Cache de leitura

Exemplos:

Perfil público.
Tabela.
Calendário.
Resumo de clube.
Configurações.
Permissões estáveis.
93. Invalidação

Poderá ocorrer por:

Evento.
Versão.
TTL.
Operação administrativa.
Rebuild.
94. Cache stampede

Será controlado por:

Locks curtos.
TTL aleatório.
Revalidação antecipada.
Stale-while-revalidate.
Limite de concorrência.
95. Locks críticos

Para operações críticas serão preferidos:

Lock de linha PostgreSQL.
Advisory lock PostgreSQL.
Lease persistido.
Restrição única.

Redis não será usado como única garantia para contratos, finanças ou transferências.

96. Lease

Processos distribuídos utilizarão:

leaseOwner
leaseExpiresAt
heartbeatAt
version
97. Scheduler persistente

Tarefas futuras serão armazenadas no PostgreSQL.

scheduledTaskId
gameWorldId
taskType
dueAtWorld
dueAtReal
status
payload
attemptCount
leaseOwner
leaseExpiresAt
98. Busca de tarefas vencidas

Workers utilizarão:

FOR UPDATE SKIP LOCKED

Para processar lotes sem colisão.

99. Por que não usar apenas timers em memória

Timers em memória seriam perdidos em:

Restart.
Deployment.
Falha.
Migração.
Escalonamento.
Regra fechada

Prazos oficiais sempre serão persistidos.

100. Relógio do mundo

Cada mundo possuirá:

worldClockId
currentWorldTime
status
processingLease
lastProcessedAt
nextScheduledAt
version
101. Avanço do mundo

O scheduler:

Adquire lease.
Verifica estado.
Executa etapa.
Registra checkpoint.
Publica eventos.
Atualiza relógio.
Libera lease.
102. Dois schedulers

Somente o processo com lease válido poderá avançar o mundo.

103. Mundo atrasado

Se o mundo estiver atrasado:

O scheduler calcula etapas pendentes.
Processa em ordem.
Limita carga.
Mantém observabilidade.
Não pula etapas obrigatórias.
104. Motor de partidas

O motor será um módulo isolado com interface própria.

Entradas:

Snapshot de jogadores.
Tática.
Estado físico.
Comissão.
Clima.
Estádio.
Regras.
Seed.
Políticas.
Commands ao vivo.

Saídas:

Eventos.
Estado.
Estatísticas.
Checkpoints.
Resultado.
105. Determinismo

Dadas as mesmas entradas, seed e ordem de comandos, a simulação deverá produzir o mesmo resultado lógico.

106. Seed da partida
matchSeed
engineVersion
rulesVersion
inputSnapshotHash
107. Versão do motor

Toda partida registrará:

matchEngineVersion
Regra fechada

Atualizar o motor não recalculará automaticamente partidas antigas.

108. Runtime da partida

A partida em andamento terá estado separado do registro oficial final.

matchRuntimeId
matchId
status
currentSimulationTime
stateSnapshot
lastEventSequence
activeWorkerLease
checkpointVersion
109. Actor lógico da partida

Cada partida terá apenas um actor lógico responsável por processar sua sequência.

O actor poderá mudar de worker, mas não haverá dois processadores ativos válidos.

110. Comandos ao vivo

Serão enfileirados com:

matchCommandId
matchId
clubId
type
submittedAt
receivedAt
expectedMatchVersion
clientSequence
payload
111. Ordenação dos commands

A ordem oficial será determinada pelo servidor considerando:

Recebimento.
Janela.
Versão.
Sequência.
Validade.
112. Persistência durante partida

O motor não fará uma transação no banco a cada pequeno tick.

Utilizará:

Estado em memória do worker.
Eventos em lote.
Checkpoints periódicos.
Persistência em momentos críticos.
Log de commands.
113. Checkpoint da partida

Será criado:

Em intervalos.
Após gol.
Após cartão relevante.
Após substituição.
Antes do intervalo.
Antes do fim.
Em desligamento controlado.
114. Falha do worker de partida

Outro worker poderá:

Adquirir o lease expirado.
Carregar último checkpoint.
Carregar commands e eventos posteriores.
Reconstruir estado.
Continuar.
115. Partida concluída

A conclusão deverá persistir atomicamente:

Resultado.
Eventos finais.
Estatísticas.
Estado dos jogadores.
Suspensões.
Consequências.
Outbox.
116. Estado provisório da partida

Antes da validação final:

FINISHED_PENDING_VALIDATION

Após validações:

OFFICIAL
117. Simulações offline

Partidas sem usuário conectado utilizarão o mesmo motor.

A diferença será apenas a origem dos commands:

Humano.
IA.
Política offline.
Comissão.
118. IA do jogo

A IA será separada em:

DECISION_POLICY
EVALUATION_MODEL
ACTION_SELECTOR
119. IA sem conhecimento indevido

A IA receberá somente:

Estado permitido.
Conhecimento do clube.
Relatórios.
Políticas.
Reputação.
Informações públicas.
120. IA determinística e aleatoriedade

Decisões poderão utilizar aleatoriedade controlada por seed quando necessário.

A seed será registrada em decisões críticas simuladas.

121. Process managers

Processos longos serão coordenados por:

SAGA
PROCESS_MANAGER

Exemplos:

Transferência.
Contratação.
Construção.
Transição de temporada.
Entrada de usuário.
Restauração.
Licenciamento.
122. Transações distribuídas

Não será utilizado:

TWO_PHASE_COMMIT

Entre módulos ou serviços futuros.

123. Compensações

Quando uma etapa posterior falhar:

Etapas já confirmadas permanecem registradas.
A saga aplica compensação.
Reservas são liberadas.
Estados são corrigidos.
O usuário recebe explicação.
124. Estado da saga
CREATED
RUNNING
WAITING
COMPENSATING
COMPLETED
FAILED
MANUAL_REVIEW
125. Exemplo da transferência
Reservar orçamento
    ↓
Aceitar proposta
    ↓
Negociar contrato
    ↓
Realizar exame
    ↓
Registrar jogador
    ↓
Liquidar valores
    ↓
Concluir

Uma falha no registro poderá manter o acordo pendente e impedir liquidação final, conforme as regras definidas.

126. Read models

Consultas complexas utilizarão projeções específicas.

Exemplos:

Central.
Perfil do clube.
Classificação.
Histórico.
Mercado.
Resumo financeiro.
Retorno após ausência.
127. CQRS pragmático

O sistema utilizará separação lógica entre:

Commands
Queries

Mas não exigirá bancos diferentes inicialmente.

128. Queries

Poderão ler:

Tabelas de domínio.
Projeções.
Views.
Materialized views.
Cache.
129. Commands

Deverão passar por:

Aplicação.
Autorização.
Domínio.
Repositório.
Transação.
Outbox.
130. Projeções

Serão atualizadas por eventos.

Cada projeção possuirá:

projectionName
projectionVersion
lastProcessedEvent
rebuildStatus
131. Rebuild

Uma projeção poderá ser descartada e reconstruída sem alterar o fato-base.

132. Troca de projeção

Durante rebuild:

Nova versão é construída.
É validada.
O alias ou ponteiro ativo é trocado.
A versão anterior é removida posteriormente.
133. Event sourcing

O projeto não utilizará event sourcing completo para todos os agregados.

Será utilizado:

Estado relacional atual
+
log imutável de eventos relevantes
+
outbox
+
snapshots históricos
134. Eventos de domínio e histórico

Nem todo evento técnico será histórico.

Exemplo técnico:

CACHE_INVALIDATED

Exemplo de domínio:

PLAYER_TRANSFER_COMPLETED

Exemplo histórico:

CLUB_WON_FIRST_NATIONAL_TITLE
135. Event log

Eventos relevantes serão preservados para:

Auditoria.
Histórico.
Projeções.
Diagnóstico.
Rebuild.
Integração.
136. Retenção de eventos

Eventos competitivos e financeiros essenciais serão preservados enquanto o mundo existir.

Eventos técnicos de baixa relevância poderão possuir retenção menor.

137. Arquivamento de eventos

Eventos antigos poderão ser:

Particionados.
Compactados.
Exportados para R2.
Mantidos em índice resumido.
Restaurados quando necessário.
138. Pesquisa

A primeira versão utilizará:

PostgreSQL Full Text Search
trigram indexes
139. Motor de busca externo

Somente será introduzido quando:

Volume justificar.
Latência ficar inadequada.
Recursos de relevância forem necessários.
Operação puder sustentá-lo.

Possíveis opções futuras:

Meilisearch.
OpenSearch.
140. Pesquisa não autoritativa

O resultado da busca apenas localiza entidades.

A abertura da entidade sempre carregará o estado oficial.

141. Estatísticas operacionais

Na primeira fase, estatísticas e analytics utilizarão:

PostgreSQL.
Views.
Materialized views.
Projeções.
Exportações.
142. Banco analítico futuro

Um banco analítico, como ClickHouse, somente será introduzido quando o volume de telemetria ou histórico justificar.

143. Armazenamento de arquivos

O Cloudflare R2 armazenará:

Escudos.
Avatares.
Uniformes renderizados.
Relatórios exportados.
Anexos permitidos.
Snapshots grandes.
Backups.
Arquivos históricos.
Imagens de notícias.
Exportações.
144. Metadados do arquivo

O PostgreSQL armazenará:

fileId
ownerType
ownerId
bucket
objectKey
contentType
size
checksum
visibility
status
createdAt
145. Upload

O fluxo será:

Cliente solicita autorização
    ↓
API valida permissão
    ↓
API gera URL pré-assinada
    ↓
Cliente envia diretamente ao R2
    ↓
Cliente confirma upload
    ↓
Worker valida arquivo
    ↓
Arquivo é ativado
146. Upload não confirmado

Será removido após prazo de limpeza.

147. Segurança de arquivo

Arquivos enviados por usuários poderão passar por:

Validação de tipo.
Validação de tamanho.
Checksum.
Inspeção.
Sanitização.
Antivírus.
Quarentena.
148. URLs de arquivo

Arquivos privados utilizarão:

URL temporária.
Verificação de permissão.
Expiração.

Arquivos públicos poderão utilizar CDN.

149. Chaves do R2

Chaves de objetos deverão evitar nomes previsíveis contendo informações privadas.

150. Exclusão de arquivo

A exclusão lógica poderá ocorrer antes da exclusão física.

Objetos vinculados a histórico ou auditoria respeitarão retenção.

151. Backups do PostgreSQL

Será utilizado:

WAL-G

Com destino S3 compatível no Cloudflare R2.

152. Política inicial de backup
WAL contínuo.
Backup base diário.
Retenção definida por ambiente.
Backup semanal de longa retenção.
Teste periódico de restauração.
Checksum.
Criptografia.
153. Backup fora do servidor

Backups não ficarão apenas no mesmo VPS do banco.

154. RabbitMQ e Redis

Seus dados operacionais poderão ser recuperados por:

Persistência local.
Estado no PostgreSQL.
Reprocessamento.
Outbox.
Jobs persistidos.
Regra fechada

A recuperação do mundo não dependerá exclusivamente do backup do Redis ou RabbitMQ.

155. EasyPanel

O EasyPanel será o plano de implantação inicial.

Cada processo será criado como serviço Docker.

156. Serviços no EasyPanel
football-web
football-api
football-realtime
football-world-scheduler
football-simulation-worker
football-async-worker
football-notification-worker
football-postgres
football-redis
football-rabbitmq
football-otel
football-prometheus
football-grafana
football-loki
football-tempo
157. Rede interna

PostgreSQL, Redis e RabbitMQ não serão expostos diretamente à internet.

Somente os serviços que necessitem acesso público serão publicados.

158. Serviços públicos

Inicialmente:

web
api
realtime-gateway
159. TLS

O acesso público utilizará HTTPS.

O proxy do EasyPanel será responsável pela terminação TLS inicial.

160. Cloudflare

Poderá ser utilizado para:

DNS.
Proxy.
CDN.
Proteção básica.
Cache de arquivos públicos.
R2.
161. Volumes persistentes

Terão volume próprio:

PostgreSQL.
RabbitMQ.
Redis.
Grafana.
Loki, conforme política.
Prometheus, conforme retenção.
162. Saúde dos contêineres

Cada serviço deverá fornecer:

/health/live
/health/ready
163. Dependência de readiness

A API só será considerada pronta quando:

Configuração estiver válida.
PostgreSQL estiver acessível.
Migrações obrigatórias estiverem compatíveis.
Serviços essenciais estiverem disponíveis.
164. Falha do RabbitMQ

A API poderá continuar aceitando comandos quando:

A transação e a outbox forem gravadas.
O evento puder ser publicado posteriormente.
A ação não depender de resposta assíncrona imediata.
165. Falha do Redis

A aplicação deverá:

Perder cache.
Reconstruir presença.
Reduzir performance temporariamente.
Manter dados oficiais.
166. Falha do R2

Uploads e downloads de arquivos poderão ficar indisponíveis.

Partidas, contratos e finanças continuarão funcionando.

167. Configuração

Variáveis de ambiente deverão ser validadas na inicialização.

Exemplos:

DATABASE_URL
REDIS_URL
RABBITMQ_URL
R2_ENDPOINT
R2_BUCKET
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
JWT_PRIVATE_KEY
168. Configuração inválida

O serviço deverá falhar na inicialização em vez de operar parcialmente com configuração indefinida.

169. Segredos no EasyPanel

Serão cadastrados como secrets ou variáveis protegidas.

Não serão incluídos:

No repositório.
Na imagem Docker.
Em logs.
Em arquivos públicos.
170. Ambientes

Existirão:

development
test
staging
production
171. Desenvolvimento local

Utilizará:

Docker Compose

Com versões equivalentes de:

PostgreSQL.
Redis.
RabbitMQ.
R2 simulado quando necessário.
172. Staging

O staging deverá reproduzir:

Topologia.
Variáveis.
Migrações.
Filas.
Observabilidade.
Fluxos de deployment.

Sem utilizar segredos ou dados pessoais reais de produção.

173. Produção

Somente artefatos aprovados e imutáveis serão implantados.

174. Imagens Docker

Cada imagem deverá possuir:

Tag de versão.
Commit.
Data de build.
Checksum.
Ambiente de runtime mínimo.
175. Build

O pipeline produzirá imagens separadas por aplicação ou uma imagem comum com diferentes comandos de inicialização.

A primeira fase poderá utilizar uma imagem backend comum para reduzir divergência.

176. Registro de imagens

Será utilizado:

GitHub Container Registry
177. CI/CD

O pipeline utilizará GitHub Actions para:

Instalar dependências.
Validar formatação.
Executar lint.
Executar typecheck.
Executar testes.
Gerar cliente Prisma.
Validar migrações.
Construir aplicações.
Construir imagens.
Enviar ao GHCR.
Implantar no EasyPanel.
Executar verificações pós-deployment.
178. Branches

Fluxo recomendado:

main
feature/*
fix/*

Produção será derivada de main ou de tags de release.

179. Releases

Cada release possuirá:

Versão.
Changelog.
Migrações.
Compatibilidade.
Feature flags.
Plano de rollback.
180. Migrações Prisma

Migrações serão:

Versionadas.
Revisadas.
Executadas antes ou durante deployment controlado.
Testadas em cópia de staging.
Compatíveis com rollback de aplicação quando possível.
181. Migração expand-contract

Mudanças arriscadas utilizarão:

EXPAND
MIGRATE
SWITCH
CONTRACT

Exemplo:

Adicionar novo campo.
Escrever nos dois campos.
Migrar dados antigos.
Alterar leitura.
Parar escrita antiga.
Remover campo posteriormente.
182. Migração automática na inicialização

A aplicação comum não executará migração destrutiva automaticamente ao iniciar.

Haverá job ou etapa específica de migration.

183. Rollback

O rollback da aplicação não deverá depender de reverter imediatamente toda migração.

184. Feature flags

Funcionalidades incompletas poderão ser protegidas por flags.

As flags serão armazenadas no PostgreSQL e cacheadas no Redis.

185. Flags por mundo

Uma flag técnica poderá ser habilitada por mundo quando não alterar a justiça competitiva entre clubes daquele mundo.

186. Regras competitivas

Mudanças de regra utilizarão:

Versão de regulamento.
Data efetiva.
Migração.
Comunicação.

Não serão ativadas apenas por uma flag invisível.

187. Observabilidade

Toda aplicação utilizará OpenTelemetry.

188. Traces

Serão propagados entre:

HTTP.
WebSocket.
RabbitMQ.
Workers.
Banco.
Jobs.
189. Metadados de trace
traceId
correlationId
commandId
eventId
gameWorldId
clubId
matchId
jobId
190. Métricas

Prometheus coletará:

Latência.
Erros.
Requests.
Conexões.
Filas.
Jobs.
Partidas.
Commands.
Eventos.
Cache.
Banco.
Runtime.
191. Logs

Loki armazenará logs estruturados.

Os logs utilizarão JSON.

192. Traces distribuídos

Tempo armazenará traces.

193. Dashboards

Grafana apresentará:

Plataforma.
API.
Banco.
Redis.
RabbitMQ.
Partidas.
Scheduler.
Jobs.
Mundo.
Deployments.
194. Alertas iniciais
API indisponível.
Banco sem conexão.
Fila crescendo.
Scheduler atrasado.
Worker de partida sem heartbeat.
Disco alto.
Backup atrasado.
Erro crítico.
Invariante falhando.
Mundo em risco.
195. SLOs iniciais

Serão definidos por fluxo, não apenas pela plataforma inteira.

Exemplos:

Comandos comuns.
Partidas ao vivo.
Processamento diário.
Notificações críticas.
Consultas.
Recuperação.
196. Performance da API

Metas iniciais deverão diferenciar:

Consulta simples
Consulta agregada
Command
Relatório pesado
197. Consultas pesadas

Serão:

Assíncronas.
Cacheadas.
Baseadas em projeção.
Limitadas.
Separadas de commands críticos.
198. Pool de conexões

O PostgreSQL utilizará pool controlado.

Se necessário, será introduzido:

PgBouncer
199. Limite de conexão

Cada réplica não abrirá quantidade ilimitada de conexões.

200. Prisma e serverless

A arquitetura não será serverless na primeira fase.

Isso simplifica:

Conexões.
Workers.
WebSocket.
Partidas.
Jobs persistentes.
Scheduler.
201. Testes

A estratégia utilizará:

Unit tests
Integration tests
Contract tests
End-to-end tests
Property-based tests
Concurrency tests
Simulation tests
Load tests
Migration tests
Recovery tests
202. Testes unitários

Cobrirão:

Regras.
Políticas.
Objetos de valor.
Invariantes.
Cálculos.
Decisões.

Não dependerão de banco.

203. Testes de integração

Utilizarão instâncias reais de:

PostgreSQL.
Redis.
RabbitMQ.

Preferencialmente por Testcontainers.

204. Testes de contrato

Verificarão:

API.
Eventos.
WebSocket.
Schemas.
Compatibilidade.
205. Testes end-to-end

Cobrirão fluxos como:

Criar mundo.
Entrar em clube.
Montar escalação.
Disputar partida.
Fazer transferência.
Processar temporada.
206. Testes de concorrência

Cenários obrigatórios:

Duas propostas para o mesmo jogador.
Dois commands no mesmo contrato.
Dois schedulers no mesmo mundo.
Dois workers na mesma partida.
Pagamento repetido.
Aceite duplicado.
Retry de evento.
207. Testes de propriedade

Serão utilizados para invariantes como:

Saldo não diverge do razão.
Jogador não pertence a dois clubes incompatíveis.
Soma de percentuais não excede o limite.
Calendário não duplica partida.
Simulação sempre termina em estado válido.
208. Testes do motor

O motor possuirá:

Seeds fixas.
Golden files.
Cenários extremos.
Replays.
Comparação por versão.
Testes estatísticos.
209. Golden tests

Uma seed e um snapshot produzirão sequência esperada de eventos para determinada versão do motor.

210. Mudança intencional do motor

Quando alterar resultados esperados:

A versão do motor muda.
Golden files são atualizados conscientemente.
Partidas antigas permanecem na versão anterior.
211. Teste estatístico

Milhares de simulações serão utilizadas para verificar:

Distribuição de gols.
Cartões.
Lesões.
Posse.
Vantagem de mando.
Impacto tático.
Ausência de resultados impossíveis frequentes.
212. Teste de carga

Deverá simular:

Muitos usuários conectados.
Rodada simultânea.
Fechamento de janela.
Transição de temporada.
Muitos eventos.
Notificações.
Busca histórica.
213. Teste de recuperação

Deverá verificar:

Worker morto.
Banco reiniciado.
RabbitMQ indisponível.
Redis perdido.
Replay de outbox.
Restore de backup.
Retomada de job.
Continuação de partida.
214. Dados de teste

Serão gerados por factories e seeds determinísticas.

215. Seed de ambiente

Deverá permitir criar:

Mundo pequeno.
Mundo médio.
Mundo antigo.
Clube em crise.
Mercado ativo.
Temporada em transição.
Partida ao vivo.
216. Lint e formatação

Serão obrigatórios antes do merge.

217. Análise estática

O pipeline deverá detectar:

Dependência circular.
Importação entre camadas proibidas.
Tipos inseguros.
Segredos.
Vulnerabilidades conhecidas.
Código morto relevante.
218. Testes de arquitetura

Testes automatizados verificarão que:

Domínio não importa infraestrutura.
Módulos não acessam internos indevidos.
API não acessa Prisma diretamente.
Workers utilizam casos de uso.
Frontend não importa domínio de servidor.
219. Segurança da API

Deverá incluir:

Validação de payload.
Limite de tamanho.
Rate limiting.
Autorização.
Proteção contra enumeração.
CORS controlado.
Headers de segurança.
Sanitização.
Logs seguros.
220. CSRF

Quando autenticação usar cookies, haverá proteção CSRF apropriada.

221. XSS

Conteúdo de usuários será:

Escapado.
Sanitizado.
Limitado.
Renderizado de forma segura.
222. SQL injection

Prisma e parâmetros serão utilizados.

SQL direto nunca concatenará entrada do usuário.

223. Upload malicioso

Uploads serão validados antes da publicação.

224. Rate limiting

Diferenciado por:

Login.
Commands.
Busca.
Mensagens.
Upload.
WebSocket.
Partida.
225. Limite competitivo

Commands próximos do prazo não poderão ser bloqueados por limites excessivamente genéricos.

A política considerará:

Sessão.
Tipo.
Histórico.
Risco.
Janela.
226. Auditoria de command

Commands críticos registrarão:

actor
session
device
commandId
expectedVersion
result
correlationId
227. Integrações externas

A arquitetura central deverá depender do mínimo possível de integrações externas.

Possíveis integrações:

E-mail.
Push.
Pagamentos da plataforma.
Armazenamento R2.
Monitoramento.
Login social futuro.
228. Adapter

Toda integração terá uma interface interna.

Exemplo:

EmailProvider
PushProvider
ObjectStorage
PaymentProvider
IdentityProvider
229. Troca de fornecedor

A regra do jogo não dependerá diretamente de uma API externa específica.

230. Falha de integração

Será tratada por:

Retry.
Circuit breaker.
Dead letter.
Fallback.
Notificação interna.
Reconciliação.
231. Webhooks externos

Serão:

Autenticados.
Idempotentes.
Versionados.
Registrados.
Reprocessáveis.
232. E-mail

O envio será assíncrono.

A API não aguardará o provedor de e-mail para concluir um command de jogo.

233. Push

O push será derivado de uma notificação interna já criada.

234. Pagamentos reais

Quando existirem, serão mantidos fora do domínio econômico do jogo.

Nunca haverá conversão direta implícita entre:

Dinheiro real.
Caixa do clube.
Moeda do mundo.
235. Multi-tenancy

O isolamento lógico será por mundo.

A plataforma terá dados globais separados, como:

Conta.
Sessão.
Preferências globais.
Segurança.
236. Consulta global

Consultas globais somente serão permitidas para:

Descoberta de mundos.
Conta.
Administração autorizada.
Estatísticas agregadas públicas.
237. RLS

Row Level Security poderá ser introduzida futuramente em áreas sensíveis.

Na primeira fase, o isolamento utilizará:

Escopo obrigatório na aplicação.
Repositórios específicos.
Constraints.
Testes.
Auditoria.
238. Foreign keys

Serão utilizadas para garantir integridade relacional quando não impedirem particionamento futuro necessário.

239. Constraints

O banco deverá proteger invariantes estruturais:

Unicidade.
Valores não negativos.
Estados válidos.
Relações obrigatórias.
Uma associação ativa exclusiva.
Uma inscrição única.
240. Regra no domínio e constraint

Regras críticas serão protegidas em mais de uma camada quando possível:

Validação da aplicação
+
invariante do domínio
+
constraint do banco
241. Estado de leitura e escrita

A API poderá separar endpoints e infraestrutura de leitura no futuro.

Inicialmente, leitura e escrita utilizarão o mesmo cluster, mas com limites diferentes.

242. Réplica de leitura futura

Poderá ser usada para:

Histórico.
Perfis públicos.
Estatísticas.
Rankings.
Relatórios.

Não será usada para commands que precisam ler o estado mais recente.

243. Consistência forte

Obrigatória para:

Saldo.
Pagamento.
Contrato.
Transferência.
Inscrição.
Propriedade de jogador.
Resultado oficial.
Controle do clube.
Command de partida.
244. Consistência eventual

Aceitável para:

Feed.
Busca.
Notificação não crítica.
Ranking.
Histórico projetado.
Presença.
Recomendação.
Estatística agregada.
245. Estado desatualizado

A interface poderá mostrar:

Atualizando…
Última atualização há 12 segundos

Nunca deverá aceitar command crítico usando versão silenciosamente antiga.

246. Arquitetura evolutiva

A evolução será dividida em fases.

247. Fase 1 — Fundação
Um EasyPanel
Um PostgreSQL
Um Redis
Um RabbitMQ
Aplicações e workers separados
R2 externo
248. Fase 2 — Escala horizontal
Mais réplicas da API.
Mais gateways.
Mais workers.
Redis Adapter.
Pool de conexões.
Melhor particionamento de filas.
Banco com recursos ampliados.
249. Fase 3 — Especialização

Possíveis extrações:

Motor de partidas.
Notificações.
Histórico.
Busca.
Analytics.

Somente quando houver necessidade comprovada.

250. Fase 4 — Distribuição por mundo
Mundos atribuídos a clusters.
Roteamento por gameWorldId.
Migração de mundo.
Filas por partição.
Workers por região.
251. Fase 5 — Alta disponibilidade
PostgreSQL com réplica e failover.
RabbitMQ em cluster.
Redis com réplica ou Sentinel.
Múltiplos hosts.
Balanceamento.
Recuperação regional.
252. Extração de serviço

Um módulo somente será extraído quando:

Possuir fronteira estável.
Possuir carga própria.
Precisar escalar independentemente.
Possuir equipe ou operação distinta.
O benefício superar o custo de rede.
253. Preparação para extração

Cada módulo deverá possuir:

Contratos públicos.
Eventos.
Repositórios próprios.
Dados identificáveis.
Testes.
Sem importações internas indevidas.
254. Banco após extração

A extração de serviço não exigirá necessariamente banco separado no primeiro momento.

A separação de aplicação e de dados poderá ocorrer em fases diferentes.

255. Anti-corruption layer

Ao integrar módulos antigos, novos serviços ou fornecedores, será utilizada uma camada de tradução para evitar contaminar o domínio.

256. Compatibilidade

Eventos e APIs utilizarão:

schemaVersion

Consumidores deverão aceitar versões compatíveis durante períodos de transição.

257. Evento alterado

Mudanças aditivas poderão manter a versão.

Mudanças sem compatibilidade exigirão novo tipo ou nova versão.

258. Reprocessamento de eventos antigos

O consumidor deverá conhecer:

Versão do schema.
Conversor.
Política de dados ausentes.
Limitações.
259. Contrato mínimo do command
commandId
commandType
schemaVersion
actorType
actorId
sessionId
gameWorldId
clubId
aggregateType
aggregateId
expectedVersion
idempotencyKey
correlationId
causationId
payload
issuedAt
260. Contrato mínimo do evento
eventId
eventType
schemaVersion
gameWorldId
aggregateType
aggregateId
aggregateVersion
worldSequence
correlationId
causationId
actorType
actorId
payload
occurredAtReal
occurredAtWorld
261. Contrato mínimo da outbox
outboxEventId
eventId
gameWorldId
topic
routingKey
payload
headers
status
attemptCount
nextAttemptAt
createdAt
publishedAt
version
262. Contrato mínimo da inbox
consumerName
eventId
status
receivedAt
processedAt
failureReason
attemptCount
version
263. Contrato mínimo da tarefa agendada
scheduledTaskId
gameWorldId
taskType
status
dueAtReal
dueAtWorld
payload
priority
leaseOwner
leaseExpiresAt
attemptCount
lastFailure
createdAt
completedAt
version
264. Contrato mínimo da saga
processManagerId
gameWorldId
processType
subjectType
subjectId
status
currentStep
statePayload
completedSteps
compensationSteps
waitingForEventTypes
startedAt
updatedAt
completedAt
version
265. Contrato mínimo da projeção
projectionStateId
projectionName
scopeType
scopeId
projectionVersion
lastProcessedEventId
lastProcessedSequence
status
rebuildJobId
updatedAt
version
266. Contrato mínimo do arquivo
fileObjectId
gameWorldId
ownerType
ownerId
bucket
objectKey
contentType
size
checksum
visibility
status
uploadedBy
createdAt
validatedAt
deletedAt
version
267. Contrato mínimo do runtime da partida
matchRuntimeId
gameWorldId
matchId
status
engineVersion
rulesVersion
matchSeed
inputSnapshotHash
currentSimulationTime
lastEventSequence
lastCommandSequence
checkpointReference
activeWorkerLease
heartbeatAt
startedAt
completedAt
version
268. Contrato mínimo do lease
leaseId
resourceType
resourceId
ownerInstanceId
acquiredAt
heartbeatAt
expiresAt
version
269. Eventos técnicos necessários
OUTBOX_EVENT_CREATED
OUTBOX_EVENT_PUBLISHED
OUTBOX_EVENT_PUBLICATION_FAILED

INBOX_EVENT_RECEIVED
INBOX_EVENT_PROCESSED
INBOX_DUPLICATE_DETECTED
INBOX_EVENT_FAILED

SCHEDULED_TASK_CREATED
SCHEDULED_TASK_LEASE_ACQUIRED
SCHEDULED_TASK_STARTED
SCHEDULED_TASK_COMPLETED
SCHEDULED_TASK_FAILED
SCHEDULED_TASK_RETRY_SCHEDULED
SCHEDULED_TASK_DEAD_LETTERED

WORLD_CLOCK_LEASE_ACQUIRED
WORLD_CLOCK_HEARTBEAT_UPDATED
WORLD_CLOCK_ADVANCE_STARTED
WORLD_CLOCK_ADVANCE_COMPLETED
WORLD_CLOCK_ADVANCE_FAILED
WORLD_CLOCK_LEASE_EXPIRED

PROCESS_MANAGER_CREATED
PROCESS_MANAGER_STEP_STARTED
PROCESS_MANAGER_STEP_COMPLETED
PROCESS_MANAGER_WAITING
PROCESS_MANAGER_COMPENSATION_STARTED
PROCESS_MANAGER_COMPLETED
PROCESS_MANAGER_FAILED

PROJECTION_UPDATE_STARTED
PROJECTION_UPDATED
PROJECTION_REBUILD_STARTED
PROJECTION_REBUILD_COMPLETED
PROJECTION_REBUILD_FAILED
PROJECTION_VERSION_ACTIVATED

MATCH_RUNTIME_CREATED
MATCH_RUNTIME_WORKER_ASSIGNED
MATCH_RUNTIME_CHECKPOINT_CREATED
MATCH_RUNTIME_WORKER_HEARTBEAT_UPDATED
MATCH_RUNTIME_WORKER_LOST
MATCH_RUNTIME_RECOVERY_STARTED
MATCH_RUNTIME_RECOVERED
MATCH_RUNTIME_COMPLETED

FILE_UPLOAD_AUTHORIZED
FILE_UPLOAD_COMPLETED
FILE_VALIDATION_STARTED
FILE_VALIDATED
FILE_QUARANTINED
FILE_DELETED

CACHE_INVALIDATED
CACHE_REBUILD_REQUESTED
CACHE_REBUILD_COMPLETED

SERVICE_STARTED
SERVICE_READY
SERVICE_NOT_READY
SERVICE_STOPPING
SERVICE_STOPPED
270. Comandos técnicos necessários
PUBLISH_OUTBOX_BATCH
RETRY_OUTBOX_EVENT
REPROCESS_INBOX_EVENT

CREATE_SCHEDULED_TASK
ACQUIRE_SCHEDULED_TASK_LEASE
EXECUTE_SCHEDULED_TASK
RETRY_SCHEDULED_TASK
CANCEL_SCHEDULED_TASK

ACQUIRE_WORLD_CLOCK_LEASE
ADVANCE_WORLD_CLOCK
RELEASE_WORLD_CLOCK_LEASE
RECOVER_WORLD_CLOCK_PROCESSING

START_PROCESS_MANAGER
CONTINUE_PROCESS_MANAGER
COMPENSATE_PROCESS_MANAGER
FAIL_PROCESS_MANAGER

UPDATE_PROJECTION
START_PROJECTION_REBUILD
ACTIVATE_PROJECTION_VERSION
CANCEL_PROJECTION_REBUILD

CREATE_MATCH_RUNTIME
ASSIGN_MATCH_RUNTIME_WORKER
SUBMIT_MATCH_COMMAND
CREATE_MATCH_CHECKPOINT
RECOVER_MATCH_RUNTIME
FINALIZE_MATCH_RUNTIME

AUTHORIZE_FILE_UPLOAD
CONFIRM_FILE_UPLOAD
VALIDATE_FILE
QUARANTINE_FILE
DELETE_FILE

INVALIDATE_CACHE
REBUILD_CACHE
271. Idempotência

Aplicável obrigatoriamente a:

Commands HTTP.
Commands WebSocket.
Eventos RabbitMQ.
Jobs.
Tarefas agendadas.
Checkpoints.
Uploads.
Pagamentos.
Transições.
Deployments.
Migrações.
Rebuilds.
272. Auditoria técnica

Deverão ser auditados:

Commands críticos.
Eventos publicados.
Retries.
Dead letters.
Leases.
Commands de partida.
Recuperações.
Migrações.
Deployments.
Flags.
Uploads.
Alterações de configuração.
Operações administrativas.
Rebuilds.
273. Telemetria técnica
Requests.
Commands.
Queries.
Erros.
Conflitos de versão.
Eventos.
Lag de outbox.
Lag de filas.
Consumers.
Retries.
Dead letters.
Cache hit.
Scheduler.
Leases.
Partidas.
Checkpoints.
Recuperações.
Banco.
Backups.
Uploads.
WebSocket.
Deployments.
274. Casos extremos fechados
A API conclui a transação e o RabbitMQ está fora

O evento permanece na outbox e será publicado depois.

O evento é publicado, mas a confirmação falha

Ele pode ser publicado novamente; a inbox impede efeito duplicado.

Dois consumers recebem o mesmo evento

Somente um efeito lógico é persistido.

Um evento chega fora de ordem

O consumidor aguarda, reprocessa ou reconstrói o estado.

O Redis perde todos os dados

Presença e cache são reconstruídos; contratos e resultados permanecem.

O RabbitMQ perde uma fila não crítica

Eventos ainda presentes na outbox podem ser republicados.

O PostgreSQL reinicia

Serviços ficam indisponíveis ou degradados até a reconexão segura.

Dois schedulers tentam avançar o mesmo mundo

Somente o detentor do lease executa.

O scheduler morre durante o processamento diário

Outro processo retoma pelo checkpoint.

O relógio do servidor muda

O tempo real é normalizado e o relógio do mundo continua baseado em estado persistido.

O usuário altera o relógio do celular

Nenhum prazo oficial é alterado.

Dois usuários aceitam o mesmo jogador

Constraints, locks e versões permitem uma única conclusão compatível.

Dois commands chegam com a mesma versão

O primeiro válido atualiza o agregado; o segundo recebe conflito.

O frontend mostra saldo antigo

O command é validado pelo saldo oficial e pode ser rejeitado.

O WebSocket desconecta

O cliente recupera eventos pela sequência ou solicita snapshot.

Um evento WebSocket é perdido

A API oficial continua correta e a ressincronização restaura a interface.

Duas réplicas do gateway recebem a mesma atualização

O identificador e a sequência evitam duplicidade visual.

O worker de partida morre após um gol

O novo worker restaura checkpoint e eventos sem duplicar o gol.

Dois workers assumem a mesma partida

Somente o lease e a versão válidos permitem persistir.

O command de substituição chega depois da janela

É rejeitado pelo estado oficial do motor.

O cliente envia command repetido

O commandId retorna o resultado anterior.

A partida termina enquanto o usuário está desconectado

O motor continua e o usuário recebe o estado oficial ao retornar.

Uma nova versão do motor é implantada durante partidas

Partidas em andamento continuam vinculadas à versão com que começaram.

Um rebuild histórico ocorre durante rodada

Utiliza recursos limitados e não bloqueia commands críticos.

Uma projeção fica incorreta

É reconstruída a partir dos eventos e fatos oficiais.

O cache e a projeção discordam

A projeção oficial ou o banco prevalecem, e o cache é invalidado.

A busca retorna jogador já transferido

Ao abrir, a entidade mostra o estado atual oficial.

Um upload é concluído, mas nunca confirmado

É removido pelo job de limpeza.

Um arquivo malicioso é enviado

Fica em quarentena e não recebe URL pública.

O R2 fica indisponível

Arquivos ficam limitados, mas o mundo continua funcionando.

Um backup diário falha

O alerta é disparado, o WAL continua e uma nova tentativa é executada.

O servidor do EasyPanel é perdido

O PostgreSQL é restaurado do R2 e os serviços são recriados pelas imagens versionadas.

Uma migração falha no meio

A etapa específica é retomada ou compensada conforme o plano.

O aplicativo antigo usa contrato incompatível

Commands críticos são bloqueados com exigência de atualização.

Uma feature flag nova causa erro

O kill switch a desativa sem reverter todo o deployment.

Uma flag muda a regra apenas para um clube

A ativação é bloqueada por impacto competitivo.

O pool do banco fica esgotado

A API aplica backpressure e preserva commands prioritários.

Uma consulta histórica muito pesada é solicitada

É executada em projeção, limitada ou transformada em job.

Um serviço externo de e-mail falha

A notificação interna permanece válida e o envio entra em retry.

Um webhook chega duas vezes

O identificador externo impede efeito duplicado.

Um pagamento real e um valor do clube possuem o mesmo número

Permanecem em domínios totalmente separados.

Um módulo acessa tabela privada de outro módulo

Os testes de arquitetura bloqueiam o merge.

Um desenvolvedor coloca regra no controller

A revisão e os testes arquiteturais exigem movimentação para domínio ou aplicação.

Uma regra do domínio depende do Prisma

A dependência é proibida.

Um mundo cresce além da capacidade do cluster

Pode ser migrado futuramente usando gameWorldId como unidade.

Uma extração de microsserviço é necessária

O módulo já possui contratos e eventos para ser separado gradualmente.

275. Critérios de aceite

O bloco será considerado correto quando:

A arquitetura inicial for monólito modular.
Processos especializados forem executados separadamente.
O backend utilizar NestJS e TypeScript.
O frontend utilizar Next.js.
O banco principal for PostgreSQL.
O ORM principal for PrismaJS.
O Redis for usado apenas para dados temporários e cache.
O RabbitMQ for utilizado para mensageria durável.
O Cloudflare R2 armazenar arquivos.
Todos os serviços iniciais forem implantáveis no EasyPanel.
O domínio não depender de infraestrutura.
A aplicação orquestrar casos de uso.
A infraestrutura implementar adaptadores.
Módulos possuírem fronteiras claras.
Módulos não acessarem tabelas privadas uns dos outros.
O shared kernel permanecer pequeno.
Acoplamentos circulares serem detectados.
O monorepo utilizar pnpm.
Aplicações e pacotes serem separados.
TypeScript utilizar modo estrito.
Contratos externos serem validados em runtime.
O frontend separar estado local e estado do servidor.
A aplicação ser mobile-first.
A primeira versão ser PWA.
Um aplicativo nativo futuro poder reutilizar a API.
Commands utilizarem API oficial.
WebSocket ser utilizado para eventos em tempo real.
WebSocket não ser fonte de verdade.
Eventos WebSocket possuírem sequência.
Reconexões recuperarem eventos perdidos.
A API ser versionada.
Commands possuírem commandId.
Commands possuírem idempotencyKey.
Commands críticos possuírem expectedVersion.
Erros possuírem códigos estáveis.
Paginação por cursor ser suportada.
Filtros serem limitados e indexados.
Autenticação utilizar Argon2id.
Tokens de acesso possuírem curta duração.
Refresh tokens serem rotativos.
Sessões poderem ser revogadas.
Autorização ser calculada no servidor.
Todas as requisições competitivas possuírem escopo de mundo.
O PostgreSQL ser fonte de verdade.
O banco inicial ser centralizado.
gameWorldId existir como chave de particionamento.
Mundos poderem ser migrados futuramente.
Identificadores distribuídos serem suportados.
Concorrência otimista ser utilizada.
Sobrescritas silenciosas serem proibidas.
Dinheiro ser armazenado em unidade mínima.
Ponto flutuante não ser usado para saldo.
Datas reais serem armazenadas em UTC.
Tempo do mundo ser separado do tempo real.
JSONB não substituir relações essenciais.
Índices utilizarem o escopo do mundo.
Tabelas volumosas poderem ser particionadas.
Prisma cobrir operações comuns.
SQL direto ser encapsulado.
Commands críticos utilizarem transações.
Transações não realizarem chamadas externas.
Estado e outbox serem persistidos juntos.
A outbox ser publicável por retry.
A entrega da mensageria ser ao menos uma vez.
Consumidores possuírem inbox.
Consumidores serem idempotentes.
Eventos duplicados não repetirem efeitos.
Eventos possuírem versão de agregado.
Eventos de mundo possuírem sequência.
Eventos fora de ordem serem tratados.
RabbitMQ possuir filas duráveis.
Filas possuírem dead letter.
Redis não armazenar estado competitivo exclusivo.
A perda do Redis ser recuperável.
Caches possuírem TTL e invalidação.
Locks críticos não dependerem apenas do Redis.
Tarefas futuras serem persistidas.
Timers em memória não serem usados para prazos oficiais.
Workers utilizarem SKIP LOCKED quando aplicável.
O relógio do mundo possuir lease.
Dois schedulers não avançarem o mesmo mundo.
Mundos atrasados serem recuperados em ordem.
O motor de partidas possuir interface isolada.
A partida registrar seed.
A partida registrar versão do motor.
Partidas antigas não serem recalculadas por atualização.
Cada partida possuir um actor lógico.
Commands de partida serem ordenados pelo servidor.
Checkpoints serem persistidos.
O motor não escrever no banco a cada tick.
Falhas de worker permitirem recuperação.
A conclusão da partida ser transacional.
Partidas offline utilizarem o mesmo motor.
A IA receber apenas informações permitidas.
Processos longos utilizarem sagas.
Transações distribuídas de duas fases não serem usadas.
Compensações serem explícitas.
Read models serem suportados.
Commands e queries serem separados logicamente.
Projeções poderem ser reconstruídas.
Rebuilds não alterarem fatos.
O sistema não depender de event sourcing completo.
Eventos de domínio serem preservados.
Eventos técnicos e históricos serem diferenciados.
Eventos antigos poderem ser arquivados.
A busca inicial utilizar PostgreSQL.
Um motor externo de busca não ser obrigatório.
Busca não ser fonte autoritativa.
Analytics inicial utilizar PostgreSQL.
Banco analítico ser introduzido somente quando necessário.
Arquivos serem armazenados no R2.
Metadados de arquivos permanecerem no banco.
Uploads poderem ser diretos ao R2.
Uploads exigirem autorização.
Arquivos serem validados.
Arquivos privados utilizarem URLs temporárias.
Uploads abandonados serem limpos.
Backups do PostgreSQL utilizarem armazenamento externo.
O WAL ser arquivado.
Backups serem testados.
A recuperação não depender apenas de Redis ou RabbitMQ.
Serviços do EasyPanel possuírem redes privadas.
Banco, Redis e RabbitMQ não ficarem públicos.
HTTPS ser obrigatório.
Volumes persistentes serem configurados.
Serviços possuírem health checks.
Readiness validar dependências essenciais.
A API tolerar indisponibilidade temporária do RabbitMQ por outbox.
A perda do Redis causar apenas degradação.
A perda do R2 não interromper o núcleo do jogo.
Variáveis de ambiente serem validadas.
Configuração inválida impedir inicialização.
Segredos não ficarem no repositório.
Ambientes serem separados.
Desenvolvimento local utilizar Docker Compose.
Staging reproduzir produção.
Imagens Docker serem imutáveis.
O GHCR armazenar imagens.
O GitHub Actions executar o pipeline.
Releases possuírem changelog.
Migrações serem versionadas.
Migrações arriscadas utilizarem expand-contract.
Migrações destrutivas não executarem automaticamente no boot.
Rollback da aplicação ser planejado.
Feature flags serem suportadas.
Flags competitivas não favorecerem um clube.
OpenTelemetry ser utilizado.
Traces atravessarem HTTP e RabbitMQ.
Prometheus coletar métricas.
Loki armazenar logs.
Tempo armazenar traces.
Grafana apresentar dashboards.
Alertas operacionais existirem.
Fluxos possuírem SLOs.
Consultas pesadas não competirem diretamente com commands.
Pool de conexões ser controlado.
A arquitetura não depender de serverless.
Testes unitários cobrirem domínio.
Testes de integração utilizarem serviços reais.
Testes de contrato verificarem schemas.
Testes end-to-end cobrirem fluxos principais.
Testes de concorrência existirem.
Testes de propriedade validarem invariantes.
O motor possuir golden tests.
Mudanças do motor gerarem nova versão.
Testes estatísticos do motor existirem.
Testes de carga cobrirem rodadas e janelas.
Testes de recuperação existirem.
Seeds de teste serem determinísticas.
Lint e typecheck serem obrigatórios.
Testes de arquitetura bloquearem dependências incorretas.
A API validar entrada.
O servidor nunca confiar no cliente.
SQL injection ser evitada.
Uploads maliciosos serem isolados.
Rate limiting existir por fluxo.
Commands críticos serem auditados.
Integrações utilizarem adapters.
Falhas externas possuírem retry e circuit breaker.
E-mails serem enviados assincronamente.
Push derivar de notificações internas.
Dinheiro real e economia do jogo permanecerem separados.
O isolamento lógico ser por mundo.
Consultas globais serem restritas.
Constraints protegerem invariantes estruturais.
Regras críticas poderem existir em domínio e banco.
Réplicas de leitura serem possíveis futuramente.
Consistência forte ser aplicada a contratos e finanças.
Consistência eventual ser aplicada a feeds e rankings.
O cliente indicar quando dados estiverem desatualizados.
A arquitetura possuir fases de evolução.
A fase inicial caber em um EasyPanel.
A escala horizontal não exigir reescrever regras.
O motor poder ser extraído futuramente.
Mundos poderem ser distribuídos por clusters.
Extrações de serviço exigirem necessidade comprovada.
Módulos possuírem contratos para extração.
Eventos e APIs possuírem schemaVersion.
Eventos antigos poderem ser convertidos.
Nenhum evento ser perdido entre transação e mensageria.
Nenhum retry duplicar pagamento.
Nenhum worker processar uma partida simultaneamente de forma válida.
Nenhum scheduler avançar duas vezes o mundo.
Nenhum cache substituir o banco.
Nenhum arquivo pesado precisar ficar no PostgreSQL.
Nenhuma regra oficial depender do relógio do dispositivo.
Nenhum módulo de infraestrutura contaminar o domínio.
Nenhuma migração crítica ser executada sem controle.
Nenhum serviço externo ser indispensável para a simulação central.
O sistema poder crescer sem abandonar a arquitetura construída.
Decisões fechadas do Bloco 25
A primeira arquitetura será um monólito modular.
Não serão criados microsserviços prematuramente.
Processos especializados serão implantados separadamente.
O backend utilizará NestJS e TypeScript.
O frontend utilizará Next.js.
O projeto utilizará monorepo com pnpm e Turborepo.
O banco principal será PostgreSQL.
O ORM será PrismaJS.
O Redis será utilizado para cache e estado temporário.
O RabbitMQ será utilizado para mensageria.
O Cloudflare R2 será utilizado para arquivos e backups.
A implantação inicial ocorrerá integralmente no EasyPanel, exceto o R2 externo.
A aplicação será mobile-first e PWA.
A API principal será REST.
O tempo real utilizará WebSocket com Socket.IO.
O gateway de tempo real não será fonte de verdade.
A API possuirá versionamento.
Commands serão idempotentes.
Agregados críticos utilizarão concorrência otimista.
O servidor será autoritativo.
O cliente nunca executará regras oficiais.
Todos os dados competitivos possuirão escopo de mundo.
gameWorldId será chave de particionamento.
A primeira versão utilizará um cluster PostgreSQL.
Mundos poderão ser movidos futuramente para clusters diferentes.
Identificadores utilizarão preferencialmente UUIDv7.
Dinheiro será armazenado em unidade mínima.
O tempo real e o tempo do mundo serão separados.
JSONB será utilizado com moderação.
Relações essenciais serão relacionais.
Prisma será utilizado para operações comuns.
SQL direto será permitido dentro da infraestrutura.
Transações serão curtas.
Chamadas externas não ocorrerão dentro de transações.
Eventos serão gravados em outbox transacional.
A mensageria terá entrega ao menos uma vez.
Consumidores utilizarão inbox.
Todos os consumers serão idempotentes.
Eventos possuirão versões.
Eventos do mundo possuirão sequência.
Filas críticas serão duráveis.
Redis nunca armazenará sozinho saldos, contratos ou resultados.
Prazos oficiais serão persistidos no PostgreSQL.
O scheduler utilizará leases.
Apenas um scheduler avançará cada mundo.
O motor de partidas será isolado.
Partidas registrarão seed e versão do motor.
Partidas serão determinísticas em relação às entradas oficiais.
Cada partida possuirá um único actor lógico.
Partidas utilizarão checkpoints.
Partidas sobreviverão à perda do worker.
Partidas offline utilizarão o mesmo motor.
A IA não conhecerá dados secretos.
Processos longos utilizarão sagas.
Não haverá transação distribuída de duas fases.
Falhas serão tratadas por compensação.
O sistema utilizará CQRS pragmático.
Read models serão projetados por necessidade.
Projeções poderão ser reconstruídas.
Não haverá event sourcing completo obrigatório.
Eventos relevantes serão imutáveis.
A busca inicial utilizará PostgreSQL.
Um motor externo de busca será introduzido apenas por necessidade.
Analytics inicial utilizará o banco principal e projeções.
Arquivos serão enviados diretamente ao R2 quando possível.
Arquivos privados utilizarão URLs temporárias.
Uploads serão validados.
Backups PostgreSQL utilizarão WAL-G e R2.
Backups ficarão fora do servidor principal.
EasyPanel gerenciará os contêineres iniciais.
PostgreSQL, Redis e RabbitMQ não serão públicos.
O tráfego público utilizará HTTPS.
Serviços possuirão health checks.
A outbox permitirá continuar durante falha temporária do broker.
A perda do Redis causará degradação, não perda de mundo.
Configurações serão validadas na inicialização.
Segredos não ficarão no código.
Haverá ambientes separados.
O desenvolvimento local utilizará Docker Compose.
O staging reproduzirá a arquitetura de produção.
Imagens serão armazenadas no GHCR.
GitHub Actions realizará CI/CD.
Migrações serão versionadas e testadas.
Migrações arriscadas usarão expand-contract.
Feature flags terão escopo e prazo.
Regras competitivas não serão alteradas por flags invisíveis.
OpenTelemetry será utilizado desde o início.
Prometheus, Grafana, Loki e Tempo formarão a observabilidade.
Consultas pesadas utilizarão projeções ou jobs.
Testes de domínio, integração, concorrência e simulação serão obrigatórios.
O motor possuirá golden tests e testes estatísticos.
Testes de recuperação serão parte da arquitetura.
Testes automatizados protegerão as fronteiras dos módulos.
Integrações externas utilizarão adapters.
E-mail e push serão assíncronos.
Dinheiro real será separado da economia fictícia.
A arquitetura evoluirá por fases.
Módulos somente serão extraídos quando houver benefício comprovado.
A evolução para distribuição por mundo será prevista desde o primeiro schema.
A arquitetura técnica será simples para começar, robusta para operar e preparada para crescer sem reescrever o jogo.

Bloco 25 encerrado.

Faltam 3 blocos no roteiro principal. O próximo será Modelo de Dados, Enums, PrismaJS e Integridade Relacional, consolidando todas as entidades, identificadores, estados, relações, constraints, índices, partições e estratégia de migração do banco.

segue
Pensou por 1m 50s

O modelo será organizado por domínio, com relações explícitas, proteção contra vínculos entre mundos, razão financeira de partidas dobradas, estados versionados e migrações SQL complementares ao Prisma.

Bloco 26 — Modelo de Dados, Enums, PrismaJS e Integridade Relacional

O banco de dados será construído como uma representação explícita das regras do jogo.

Ele não será apenas uma coleção de tabelas utilizadas pelas telas.

Cada entidade deverá possuir uma responsabilidade clara e cada relação deverá responder:

A qual mundo pertence?
Quem é seu agregado responsável?
Qual é sua fonte de verdade?
Qual é seu ciclo de vida?
Qual estado pode suceder outro?
Quais relações são obrigatórias?
Quais relações podem existir simultaneamente?
Quais invariantes pertencem ao domínio?
Quais invariantes também serão protegidas pelo PostgreSQL?
O registro pode ser alterado?
O registro pode ser encerrado?
O registro pode ser excluído?
Existe histórico obrigatório?
Existe informação confidencial?
Existe risco de duplicidade?
Existe risco de concorrência?
Existe necessidade de particionamento futuro?

A regra principal será:

O schema representa as regras do mundo.

A aplicação não deverá compensar permanentemente
um banco incapaz de proteger suas próprias invariantes estruturais.
1. Objetivo do bloco

Garantir que:

Todas as entidades essenciais estejam identificadas.
Entidades globais e entidades de mundo sejam separadas.
Todo jogador seja único dentro de seu mundo.
Pessoas possam possuir carreira como jogador e funcionário.
Clubes mantenham história sem recriação de identidade.
Contratos sejam separados de inscrições e vínculos esportivos.
Empréstimos preservem o contrato com o clube de origem.
Transferências sejam processos, não simples alterações de clubId.
Finanças utilizem razão de partidas dobradas.
Saldos sejam derivados de lançamentos.
Orçamentos sejam diferentes de caixa.
Reservas financeiras sejam persistentes.
Competições tenham definições e edições.
Regulamentos sejam versionados.
Partidas tenham estado operacional e resultado oficial separados.
Escalações históricas sejam preservadas.
Estatísticas possam ser recalculadas.
Eventos sejam idempotentes.
Prazos sejam persistidos.
Notificações não sejam fonte de verdade.
Automações possuam versões.
Histórico seja imutável por versão.
Ações administrativas sejam auditáveis.
Relações entre mundos diferentes sejam bloqueadas.
Exclusões em cascata sejam usadas com extremo cuidado.
Dados históricos não desapareçam.
Enums estáveis sejam diferentes de catálogos expansíveis.
Mudanças de regra não exijam alterar enums do banco a todo momento.
Índices sejam definidos pelas consultas reais.
Particionamento seja introduzido apenas quando necessário.
Migrações possam utilizar SQL nativo.
O Prisma não seja tratado como limite das capacidades do PostgreSQL.
Migrações sejam reproduzíveis e revisadas.
Dados antigos possam ser migrados sem bloquear o mundo.
O schema seja testável.
O schema possa evoluir para múltiplos clusters.
A futura separação de serviços seja possível.
Nenhuma entidade crítica dependa de referência polimórfica sem integridade.
Nenhuma quantia financeira dependa de ponto flutuante.
Nenhum status crítico seja alterado sem transição válida.
Nenhuma operação concorrente sobrescreva silenciosamente outra.
Nenhum retry duplique efeitos.
Nenhum mundo acesse acidentalmente entidades de outro mundo.
2. Fonte de verdade do modelo

O modelo terá três camadas complementares:

Prisma Schema
    +
Migrações SQL nativas
    +
Regras e invariantes do domínio
Prisma Schema

Responsável por:

Models.
Relações.
Foreign keys.
Enums estáveis.
Índices comuns.
Constraints únicas comuns.
Tipagem do cliente.
Mapeamento entre código e banco.
Migrações SQL nativas

Responsáveis por recursos como:

CHECK constraints.
EXCLUDE constraints.
Índices por expressão.
Índices com INCLUDE.
Views.
Materialized views.
Triggers de integridade específicos.
Particionamento.
Funções PostgreSQL.
Extensões.
Constraints deferrable.
Validações financeiras avançadas.
Domínio

Responsável por:

Transições válidas.
Autoridade.
Cálculos.
Políticas.
Decisões contextuais.
Regras que dependem de múltiplos agregados.
Mensagens de erro compreensíveis.

A documentação atual do Prisma permite organizar o schema em vários arquivos. Entretanto, nem todas as estruturas do PostgreSQL são representadas diretamente pela linguagem do Prisma; CHECK, EXCLUDE, views e determinados índices continuarão sendo tratados por migrações SQL revisadas. Recursos ainda marcados como preview não serão essenciais para a integridade da primeira versão.

3. Organização física do Prisma

O schema será dividido em arquivos por domínio:

/prisma
  schema.prisma
  platform.prisma
  world.prisma
  club.prisma
  person.prisma
  player.prisma
  staff.prisma
  squad.prisma
  training.prisma
  tactics.prisma
  medical.prisma
  match.prisma
  competition.prisma
  market.prisma
  transfer.prisma
  contract.prisma
  finance.prisma
  infrastructure.prisma
  commercial.prisma
  supporter.prisma
  communication.prisma
  history.prisma
  notification.prisma
  automation.prisma
  entry.prisma
  eventing.prisma
  operations.prisma
  enums.prisma

O arquivo principal conterá:

generator.
datasource.
Configurações globais.
Extensões autorizadas.
Comentários de versão.
4. Schemas do PostgreSQL

A primeira versão utilizará os seguintes schemas lógicos:

platform
game
finance
eventing
operations
read_model
platform
Usuários.
Credenciais.
Sessões.
Dispositivos.
Preferências globais.
Segurança da conta.
game
Mundos.
Clubes.
Pessoas.
Jogadores.
Funcionários.
Competições.
Partidas.
Mercado.
Estruturas.
Histórico esportivo.
finance
Contas.
Lançamentos.
Recebíveis.
Pagáveis.
Orçamentos.
Reservas.
Dívidas.
eventing
Event log.
Outbox.
Inbox.
Jobs.
Tarefas agendadas.
Sagas.
Leases.
operations
Auditoria.
Administração.
Suporte.
Incidentes.
Backups.
Deployments.
read_model
Views.
Materialized views.
Projeções de consulta.
Tabelas de leitura reconstruíveis.
5. Convenção de nomes
Models Prisma
PascalCase

Exemplos:

GameWorld
ClubControl
PlayerContract
CompetitionEdition
FinancialJournalEntry
Campos Prisma
camelCase
Tabelas e colunas PostgreSQL
snake_case

Exemplo:

model ClubControl {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @map("game_world_id") @db.Uuid
  clubId      String @map("club_id") @db.Uuid

  @@map("club_control")
  @@schema("game")
}
6. Identificadores

A identificação principal utilizará UUIDv7:

id String @id @default(uuid(7)) @db.Uuid

A referência atual do Prisma documenta uuid(7) como função disponível para geração de identificadores UUIDv7.

Regra fechada

Não serão utilizados IDs sequenciais globais como identidade principal das entidades do mundo.

7. Identificadores públicos

Entidades que precisem ser compartilhadas poderão possuir:

publicCode
slug
shortCode

Exemplo:

club publicCode:
CLB-7F29DK

match publicCode:
MAT-93F4AX

O identificador público:

Não substitui o UUID.
Pode ser regenerável quando permitido.
Não concede autorização.
Não contém informação secreta.
Não será usado para ordenar cronologicamente.
8. Entidades globais e entidades do mundo
Globais

Não pertencem a um mundo específico:

UserAccount.
UserProfile.
UserCredential.
UserSession.
UserDevice.
UserSecurityFactor.
GlobalNotificationPreference.
AdminOperator.
PlatformFeatureFlag.
Pertencentes ao mundo

Possuem gameWorldId:

Clubes.
Pessoas.
Jogadores.
Funcionários.
Competições.
Partidas.
Contratos.
Lançamentos financeiros.
Estruturas.
Notificações do jogo.
Automações do clube.
Histórico.
Eventos.
9. Campos comuns de entidades do mundo

Quando aplicável:

id          String   @id @default(uuid(7)) @db.Uuid
gameWorldId String   @db.Uuid
createdAt   DateTime @default(now()) @db.Timestamptz(6)
updatedAt   DateTime @updatedAt @db.Timestamptz(6)
version     Int      @default(1)

Campos opcionais conforme o ciclo de vida:

effectiveAt
endedAt
cancelledAt
archivedAt
deletedAt
createdBy
updatedBy
10. Proteção contra relações entre mundos

Todos os pais centrais possuirão:

@@unique([gameWorldId, id])

Os filhos críticos utilizarão foreign keys compostas:

club Club @relation(
  fields: [gameWorldId, clubId],
  references: [gameWorldId, id],
  onDelete: Restrict
)
Objetivo

Impedir que:

Contrato de um mundo aponte para jogador de outro.
Partida utilize clube de outro mundo.
Inscrição vincule competição e atleta de mundos diferentes.
Lançamento financeiro use conta de outro mundo.
Transferência atravesse mundos acidentalmente.
Notificação abra entidade pertencente a outro mundo.
Regra fechada

A unicidade global do UUID não será considerada proteção suficiente contra erro de escopo.

11. Chaves compostas

Chaves compostas serão utilizadas para relações naturais como:

(gameWorldId, seasonNumber)
(gameWorldId, clubId, userId, activeState)
(competitionEditionId, clubId)
(matchId, eventSequence)
(matchId, clubId)
(playerId, abilityProfileVersion)
(journalEntryId, lineNumber)
(consumerName, eventId)

O Prisma suporta IDs e constraints únicas compostas, que também podem ser utilizadas em operações de conexão e consulta única.

12. Datas reais

Datas reais serão armazenadas como:

DateTime @db.Timestamptz(6)

Aplicável a:

Criação.
Login.
Auditoria.
Entrega.
Deployment.
Backup.
Acesso administrativo.
Upload.
13. Tempo do mundo

O tempo oficial utilizará como referência principal:

worldTick: BigInt

Campos derivados poderão ser persistidos para leitura:

seasonId
worldDay
worldMinute
worldDateLabel
Regra fechada

Prazos competitivos serão comparados pelo relógio persistido do mundo, não pelo horário do dispositivo.

14. Períodos temporais

Entidades temporais utilizarão:

startsAtWorldTick
endsAtWorldTick
startsAtReal
endsAtReal

Conforme seu domínio.

Período aberto

endsAt... = null representa período ainda ativo.

Regra fechada

null não representará “data desconhecida” e “período ativo” simultaneamente.

Quando a data for desconhecida, existirá um estado explícito.

15. Valores monetários

Toda quantia será armazenada como:

amountMinor BigInt
currencyId  String

Exemplo:

R$ 125,90

amountMinor:
12590
Proibido
Float
Double
número decimal sem escala definida

para:

Caixa.
Transferências.
Salários.
Bônus.
Parcelas.
Dívidas.
Orçamentos.
Recebíveis.
Pagamentos.
16. Percentuais e probabilidades

Serão armazenados como inteiros escalados.

Padrão:

basisPoints

Exemplo:

12,50% = 1250 basis points

Probabilidades internas poderão utilizar escala:

0 a 1.000.000

A escala deverá ser declarada pelo objeto de valor.

17. Atributos e avaliações

Atributos técnicos e avaliações utilizarão inteiros escalados:

0 a 10.000

Exemplo:

7.825 representa 78,25%

A interface decidirá se mostra:

Número.
Faixa.
Estrelas.
Texto.
Valor oculto.
18. Uso de Decimal

Decimal ficará restrito a casos em que:

A escala não pode ser representada adequadamente por inteiro.
O cálculo exige precisão decimal arbitrária.
Existe justificativa documentada.
Regra fechada

Dinheiro continuará usando BigInt, mesmo que o PostgreSQL permita numeric.

19. Uso de JSONB

JSONB será permitido para estruturas:

Versionadas.
Lidas como unidade.
De alta variação interna.
Sem necessidade de foreign keys em cada campo.
Validadas por schema em runtime.

Exemplos:

Perfil técnico interno do jogador.
Snapshot da partida.
Payload de evento.
Condições de automação.
Configuração de regulamento.
Resultado de simulação.
Resumo histórico.
Metadados de relatório.
20. Uso proibido de JSONB

Não serão armazenados somente em JSON:

Proprietário do jogador.
Clube contratante.
Parcelas.
Participantes da competição.
Inscrições.
Saldos.
Contas financeiras.
Títulos.
Suspensões.
Responsáveis.
Autoridades.
Membros do elenco.
Relações entre pessoas.
21. Arrays PostgreSQL

Arrays poderão ser usados para:

Tags técnicas.
Escopos simples.
Códigos auxiliares.
Dados sem identidade própria.

Não serão utilizados para relações principais.

22. Política de enums

Os valores serão divididos em três categorias.

ENUM ESTÁVEL
CATÁLOGO EXPANSÍVEL
REGRA VERSIONADA
23. Enums estáveis

Serão utilizados quando:

O ciclo de vida for fechado.
O conjunto mudar raramente.
O valor possuir comportamento técnico.
Uma mudança exigir migration consciente.

Exemplos:

WorldStatus
SeasonStatus
MatchStatus
ContractStatus
JournalEntryStatus
NotificationStatus
AutomationStatus
JobStatus
IncidentStatus
24. Catálogos expansíveis

Serão tabelas quando novos valores puderem ser adicionados sem alterar o schema.

Exemplos:

Posições.
Funções táticas.
Competências de funcionários.
Tipos de objetivo.
Capacidades de estrutura.
Tipos de prêmio.
Categorias de treinamento.
Tipos de lesão.
Especialidades médicas.
Tipos comerciais.
Papéis de departamento.

Modelo-base:

CatalogDefinition
CatalogEntry
CatalogEntryTranslation
CatalogEntryVersion
25. Regras versionadas

Ficarão ligadas a:

RuleSet
RuleDefinition
RuleValue
RuleSetVersion

Exemplos:

Critérios de desempate.
Limites de inscrição.
Limites de estrangeiros.
Regras de empréstimo.
Formato de competição.
Distribuição de premiação.
Licenciamento.
Suspensões.
Regras de expansão.
26. Enum não será usado como tradução

O banco armazenará códigos:

ACTIVE
SUSPENDED
CANCELLED

A interface traduzirá:

Ativo
Suspenso
Cancelado
27. Enums da plataforma
UserAccountStatus
UserSessionStatus
UserDeviceTrustStatus
SecurityFactorType
SecurityFactorStatus
WorldMembershipStatus
InvitationStatus
AccountRestrictionType
28. Enums do mundo
GameWorldStatus
WorldClockStatus
WorldOperationalState
SeasonStatus
SeasonTransitionStatus
WorldEntryWindowStatus
WorldProcessingState
29. Enums de clube e governança
ClubStatus
ClubOriginType
ClubIdentityStatus
ClubControlStatus
GovernanceModel
BoardStatus
BoardMandateStatus
AutonomyLevel
ClubObjectiveStatus
ClubPolicyStatus
DepartmentStatus
ResponsibilityAssignmentStatus
30. Enums de pessoas e carreira
PersonStatus
PlayerCareerStatus
PlayerAvailabilityStatus
StaffCareerStatus
CareerPeriodStatus
PersonRelationshipStatus
RetirementProcessStatus
RecognitionStatus
31. Enums de elenco e registro
SquadType
SquadMembershipStatus
SquadMembershipRole
PlayerRegistrationStatus
RegistrationMovementType
ShirtNumberStatus
LeadershipAssignmentType
LeadershipAssignmentStatus
32. Enums contratuais
AgreementStatus
PlayerContractStatus
StaffContractStatus
ContractNegotiationStatus
ContractOptionType
ContractOptionStatus
ContractTriggerStatus
LoanAgreementStatus
TransferAgreementStatus
CommercialContractStatus
FacilityAgreementStatus
33. Enums de transferência
TransferCaseStatus
TransferOfferStatus
TransferDirection
TransferType
PaymentScheduleStatus
TransferMedicalStatus
TransferRegistrationStatus
SellOnClauseType
LoanPurchaseClauseType
34. Enums financeiros
FinancialAccountType
AccountNormalSide
JournalEntryStatus
JournalLineDirection
BudgetStatus
BudgetLineStatus
FinancialReservationStatus
PayableStatus
ReceivableStatus
PaymentStatus
InstallmentStatus
DebtStatus
FinancialRiskLevel
35. Enums competitivos
CompetitionDefinitionStatus
CompetitionEditionStatus
CompetitionType
CompetitionFormatType
CompetitionStageType
CompetitionParticipantStatus
FixtureStatus
HomologationStatus
CompetitiveMovementType
CompetitiveMovementStatus
AppealStatus
LicenseStatus
DrawStatus
36. Enums da partida
MatchStatus
MatchSide
MatchRuntimeStatus
MatchCommandStatus
MatchCommandOrigin
MatchEventKind
MatchResultStatus
MatchCheckpointType
LineupStatus
SubstitutionStatus
TacticalInstructionStatus

MatchEventKind conterá apenas categorias estruturais estáveis.

Detalhes como:

Tipo de finalização.
Região do campo.
Motivo da interrupção.
Tipo de passe.

Poderão usar códigos versionados no payload.

37. Enums de treinamento e medicina
TrainingPlanStatus
TrainingSessionStatus
TrainingAttendanceStatus
TrainingLoadLevel
MedicalCaseStatus
InjurySeverity
MedicalAssessmentStatus
TreatmentPlanStatus
RehabilitationStatus
MedicalRestrictionStatus
ReturnToPlayStatus
38. Enums de estrutura
FacilityStatus
FacilityOwnershipType
FacilityAccessType
InfrastructureProjectStatus
ProjectPhaseStatus
MaintenancePlanStatus
WorkOrderStatus
InspectionStatus
ComplianceCertificateStatus
FacilityIncidentStatus
BookingStatus
39. Enums de notificação e automação
NotificationStatus
NotificationPriority
NotificationUrgency
ActionableTaskStatus
ReminderStatus
NotificationDeliveryStatus
AutomationRuleStatus
AutomationLevel
AutomationExecutionStatus
AutomationFailurePolicy
DelegationStatus
40. Enums operacionais
AdminOperatorStatus
AdminSessionStatus
AdministrativeOperationStatus
AdministrativeCorrectionStatus
SupportTicketStatus
SupportAccessMode
OperationalIncidentStatus
OperationalIncidentSeverity
AdministrativeJobStatus
BackupStatus
RestoreStatus
DeploymentStatus
MigrationStatus
FeatureFlagStatus
41. Entidades da plataforma
Conta e identidade
UserAccount
UserProfile
UserCredential
UserSession
UserRefreshToken
UserDevice
UserSecurityFactor
UserRecoveryCode
UserSecurityEvent
UserAccountRestriction
Preferências
UserGlobalPreference
UserLocalePreference
UserAccessibilityPreference
UserPrivacyPreference
Relações com mundos
WorldParticipant
WorldInvitation
WorldMembershipRestriction
WorldObserverAccess
42. UserAccount

Representa a conta global.

Campos essenciais:

id
status
primaryEmailNormalized
emailVerifiedAt
authenticationVersion
lastLoginAt
anonymizedAt
createdAt
updatedAt
version
Regra fechada

O usuário global não será o controlador direto de um clube.

O controle ocorrerá por ClubControl.

43. WorldParticipant

Representa a participação da conta em um mundo.

Campos:

id
gameWorldId
userId
status
joinedAt
leftAt
observerState
restrictionState
version

Constraint:

unique(gameWorldId, userId)
44. Entidades do mundo
GameWorld
GameWorldConfiguration
GameWorldRuleSet
GameWorldRuleSetVersion
WorldClock
WorldClockCheckpoint
WorldPause
WorldProcessingLease
WorldScheduledTask
WorldSequenceCounter
WorldEconomicSnapshot
WorldPopulationSnapshot
45. GameWorld

Campos essenciais:

id
publicCode
name
status
operationalState
currentSeasonId
currentRuleSetVersionId
currentWorldTick
rhythmProfile
regionProfile
createdAt
startedAt
archivedAt
version
46. WorldClock

Existirá um relógio ativo por mundo.

Constraint parcial:

um único WorldClock ACTIVE por gameWorldId

Campos:

gameWorldId
status
currentWorldTick
lastProcessedWorldTick
nextProcessingWorldTick
leaseOwner
leaseExpiresAt
heartbeatAt
version
47. Entidades de temporada
Season
SeasonPhase
SeasonTransition
SeasonTransitionCheckpoint
SeasonSnapshot
ClubSeasonParticipation
ClubSeasonReview
ClubSeasonObjectiveResult

Constraint:

unique(gameWorldId, seasonNumber)
48. Geografia do mundo
WorldRegion
WorldSubregion
WorldCity
WorldVenueLocation
RegionalEconomicProfile
RegionalPlayerPopulation
RegionalSupporterMarket
Regra fechada

Geografia do mundo será própria do mundo e não dependerá diretamente de localidades reais externas.

49. Entidades de clube
Club
ClubIdentityPeriod
ClubStatusPeriod
ClubOriginProfile
ClubControl
ClubControlPeriod
ClubGovernance
ClubOwnership
ClubOwner
ClubBoard
ClubBoardMember
ClubBoardMandate
ClubAuthorityProfile
ClubAutonomyPeriod
ClubObjective
ClubObjectiveEvaluation
ClubPolicy
ClubStrategy
ClubReputationSnapshot
ClubOperationalSnapshot
50. Club

Representa a identidade esportiva permanente.

Campos:

id
gameWorldId
publicCode
status
originType
foundedAtWorldTick
currentIdentityPeriodId
currentControlId
currentGovernanceId
homeCityId
createdAt
version

Não armazenará diretamente:

Nome histórico completo.
Escudo histórico completo.
Estádio histórico completo.
Controlador histórico completo.

Esses dados estarão em períodos próprios.

51. ClubIdentityPeriod

Campos:

clubId
officialName
shortName
nickname
slug
primaryColor
secondaryColor
badgeFileId
startsAtWorldTick
endsAtWorldTick
changeReason
decisionId
status
version

Constraint:

não poderá existir sobreposição de períodos oficiais do mesmo clube
52. ClubControl

Representa o controle atual ou histórico do clube.

Campos:

clubId
worldParticipantId
status
controlType
startsAtWorldTick
endsAtWorldTick
competitiveControlStartsAtWorldTick
authorityProfileId
activationProcessId
version

Constraints:

um único controle ativo por clube
um único clube ativo por participante no mesmo mundo
53. Governança

Entidades:

ClubGovernance
ClubOwnership
ClubOwner
ClubBoard
ClubBoardMember
ClubBoardMandate
ClubAuthorityProfile
ClubAuthorityGrant
ClubAuthorityRestriction
BoardDecision
BoardApprovalRequest
54. Departamentos e responsabilidades
ClubDepartment
DepartmentCapability
DepartmentOperationalSnapshot
ClubPosition
ClubPositionAssignment
ClubResponsibility
ClubResponsibilityAssignment
ClubDelegationPolicy
ClubWorkQueue
ClubWorkItem
55. Entidade Person

Toda pessoa única do mundo será representada por:

Person

Uma pessoa poderá possuir:

Perfil de jogador.
Perfil de funcionário.
Perfil de proprietário.
Perfil de dirigente.
Perfil histórico.
Regra fechada

Um jogador aposentado que se torna funcionário continuará usando o mesmo Person.

56. Entidades de pessoa
Person
PersonNamePeriod
PersonNationalityPeriod
PersonLanguage
PersonPublicProfile
PersonPrivateProfile
PersonPersonalityProfile
PersonRelationship
PersonRelationshipEvent
PersonReputationSnapshot
PersonAvailabilityPeriod
PersonLifeEvent
57. Person

Campos essenciais:

id
gameWorldId
status
birthWorldDate
deathWorldDate
currentNamePeriodId
primaryNationalityId
publicProfileId
privateProfileId
createdAt
version
58. Nome da pessoa

O nome atual não será sobrescrito quando houver alteração.

PersonNamePeriod

Campos:

personId
fullName
commonName
shirtName
startsAtWorldTick
endsAtWorldTick
reason
59. Perfil de jogador
Player
PlayerAbilityProfile
PlayerHiddenProfile
PlayerPositionProficiency
PlayerRoleFamiliarity
PlayerFootPreference
PlayerCareerPeriod
PlayerDevelopmentSnapshot
PlayerPhysicalState
PlayerMentalState
PlayerAvailability
PlayerLeadershipProfile
PlayerPromise
PlayerCareerMilestone
60. Player

Campos principais:

id
gameWorldId
personId
careerStatus
primaryPositionCode
currentEmploymentClubId
currentSportingClubId
currentSquadId
professionalDebutAtWorldTick
retiredAtWorldTick
version

Constraint:

unique(gameWorldId, personId)
61. Clube empregador e clube esportivo

Serão campos diferentes.

Clube empregador

Clube com o contrato de trabalho principal.

Clube esportivo

Clube pelo qual o jogador está autorizado a atuar naquele período.

Exemplo de empréstimo:

currentEmploymentClubId = clube de origem
currentSportingClubId = clube de destino
62. Perfil interno de habilidades
PlayerAbilityProfile

Campos:

playerId
schemaVersion
technicalProfile Json
mentalProfile Json
physicalProfile Json
goalkeepingProfile Json
profileHash
effectiveFromWorldTick
effectiveUntilWorldTick
version
Regra fechada

O motor utilizará um snapshot validado e versionado, não dezenas de consultas individuais durante a partida.

63. Perfil oculto
PlayerHiddenProfile

Poderá conter:

Potencial.
Consistência.
Ambição.
Adaptabilidade.
Profissionalismo.
Tendência a lesão.
Reação à pressão.
Traços privados.

Acesso restrito:

Motor.
Processos autorizados.
Nunca diretamente ao usuário.
64. Conhecimento do clube sobre o jogador

O conhecimento não ficará no Player.

Entidades:

ClubPlayerKnowledge
ClubPlayerKnowledgeSource
ScoutingReport
MedicalKnowledge
ContractKnowledge
RelationshipKnowledge

Dessa forma:

O jogador possui estado real.
Cada clube possui seu conhecimento parcial.
Relatórios antigos não são atualizados retroativamente.
65. Estado físico e mental
PlayerPhysicalState
PlayerMentalState
PlayerFatigueSnapshot
PlayerMoraleSnapshot
PlayerConditionEvent

O estado atual poderá ser atualizado, enquanto snapshots preservam histórico.

66. Carreira esportiva
PlayerCareerPeriod

Representa passagem por clube.

Campos:

playerId
clubId
movementType
employmentContractId
loanAgreementId
startsAtWorldTick
endsAtWorldTick
status
exitReason
version
67. Elencos
Squad
SquadSeason
SquadMembership
SquadRoleAssignment
SquadLeadershipAssignment
SquadGroup
SquadGroupMembership
SquadAvailabilitySnapshot
68. SquadMembership

Representa presença operacional no elenco.

Não substitui:

Contrato.
Registro competitivo.
Empréstimo.
Relação de propriedade.

Campos:

squadId
playerId
status
role
startsAtWorldTick
endsAtWorldTick
shirtNumber
version
69. Contratos de jogadores
PlayerContract
PlayerContractTerm
PlayerContractSalaryPeriod
PlayerContractBonus
PlayerContractClause
PlayerContractOption
PlayerContractTrigger
PlayerContractPromise
PlayerContractAmendment
PlayerContractTermination
70. PlayerContract

Campos:

id
gameWorldId
playerId
clubId
status
contractType
signedAtWorldTick
startsAtWorldTick
endsAtWorldTick
baseCurrencyId
currentSalaryPeriodId
negotiationId
version
Constraint central

Um jogador não poderá possuir dois contratos principais de emprego incompatíveis e sobrepostos.

71. Termos contratuais

Termos que mudam ao longo do contrato serão períodos próprios:

PlayerContractSalaryPeriod

Campos:

contractId
amountMinor
paymentFrequency
startsAtWorldTick
endsAtWorldTick
reason
72. Bônus e cláusulas

Cada bônus será uma entidade:

PlayerContractBonus

Campos:

contractId
bonusTypeCode
amountMinor
triggerDefinition Json
maximumOccurrences
status

Cláusulas também possuirão:

Tipo.
Condição.
Vigência.
Beneficiário.
Valor.
Estado.
73. Negociação contratual
ContractNegotiation
ContractNegotiationParty
ContractProposal
ContractProposalTerm
ContractNegotiationMessage
ContractNegotiationDeadline
Regra fechada

A proposta aceita permanecerá registrada e ligada ao contrato resultante.

74. Registro competitivo
CompetitionRegistration
CompetitionRegistrationPlayer
CompetitionRegistrationChange
PlayerEligibilityDecision
PlayerRegistrationRestriction
ShirtNumberAssignment

Contrato e registro serão independentes.

Um jogador poderá:

Ter contrato.
Estar no elenco.
Não estar registrado em determinada competição.
Estar suspenso.
Estar inelegível por outra regra.
75. Funcionários
StaffMember
StaffCareerProfile
StaffCompetency
StaffSpecialty
StaffQualification
StaffLicense
StaffLanguage
StaffCareerPeriod
StaffContract
StaffContractTerm
StaffPositionAssignment
StaffResponsibilityAssignment
StaffWorkloadSnapshot
StaffPerformanceReview
StaffAbsence
StaffDevelopmentPlan
StaffSuccessionPlan
76. StaffMember

Campos:

personId
careerStatus
primaryFunctionCode
currentClubId
currentPositionAssignmentId
reputationProfile
availableFromWorldTick
version

Constraint:

unique(gameWorldId, personId)

Uma pessoa poderá possuir Player e StaffMember simultaneamente apenas em períodos regulamentarmente permitidos.

77. Competências de funcionários

Serão modeladas em linhas:

StaffCompetency

Campos:

staffMemberId
competencyCode
valueScaled
confidenceState
effectiveFromWorldTick
version

O catálogo de competências poderá crescer sem migration de colunas.

78. Posição e responsabilidade

Serão separadas.

Posição

Cargo institucional.

Responsabilidade

Ação ou domínio que a pessoa pode executar.

Um diretor pode possuir:

Posição de diretor esportivo.
Responsabilidade por negociações.
Responsabilidade por contratos.
Limite de aprovação.
79. Treinamento
TrainingPlan
TrainingCycle
TrainingSession
TrainingSessionGroup
TrainingSessionParticipant
TrainingSessionExercise
TrainingAttendance
TrainingLoad
PlayerTrainingAssignment
PlayerDevelopmentPlan
PlayerDevelopmentObservation
TrainingFacilityBooking
TrainingIncident
80. Sessão de treinamento

Campos:

clubId
squadId
status
sessionTypeCode
startsAtWorldTick
endsAtWorldTick
facilityId
leadStaffId
plannedLoad
actualLoad
weatherSnapshotId
version
81. Desenvolvimento

O desenvolvimento real será persistido em:

PlayerDevelopmentEvent
PlayerDevelopmentSnapshot

A recomendação técnica ficará em:

PlayerDevelopmentObservation
Regra fechada

Recomendação e alteração real de atributo serão registros diferentes.

82. Táticas
TacticalSystem
TacticalSystemVersion
TacticalFormation
TacticalRoleAssignment
TacticalInstruction
TacticalInstructionSet
TacticalPhasePlan
SetPiecePlan
SetPieceAssignment
OpponentPlan
MatchTacticalPlan
TacticalFamiliarity
83. Plano tático versionado

Alterar uma tática criará nova versão.

TacticalSystemVersion

Campos:

tacticalSystemId
versionNumber
formationCode
instructionPayload
rolePayload
createdAtWorldTick
createdByPersonId
status
84. Medicina
MedicalCase
MedicalAssessment
MedicalDiagnosis
MedicalExam
InjuryCase
InjuryEvent
TreatmentPlan
TreatmentSession
RehabilitationPlan
RehabilitationMilestone
MedicalRestriction
TrainingRestriction
MatchRestriction
ReturnToPlayProcess
MedicalClearance
MedicalCost
MedicalResponsibility
85. InjuryCase

Campos:

playerId
status
injuryTypeCode
severity
occurredAtWorldTick
estimatedRecoveryMinTick
estimatedRecoveryMaxTick
confirmedRecoveryTick
sourceMatchId
sourceTrainingSessionId
confidentialityLevel
version
86. Diagnóstico e estimativa

O diagnóstico real será separado de:

Estimativa inicial.
Comunicação pública.
Relatório para comissão.
Informação do usuário.
Conhecimento de outro clube.
87. Retorno ao jogo
ReturnToPlayProcess

Conterá:

Etapas.
Critérios.
Avaliações.
Restrições.
Autorizações.
Riscos.
Data real de liberação.
88. Competições
CompetitionDefinition
CompetitionDefinitionVersion
CompetitionEdition
CompetitionStage
CompetitionGroup
CompetitionRound
CompetitionParticipant
CompetitionRuleSet
CompetitionRuleSetVersion
CompetitionRuleValue
CompetitionPrizeRule
CompetitionQualificationRule
CompetitionRelegationRule
CompetitionRegistrationRule
CompetitionDisciplinaryRule
89. Definição e edição
CompetitionDefinition

Representa a competição permanente.

CompetitionEdition

Representa uma temporada específica.

Exemplo:

CompetitionDefinition:
Campeonato Nacional

CompetitionEdition:
Campeonato Nacional — temporada 18
90. Participantes
CompetitionParticipant

Campos:

competitionEditionId
clubId
status
entryReason
seedNumber
groupId
licenseState
joinedAtWorldTick
withdrawnAtWorldTick
version

Constraint:

unique(competitionEditionId, clubId)
91. Fases e grupos
CompetitionStage
CompetitionGroup
CompetitionRound
StageParticipant
GroupParticipant

O formato não será armazenado apenas em um JSON monolítico.

A estrutura executável terá entidades relacionais.

92. Calendário e jogos
Fixture
FixtureConstraint
FixtureVenueAssignment
FixtureScheduleChange
Match
MatchTeam
MatchOfficialResult
MatchHomologation
MatchReplayLink
MatchAdministrativeDecision
93. Fixture e Match
Fixture

Compromisso programado.

Match

Execução esportiva concreta.

Um fixture poderá:

Ser adiado.
Ser cancelado.
Gerar uma partida.
Gerar uma repetição.
Ser decidido administrativamente.
94. Partida
Match
MatchTeam
MatchLineup
MatchLineupSlot
MatchBenchEntry
MatchTacticalPlan
MatchRuntime
MatchCommand
MatchEvent
MatchCheckpoint
MatchTeamStatistic
MatchPlayerStatistic
MatchOfficialResult
MatchConsequence
MatchReview
95. MatchTeam

Campos:

matchId
clubId
side
scoreOfficial
scoreOnField
lineupId
tacticalPlanId
version

Constraints:

unique(matchId, clubId)
unique(matchId, side)
96. Escalação
MatchLineup
MatchLineupSlot

A escalação preservará:

Titulares.
Reservas.
Funções.
Capitão.
Formação.
Indisponibilidades conhecidas.
Versão submetida.
Responsável.
97. Runtime da partida
MatchRuntime
MatchRuntimeLease
MatchRuntimeSnapshot

Separado de:

Registro oficial da partida.
Estatísticas finais.
Homologação.
98. Eventos da partida
MatchEvent

Campos:

matchId
sequence
simulationTime
kind
clubId
playerId
secondaryPlayerId
payload
engineVersion
status
createdAt

Constraint:

unique(matchId, sequence)
99. Commands da partida
MatchCommand

Campos:

commandId
matchId
clubId
origin
type
status
expectedMatchVersion
submittedAtReal
receivedAtReal
effectiveSimulationTime
payload
resultPayload
version

Constraint:

unique(commandId)
100. Estatísticas da partida

Serão separadas em:

MatchPlayerStatistic
MatchTeamStatistic
MatchStatisticCorrection

Cada registro terá:

Versão do modelo.
Estado provisório ou oficial.
Fonte.
Correção anterior.
101. Classificações
CompetitionStanding
CompetitionStandingEntry
CompetitionStandingSnapshot
CompetitionStandingAdjustment
CompetitionTiebreakResult
Regra fechada

Punições não serão incorporadas silenciosamente ao número de pontos.

Existirá CompetitionStandingAdjustment.

102. Homologação
CompetitionHomologation
CompetitionFinalStanding
CompetitiveMovement
CompetitiveAppeal
CompetitionAdministrativeDecision
103. Mercado e observação
ScoutingMission
ScoutingAssignment
ScoutingObservation
ScoutingReport
ScoutingReportEstimate
ScoutingReportEvidence
ScoutingRecommendation
ClubPlayerKnowledge
ClubPlayerKnowledgeSnapshot
Watchlist
WatchlistEntry
RecruitmentNeed
RecruitmentCandidate
RecruitmentShortlist
MarketAvailability
PlayerMarketInterest
AgentRelationship
104. Relatório de observação
ScoutingReport

Campos:

clubId
playerId
scoutId
missionId
status
confidence
observedFromWorldTick
observedUntilWorldTick
overallEstimate
potentialEstimate
attributeEstimates Json
recommendation
expiresAtWorldTick
version
105. Conhecimento consolidado

ClubPlayerKnowledge não sobrescreverá relatórios.

Ele será uma projeção consolidada derivada de:

Relatórios.
Partidas observadas.
Relações.
Informação pública.
Negociações.
Histórico.
106. Transferências
TransferCase
TransferCaseParty
TransferInquiry
TransferOffer
TransferOfferVersion
TransferOfferTerm
TransferCounterOffer
TransferAgreement
TransferAgreementTerm
TransferPaymentSchedule
TransferInstallment
TransferBonus
TransferSellOnClause
TransferBuyBackClause
TransferMatchingRight
TransferMedicalProcess
TransferRegistrationProcess
TransferCompletion
TransferCancellation
107. TransferCase

Representa o processo inteiro.

Campos:

playerId
buyingClubId
sellingClubId
status
transferType
openedAtWorldTick
currentOfferId
agreementId
deadlineAtWorldTick
version
108. Versões da proposta

Uma contraproposta não sobrescreverá a anterior.

TransferOfferVersion

Campos:

transferOfferId
versionNumber
proposedByClubId
fixedAmountMinor
termsPayload
submittedAtWorldTick
expiresAtWorldTick
status
109. Empréstimos
PlayerLoanAgreement
PlayerLoanSalaryShare
PlayerLoanUsagePromise
PlayerLoanPurchaseClause
PlayerLoanRecallClause
PlayerLoanRestriction
PlayerLoanReturn

O empréstimo estará ligado a:

Contrato de origem.
Clube de origem.
Clube de destino.
Período.
Registro.
Responsabilidade médica.
Salário.
Opções.
110. Finanças

O sistema utilizará razão de partidas dobradas.

Entidades:

FinancialAccount
FinancialAccountGroup
FinancialJournalEntry
FinancialJournalLine
FinancialTransactionReference
FinancialAccountBalanceSnapshot
FinancialPeriod
FinancialPeriodClose
Budget
BudgetScenario
BudgetLine
BudgetAllocation
FinancialReservation
Receivable
ReceivableInstallment
Payable
PayableInstallment
Payment
PaymentAllocation
ClubDebt
DebtInstallment
CreditFacility
FinancialForecast
FinancialRiskAssessment
111. Conta financeira
FinancialAccount

Campos:

clubId
accountCode
accountType
normalSide
currencyId
status
parentAccountId
version

Exemplos:

Caixa.
Banco.
Contas a receber.
Contas a pagar.
Receita de bilheteria.
Despesa salarial.
Dívida.
Patrimônio.
112. Lançamento contábil
FinancialJournalEntry

Representa uma transação lógica.

FinancialJournalLine

Representa débitos e créditos.

Constraint obrigatória:

soma dos débitos = soma dos créditos
por journalEntry e moeda
113. Estrutura da linha
journalEntryId
lineNumber
financialAccountId
direction
amountMinor
currencyId
clubId
costCenterCode
referenceType
referenceId

Constraint:

amountMinor > 0
114. Saldos

O saldo oficial será calculado a partir do razão.

FinancialAccountBalanceSnapshot será:

Cache persistido.
Recalculável.
Versionado.
Conciliado.
Regra fechada

Não haverá um campo de saldo editável como fonte isolada.

115. Orçamento
Budget
BudgetScenario
BudgetLine
BudgetAllocation
BudgetRevision

Orçamento representa autorização e planejamento.

Não representa disponibilidade imediata de caixa.

116. Reserva financeira
FinancialReservation

Campos:

clubId
budgetLineId
purposeType
purposeId
amountMinor
status
expiresAtWorldTick
consumedAmountMinor
releasedAmountMinor
version

Constraint:

consumido + liberado <= valor reservado
117. Recebíveis e pagáveis
Receivable
ReceivableInstallment
Payable
PayableInstallment

Cada parcela possuirá:

Valor.
Vencimento.
Estado.
Pagamento.
Origem.
Correções.
118. Pagamentos
Payment
PaymentAllocation

Um pagamento poderá liquidar:

Uma parcela.
Várias parcelas.
Parte de uma parcela.
119. Infraestrutura
FacilitySite
Facility
FacilityModule
FacilityCapability
FacilityCapabilitySnapshot
FacilityEquipment
Pitch
Stadium
StadiumSector
FacilityAccessAgreement
FacilityBooking
InfrastructureProject
InfrastructureProjectPhase
InfrastructureProjectMilestone
InfrastructureProjectDependency
InfrastructureProjectEstimate
Contractor
ConstructionAgreement
ConstructionChangeOrder
MaintenancePlan
MaintenanceWorkOrder
FacilityInspection
ComplianceCertificate
FacilityIncident
TemporaryFacilityPlan
120. Instalação e módulo
Facility

Ativo físico principal.

FacilityModule

Parte funcional.

Exemplo:

Facility:
Centro de treinamento

FacilityModule:
Campo principal
Academia
Sala médica
Sala de análise
121. Capacidade estrutural

Capacidades serão armazenadas em:

FacilityCapability
FacilityCapabilitySnapshot

Não como um único “nível do centro”.

122. Projetos

InfrastructureProject terá:

Escopo.
Etapas.
Orçamento.
Contratos.
Marcos.
Dependências.
Riscos.
Estado.
Impacto operacional.
123. Comercial
CommercialAsset
CommercialAssetInventory
Sponsor
SponsorContact
SponsorshipOpportunity
SponsorshipProposal
SponsorshipAgreement
SponsorshipRight
SponsorshipObligation
SponsorshipActivation
SponsorshipDelivery
CommercialCampaign
MerchandiseProduct
MerchandiseInventory
MerchandiseSale
TicketProduct
TicketPricePolicy
MatchTicketAllocation
HospitalityProduct
NamingRightsAgreement
SupplierAgreement
124. Direitos comerciais

Os ativos comercializáveis serão explícitos:

Frente do uniforme.
Manga.
Placa.
Naming rights.
Camarote.
Conteúdo.
Treino.
Base.
Digital.

Constraint:

o mesmo ativo não poderá possuir dois direitos exclusivos sobrepostos
125. Torcida
SupporterPopulation
SupporterSegment
SupporterSegmentSnapshot
SupporterSentimentSnapshot
SupporterExpectation
SupporterMemory
SupporterGroup
SupporterGroupRelationship
SupporterCampaign
SupporterProtest
SupporterMembershipProgram
SupporterMembership
AttendanceDemandSnapshot
126. Comunicação e mídia
MediaOutlet
MediaPerson
MediaPublication
MediaPublicationCorrection
MediaNarrative
MediaNarrativeEntity
PressConference
PressQuestion
PressResponse
ClubCommunication
ClubCommunicationApproval
PublicPromise
PublicStatement
Rumor
RumorSource
RumorResolution
SocialConversation
SocialMessage
SocialChannel
127. Promessas
PlayerPromise
StaffPromise
BoardPromise
PublicPromise

Poderão compartilhar um agregado conceitual, mas terão relações explícitas para o domínio responsável.

Regra fechada

Não será criada uma tabela genérica de promessa que elimine todas as relações tipadas sem necessidade.

128. História
HistoricalEvent
HistoricalEventSubject
HistoricalTimeline
SeasonHistoryBook
HistoricalHonor
HistoricalStatistic
HistoricalStatisticCorrection
RecordDefinition
RecordOccurrence
RecordHolder
HistoricalEra
HistoricalRivalry
HistoricalCorrection
ClubHistoricalIdentityPeriod
PlayerCareerMilestone
StaffCareerMilestone
HistoricMatchClassification
129. Evento histórico

HistoricalEvent poderá usar referências polimórficas controladas porque:

É uma projeção transversal.
Não determina integridade do domínio original.
A entidade original continua sendo fonte de verdade.

Campos:

subjectType
subjectId
130. Recordes
RecordDefinition
RecordOccurrence
RecordHolder

A definição será separada da ocorrência.

Dessa maneira, uma regra de recorde pode existir antes de alguém atingi-la.

131. Notificações
Notification
NotificationThread
NotificationThreadEntry
ActionableTask
TaskDependency
TaskAssignment
Reminder
NotificationPreferenceProfile
NotificationCategoryPreference
NotificationChannelPreference
NotificationDelivery
NotificationDigest
ReturnExperience
132. Notificação e tarefa

A relação será:

ActionableTask
    1
    ↓
Notification
    N

Uma tarefa pode gerar vários alertas sem duplicar a obrigação.

133. Automações
AutomationRule
AutomationRuleVersion
AutomationTrigger
AutomationCondition
AutomationAction
AutomationLimit
AutomationExecution
AutomationExecutionAction
AutomationApproval
AutomationConflict
AutomationSimulation
TaskDelegation
DelegationAuthority
134. Versão da automação

A execução sempre referenciará:

automationRuleVersionId

Alterar a regra não muda retroativamente o motivo de uma execução anterior.

135. Entrada de usuários
WorldEntryProcess
WorldEntryEligibilityCheck
WorldEntryQueue
WorldEntryQueueItem
WorldEntryClubOffer
ClubEntryReservation
ClubTakeoverReview
ClubExpansionProject
ClubExpansionStudy
ExpansionClubConfiguration
InitialSquadGeneration
InitialSquadPlayerAllocation
ClubEntryBenefit
ClubOnboardingProgress
ClubOnboardingStep
ClubInitialReview
136. Administração e operações
AdminOperator
AdminRole
AdminPermission
AdminRolePermission
AdminOperatorRole
AdminTemporaryAccess
AdminSession
AdminConflictDeclaration
BreakGlassAccess
AdministrativeOperation
AdministrativeApproval
AdministrativeCorrection
OperationalIncident
IncidentTimelineEvent
IncidentCorrectiveAction
AdministrativeJob
Backup
RestoreOperation
MaintenanceWindow
Deployment
DatabaseMigration
FeatureFlag
SupportTicket
SupportTicketMessage
SupportAccessSession
AuditEvent
137. Eventing
DomainEvent
OutboxEvent
InboxEvent
ScheduledTask
ScheduledTaskAttempt
ProcessManager
ProcessManagerStep
Lease
ProjectionState
ProjectionRebuild
DeadLetterMessage
IdempotencyRecord
CommandExecution
138. CommandExecution

Persistirá o resultado de commands idempotentes.

Campos:

commandId
idempotencyKey
actorId
gameWorldId
commandType
status
aggregateId
resultPayload
errorCode
createdAt
completedAt

Constraints:

unique(commandId)
unique(actorId, idempotencyKey)
139. DomainEvent

Campos:

eventId
gameWorldId
aggregateType
aggregateId
aggregateVersion
worldSequence
eventType
schemaVersion
correlationId
causationId
actorType
actorId
payload
occurredAtReal
occurredAtWorldTick

Constraints:

unique(gameWorldId, eventId)
unique(gameWorldId, aggregateType, aggregateId, aggregateVersion)
unique(gameWorldId, worldSequence)
140. Outbox e inbox
Outbox

Garante publicação posterior.

Inbox

Garante consumo idempotente.

Constraints:

unique(eventId)
unique(consumerName, eventId)
141. Relações explícitas versus referências genéricas
Relações explícitas obrigatórias
Jogador e contrato.
Jogador e clube.
Partida e clubes.
Inscrição e competição.
Lançamento e conta.
Projeto e instalação.
Transferência e jogador.
Tarefa e responsável.
Referências genéricas permitidas
Auditoria.
Notificação.
Histórico.
Arquivo.
Telemetria.
Event log.
Comentários administrativos.
Regra fechada

Referências genéricas nunca serão utilizadas para substituir relações que determinam propriedade, dinheiro, elegibilidade ou resultado.

142. Política de deleção

As relações utilizarão preferencialmente:

Restrict
NoAction
SetNull controlado
Cascade somente para filhos descartáveis
143. Restrict

Aplicável a:

Clube com contratos.
Jogador com carreira.
Partida com eventos.
Conta com lançamentos.
Competição com edições.
Contrato com pagamentos.
Usuário com controle histórico.
144. SetNull

Permitido quando:

A relação é realmente opcional.
A perda da referência não destrói o significado.
A entidade principal continua compreensível.

Exemplos:

Avatar atual removido.
Funcionário sugerido que saiu.
Arquivo temporário.
Responsável secundário.
145. Cascade

Permitido apenas para filhos sem valor histórico independente.

Exemplos:

Parâmetros de um rascunho ainda não ativado.
Linhas temporárias de uma simulação não persistida.
Preferências internas de um perfil excluível.
Tokens de uma sessão revogada.
146. Exclusão de entidades históricas

Não serão fisicamente excluídos por operação comum:

Clubes.
Pessoas.
Jogadores.
Funcionários.
Partidas.
Contratos oficiais.
Transferências concluídas.
Lançamentos financeiros.
Títulos.
Competições.
Eventos oficiais.
Auditoria.

Utilizarão:

Status.
Encerramento.
Anonimização.
Arquivamento.
Nova versão.
147. Soft delete

deletedAt será utilizado somente quando houver processo real de recuperação ou retenção.

Não será adicionado automaticamente em todos os models.

148. Estado atual e histórico

Quando o histórico for importante, serão usados períodos.

Exemplo:

ClubIdentityPeriod
PlayerContractSalaryPeriod
PersonNamePeriod
ClubAutonomyPeriod
FacilityCapacitySnapshot
Regra fechada

Campos históricos importantes não serão sobrescritos no registro principal.

149. Snapshots

Snapshots serão imutáveis.

Campos padrão:

snapshotId
gameWorldId
subjectType
subjectId
schemaVersion
stateHash
payload
capturedAtWorldTick
capturedAtReal
sourceVersion
150. Hash de snapshot

Servirá para:

Verificação.
Deduplicação.
Determinismo.
Comparação.
Auditoria.
Motor de partidas.
151. Constraints estruturais obrigatórias

O banco deverá proteger pelo menos:

Um usuário por e-mail normalizado.
Uma participação por usuário e mundo.
Um controle ativo por clube.
Um clube ativo por participante dentro do mundo.
Uma identidade oficial ativa por clube.
Uma temporada por número dentro do mundo.
Um relógio oficial ativo por mundo.
Uma pessoa por perfil de jogador.
Uma pessoa por perfil de funcionário.
Um contrato principal incompatível ativo por jogador.
Uma inscrição por jogador, clube e edição.
Um participante por clube e edição.
Um lado por clube em cada partida.
Dois lados distintos por partida.
Uma sequência por evento da partida.
Uma sequência por evento do mundo.
Uma versão por agregado.
Um processamento por commandId.
Um consumo por consumidor e evento.
Um lançamento por identificador idempotente.
Uma parcela liquidada somente até seu valor.
Uma reserva consumida somente até seu valor.
Débitos iguais a créditos.
Quantias financeiras positivas nas linhas.
Percentuais dentro da escala.
Datas finais maiores ou iguais às iniciais.
Um direito comercial exclusivo por período e ativo.
Uma reserva de clube ativa por vaga.
Um lease válido por recurso.
Um runtime ativo por partida.
152. Constraints condicionais

Serão implementadas com:

Índices únicos parciais.
CHECK.
EXCLUDE.
Triggers restritos.
Tabelas de estado atual.

Exemplo:

CREATE UNIQUE INDEX uq_active_club_control
ON game.club_control (game_world_id, club_id)
WHERE status = 'ACTIVE';

O PostgreSQL permite utilizar índice único parcial para impor unicidade somente ao subconjunto de linhas correspondente à condição.

153. Períodos sobrepostos

Para relações temporais críticas, poderá ser utilizado:

EXCLUDE USING gist

Com intervalos.

Exemplos:

Controle de clube.
Contrato principal.
Identidade do clube.
Direito comercial exclusivo.
Reserva de instalação.
Cargo exclusivo.
154. Estratégia para exclusão temporal

Nem todo período usará EXCLUDE.

Será utilizada quando:

A sobreposição for estruturalmente inválida.
O volume permitir.
A tabela não sofrer particionamento incompatível.
A regra puder ser expressa objetivamente.

Nos demais casos:

Lock do agregado.
Consulta na mesma transação.
Constraint parcial.
Testes de concorrência.
155. Constraints financeiras

A igualdade do lançamento será validada:

Na aplicação.
Na transação.
Por função ou trigger de validação antes da confirmação.

O lançamento poderá passar por:

DRAFT
POSTING
POSTED
REVERSED

Somente POSTED afeta saldo oficial.

156. Reversão financeira

Um lançamento publicado não será editado.

A reversão criará:

FinancialJournalEntry

com:

reversalOfJournalEntryId
157. Normalização de texto

Campos pesquisáveis poderão possuir:

normalizedName
normalizedEmail
searchText

A normalização será feita de forma consistente na aplicação.

158. Unicidade de nomes

Nomes de clube poderão ter regras por mundo e período.

Não será aplicado simplesmente:

unique(name)

A validação poderá considerar:

Mundo.
Nome normalizado.
Estado.
Período.
Identidade histórica.
Similaridade proibida.
159. Índices básicos

Todo foreign key frequentemente consultado deverá possuir índice adequado.

Padrões:

(gameWorldId, id)
(gameWorldId, status)
(gameWorldId, clubId)
(gameWorldId, playerId)
(gameWorldId, seasonId)
(gameWorldId, deadlineWorldTick)
160. Índices de estado e prazo

Exemplos:

(gameWorldId, status, deadlineWorldTick)
(gameWorldId, status, createdAt)
(clubId, status, endsAtWorldTick)
(playerId, status, startsAtWorldTick)
161. Índices de partida
(matchId, sequence)
(gameWorldId, status, scheduledWorldTick)
(gameWorldId, competitionEditionId, scheduledWorldTick)
(playerId, matchId)
(clubId, matchId)
162. Índices financeiros
(clubId, status, dueAtWorldTick)
(financialAccountId, postedAtWorldTick)
(journalEntryId, lineNumber)
(referenceType, referenceId)
(gameWorldId, idempotencyKey)
163. Índices de mercado
(gameWorldId, playerId, status)
(gameWorldId, buyingClubId, status)
(gameWorldId, sellingClubId, status)
(gameWorldId, expiresAtWorldTick)
164. Índices de notificação
(recipientUserId, status, priority, createdAt)
(recipientUserId, taskId)
(threadId, createdAt)
(status, scheduledAt)
165. Índices de busca

Inicialmente:

B-tree.
GIN para busca textual.
Trigram para nomes.
GIN controlado para JSON consultado.
BRIN para séries temporais grandes quando adequado.
166. Índices não serão criados por intuição

Cada índice deverá possuir:

Consulta justificadora.
Plano analisado.
Impacto de escrita.
Tamanho.
Responsável.
Revisão.
167. Índices redundantes

O pipeline deverá detectar ou revisar:

Índice coberto por outro.
Índice nunca utilizado.
Índice muito grande.
Índice que duplica unique constraint.
Índice inválido.
168. Particionamento inicial

Na primeira versão, as tabelas transacionais comuns não serão particionadas prematuramente.

Candidatas para particionamento futuro:

DomainEvent
MatchEvent
AuditEvent
NotificationDelivery
HistoricalStatistic
OperationalLogReference
169. Unidade principal de particionamento

A principal chave será:

gameWorldId

Possíveis estratégias:

HASH por gameWorldId
RANGE por temporada
RANGE por data real
particionamento em dois níveis
170. Estratégia recomendada por tabela
DomainEvent
HASH(gameWorldId)
MatchEvent
HASH(gameWorldId)
ou
RANGE(seasonId) dentro de mundo
AuditEvent
RANGE(occurredAtReal)
NotificationDelivery
RANGE(createdAt)
171. Constraints em tabelas particionadas

Antes de particionar, será verificado se:

Primary key inclui a chave de partição.
Unique constraints incluem a chave de partição.
Foreign keys continuam viáveis.
Rebuilds conhecem todas as partições.

O PostgreSQL impõe limitações a constraints únicas e de exclusão em tabelas particionadas; as colunas da chave de partição precisam participar dessas constraints para que a unicidade seja garantida entre partições.

172. Particionamento não será usado como arquivamento automático

Mover dados antigos exigirá política própria.

Partição antiga poderá ser:

Mantida ativa.
Comprimida externamente.
Destacada.
Exportada para R2.
Restaurada quando necessário.
173. Views

Serão utilizadas para:

Saldos.
Classificações.
Contratos atuais.
Elenco atual.
Controle atual.
Próximos prazos.
Resumos operacionais.
174. Materialized views

Serão utilizadas quando:

A consulta for cara.
Pequeno atraso for aceitável.
Rebuild puder ser controlado.
O resultado não for fonte de verdade.

Exemplos:

Ranking histórico.
Tabela histórica acumulada.
Resumo financeiro sazonal.
Estatísticas de carreira.
Tendências de mercado.
175. Read models persistidos

Algumas consultas críticas utilizarão tabelas de projeção em vez de materialized view.

Exemplos:

ClubDashboardProjection
UserActionCenterProjection
CompetitionStandingProjection
PlayerPublicProfileProjection
TransferMarketProjection
ReturnSummaryProjection
176. Reconstrução de projeção

Toda projeção deverá possuir:

projectionVersion
lastProcessedEventId
lastProcessedSequence
rebuildStatus
177. Prisma e views

Views e materialized views serão definidas em SQL.

Quando necessário, o acesso ocorrerá por:

Model de leitura mapeado.
SQL tipado.
Repositório específico.
DTO de query.
178. Transações e aggregates

Cada command deverá definir seu agregado principal.

Exemplos:

Renovar contrato:
PlayerContract

Aceitar proposta:
TransferCase

Enviar escalação:
MatchLineup

Pagar parcela:
Payment

Alterar tática:
TacticalSystem
179. Ordem de locks

Para evitar deadlocks, será definida ordem padrão:

GameWorld
Club
Person/Player
Contract
TransferCase
FinancialReservation
FinancialAccount
Competition
Match

A ordem exata poderá variar por domínio, mas deverá ser documentada e estável.

180. Locks de transferência

Uma conclusão de transferência poderá bloquear:

TransferCase.
Jogador.
Clube vendedor.
Clube comprador.
Contrato.
Reservas financeiras.
Registros.
181. Locks financeiros

Pagamentos deverão bloquear:

Parcela.
Reserva.
Contas afetadas.
Journal entry.

Nunca serão processados apenas com leitura anterior e atualização posterior sem proteção.

182. Idempotência no banco

Tabelas críticas terão chaves únicas como:

externalReference
commandId
idempotencyKey
sourceEventId
paymentReference
generationSeed + subject
183. Seeds de geração

Gerações de:

Jogadores.
Calendários.
Sorteios.
Elencos de expansão.
Partidas.
História prévia.

Terão registros próprios:

GenerationProcess
GenerationItem

Constraint:

unique(gameWorldId, generationType, subjectId, generationVersion)
184. Estado e transição

O banco armazenará o estado atual.

A aplicação validará:

estado atual
+
command
+
regra
=
novo estado permitido
Regra fechada

Não será permitido update genérico de status sem caso de uso.

185. Histórico de transição

Para processos importantes existirão:

status
statusChangedAt
statusReason
statusHistory

O histórico poderá ser derivado dos eventos ou persistido em tabela própria.

186. Constraints de estado

CHECK poderá impedir combinações impossíveis.

Exemplo:

COMPLETED exige completedAt
CANCELLED exige cancelledAt
ACTIVE não pode possuir endedAt
PAID exige paidAt
187. Campos derivados

Campos derivados serão classificados como:

RECALCULABLE
CACHED
AUTHORITATIVE

Exemplo:

age

Recalculável.

currentBalance

Cache conciliado.

contractStatus

Autoritativo.

188. Dados duplicados intencionalmente

Somente serão duplicados para:

Performance.
Histórico imutável.
Snapshot.
Leitura.
Integração.

A duplicação deverá possuir:

Fonte.
Processo de atualização.
Processo de reconciliação.
Política de rebuild.
189. Relações atuais armazenadas no agregado

Campos como:

currentControlId
currentIdentityPeriodId
currentEmploymentClubId
currentSportingClubId

poderão existir como ponteiros de performance.

A história continuará nas tabelas de períodos.

190. Reconciliação de ponteiros atuais

Jobs verificarão:

Ponteiro atual corresponde ao período ativo.
Não existem dois períodos ativos.
Campo atual e relação histórica concordam.
Projeções concordam com a fonte.
191. Privacidade e classificação

Models sensíveis deverão possuir:

visibility
confidentialityLevel
dataClassification

Quando aplicável.

Exemplos:

Diagnóstico médico.
Relatório de observação.
Contrato confidencial.
Mensagem privada.
Evidência de moderação.
192. Criptografia em nível de aplicação

Campos altamente sensíveis poderão ser criptografados antes da persistência.

A busca nesses campos será limitada.

193. Normalização de e-mail

Serão armazenados:

emailOriginal
emailNormalized

A unicidade será aplicada ao normalizado.

194. Mensagens privadas
SocialConversation
SocialConversationParticipant
SocialMessage
SocialMessageDelivery
SocialMessageModerationState

Não serão misturadas com:

Notificações.
Comunicação oficial.
Eventos históricos.
Logs.
195. Arquivos
FileObject
FileUploadSession
FileValidation
FileAccessGrant
FileVersion
FileRetentionPolicy

O banco manterá metadados.

O R2 manterá os bytes.

196. Mapeamento de arquivos

Entidades poderão possuir relação explícita quando o arquivo tiver função estrutural:

ClubIdentityPeriod.badgeFileId
UserProfile.avatarFileId
MediaPublication.coverFileId

Anexos genéricos poderão usar:

FileAttachment
197. Auditoria

AuditEvent não terá cascade delete.

Campos:

actorType
actorId
sessionId
action
targetType
targetId
gameWorldId
reason
beforeReference
afterReference
result
integrityHash
occurredAt
198. Integridade do audit log

Eventos de auditoria poderão utilizar cadeia de hash por partição operacional.

Objetivo:

Detectar alterações indevidas.
Verificar sequência.
Preservar evidências.
199. Modelo Prisma-base
model Club {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @map("game_world_id") @db.Uuid
  publicCode  String @map("public_code") @db.VarChar(24)
  status      ClubStatus
  version     Int    @default(1)

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  gameWorld GameWorld @relation(
    fields: [gameWorldId],
    references: [id],
    onDelete: Restrict
  )

  identityPeriods ClubIdentityPeriod[]
  controls        ClubControl[]
  playerContracts PlayerContract[]

  @@unique([gameWorldId, id])
  @@unique([gameWorldId, publicCode])
  @@index([gameWorldId, status])
  @@map("club")
  @@schema("game")
}
200. Relação composta de mundo
model PlayerContract {
  id          String @id @default(uuid(7)) @db.Uuid
  gameWorldId String @map("game_world_id") @db.Uuid
  playerId    String @map("player_id") @db.Uuid
  clubId      String @map("club_id") @db.Uuid

  status PlayerContractStatus
  version Int @default(1)

  player Player @relation(
    fields: [gameWorldId, playerId],
    references: [gameWorldId, id],
    onDelete: Restrict
  )

  club Club @relation(
    fields: [gameWorldId, clubId],
    references: [gameWorldId, id],
    onDelete: Restrict
  )

  @@unique([gameWorldId, id])
  @@index([gameWorldId, playerId, status])
  @@index([gameWorldId, clubId, status])
  @@map("player_contract")
  @@schema("game")
}
201. Model financeiro-base
model FinancialJournalLine {
  id                String @id @default(uuid(7)) @db.Uuid
  gameWorldId       String @map("game_world_id") @db.Uuid
  journalEntryId    String @map("journal_entry_id") @db.Uuid
  financialAccountId String @map("financial_account_id") @db.Uuid

  lineNumber Int    @map("line_number")
  direction  JournalLineDirection
  amountMinor BigInt @map("amount_minor")
  currencyId String @map("currency_id") @db.Uuid

  @@unique([journalEntryId, lineNumber])
  @@index([gameWorldId, financialAccountId])
  @@map("financial_journal_line")
  @@schema("finance")
}
202. Model de evento-base
model OutboxEvent {
  id          String @id @default(uuid(7)) @db.Uuid
  eventId     String @unique @map("event_id") @db.Uuid
  gameWorldId String? @map("game_world_id") @db.Uuid

  topic         String @db.VarChar(120)
  routingKey    String @map("routing_key") @db.VarChar(160)
  schemaVersion Int    @map("schema_version")
  payload       Json

  status        OutboxStatus
  attemptCount  Int       @default(0) @map("attempt_count")
  nextAttemptAt DateTime? @map("next_attempt_at") @db.Timestamptz(6)
  publishedAt   DateTime? @map("published_at") @db.Timestamptz(6)
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  @@index([status, nextAttemptAt])
  @@index([gameWorldId, createdAt])
  @@map("outbox_event")
  @@schema("eventing")
}
203. Migrações SQL complementares

Cada migration poderá conter:

migration.sql
verification.sql
rollback-plan.md
migration-metadata.json
204. Recursos definidos por SQL

Serão incluídos, quando necessários:

CHECK constraints
EXCLUDE constraints
partial unique indexes
expression indexes
INCLUDE indexes
materialized views
partitioned tables
database functions
triggers
generated columns
extensions
205. Política para recursos preview

A primeira versão não dependerá de recurso preview do Prisma para integridade crítica.

Quando o Prisma passar a representar oficialmente uma estrutura já existente:

Não haverá migração automática destrutiva.
A estrutura será comparada.
O schema será atualizado de forma compatível.
O SQL existente continuará documentado.
206. Migração de desenvolvimento

Fluxo:

Alterar schema
    ↓
Criar migration sem aplicar
    ↓
Revisar SQL gerado
    ↓
Adicionar SQL nativo necessário
    ↓
Executar em banco limpo
    ↓
Executar sobre snapshot anterior
    ↓
Executar testes
    ↓
Revisar plano
    ↓
Aplicar
207. db push

Não será utilizado em produção.

Poderá ser utilizado apenas em:

Protótipos descartáveis.
Testes locais temporários.
Ambientes sem histórico relevante.
208. Shadow database

Será utilizada no processo de desenvolvimento e validação das migrations.

Não utilizará dados de produção.

209. Migrações destrutivas

Seguirão:

EXPAND
BACKFILL
DUAL WRITE
VALIDATE
SWITCH READ
STOP OLD WRITE
CONTRACT
210. Backfill

Todo backfill relevante possuirá:

Job próprio.
Checkpoint.
Lotes.
Limite de carga.
Métricas.
Retry.
Validação.
Possibilidade de pausa.
211. Nova coluna obrigatória

Não será adicionada imediatamente como NOT NULL em tabela grande sem estratégia.

Fluxo:

Criar coluna opcional.
Atualizar aplicação para preencher.
Preencher registros antigos.
Verificar ausências.
Aplicar NOT NULL.
Remover compatibilidade antiga.
212. Renomeação de coluna

Poderá utilizar período de compatibilidade em vez de renomeação imediata, especialmente quando:

Existem várias versões do backend.
Há workers antigos.
Há jobs longos.
O rollback precisa funcionar.
213. Alteração de enum

Uma alteração de enum estável exigirá:

Migration.
Compatibilidade da aplicação.
Conversão de dados.
Atualização de consumers.
Teste de rollback.
Regra fechada

Valores antigos não serão renomeados casualmente.

214. Remoção de valor de enum

Será evitada.

Preferências:

Manter valor legado.
Marcar como não utilizável.
Migrar registros.
Remover somente depois de validação completa.
215. Seeds

Existirão três categorias.

Seed estrutural

Necessário para a aplicação iniciar:

Catálogos.
Códigos.
Tipos.
Regras padrão.
Moedas.
Idiomas.
Seed de desenvolvimento
Usuários.
Mundos.
Clubes.
Jogadores.
Competições.
Seed de testes
Cenários determinísticos.
Seeds fixas.
Casos extremos.
216. Seed estrutural idempotente

Utilizará códigos estáveis.

Exemplo:

POSITION.GOALKEEPER
STAFF_ROLE.HEAD_COACH
FACILITY_CAPABILITY.MEDICAL_DIAGNOSTICS
217. Dados de catálogo

Não dependerão de IDs fixos escritos manualmente no código.

O código utilizará:

code

O banco resolverá o UUID correspondente.

218. Versionamento de catálogos

Quando um catálogo afetar regras históricas:

CatalogEntryVersion

Exemplo:

Nome de função alterado.
Definição de métrica alterada.
Capacidade renomeada.
Tipo de prêmio modificado.
219. Testes do schema

Serão obrigatórios:

Criação de banco vazio.
Aplicação de todas as migrations.
Aplicação sobre versão anterior.
Rollback de aplicação.
Constraints.
Unicidade.
Foreign keys.
Concorrência.
Performance.
Seed.
Rebuild de projeções.
220. Testes de relações entre mundos

Cenários obrigatórios:

Contrato do mundo A com jogador do mundo B.
Partida do mundo A com clube do mundo B.
Lançamento financeiro cruzado.
Inscrição cruzada.
Transferência cruzada.
Arquivo privado cruzado.

Todos deverão falhar.

221. Testes de concorrência
Dois controles ativos.
Dois contratos principais.
Duas transferências simultâneas.
Duas liquidações da mesma parcela.
Duas inscrições.
Dois schedulers.
Dois runtimes.
Dois commands com mesma versão.
Dois consumers do mesmo evento.
222. Testes financeiros

Deverão provar:

Lançamento desequilibrado falha.
Quantia negativa inadequada falha.
Reversão preserva histórico.
Pagamento duplicado falha.
Reserva não pode ser consumida além do limite.
Saldo pode ser reconstruído.
Snapshot conciliado corresponde ao razão.
223. Testes temporais
Períodos incompatíveis não se sobrepõem.
Período encerrado não permanece atual.
Prazos usam world tick.
Alteração do relógio local não altera validade.
Contratos com datas diferentes funcionam.
Mudança de temporada não encerra períodos indevidamente.
224. Testes de migration

Cada migration importante será testada com:

Banco vazio.
Banco pequeno.
Banco antigo.
Dados inválidos simulados.
Jobs concorrentes.
Aplicação antiga.
Aplicação nova.
Interrupção parcial.
225. Dados inválidos preexistentes

A migration não deverá ocultar inconsistências.

Poderá:

Bloquear.
Produzir relatório.
Mover para quarentena.
Exigir correção administrativa.
Aplicar transformação explícita.
226. Quarentena de dados

Entidades corrompidas poderão ser associadas a:

DataIntegrityIssue
DataIntegrityQuarantine
DataIntegrityRepair

Sem desaparecer silenciosamente.

227. Retenção
Permanente enquanto o mundo existir
Partidas.
Eventos oficiais.
Contratos.
Transferências.
Razão financeiro.
Títulos.
Identidades.
Carreiras.
Auditoria essencial.
Retenção configurável
Sessões.
Tokens.
Entregas de push.
Logs técnicos.
Rascunhos.
Uploads abandonados.
Caches.
Presença.
228. Arquivamento

Arquivar não significará excluir.

O banco poderá manter:

Metadados.
Identificador.
Checksum.
Local do arquivo.
Estado.
Resumo.

Os dados pesados poderão ir para o R2.

229. Performance inicial

O schema será otimizado inicialmente para:

Próxima partida.
Central.
Elenco.
Escalação.
Mercado.
Contratos próximos.
Tabela.
Caixa.
Notificações.
Processamento do mundo.
230. Consultas que não usarão joins ilimitados

Telas principais utilizarão:

Projeções.
Queries específicas.
Paginação.
Batching.
Cache.
Resumos.
231. Limite de include

O uso de include profundo do Prisma será controlado.

Não será permitido carregar árvores inteiras como:

club
  contracts
    player
      history
        matches
          events
232. Repositórios

Cada módulo possuirá repositórios orientados a agregado.

Exemplos:

ClubRepository
PlayerContractRepository
TransferCaseRepository
MatchRuntimeRepository
FinancialLedgerRepository
233. Transação do Prisma

O caso de uso receberá um contexto transacional próprio.

Repositórios não criarão transações independentes escondidas quando participarem do mesmo command.

234. Unit of work

A aplicação deverá conseguir:

Abrir transação.
Carregar agregados.
Aplicar regras.
Persistir alterações.
Criar outbox.
Confirmar.
Retornar resultado.
235. Queries fora de agregados

Queries de leitura não precisarão reconstruir objetos completos do domínio.

Poderão retornar DTOs otimizados.

236. Prisma Client gerado

O cliente Prisma será usado somente nas camadas:

database
infrastructure
read repositories
migration jobs autorizados
237. Prisma proibido no domínio

Arquivos de domínio não poderão importar:

PrismaClient
Prisma.Decimal
tipos gerados do Prisma

Objetos de valor do domínio serão próprios.

238. Tipos do banco e tipos do domínio

A infraestrutura converterá:

BigInt → Money
String enum → DomainState
Json → ValidatedProfile
DateTime → RealInstant
BigInt worldTick → WorldInstant
239. Catálogo de aggregates principais
GameWorld
SeasonTransition
Club
ClubControl
Person
Player
PlayerContract
StaffContract
Squad
TrainingPlan
MedicalCase
TacticalSystem
CompetitionEdition
Match
MatchRuntime
TransferCase
PlayerLoanAgreement
FinancialJournalEntry
Budget
InfrastructureProject
SponsorshipAgreement
HistoricalCorrection
ActionableTask
AutomationRule
WorldEntryProcess
AdministrativeOperation
OperationalIncident
240. Limites de aggregate

Um aggregate não carregará todo o mundo.

Exemplo:

Club não conterá internamente todos:

Jogadores.
Contratos.
Partidas.
Lançamentos.
Torcedores.
Funcionários.

Utilizará IDs, serviços de domínio e processos.

241. Consistência entre aggregates

Quando vários aggregates precisarem mudar:

Saga.
Reserva.
Eventos.
Compensações.
Processo com estados.

Exceção:

Operações que exigem consistência imediata e estão no mesmo banco poderão utilizar uma transação de aplicação bem definida.

242. Dados de IA

Decisões de IA terão:

AiDecision
AiDecisionInputSnapshot
AiDecisionOption
AiDecisionResult
AiPolicyVersion

Somente decisões relevantes serão persistidas em detalhe.

243. Seeds secretas

Seeds futuras de:

Partidas não iniciadas.
Geração futura.
Sorteios não realizados.

Terão classificação altamente restrita.

Não serão expostas em:

APIs.
Logs.
Dashboards comuns.
Exportações.
244. Modelo de integridade

Cada invariante será catalogada em:

IntegrityInvariant

Campos conceituais:

code
domain
description
enforcementLayer
severity
repairPolicy
monitoringQuery
245. Níveis de proteção
APPLICATION_ONLY
DOMAIN_AND_APPLICATION
DATABASE_CONSTRAINT
DATABASE_AND_DOMAIN
CONTINUOUS_RECONCILIATION
246. Exemplos de invariantes catalogadas
PLAYER_ONE_ACTIVE_PRIMARY_CONTRACT
CLUB_ONE_ACTIVE_CONTROL
MATCH_TWO_DISTINCT_SIDES
FINANCIAL_ENTRY_BALANCED
WORLD_ONE_ACTIVE_CLOCK
PLAYER_REGISTRATION_UNIQUE
TRANSFER_PAYMENT_NOT_DUPLICATED
AUTOMATION_EXECUTION_IDEMPOTENT
247. Reconciliações do banco

Jobs periódicos verificarão:

Contratos ativos.
Vínculos.
Inscrições.
Controles.
Lançamentos.
Saldos.
Partidas.
Classificações.
Projeções.
Outbox.
Leases.
Arquivos.
248. Correções

Toda correção de dado crítico deverá gerar:

Comando administrativo.
Evento.
Auditoria.
Nova versão.
Rebuild de projeções.
Comunicação quando necessária.
249. Nenhum “SQL de emergência” invisível

Mesmo em emergência, a operação deverá posteriormente possuir:

Script versionado.
Ticket.
Auditoria.
Explicação.
Validação.
Evento compensatório.
250. Critérios de aceite

O bloco será considerado correto quando:

O schema for dividido por domínio.
Prisma e SQL nativo forem complementares.
O domínio não depender do Prisma.
O schema puder usar múltiplos arquivos.
Os schemas PostgreSQL estiverem definidos.
Models utilizarem PascalCase.
O banco utilizar snake_case.
IDs utilizarem UUIDv7.
Entidades públicas poderem possuir códigos próprios.
Entidades globais e de mundo forem separadas.
Todas as entidades competitivas possuírem gameWorldId.
Relações críticas incluírem o escopo do mundo.
Relações entre mundos serem bloqueadas pelo banco.
Campos comuns possuírem versão.
Datas reais utilizarem timezone.
O tempo do mundo ser persistido separadamente.
Períodos ativos e datas desconhecidas serem diferentes.
Dinheiro utilizar BigInt.
Ponto flutuante não ser usado para saldo.
Percentuais possuírem escala explícita.
Atributos possuírem escala explícita.
JSONB ser utilizado somente em estruturas adequadas.
Relações centrais não ficarem em JSONB.
Enums estáveis serem separados de catálogos.
Regras expansíveis usarem catálogos ou versões.
Traduções não serem armazenadas como valores de enum.
Enums da plataforma serem definidos.
Enums do mundo serem definidos.
Enums de clube serem definidos.
Enums contratuais serem definidos.
Enums financeiros serem definidos.
Enums competitivos serem definidos.
Enums de partida serem definidos.
Enums de operações serem definidos.
A conta global não controlar diretamente o clube.
WorldParticipant representar a participação.
Um usuário possuir uma participação por mundo.
Um mundo possuir configuração e relógio.
Uma temporada possuir número único no mundo.
Geografia ser própria do mundo.
Clube possuir identidade permanente.
Mudanças de nome usarem períodos.
Um clube possuir um controle ativo.
Um participante possuir um clube ativo por mundo.
Governança e controle serem separados.
Departamentos e responsabilidades serem separados.
Toda pessoa possuir entidade única.
Jogador e funcionário poderem compartilhar Person.
Nome da pessoa possuir histórico.
Jogador possuir perfil próprio.
Um jogador existir uma vez por pessoa.
Clube empregador e esportivo serem diferentes.
Empréstimos preservarem o empregador.
Habilidades internas serem versionadas.
Perfil oculto ser separado.
Conhecimento do clube não alterar o jogador real.
Estado físico possuir snapshots.
Carreira possuir períodos.
Elenco não substituir contrato.
Elenco não substituir registro.
Contrato possuir termos versionados.
Salários poderem mudar por período.
Bônus possuírem gatilhos.
Propostas contratuais permanecerem históricas.
Registro competitivo ser independente do contrato.
Funcionários possuírem perfil próprio.
Competências de funcionários usarem catálogo.
Cargo e responsabilidade serem diferentes.
Treinamentos possuírem planos e sessões.
Desenvolvimento real e recomendação serem diferentes.
Táticas possuírem versões.
Casos médicos possuírem histórico.
Diagnóstico real e comunicação pública serem diferentes.
Retorno ao jogo possuir processo.
Competição possuir definição e edição.
Regulamentos possuírem versões.
Participantes de edição serem únicos.
Fases serem relacionais.
Fixture e partida serem diferentes.
Partidas preservarem escalações.
Runtime e resultado oficial serem diferentes.
Eventos de partida possuírem sequência.
Commands de partida serem idempotentes.
Estatísticas possuírem versão.
Ajustes de classificação serem explícitos.
Homologações serem persistidas.
Observação possuir relatórios independentes.
Conhecimento consolidado ser uma projeção.
Transferência ser um processo.
Propostas possuírem versões.
Empréstimos possuírem acordos próprios.
Finanças utilizarem partidas dobradas.
Contas financeiras possuírem natureza.
Lançamentos possuírem linhas.
Débitos e créditos serem iguais.
Saldos serem derivados.
Snapshots de saldo serem conciliáveis.
Orçamento e caixa serem diferentes.
Reservas financeiras serem persistidas.
Reservas não serem consumidas além do valor.
Recebíveis possuírem parcelas.
Pagáveis possuírem parcelas.
Pagamentos poderem liquidar parcialmente.
Instalações possuírem módulos.
Capacidades estruturais serem explícitas.
Projetos possuírem fases.
Direitos comerciais serem explicitamente modelados.
Exclusividades comerciais não se sobreporem.
Torcida possuir segmentos e snapshots.
Publicações e rumores serem separados.
Promessas possuírem relações de domínio.
Eventos históricos possuírem sujeitos.
Recorde possuir definição e ocorrência.
Notificação e tarefa serem diferentes.
Uma tarefa poder gerar várias notificações.
Automações possuírem versões.
Execuções referenciarem a versão utilizada.
Entrada de usuário possuir processo próprio.
Administração possuir modelos próprios.
Eventing possuir outbox e inbox.
Commands possuírem registro idempotente.
Eventos possuírem sequência de agregado.
Relações genéricas não determinarem propriedade.
Deleções históricas serem restritas.
Cascades serem limitados a filhos descartáveis.
Soft delete não ser automático.
Histórico importante usar períodos.
Snapshots serem imutáveis.
Constraints estruturais existirem no banco.
Unicidades condicionais usarem proteção adequada.
Períodos incompatíveis não se sobreporem.
Lançamentos publicados não serem editados.
Reversões criarem novos lançamentos.
Nomes normalizados serem suportados.
Nomes de clubes considerarem mundo e período.
Foreign keys relevantes possuírem índices.
Índices de prazo considerarem o mundo.
Índices serem justificados por consultas.
Índices redundantes serem revisados.
Particionamento não ser prematuro.
gameWorldId ser a principal unidade futura.
Constraints particionadas incluírem a chave necessária.
Partição não significar exclusão.
Views serem usadas para leitura.
Materialized views não serem fonte de verdade.
Projeções possuírem versão.
Projeções poderem ser reconstruídas.
Commands definirem aggregate principal.
Ordem de locks ser documentada.
Transferências bloquearem entidades em ordem segura.
Pagamentos utilizarem locks.
Chaves idempotentes serem únicas.
Gerações possuírem seed.
Status não ser alterado por update genérico.
Transições importantes possuírem histórico.
Combinações impossíveis serem protegidas por CHECK.
Campos derivados serem classificados.
Duplicações intencionais possuírem fonte.
Ponteiros atuais serem conciliados.
Dados sensíveis possuírem classificação.
Campos altamente sensíveis poderem ser criptografados.
Mensagens privadas serem separadas de notificações.
Arquivos manterem metadados no banco.
Bytes ficarem no R2.
Auditoria não possuir cascade delete.
Auditoria poder possuir verificação de integridade.
O modelo Prisma-base seguir as convenções.
Relações compostas impedirem mistura de mundos.
Migrações SQL complementarem o Prisma.
Recursos preview não serem essenciais.
Migrações serem revisadas antes de aplicar.
db push não ser usado em produção.
Migrações destrutivas usarem expand-contract.
Backfills serem jobs retomáveis.
Colunas obrigatórias serem introduzidas gradualmente.
Renomeações preservarem compatibilidade.
Enums serem alterados conscientemente.
Valores de enum não serem removidos casualmente.
Seeds serem separados por finalidade.
Seeds estruturais serem idempotentes.
Catálogos usarem códigos estáveis.
Catálogos históricos poderem possuir versões.
O banco vazio aceitar todas as migrations.
Bancos antigos aceitarem migrations testadas.
Relações cruzadas entre mundos falharem.
Testes de concorrência existirem.
Testes financeiros provarem integridade.
Testes temporais provarem períodos válidos.
Migrations serem testadas com interrupção.
Dados inválidos não serem ocultados.
Quarentena de integridade existir.
Fatos competitivos possuírem retenção permanente.
Dados temporários possuírem retenção configurável.
Arquivamento não significar perda.
Consultas principais serem priorizadas.
Árvores de include profundas serem evitadas.
Repositórios serem orientados a aggregates.
Transações serem controladas pela aplicação.
Queries poderem retornar DTOs.
Prisma ficar restrito à infraestrutura.
Tipos do banco serem convertidos para objetos de domínio.
Aggregates principais serem conhecidos.
Club não carregar todo o mundo.
Consistência entre aggregates utilizar sagas quando necessário.
Decisões relevantes de IA serem registradas.
Seeds futuras serem protegidas.
Invariantes possuírem catálogo.
Invariantes possuírem camada de proteção definida.
Reconciliações periódicas existirem.
Correções gerarem eventos e auditoria.
Nenhum saldo ser corrigido por sobrescrita silenciosa.
Nenhuma transferência ser concluída mudando apenas um campo.
Nenhum contrato ser confundido com inscrição.
Nenhuma notificação ser tratada como fato-base.
Nenhum histórico ser apagado por cascade.
Nenhum retry criar nova transação financeira.
Nenhuma relação crítica atravessar mundos.
Nenhuma migration depender exclusivamente do Prisma.
Nenhum dado inválido ser inventado durante migration.
O modelo permanecer preparado para crescimento e separação futura.
Decisões fechadas do Bloco 26
O banco será modelado por domínios.
O Prisma será a camada principal de modelagem relacional.
Migrações SQL nativas complementarão o Prisma.
O schema será dividido em vários arquivos.
Serão utilizados schemas lógicos do PostgreSQL.
Models usarão PascalCase.
O banco usará snake_case.
Identificadores principais serão UUIDv7.
Códigos públicos serão separados dos IDs internos.
Usuários serão globais.
Entidades esportivas pertencerão a um mundo.
Toda relação competitiva crítica carregará gameWorldId.
Foreign keys compostas impedirão relações entre mundos.
Entidades críticas possuirão version.
Datas reais usarão timestamptz.
O tempo simulado utilizará worldTick.
Dinheiro será armazenado em unidade mínima.
Percentuais serão inteiros escalados.
Atributos serão inteiros escalados.
JSONB será usado apenas em estruturas versionadas adequadas.
Relações centrais permanecerão relacionais.
Enums estáveis serão usados para ciclos fechados.
Taxonomias expansíveis utilizarão catálogos.
Regulamentos utilizarão versões.
Traduções não ficarão em enums.
Conta e participação no mundo serão entidades diferentes.
O controle do clube será uma relação própria.
Um usuário controlará no máximo um clube por mundo.
Um clube possuirá no máximo um controlador ativo.
Clube manterá identidade permanente.
Nomes e escudos serão períodos históricos.
Governança e controle serão separados.
Toda pessoa será única no mundo.
Jogadores e funcionários compartilharão Person quando forem a mesma pessoa.
Clube empregador e clube esportivo serão separados.
Empréstimos preservarão o contrato de origem.
Habilidades internas usarão perfil versionado.
Conhecimento de observação será separado do estado real.
Elenco, contrato e inscrição serão entidades diferentes.
Contratos possuirão termos por período.
Propostas não serão sobrescritas.
Funcionários terão competências catalogadas.
Cargo e responsabilidade serão separados.
Treinamento possuirá planos, ciclos e sessões.
Desenvolvimento real será separado da recomendação.
Táticas serão versionadas.
Medicina utilizará casos e processos.
Diagnósticos serão separados da comunicação pública.
Competições terão definição e edição.
Regulamentos não serão JSONs sem estrutura.
Fixture e partida serão diferentes.
Runtime e resultado oficial serão diferentes.
Escalações históricas serão preservadas.
Eventos de partida possuirão sequência.
Commands de partida serão idempotentes.
Ajustes de classificação serão explícitos.
Transferências serão processos completos.
Empréstimos possuirão contratos próprios.
Finanças utilizarão razão de partidas dobradas.
Saldos serão derivados dos lançamentos.
Reversões serão novos lançamentos.
Orçamento não será caixa.
Reservas financeiras serão persistidas.
Infraestrutura possuirá módulos e capacidades.
Direitos comerciais possuirão exclusividade temporal.
Torcida possuirá segmentos e memória.
Rumores e fatos oficiais serão diferentes.
Histórico possuirá eventos, honras, estatísticas e recordes.
Notificação e tarefa serão diferentes.
Automações possuirão versões e execuções próprias.
Entrada de usuários será modelada como processo.
Administração e suporte possuirão entidades próprias.
Eventing terá outbox, inbox e event log.
Relações polimórficas serão limitadas a domínios transversais.
Propriedade, dinheiro e elegibilidade usarão foreign keys explícitas.
Exclusões históricas serão bloqueadas.
Cascade será usado apenas para filhos descartáveis.
Soft delete não será padrão universal.
Histórico importante será representado por períodos.
Snapshots serão imutáveis.
Unicidades condicionais utilizarão índices parciais ou estrutura equivalente.
Sobreposições temporais críticas serão bloqueadas.
Constraints financeiras existirão no banco.
Índices seguirão consultas reais.
Particionamento será introduzido por necessidade comprovada.
gameWorldId será a principal chave futura de particionamento.
Views e projeções serão reconstruíveis.
Materialized views não serão fonte de verdade.
Agregados terão limites claros.
Locks possuirão ordem documentada.
Idempotência será protegida por constraints.
Gerações possuirão seeds persistidas.
Status só mudará por casos de uso.
Migrações destrutivas usarão expand-contract.
Backfills serão retomáveis.
Seeds estruturais serão idempotentes.
Testes de schema, migration, concorrência e integridade serão obrigatórios.
Prisma permanecerá fora do domínio.
Toda invariante crítica terá camada de proteção definida.
O modelo de dados será relacional, histórico, versionado, auditável e preparado para múltiplos mundos e clusters.

Bloco 26 encerrado.

Faltam 2 blocos no roteiro principal. O próximo será Plano de Implementação, MVP, Fases e Critérios de Entrega, transformando toda a arquitetura em uma ordem prática de construção sem tentar desenvolver o jogo inteiro de uma vez.