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
- [x] T015 [US2] Integração realtime com X-002 (sequence/resume token) no transporte real

## Phase 5: User Story 3 — Operar o mundo com segurança no admin (Priority: P3)

- [x] T016 [US3] Admin Next.js (`apps/admin`) com RBAC (guard global + admin:* → 403; não-admin bloqueado de /anti-abuso), **reautenticação** (step-up: reemite token admin com a chave antes de admin:*) e **quatro-olhos** (painel SoD propor→aprovar; backend recusa o mesmo ator) — reusa C12
- [x] T017 [US3] Confirmação **proporcional ao risco** (`commandRisk`/`requiresConfirmation` no design-system + ConfirmDialog p/ high/irreversible) e **acessibilidade** (aria-current/aria-label na nav, focus rings, sr-only, prefers-reduced-motion); AccessibilityProfile não muda regra

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T018 [P] Cache de query com scope/version imutável (`QueryCache` em `@grinta/api-client`: segregado por scopeKey, monotônico por projectionVersion, `clearScope` na troca) + testes
- [x] T019 Rodar quickstart e promover evidência — `pnpm lint`, `pnpm typecheck`, `pnpm test` (386/386) e `pnpm build` verdes em 2026-07-15

## Phase 7: Transporte oficial (API + SDK) — habilita clientes reais (FR-002)

- [x] T020 API NestJS `apps/api` `/api/v1`: command endpoint (envelope idempotente), query envelope, erro-padrão, catálogo — 136 commands + 17 queries (inclui projeções detalhadas de identidade, elenco e partidas)
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
- [x] T032 [US2] Transporte realtime do mobile via X-002 (sequence/resume token) — T015; Socket.IO autenticado com dedup, delta e fallback para snapshot oficial
- [x] T033 Telemetria sem PII correlacionada por IDs seguros (`redactForTelemetry`/`commandTelemetry` em `@grinta/api-client`) + testes (FR-013)

## Implementation Strategy

- **Incremento atual**: kernel de contrato de cliente (whitelist offline, tracking sem simular sucesso, realtime dedup/gap, intent TTL) — pura lógica testável, compartilhável entre mobile e admin.
- **Pendente**: concluir GP-001…GP-016 e todos os estados no app Expo (T011/T012/T031), além do ruleset admin bloqueado pelo domínio (T028).

## Notes

- Clientes são NÃO autoritativos; usam contratos oficiais e nunca decidem retry de ação irreversível.
- Offline restrito à whitelist reversível; realtime é gap-aware e idempotente.

## Phase 10: Convergence

- [x] T034 Concluir leitura offline cacheada no admin e mobile, segregada por escopo; a fila persistida de intents é exclusiva do mobile e limitada à whitelist/TTL — integração concluída em `QueryCache`, `clientScopeKey`, `useWorldQuery` e `PersistentOfflineIntentQueue`
- [x] T035 Telemetria segura emitida de fato: `onTelemetry` no `GrintaClient` dispara `commandTelemetry` (só IDs) por command; admin passa o sink; teste prova ausência de payload per FR-013
- [x] T036 Check automatizado de acessibilidade: `contrastRatio` WCAG no design-system + teste (texto ≥4.5:1, acento/apoio ≥3:1, botão primário ≥4.5:1) per FR-011/SC-004
- [x] T037 Nomes reconciliados/justificados: `@grinta/api-client` = SDK dos contratos de cliente (plan `packages/contracts`), `@grinta/design-system` = tokens de UI (plan `packages/ui`) — mesma função, nomes mais claros per plan

## Phase 11: Convergence

- [x] T038 Implementar GP-001…GP-003 como onboarding, retorno e troca/saída de clube orientados à tarefa do gestor, usando queries/commands oficiais de identity e club, sem superfície de documentação per US1/AC1 e FR-010 — onboarding oficial, resumo de retorno e saída/troca com cooldown entregues
- [ ] T039 Implementar GP-004…GP-007 como início/encerramento de temporada, ciclo semanal, preparação, escalação, partida ao vivo e pós-jogo; substituir seeds de Home/Elenco/Partidas por projeções oficiais per US1/AC1 e FR-001/FR-010 (missing, CRITICAL)
- [ ] T040 Implementar GP-008…GP-010 como scouting, contratação, venda e empréstimo; remover jogadores fictícios e ações no-op do Mercado, preservando bloqueio quando o contexto oficial não estiver inicializado per US1/AC1 e FR-001/FR-010 (contradicts, CRITICAL)
- [ ] T041 Implementar GP-011…GP-016 como base, treino, medicina, finanças, infraestrutura e crises esportiva/financeira usando queries/commands oficiais per US1/AC1 e FR-010 (missing, CRITICAL)
- [ ] T042 Criar apresentação reutilizável dos estados loading/empty/partial-stale/offline/processing/success/domain-error/technical-error/forbidden/conflict/expired/maintenance e aplicá-la a cada fluxo sem fallback silencioso para seed per US1/AC2 e FR-007 (contradicts, CRITICAL)
- [x] T043 Integrar no mobile um orquestrador de command com idempotencyKey/correlationId, tracking até efeito oficial, preservação de input, confirmação proporcional ao risco e bloqueio de contrato incompatível per FR-003/FR-008/FR-014 — centralizado em `submitTrackedCommand` e integrado a onboarding, clube, mercado e partida
- [ ] T044 Integrar cache mobile segregado por account/world/control e OfflineIntentQueue persistida, limitada à whitelist/TTL e proibida para escalação final, mercado, finanças e demais ações irreversíveis per FR-005/FR-006/FR-009 e SC-005 (partial)
- [x] T045 Adicionar checks automatizados mobile para leitor de tela, nomes/estados acessíveis, foco, touch target, contraste e reduced motion nos fluxos críticos per FR-011 e SC-004 — auditoria executável + contrato de acessibilidade e contraste WCAG
- [ ] T046 Criar matriz e E2E executável no Expo para GP-001…GP-016, cobrindo success/loading/empty/error/blocked/offline e provando a cobertura das 114 telas mobile per SC-001/SC-003 (missing)
- [~] T047 Personalizar Clube (mobile): hero do clube clicável → modal com nome (checagem de unicidade local), cores primária/secundária/terciária, modelos de camisa 1/2 e escudo em SVG (`screens/club/customization/*` — catálogo espelhando os ids de C3), preview ao vivo, torcida (fanbaseSize de /narrative) e confirmação com aviso da queda de 10–15%. Dispara `club:command` UpdateClubVisualIdentity via `submitTrackedCommand`. Consome o backend de C3 (spec 004) e C10 (spec 015). NOTA: entregue como mudanças no working tree integradas ao WIP mobile (não commitado isoladamente, por escolha do dono do repo); typecheck/lint limpos nos arquivos novos.
- [~] T048 Interatividade jogável (delta 2026-07-15, working tree integrado ao WIP; avança T039/T040/T044):
  - Seed: `scripts/seed-demo-world.mjs` publica listings de mercado (genesis já entrega liga + 240 fixtures + manifests); query `competitions` expõe `fixtures`; query `market` enriquece listings/negociações com nome/posição do jogador.
  - Elenco persistente: titularidade oficial por slot (S01–S11) em `club-projection`; rascunho local `SET_LINEUP_DRAFT` em AsyncStorage (`squad/lineup-draft.ts`, sobrevive a refetch); "SALVAR" sincroniza via `club:command` Remove/AssignSquadSlot com `expectedVersion` encadeada (`squad/lineup-sync.ts` + testes). Verificado contra API real (troca S01↔S12, v1→v5).
  - Mercado jogável: busca por nome/posição; seção LISTADOS com cadeia `market:open-negotiation → submit-offer → accept-offer` (aceite rotulado DEMO — mundo sem IA vendedora), estados derivados em `market-state.ts` (`deriveListingAction`) + testes. Verificado contra API real (OPEN v0 → OFFERED v1 → ACCEPTED).
  - Área técnica in-match: `COACH_ACTIONS` (ATACAR/PRESSIONAR/CADENCIAR/RECUAR, delta ±6/±3) → `match:submit-command` com `expectedSequence` do runtime (`match-actions.ts` + testes); painel na tela de Partidas quando a partida é do clube gerenciado. Verificado contra API real (seq 1→2, motor avançou com efeito do delta).
  - Pendente para fechar T039/T040/T041: pós-aceite formalizar transferência (SAGA-01 via start-transfer/advance-transfer-step), GP-004/006 (temporada), GP-011–016 (base/treino/medicina/finanças/infra/crises), 12 estados unificados (T042) e E2E Expo (T046).
