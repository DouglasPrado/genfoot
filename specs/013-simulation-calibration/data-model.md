# Data model: simulação e calibração

| Entity             | Fields                                                   | Rules                  |
| ------------------ | -------------------------------------------------------- | ---------------------- |
| SimulationManifest | id/hash, commit, ruleset, scenarios, seedSet, toolchain  | imutável               |
| SeedSet            | id/hash, orderedSeeds, streamPolicy                      | integral/versionado    |
| BatchRun           | id, manifestHash, shardPlan, status, timestamps          | resume sem duplicação  |
| ScenarioRun        | batchId, scenario, seed, resultHash, metrics, violations | exatamente um terminal |
| MetricObservation  | metricId, value, unit, dimensions                        | mantém granularidade   |
| BandEvaluation     | oracleVersion, bandId, observed, result                  | PASS/FAIL explícito    |
| GateEvaluation     | G1…G8, evidenceRefs, result                              | ausência=FAIL          |
| PromotionDecision  | candidate, gates, GO/NO_GO, reviewers                    | append-only            |

```text
Batch: PLANNED -> RUNNING -> COMPLETED | FAILED | CANCELLED
Gate: UNEVALUATED -> PASS | FAIL; mudança de input gera nova avaliação
```

VAL-001 escreve somente artefatos de validação; não altera estado simulado.
