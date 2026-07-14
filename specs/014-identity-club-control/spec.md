# Feature Specification: Identidade, conta e controle de clube

**Feature Branch**: `014-identity-club-control` | **Created**: 2026-07-13 | **Status**: DELIVERED  
**Feature ID**: BC-001 | **Milestone**: M2 | **Owner**: C1 Identidade/Conta

**Input**: Entregar conta, sessão, participação no mundo, reserva, onboarding, controle, abandono/troca e cooldown.

## User Scenarios & Testing

### User Story 1 — Entrar e controlar um clube sem duplicidade (Priority: P1)

Como jogador, quero reservar um clube elegível e concluir onboarding para entrar no mundo uma única vez.

**Why this priority**: É a fronteira de autoridade humana e base do multiplayer.

**Independent Test**: Disputar a mesma vaga com duas contas e retries de SAGA-03; apenas uma reserva/participação/ClubControl fica ativa.

**Acceptance Scenarios**:

1. **Given** clube elegível, sessão válida e risco aprovado, **When** onboarding conclui, **Then** participação e controle são ativados uma vez e a automação é revalidada.
2. **Given** duas reservas concorrentes, **When** ambas tentam confirmar, **Then** somente uma vence e a outra recebe erro estável sem estado parcial.

### User Story 2 — Manter sessões seguras (Priority: P2)

Como jogador, quero renovar e revogar sessões para que apenas credenciais válidas comandem meu clube.

**Independent Test**: Emitir, rotacionar, reutilizar refresh token e revogar família; reúso invalida a família e commands posteriores falham.

**Acceptance Scenarios**:

1. **Given** refresh válido, **When** renovado, **Then** o token anterior não pode ser usado outra vez.
2. **Given** controle de outro mundo/clube, **When** um command é enviado, **Then** autorização nega sem revelar dados.

### User Story 3 — Sair ou trocar preservando história (Priority: P3)

Como jogador, quero abandonar/trocar clube com cooldown claro, sem apagar fatos anteriores.

**Independent Test**: Encerrar controle, tentar troca durante/depois do cooldown e provar histórico preservado e automação reassumindo.

**Acceptance Scenarios**:

1. **Given** controle ativo, **When** abandono confirma, **Then** ele termina em data lógica, cooldown inicia e fatos permanecem.
2. **Given** cooldown vigente, **When** nova reserva é solicitada, **Then** ela é rejeitada com elegibilidade futura explícita.

### Edge Cases

- Reserva expira no meio do onboarding; conta bloqueada; sessão revogada concorrente.
- Usuário em múltiplos mundos, mas nunca com controles incompatíveis no mesmo mundo.
- Clube fica inelegível depois da reserva; saga compensa.
- Retry após controle ativado retorna `ALREADY_APPLIED`.

## Scope & Boundaries

Inclui Account, Credential/SessionFamily, WorldParticipation, ClubReservation, ClubControl, cooldown e SAGA-03. Exclui dados do clube (C3), risk decision (C12), decisões automáticas (X-001), transporte (X-002) e UI (X-003).

Dependências: contratos de BC-003/X-001/X-002; VAL-001 concluída antes de iniciar backend multiplayer.

## Requirements

- **FR-001**: C1 MUST ser único owner de account, session, participation, reservation e ClubControl.
- **FR-002**: Credenciais MUST ser armazenadas de forma segura; refresh MUST rotacionar e detectar reúso.
- **FR-003**: Autorização MUST validar account, worldId, participation, active control e command scope.
- **FR-004**: Reserva MUST possuir TTL, elegibilidade versionada e unicidade concorrente.
- **FR-005**: SAGA-03 MUST usar checkpoints/idempotência e compensar reserva/participação incompletas.
- **FR-006**: Exatamente um controlador ativo MUST existir por clube e limites por conta/mundo MUST ser aplicados.
- **FR-007**: Ativação/encerramento de controle MUST emitir eventos para automação, histórico e auditoria.
- **FR-008**: Abandono/troca MUST aplicar cooldown ratificado sem apagar histórico.
- **FR-009**: Falha de autenticação/autorização MUST NOT revelar existência de recurso fora do escopo.
- **FR-010**: Ações críticas MUST exigir reautenticação conforme política.
- **FR-011**: Toda mutação MUST ser idempotente e auditável por correlationId.
- **FR-012**: Isolamento entre mundos MUST ser aplicado em toda query e command.

### Key Entities

Account, Credential, SessionFamily, Session, WorldParticipation, ClubReservation e ClubControl.

## Canonical Sources & Traceability

| Scope         | Sources                                                                                                 | IDs           |
| ------------- | ------------------------------------------------------------------------------------------------------- | ------------- |
| C1/aggregates | `docs/02-tecnico/12-context-map-e-blueprint.md`, “C1”                                                   | ownership     |
| Multiplayer   | `docs/02-tecnico/03-multiplayer-e-mundos.md`, contas/sessões/entrada                                    | R-25          |
| Onboarding    | `docs/01-game-design/09-anti-abuso-e-onboarding.md`; `docs/02-tecnico/16-sagas-e-workflows.md`, SAGA-03 | SAGA-03, R-95 |
| Segurança     | `docs/02-tecnico/19-seguranca-dr-ha.md`, AuthN/AuthZ                                                    | R-87/R-95     |

## Success Criteria

- **SC-001**: Concorrência/retry produz zero reserva ou controle ativo duplicado.
- **SC-002**: 100% dos commands sem sessão/participação/controle válidos são negados sem efeito.
- **SC-003**: Reúso de refresh revoga a família em 100% dos testes.
- **SC-004**: Saída/troca preserva 100% do histórico e aplica cooldown deterministicamente.

## Assumptions

- C3 fornece elegibilidade; C12 fornece risk decision; nenhum deles escreve C1.
- Valores de TTL/cooldown vêm de config/ruleset versionados.
