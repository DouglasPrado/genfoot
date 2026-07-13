# Feature Specification: Notificações, relatórios e memória

**Feature Branch**: `016-notifications-history` | **Created**: 2026-07-13 | **Status**: PLANNED  
**Feature ID**: BC-011 | **Milestone**: M2 | **Owner**: C11 Notificação/Relatório

**Input**: Entregar inbox, threads, entrega/digest, timeline, records, estatísticas e relatórios reconstruíveis.

## User Scenarios & Testing

### User Story 1 — Receber decisões priorizadas (Priority: P1)

Como gestor, quero uma inbox que separe tarefas, alertas e informação para agir antes dos prazos.

**Independent Test**: Projetar fixture de eventos duplicados/fora de ordem e obter uma única notification por chave, prioridade/prazo corretos e thread estável.

**Acceptance Scenarios**:

1. **Given** fato relevante, **When** projetado, **Then** notification/thread é criada uma vez com sourceRef, prioridade, urgência e ação permitida.
2. **Given** digest solicitado, **When** itens são agrupados, **Then** urgentes não são atrasados e nenhum item é duplicado.

### User Story 2 — Consultar relatórios reconstruíveis (Priority: P2)

Como gestor, quero relatórios esportivos, elenco, base, finanças, mercado, staff e temporada derivados de fatos oficiais.

**Independent Test**: Apagar projeções, reconstruir do event log e comparar hashes/pontos de corte com a versão anterior.

**Acceptance Scenarios**:

1. **Given** asOf e versão definidos, **When** relatório é gerado, **Then** números têm proveniência e não viram fonte competitiva.
2. **Given** rebuild completo, **When** termina, **Then** relatório equivalente possui mesmo hash canônico.

### User Story 3 — Preservar memória do mundo (Priority: P3)

Como participante, quero timeline, recordes e rankings históricos para compreender a trajetória sem reescrita retroativa.

**Independent Test**: Processar temporada, correção oficial e replay; fatos originais/correções permanecem e record books atualizam uma vez.

**Acceptance Scenarios**:

1. **Given** recorde homologado, **When** evento chega, **Then** record book/timeline referenciam o fato oficial.
2. **Given** correção posterior, **When** aplicada, **Then** nova entrada supersede projeção sem apagar evento anterior.

### Edge Cases

- Evento duplicado, gap/ordem atrasada, projeção rebuild durante leitura.
- Destinatário sem controle, preferência alterada, canal indisponível.
- Relatório pesado, asOf no rollover e empate de recordes.
- PII removida: histórico esportivo anonimizado permanece.

## Scope & Boundaries

Inclui Notification, Thread, Delivery/Digest, DecisionTask read model, ReportDefinition/Artifact, world/club/player timelines, Record e StatisticProjection. Exclui facts autoritativos, realtime transport X-002, UI X-003 e decisão C10/C12.

Dependências: BC-002/BC-008/BC-010 por contratos; X-002 concluído para iniciar projeções duráveis.

## Requirements

- **FR-001**: C11 MUST escrever somente notifications, history e read models reconstruíveis.
- **FR-002**: Toda projeção MUST deduplicar por eventId e controlar world/stream sequence.
- **FR-003**: Gap MUST pausar/apontar recovery; evento fora de ordem não pode produzir estado silenciosamente incorreto.
- **FR-004**: Notification MUST conter recipient scope, category, priority, urgency, sourceRef, deadline, actionRef e status.
- **FR-005**: Tarefa e informação MUST ser distinguíveis; digest MUST NOT atrasar item urgente.
- **FR-006**: Preferências/canais MUST controlar entrega sem apagar a inbox oficial.
- **FR-007**: Relatório MUST declarar definitionVersion, asOf, source versions e generatedAt.
- **FR-008**: Rebuild MUST gerar hash equivalente para mesmos fatos/versões.
- **FR-009**: Timeline/record MUST preservar fato original e correção/supersession.
- **FR-010**: Queries MUST aplicar world/account/control authorization e política de PII.
- **FR-011**: Projeção MUST NOT ser usada como source of truth em command crítico sem revalidação no owner.
- **FR-012**: Falha de delivery MUST retry/DLQ sem duplicar conteúdo ou read status.

### Key Entities

Notification, Thread, DeliveryAttempt, Digest, ReportDefinition, ReportArtifact, TimelineEntry, Record e ProjectionCheckpoint.

## Canonical Sources & Traceability

| Scope             | Sources                                                       | IDs                    |
| ----------------- | ------------------------------------------------------------- | ---------------------- |
| C11               | `docs/02-tecnico/12-context-map-e-blueprint.md`, “C11”        | ownership              |
| Catálogo/memória  | `docs/01-game-design/13-relatorios-notificacoes-e-memoria.md` | baseline R-148         |
| Realtime/recovery | `docs/02-tecnico/08-frontend-cliente-e-tempo-real.md`         | CA-UX                  |
| Eventing          | `docs/02-tecnico/01-arquitetura-de-dados.md`                  | Outbox/Inbox/projeções |

## Success Criteria

- **SC-001**: Rebuild com mesmos fatos produz 100% dos hashes de projeção equivalentes.
- **SC-002**: Duplicatas causam zero notification, delivery, record ou statistic adicional.
- **SC-003**: 100% dos relatórios possuem asOf, definição e proveniência.
- **SC-004**: Gap impede avanço silencioso e produz recovery rastreável em 100% dos testes.

## Assumptions

- X-002 fornece log/event registry e sequência; owners publicam correções oficiais.
- Push/email são canais derivados; inbox persistente é o registro de entrega do produto.
