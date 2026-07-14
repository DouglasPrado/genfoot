# Tasks: Simulação longa, calibração e promoção

**Input**: Design documents from `/specs/013-simulation-calibration/`
**Prerequisites**: Kernel de partida (BC-008) `DELIVERED`; fundação RNG.
**Tests**: Requeridos pela spec (P1/P2/P3) e pelo workflow TDD.

## Phase 1: Setup and contract freeze

- [x] T001 Congelar CLI/manifest/report/gate contracts em specs/013-simulation-calibration/contracts/README.md
- [x] T002 Reconciliar entidades (manifest, batch, scenario run, band/gate) em data-model.md
- [x] T003 Criar módulo transversal em packages/core/src/calibration/ e testes em packages/core/tests/calibration/

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 Tipos de manifesto/cenário/banda/relatório/decisão em packages/core/src/calibration/calibration-types.ts
- [x] T005 Reuso do kernel determinístico (BC-008) para rodar cada cenário
- [x] T006 Exportar contrato público de calibração em packages/core/src/index.ts

## Phase 3: User Story 1 — Provar temporadas longas sem corrupção (Priority: P1) 🎯 MVP

**Independent Test**: manifesto fixo produz relatório reproduzível; uma violação em qualquer seed mantém o gate FAIL sem ser mascarada por média.

- [x] T007 [US1] runCalibrationBatch determinístico (cada seed com resultHash/métricas/violações) + reportHash reproduzível
- [x] T008 [US1] Agregação com gate conjuntivo: violação de invariante em qualquer seed → FAIL (sem mascarar por média)
- [x] T009 [US1] Validação de manifesto (MANIFEST_INVALID) e seeds duplicadas (RUN_DUPLICATE)
- [x] T010 [US1] Testes P1 (reprodutibilidade, banda fora, violação não mascarada, manifesto inválido) em packages/core/tests/calibration/calibration.test.ts

**Checkpoint**: US1 funcional e testável isoladamente.

## Phase 4: User Story 2 — Calibrar partida/economia/demografia (Priority: P2)

- [x] T011 [US2] BandEvaluation BS/BE/BD PASS/FAIL por métrica agregada (goals, home win rate)
- [ ] T012 [US2] Bandas de economia/demografia sobre lotes multi-temporada (R-88) além de partida (R-34)
- [ ] T013 [US2] Reexecução recalibrada não altera evidências históricas (append-only por rulesetVersion)

## Phase 5: User Story 3 — Decisão de promoção conjuntiva (Priority: P3)

- [x] T014 [US3] evaluatePromotionGate G1–G8 conjuntivo (ausente/UNEVALUATED/FAIL → NO_GO; sem PARTIAL_GO)
- [ ] T015 [US3] EvidenceRefs/staleness (EVIDENCE_STALE) e PromotionDecision append-only com reviewers

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T016 [P] CLI validation:run/report/gate/replay + shard/resume em apps/simulator
- [ ] T017 Escala R-34 (~10k partidas/cenário) e persistência de artefatos
- [ ] T018 Rodar quickstart (pnpm typecheck && pnpm test) e promover evidência

## Implementation Strategy

- **Incremento atual**: US1 (harness determinístico + gate conjuntivo), núcleo de US2 (bandas de partida) e US3 (gate G1–G8 conjuntivo).
- **Pendente**: bandas economia/demografia multi-temporada (T012-T013), evidence staleness (T015), CLI/escala (T016-T017).

## Notes

- VAL-001 escreve somente artefatos de validação; não altera estado simulado.
- Determinismo total: mesmo manifesto → mesmos hashes; gate conjuntivo, sem PARTIAL_GO.
