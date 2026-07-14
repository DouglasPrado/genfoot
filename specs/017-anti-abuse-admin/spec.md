# Feature Specification: Anti-abuso, suporte e administração

**Feature Branch**: `017-anti-abuse-admin` | **Created**: 2026-07-13 | **Status**: DELIVERED  
**Feature ID**: BC-012 | **Milestone**: M2 | **Owner**: C12 Anti-abuso/Admin

**Input**: Entregar risco, quarentena, sanções, recursos, correções, audit hash-chain, suporte e reprocessamento.

## User Scenarios & Testing

### User Story 1 — Investigar risco sem punição automática opaca (Priority: P1)

Como analista, quero consolidar sinais em um caso para distinguir abuso de comportamento legítimo.

**Independent Test**: Processar sinais duplicados/contraditórios, recalcular score versionado e provar que ação grave exige evidência, RBAC e revisão.

**Acceptance Scenarios**:

1. **Given** sinais correlacionados, **When** limiar é atingido, **Then** caso/quarentena são abertos com fatores, versão e escopo.
2. **Given** somente score automático, **When** sanção grave é solicitada, **Then** workflow exige aprovação humana/quatro-olhos.

### User Story 2 — Corrigir e reprocessar sem apagar fatos (Priority: P2)

Como operador, quero emitir correção autorizada e reprocessar projeções preservando owners e auditoria.

**Independent Test**: Aprovar correction command, falhar/retry e provar um efeito no owner, hash-chain válida e fatos originais intactos.

**Acceptance Scenarios**:

1. **Given** correção aprovada, **When** owner a executa, **Then** novo fato compensatório referencia original e C12 não escreve o aggregate.
2. **Given** poison message, **When** reprocessado da DLQ, **Then** idempotência evita efeito duplicado.

### User Story 3 — Aplicar sanção com recurso (Priority: P3)

Como pessoa afetada, quero justificativa, prazo e recurso para que sanções sejam proporcionais e revisáveis.

**Independent Test**: Aplicar sanção, recorrer, manter/reverter e verificar timeline/audit chain, autorização e notificação.

**Acceptance Scenarios**:

1. **Given** decisão aprovada, **When** sanção entra em vigor, **Then** escopo/período/razões/evidências são registrados.
2. **Given** recurso deferido, **When** revisão conclui, **Then** fato de reversão é adicionado sem apagar decisão original.

### Edge Cases

- Admin investiga próprio caso; segregação de funções bloqueia.
- Hash-chain quebrada, relógio/sequence divergente ou evidência stale.
- Conta excluída/LGPD com histórico esportivo anonimizado.
- Correção de partida já homologada ou ledger fechado exige workflow específico.

## Scope & Boundaries

Inclui RiskSignal/Assessment, Case, Quarantine, Sanction, Appeal, CorrectionRequest, SupportCase, AuditEvent hash-chain e ReprocessingRequest. Exclui autenticação C1, ledger C9, projections X-002/C11 e aggregates corrigidos; C12 autoriza/coordena por command.

Dependências: BC-001/BC-009/BC-011/X-002 concluídas para fechar a operação.

## Requirements

- **FR-001**: C12 MUST ser owner de casos, risco, sanção, correção, auditoria e suporte.
- **FR-002**: Risk assessment MUST registrar sinais, pesos, versão, explicação e confidence sem decisão secreta.
- **FR-003**: Sinal duplicado MUST NOT alterar score duas vezes.
- **FR-004**: Quarentena MUST ser escopada, temporária, auditável e não apagar fatos.
- **FR-005**: Sanção MUST registrar base, evidências, escopo, período, approvers e recurso.
- **FR-006**: Ações sensíveis MUST aplicar RBAC, reautenticação, SoD e quatro-olhos conforme R-87.
- **FR-007**: AuditEvent MUST formar cadeia `prevEventHash -> eventHash`, ser append-only e verificar integridade.
- **FR-008**: Correction MUST ser command aprovado ao owner; C12 MUST NOT escrever aggregate externo.
- **FR-009**: Reprocessamento MUST usar checkpoint/idempotência e preservar event registry.
- **FR-010**: Appeal MUST possuir prazo, reviewer independente, decisão e fato de manutenção/reversão.
- **FR-011**: PII MUST ser minimizada/mascarada e retenção/legal hold aplicados.
- **FR-012**: Toda falha MUST produzir diagnóstico/correlationId e nunca sucesso presumido.

### Key Entities

RiskSignal, RiskAssessment, AbuseCase, Quarantine, Sanction, Appeal, CorrectionRequest, AuditEvent, SupportCase e ReprocessingRequest.

## Canonical Sources & Traceability

| Scope           | Sources                                                                                                   | IDs                         |
| --------------- | --------------------------------------------------------------------------------------------------------- | --------------------------- |
| Anti-abuso      | `docs/01-game-design/09-anti-abuso-e-onboarding.md`, §1                                                   | R-95                        |
| C12/admin       | `docs/02-tecnico/12-context-map-e-blueprint.md`, “C12”; `docs/02-tecnico/09-operacao-e-admin-do-mundo.md` | R-87                        |
| Segurança/audit | `docs/02-tecnico/19-seguranca-dr-ha.md`                                                                   | R-131…137, R-154, INV-34…37 |
| Plataforma      | `docs/02-tecnico/04-plataforma-seguranca-operacoes.md`                                                    | RBAC/SoD/correções          |

## Success Criteria

- **SC-001**: 100% das ações sensíveis possuem autorização, reautenticação e audit event verificável.
- **SC-002**: Audit chain detecta 100% das adulterações fixtures.
- **SC-003**: Retry/reprocessamento causa zero efeito duplicado.
- **SC-004**: Zero correção administrativa escreve aggregate fora do owner ou apaga fato histórico.

## Assumptions

- X-002 oferece DLQ/replay; owners aceitam correction commands versionados.
- Thresholds/pesos de risco são versionados e sujeitos a revisão humana.
