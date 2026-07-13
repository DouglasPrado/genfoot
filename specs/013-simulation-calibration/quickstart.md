# Quickstart: validar calibração

## Prerequisites

M1 capabilities implementadas; Node 22/PNPM 10; espaço isolado para artefatos.

```bash
pnpm test -- --run validation
pnpm simulator validation:run --manifest specs/013-simulation-calibration/fixtures/smoke.yaml
pnpm simulator validation:report --batch-id <id>
pnpm simulator validation:gate --candidate <id>
```

1. Rodar smoke manifest duas vezes e comparar hashes.
2. Particionar em shards, retomar um shard interrompido e provar cobertura exata do seed set.
3. Injetar uma INV e uma banda fora do alvo; relatório/gate devem falhar.
4. Executar manifests completos R-34/R-88 e horizontes antes da promoção real.

**Expected**: manifest reproduzível, nenhum seed duplicado/omitido, raw e summary coerentes e NO-GO diante de qualquer ausência/falha. Commands/fixtures são saídas futuras; ausência não é PASS.
