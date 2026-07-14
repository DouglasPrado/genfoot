# Quickstart: validar calibração

## Prerequisites

M1 capabilities implementadas; Node 22/PNPM 10; espaço isolado para artefatos.
Os artefatos vão para `.grinta/simulator/validation` (ou `GRINTA_SIMULATOR_VALIDATION_DIR`).

```bash
# 1. Testes de calibração (core + CLI)
pnpm exec vitest run packages/core/tests/calibration apps/simulator/tests/validation-cli.test.ts

# 2. Rodar o smoke manifest e agregar o relatório reproduzível
pnpm simulator validation:run --manifest "$PWD/specs/013-simulation-calibration/fixtures/smoke.json"
pnpm simulator validation:report --batch-id smoke-2026-07

# 3. Replay determinístico de um cenário (100% de igualdade de hash)
pnpm simulator validation:replay --batch-id smoke-2026-07 --scenario s4

# 4. Gate conjuntivo G1–G8 com evidência versionada
pnpm simulator validation:gate --candidate v1 --gate-file <gate.json>
```

1. Rodar o smoke manifest e conferir `gateResult: PASS` e `reportHash` estável entre duas execuções.
2. Particionar em shards (`--shard i/n`), retomar com `--resume` e provar cobertura exata do seed set (nenhum seed duplicado/omitido).
3. Injetar uma INV (`maxTotalGoalsPerMatch` baixo) ou uma banda fora do alvo; `validation:report` retorna `gateResult: FAIL` sem mascarar pela média; run ausente reprova com `GATE_INCOMPLETE`.
4. Executar manifests completos R-34 (`matchesPerScenario` ~10.000) e R-88 (`runMultiSeasonBatch`, economia/demografia) antes de qualquer promoção real.
5. Evidência obsoleta (rulesetVersion divergente), ausente ou incompatível equivale a FAIL → `NO_GO`. Não existe `PARTIAL_GO`.

**Expected**: manifest reproduzível, nenhum seed duplicado/omitido, raw e summary coerentes com digest, evidência append-only por rulesetVersion e NO-GO diante de qualquer ausência/falha. Bandas são oráculos ratificados ao comportamento real do kernel — ausência não é PASS.
