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

## Phase 7: Transporte oficial (API + SDK) — habilita clientes reais (FR-002)

- [x] T020 API NestJS `apps/api` `/api/v1`: command endpoint (envelope idempotente), query envelope, erro-padrão, catálogo — 136 commands + 14 queries (X-003 contracts)
- [x] T021 Auth/sessão + RBAC (guard global, `/auth/session`, admin:* → 403) e realtime Socket.IO com handshake + gap recovery (FR-012/FR-004)
- [x] T022 `@grinta/api-client` (SDK tipado: session/command/query/catalog/validation + `GrintaApiError`) e `@grinta/design-system` (tokens do protótipo + risco) — testados
- [x] T023 Endpoint `POST /validation/run` (VAL-001) para o Laboratório

## Phase 8: Admin operacional — fluxos AF-01..10 (US3)

- [x] T024 [US3] AF-00/01/02 Painel: acesso/RBAC/seleção de mundo + saúde (demografia/estrutura) + feed realtime + ações rápidas
- [x] T025 [US3] AF-03/04/05/06/07 Moderação: C12 com formulários reais (`CommandForm`+`command-specs`) — risco, caso, quarentena, sanção (quatro-olhos), correção, reprocessamento, recurso, suporte; confirmação de risco + reauth
- [x] T026 [US3] AF-08 Competições/fim de temporada: view + registrar resultado + homologar; economia (ledger) e mercado com view + init
- [x] T027 [US3] AF-09 Laboratório: rodar calibração + relatório (bandas/gate)
- [ ] T028 [US3] AF-10 Versionamento de regras (ruleset) — depende de comando de ruleset no domínio (ausente hoje)

## Phase 9: Cobertura de telas + mobile (FR-007/010/011) — pendente

- [x] T029 Registro versionado das 138 telas (114 mobile + 24 admin) em `packages/core/src/clients/screen-registry.ts`: arquétipo canônico (L-M01..09 / L-A01..05) + risco + estados; testes provam 138/114/24, sem duplicata, todos com arquétipo (SC-003/FR-010)
- [x] T030 12 estados obrigatórios por tela (initial-loading/empty/partial-stale/offline/processing/success/domain-error/technical-error/forbidden/conflict/expired/maintenance) herdados e testados (FR-007)
- [ ] T031 [US1] App Expo `apps/mobile`: telas GP-001…GP-016 consumindo SDK + kernel + design system (T011/T012) — **não certificável headless; requer `expo start`**
- [ ] T032 [US2] Transporte realtime do mobile via X-002 (sequence/resume token) — T015 (depende do app Expo)
- [x] T033 Telemetria sem PII correlacionada por IDs seguros (`redactForTelemetry`/`commandTelemetry` em `@grinta/api-client`) + testes (FR-013)

## Implementation Strategy

- **Incremento atual**: kernel de contrato de cliente (whitelist offline, tracking sem simular sucesso, realtime dedup/gap, intent TTL) — pura lógica testável, compartilhável entre mobile e admin.
- **Pendente**: apps Expo/Next reais (T011-T012, T016-T017), integração realtime com X-002 (T015).

## Notes

- Clientes são NÃO autoritativos; usam contratos oficiais e nunca decidem retry de ação irreversível.
- Offline restrito à whitelist reversível; realtime é gap-aware e idempotente.
