# Feature Specification: Projeto de infraestrutura

**ID**: GP-014 | **Slug**: `infrastructure-project` | **Milestone**: M3 | **Status**: DELIVERED  
**Owner**: BC-003 | **Contributors**: BC-009, BC-012, X-002, X-003  
**Created**: 2026-07-13 | **Directory**: `specs/033-infrastructure-project`

## User Scenarios & Testing

### User Story 1 — Planejar e concluir uma obra auditável (P1)

Como gestor, quero avaliar, financiar e acompanhar uma obra para aumentar capacidade sem gastar duas vezes ou ativar estrutura não inspecionada.

**Independent Test**: aprovar projeto, reservar recursos, avançar etapas até inspeção/operação e repetir checkpoints sem duplicar custo/progresso.

**Acceptance Scenarios**:

1. **Given** projeto viável/aprovado, **When** inicia, **Then** recursos são reservados uma vez e cronograma fica versionado.
2. **Given** etapa reprocessada, **When** o mesmo checkpoint chega, **Then** custo/progresso não duplica.
3. **Given** inspeção reprovada, **When** a obra termina fisicamente, **Then** não entra em operação até correção/aprovação.

### Edge Cases

- Custo muda antes do aceite; financiamento negado; obra pausada; mundo pausado; falha de fornecedor; cancelamento; correção administrativa; manutenção vencida.

## Scope & Boundaries

Inclui necessidade, viabilidade, aprovação, reserva/crédito, cronograma, execução, inspeção, ativação e manutenção inicial. C3 escreve projeto/estrutura; C9 dinheiro; C12 aprovação/auditoria excepcional; X2 saga. Não inclui regras gerais de estádio.

## Requirements

- **FR-001**: versionar escopo, custo, benefícios, prazo, riscos e aprovação.
- **FR-002**: reservar/liquidar recursos pelo ledger uma vez.
- **FR-003**: processar etapas por checkpoint idempotente e data lógica.
- **FR-004**: exigir inspeção antes de ativar capacidade/benefício.
- **FR-005**: compensar cancelamento/falha conforme estágio, preservando histórico.
- **FR-006**: auditar ações de alto risco e validar servidor mesmo com UI stale.

**Invariants**: INV-3a/3b, INV-8, INV-30, INV-34; SAGA-04; CA-UX-06.

## Canonical Sources & Traceability

| Scope     | Source                                                                         |
| --------- | ------------------------------------------------------------------------------ |
| Fluxo     | `docs/01-game-design/15-fluxos-completos.md` — “14. Projeto de infraestrutura” |
| Estrutura | GDD 03/04/08                                                                   |
| Saga      | `docs/02-tecnico/16-sagas-e-workflows.md` — SAGA-04                            |
| Auditoria | `docs/02-tecnico/09-operacao-e-admin-do-mundo.md`                              |

## Success Criteria

- **SC-001**: zero custo/progresso duplicado em retries/crash.
- **SC-002**: zero benefício ativo sem inspeção e aprovação.
- **SC-003**: todo desfecho possui trilha completa de decisão, dinheiro e etapas.

## Assumptions

- BC-003, BC-009, BC-012 e X-002 fornecem contratos congelados; clientes são não autoritativos.
