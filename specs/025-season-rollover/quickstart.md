# Quickstart: Encerramento e virada de temporada

Este guia valida GP-006; ele não implementa os bounded contexts dependentes.

## Prerequisites

- Node.js 22, PNPM 10 e dependências instaladas.
- Contratos verdes de BC-002, BC-004, BC-006, BC-007, BC-008, BC-009, BC-011 e X-002.
- Mundo de teste isolado, seed `season-rollover-001` e ruleset `1.0.0`.
- Implementação E2E no caminho `scripts/e2e/season-rollover.test.ts`.

## Run

```bash
pnpm exec vitest run scripts/e2e/season-rollover.test.ts
```

A ausência do teste ou de qualquer dependência é `FAIL`, não `SKIP`.

## Scenario 1 — Happy path

1. Prepare o estado inicial descrito em [data-model.md](data-model.md).
2. Execute resolver partidas/recursos → homologar → confirmar títulos/acessos → pagar prêmios → avaliar gestão → processar contratos → aging/aposentadoria/youth → fechar economia/história → realocar divisões → criar/publicar nova temporada → abrir pré-temporada.
3. Observe commands/events de [contracts/README.md](contracts/README.md).
4. Confirme: uma falha injetada em cada checkpoint pode ser retomada sem duplicar prêmio, promoção, aposentadoria, geração ou nova temporada.

**Expected**: todos os steps terminam em `COMPLETED`, sem escrita fora dos owners e com correlação completa.

## Scenario 2 — Idempotent retry

Repita cada intent com o mesmo command/idempotency key após simular timeout.

**Expected**: retorno equivalente e zero duplicação de evento oficial, aggregate version ou efeito econômico.

## Scenario 3 — Failure and recovery

Injete falha após cada fronteira entre BC-002, BC-004, BC-006, BC-007, BC-008, BC-009, BC-011 e X-002; retome a partir do último checkpoint ou execute a compensação prevista.

**Expected**: nenhum fato confirmado é apagado; a próxima ação/erro é observável e invariantes permanecem verdes.

## Scenario 4 — Isolation and determinism

Repita o cenário com referência de outro mundo e depois com os mesmos inputs/seed/ruleset.

**Expected**: referência cruzada é rejeitada antes de escrita; execução válida reproduz o mesmo resultado/hashes aplicáveis.

## Evidence required

Registrar revisão Git, commands, exit codes, seed, ruleset, contagens de efeitos por owner e resultado PASS/FAIL. Estado atual: `SeasonDue`, scheduler, lease/fencing/retry e checkpoints básicos existem; SAGA-02 completa e domínios consumidores faltam. Até todos os cenários passarem, GP-006 permanece PARTIAL.
