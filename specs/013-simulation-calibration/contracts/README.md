# Contracts: VAL-001

## CLI

- `validation:run --manifest <path> [--shard i/n] [--resume]`
- `validation:report --batch-id <id>`
- `validation:gate --candidate <id>`
- `validation:replay --scenario-run <id>`

## Manifest contract

Exige commitSha, rulesetVersion, immutable seedSet, scenarios, stream policy, toolchain, expected criteria e output location. Digest identifica o candidato.

## Report contract

Inclui runs esperados/executados/falhos, hashes, INV counts, BS/BE/BD evaluations, raw artifact digests e environment. Run faltante falha o report.

## Gate contract

Cada G1–G8 contém criterionRefs, evidenceRefs e PASS/FAIL. Resultado global é conjunção; não existe PARTIAL_GO.

## Errors

`MANIFEST_INVALID`, `SEED_MISSING`, `RUN_DUPLICATE`, `HASH_MISMATCH`, `INVARIANT_VIOLATED`, `BAND_OUTSIDE`, `EVIDENCE_STALE`, `GATE_INCOMPLETE`.
