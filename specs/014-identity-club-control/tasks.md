# Tasks: Identidade, conta e controle de clube

**Input**: Design documents from `/specs/014-identity-club-control/`
**Prerequisites**: Club/risk/automation como referências (C3/C12/X-001).
**Tests**: Requeridos pela spec (P1/P2/P3) e pelo workflow TDD.

## Phase 1: Setup and contract freeze

- [x] T001 Congelar command/query/event/error/auth-context em specs/014-identity-club-control/contracts/README.md
- [x] T002 Reconciliar entidades (conta/sessão/participação/reserva/controle) em data-model.md
- [x] T003 Criar módulo C1 em packages/core/src/identity/ e testes em packages/core/tests/identity/

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 IDs branded, reserva/controle/participação/cooldown/sessão e eventos em packages/core/src/identity/identity-types.ts
- [x] T005 [P] IdentityRepository (optimistic concurrency) em packages/core/src/identity/identity-repository.ts
- [x] T006 Bootstrap de mundo vazio + invariante de controle único por clube em packages/core/src/identity/world-identity.ts
- [x] T007 Exportar contrato público C1 em packages/core/src/index.ts

## Phase 3: User Story 1 — Entrar e controlar um clube sem duplicidade (Priority: P1) 🎯 MVP

**Independent Test**: disputar a mesma vaga com duas contas + retries; apenas uma reserva/participação/ClubControl fica ativa.

- [x] T008 [US1] ReserveClub com exclusividade (CLUB_ALREADY_RESERVED) + ClubReserved
- [x] T009 [US1] ConfirmOnboarding ativa participação e controle uma vez (CONTROL_CONFLICT se já ativo) + ClubControlActivated
- [x] T010 [US1] ReleaseReservation e um único ClubControl ativo por clube (invariante em fromSnapshot)
- [x] T011 [US1] Testes P1 (exclusividade, controle único, idempotência) em packages/core/tests/identity/identity.test.ts
- [ ] T012 [US1] SAGA-03 de onboarding (risco C12 + revalidação de automação X-001) via X-002

## Phase 4: User Story 2 — Manter sessões seguras (Priority: P2)

**Independent Test**: emitir/rotacionar/reutilizar refresh e revogar família; reúso invalida a família.

- [x] T013 [US2] StartSession/RefreshSession com rotação e detecção de reúso (SESSION_REVOKED revoga a família) + SessionFamilyRevoked
- [ ] T014 [US2] RevokeSessionFamily explícito e autorização por world/clube (WORLD_FORBIDDEN)
- [ ] T015 [US2] Credenciais (hash, verifiedAt) e escopo autenticado por Session

## Phase 5: User Story 3 — Sair ou trocar preservando história (Priority: P3)

**Independent Test**: encerrar controle, tentar troca durante/depois do cooldown; histórico preservado, automação reassume.

- [x] T016 [US3] EndClubControl inicia cooldown + ClubControlEnded/CooldownStarted; participação encerrada sem apagar fatos
- [x] T017 [US3] RequestClubSwitch bloqueado no cooldown (COOLDOWN_ACTIVE) e liberado após

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T018 [P] Adapter de persistência + sessão/credencial em apps/simulator
- [ ] T019 Rodar quickstart (pnpm typecheck && pnpm test) e promover evidência

## Implementation Strategy

- **Incremento atual**: US1 (reserva exclusiva + onboarding + controle único), US3 (cooldown + troca bloqueada) e núcleo de US2 (rotação de sessão).
- **Pendente**: SAGA-03 cross-context (T012), revogação explícita/credenciais/autorização por mundo (T014-T015), adapter (T018).

## Notes

- Club/risk/automation são referências; owners permanecem C3/C12/X-001.
- Um único controle ativo por clube; término preserva histórico e inicia cooldown; toda escrita idempotente e versionada.
