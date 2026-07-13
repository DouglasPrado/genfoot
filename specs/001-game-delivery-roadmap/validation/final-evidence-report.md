# Relatório final de rastreabilidade e evidência

**Run date**: 2026-07-13  
**Candidate commit**: `9d639f209faf27a47bde4ec8fdf19032c65b68be`  
**Decision**: **NO-GO para promoção do portfólio**; infraestrutura de validação está verde, evidência de produto permanece incompleta.

## Validator results

| Check                       | Result | Observed output                                    |
| --------------------------- | ------ | -------------------------------------------------- |
| Testes de roadmap/evidência | PASS   | 2 files, 10 tests                                  |
| Feature index/schema        | PASS   | 34 features válidas                                |
| Coverage                    | PASS   | 12 contexts, 3 concerns, 16 golden paths, 34 total |
| Dependency graph            | PASS   | 34 nodes, 163 edges, zero cycles                   |
| Source references           | PASS   | zero MISSING_SOURCE/STALE_SOURCE no registry       |
| Evidence effectiveness      | FAIL   | 37 blocking observations ausentes                  |

A falha de evidência é esperada e correta: slots planejados não são promovidos implicitamente.

## Feature-by-feature

| Feature | Catalog status | Traceability       | Evidence                          | Effective result |
| ------- | -------------- | ------------------ | --------------------------------- | ---------------- |
| FND-001 | DELIVERED      | PASS (fonte/index) | 4 PASS                            | **PASS**         |
| BC-001  | PLANNED        | PASS (fonte/index) | TEST ausente                      | **FAIL**         |
| BC-002  | PARTIAL        | PASS (fonte/index) | 1 PASS + TEST ausente             | **FAIL**         |
| BC-003  | PARTIAL        | PASS (fonte/index) | 1 PASS + TEST ausente             | **FAIL**         |
| BC-004  | PARTIAL        | PASS (fonte/index) | 1 PASS + TEST ausente             | **FAIL**         |
| BC-005  | PLANNED        | PASS (fonte/index) | TEST ausente                      | **FAIL**         |
| BC-006  | PLANNED        | PASS (fonte/index) | TEST ausente                      | **FAIL**         |
| BC-007  | PARTIAL        | PASS (fonte/index) | 1 PASS + TEST ausente             | **FAIL**         |
| BC-008  | PLANNED        | PASS (fonte/index) | TEST ausente                      | **FAIL**         |
| BC-009  | PLANNED        | PASS (fonte/index) | TEST ausente                      | **FAIL**         |
| BC-010  | PLANNED        | PASS (fonte/index) | TEST ausente                      | **FAIL**         |
| BC-011  | PLANNED        | PASS (fonte/index) | TEST ausente                      | **FAIL**         |
| BC-012  | PLANNED        | PASS (fonte/index) | TEST ausente                      | **FAIL**         |
| X-001   | PLANNED        | PASS (fonte/index) | TEST ausente                      | **FAIL**         |
| X-002   | PARTIAL        | PASS (fonte/index) | 1 PASS + TRACE/MIGRATION ausentes | **FAIL**         |
| X-003   | PLANNED        | PASS (fonte/index) | TEST/BUILD ausentes               | **FAIL**         |
| VAL-001 | PLANNED        | PASS (fonte/index) | REPORT ausente                    | **FAIL**         |
| OPS-001 | PLANNED        | PASS (fonte/index) | LOAD/SECURITY/GAMEDAY ausentes    | **FAIL**         |
| GP-001  | PLANNED        | PASS (fonte/index) | E2E TEST ausente                  | **FAIL**         |
| GP-002  | PARTIAL        | PASS (fonte/index) | 1 PASS + E2E TEST ausente         | **FAIL**         |
| GP-003  | PLANNED        | PASS (fonte/index) | E2E TEST ausente                  | **FAIL**         |
| GP-004  | PARTIAL        | PASS (fonte/index) | 1 PASS + E2E TEST ausente         | **FAIL**         |
| GP-005  | PARTIAL        | PASS (fonte/index) | 1 PASS + E2E TEST ausente         | **FAIL**         |
| GP-006  | PARTIAL        | PASS (fonte/index) | 1 PASS + E2E TEST ausente         | **FAIL**         |
| GP-007  | PLANNED        | PASS (fonte/index) | E2E TEST ausente                  | **FAIL**         |
| GP-008  | PLANNED        | PASS (fonte/index) | E2E TEST ausente                  | **FAIL**         |
| GP-009  | PLANNED        | PASS (fonte/index) | E2E TEST ausente                  | **FAIL**         |
| GP-010  | PLANNED        | PASS (fonte/index) | E2E TEST ausente                  | **FAIL**         |
| GP-011  | PARTIAL        | PASS (fonte/index) | 1 PASS + E2E TEST ausente         | **FAIL**         |
| GP-012  | PLANNED        | PASS (fonte/index) | E2E TEST ausente                  | **FAIL**         |
| GP-013  | PLANNED        | PASS (fonte/index) | E2E TEST ausente                  | **FAIL**         |
| GP-014  | PLANNED        | PASS (fonte/index) | E2E TEST ausente                  | **FAIL**         |
| GP-015  | PLANNED        | PASS (fonte/index) | E2E TEST ausente                  | **FAIL**         |
| GP-016  | PLANNED        | PASS (fonte/index) | E2E TEST ausente                  | **FAIL**         |

## Gate summary

- **M0/FND-001**: evidência histórica localizada para kernel, gênese, scheduler e lifecycle; PASS limitado à fundação auditada.
- **M1**: FAIL; contexts headless, R-34/R-88, BS/BE/BD e G1–G7 não possuem observations completas.
- **M2**: FAIL; migrations DB-01…16, Outbox/Inbox/sagas e backend autoritativo não estão comprovados.
- **M3**: FAIL; GP-001…016, clientes e acessibilidade não têm E2E completo.
- **M4/G1–G8**: FAIL; carga, segurança, restore/DR e release candidata não têm observations.

## Reproduction

```bash
pnpm exec vitest run scripts/roadmap/validate-feature-roadmap.test.ts scripts/roadmap/validate-evidence.test.ts
node scripts/roadmap/validate-feature-index.mjs --index specs/001-game-delivery-roadmap/contracts/feature-index.yaml --schema specs/001-game-delivery-roadmap/contracts/feature-index.schema.json
node scripts/roadmap/validate-coverage.mjs --index specs/001-game-delivery-roadmap/contracts/feature-index.yaml --source-map specs/001-game-delivery-roadmap/contracts/source-map.md
node scripts/roadmap/validate-dependency-graph.mjs --graph specs/001-game-delivery-roadmap/contracts/dependency-graph.yaml
node scripts/roadmap/validate-evidence.mjs --registry specs/001-game-delivery-roadmap/contracts/evidence-registry.yaml --root .
```

Os quatro primeiros comandos devem sair com zero. O último deve sair com 1 e listar os 37 slots bloqueantes ausentes até que evidências reais os preencham. Esse exit code é o gate, não defeito do validador.
