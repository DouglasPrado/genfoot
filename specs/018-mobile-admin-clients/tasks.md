# Tasks: Clientes mobile e admin

**Input**: Design documents from `/specs/018-mobile-admin-clients/`
**Prerequisites**: Backend autoritativo (todos os contexts); X-002 realtime.
**Tests**: Requeridos pela spec (P1/P2/P3) e pelo workflow TDD.

## Phase 1: Setup and contract freeze

- [x] T001 Congelar HTTP command/query/realtime/error/offline-whitelist/screen contracts em specs/018-mobile-admin-clients/contracts/README.md
- [x] T002 Reconciliar modelos locais (session/cache/intent/cursor/tracking) em data-model.md
- [x] T003 Criar kernel de contrato de cliente em packages/core/src/clients/ e testes em packages/core/tests/clients/

## Phase 2: Foundational — kernel de contrato (compartilhável entre mobile e admin)

- [x] T004 Tipos de tracking/realtime/intent em packages/core/src/clients/clients-types.ts
- [x] T005 Whitelist offline enumerada + isOfflineCommandAllowed (ausência = proibido)
- [x] T006 classifyRealtimeEvent (dedup + gap) e advanceCommandTracking (timeout ≠ sucesso)
- [x] T007 OfflineIntentQueue (enqueue whitelist/dedup, revalidate por TTL, submit uma vez)
- [x] T008 Exportar contrato público do kernel de cliente em packages/core/src/index.ts

## Phase 3: User Story 1 — Completar os 16 fluxos no mobile (Priority: P1)

**Independent Test**: E2E de cada golden path com success/loading/empty/error/blocked/offline.

- [x] T009 [US1] Máquina de tracking DRAFT→SUBMITTING→ACCEPTED→APPLIED|REJECTED|UNKNOWN_RECOVERING (sem simular sucesso)
- [x] T010 [US1] Testes P1 do kernel (whitelist, tracking, dedup/gap, intent TTL) em packages/core/tests/clients/clients.test.ts
- [ ] T011 [US1] App Expo: screens dos GP-001…GP-016 consumindo o kernel + design system
- [ ] T012 [US1] Estados explícitos de screen (loading/empty/content/error/blocked/offline) por golden path

## Phase 4: User Story 2 — Recuperar conexão sem duplicar ação (Priority: P2)

- [x] T013 [US2] Realtime gap-aware (CONNECTING→LIVE→GAP→RECOVERING) via classifyRealtimeEvent + snapshot/delta
- [x] T014 [US2] Intent reversível offline dentro do TTL revalidado e enviado uma vez; vencido não executa
- [ ] T015 [US2] Integração realtime com X-002 (sequence/resume token) no transporte real

## Phase 5: User Story 3 — Operar o mundo com segurança no admin (Priority: P3)

- [x] T016 [US3] Admin Next.js (`apps/admin`) com RBAC (guard global + admin:* → 403; não-admin bloqueado de /anti-abuso), **reautenticação** (step-up: reemite token admin com a chave antes de admin:*) e **quatro-olhos** (painel SoD propor→aprovar; backend recusa o mesmo ator) — reusa C12
- [x] T017 [US3] Confirmação **proporcional ao risco** (`commandRisk`/`requiresConfirmation` no design-system + ConfirmDialog p/ high/irreversible) e **acessibilidade** (aria-current/aria-label na nav, focus rings, sr-only, prefers-reduced-motion); AccessibilityProfile não muda regra

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T018 [P] Cache de query com scope/version imutável (`QueryCache` em `@grinta/api-client`: segregado por scopeKey, monotônico por projectionVersion, `clearScope` na troca) + testes
- [ ] T019 Rodar quickstart (pnpm typecheck && pnpm test) e promover evidência

## Implementation Strategy

- **Incremento atual**: kernel de contrato de cliente (whitelist offline, tracking sem simular sucesso, realtime dedup/gap, intent TTL) — pura lógica testável, compartilhável entre mobile e admin.
- **Pendente**: apps Expo/Next reais (T011-T012, T016-T017), integração realtime com X-002 (T015).

## Notes

- Clientes são NÃO autoritativos; usam contratos oficiais e nunca decidem retry de ação irreversível.
- Offline restrito à whitelist reversível; realtime é gap-aware e idempotente.
