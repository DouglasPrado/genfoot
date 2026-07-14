# Tasks: Automação e IA decisória

**Input**: Design documents from `/specs/012-automation-ai/`
**Prerequisites**: Projeções versionadas dos contexts; X-002 para transporte.
**Tests**: Requeridos pela spec (P1/P2/P3) e pelo workflow TDD.

## Phase 1: Setup and contract freeze

- [x] T001 Congelar command/query/event/error schemas em specs/012-automation-ai/contracts/README.md
- [x] T002 Reconciliar entidades (regra, contexto/decisão, execução) em data-model.md
- [x] T003 Criar módulo do concern em packages/core/src/automation/ e testes em packages/core/tests/automation/

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 IDs branded, regra/proposta/execução e eventos em packages/core/src/automation/automation-types.ts
- [x] T005 [P] AutomationRepository (optimistic concurrency) em packages/core/src/automation/automation-repository.ts
- [x] T006 Bootstrap de mundo vazio (initialize/fromSnapshot) em packages/core/src/automation/world-automation.ts
- [x] T007 Exportar contrato público do concern em packages/core/src/index.ts

## Phase 3: User Story 1 — Manter clubes autônomos competitivos (Priority: P1) 🎯 MVP

**Independent Test**: duas temporadas com seeds/ruleset iguais → command logs e hashes idênticos, sem command inválido ou escrita direta.

- [x] T008 [US1] EvaluateDecision determinístico (escolha por score + tie-break por seedStream/hash) + DecisionProposed
- [x] T009 [US1] Explicação reproduzível (chosen/alternatives/factors) na DecisionProposal
- [x] T010 [US1] ExecuteDecisionProposal emite o command oficial uma vez (SUBMITTED/REJECTED) sem escrita direta
- [x] T011 [US1] Testes P1 (determinismo, NO_VALID_OPTION, execução única) em packages/core/tests/automation/automation.test.ts

**Checkpoint**: US1 funcional e testável isoladamente.

## Phase 4: User Story 2 — Delegar com limites visíveis (Priority: P2)

**Independent Test**: ativar/limitar/revogar regra; precedência humana, desativação na troca de controlador e nenhum efeito fora do escopo.

- [x] T012 [US2] Ciclo da regra: Create/Activate/Suspend/Revoke (DRAFT→ACTIVE→SUSPENDED→REVOKED) + AutomationRuleActivated
- [x] T013 [US2] Desativação na troca de controle (AutomationDisabledOnControlChange) idempotente
- [ ] T014 [US2] Precedência humana explícita (bloquear automação quando há decisão humana conflitante recente)
- [ ] T015 [US2] Escopo/risco: aplicar apenas ações de baixo risco automaticamente; alto risco vira proposta pendente

## Phase 5: User Story 3 — Explicar decisões (Priority: P3)

- [ ] T016 [US3] GetDecisionExplanation para Strategic/Squad/Match/Narrative sem revelar conhecimento oculto
- [ ] T017 [US3] Filtro KNOWLEDGE_FORBIDDEN sobre projeções (só fatos autorizados entram na decisão)

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T018 [P] Adapter de persistência + submissão dos commands via owners (revalidação) em apps/simulator
- [ ] T019 Rodar quickstart (pnpm typecheck && pnpm test) e promover evidência

## Implementation Strategy

- **Incremento atual**: US1 (motor de decisão determinístico + execução única) e núcleo de US2 (ciclo de regra + desativação na troca de controle).
- **Pendente**: precedência humana e escopo/risco (T014-T015), explicação/knowledge filter (T016-T017), adapter (T018).

## Notes

- A IA usa apenas os mesmos commands humanos e projeções autorizadas; o owner receptor revalida tudo.
- Decisões determinísticas por seedStream; toda escrita carrega `worldId`, versão, chave idempotente e ruleset.
