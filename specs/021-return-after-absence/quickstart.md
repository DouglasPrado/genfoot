# Quickstart: Retorno após ausência longa

Este guia valida GP-002; ele não implementa os bounded contexts dependentes.

## Prerequisites

- Node.js 22, PNPM 10 e dependências instaladas.
- Contratos verdes de BC-002, BC-011, X-001 e X-003.
- Mundo de teste isolado, seed `return-after-absence-001` e ruleset `1.0.0`.
- Implementação E2E no caminho `scripts/e2e/return-after-absence.test.ts`.

## Run

```bash
pnpm exec vitest run scripts/e2e/return-after-absence.test.ts
```

A ausência do teste ou de qualquer dependência é `FAIL`, não `SKIP`.

## Scenario 1 — Happy path

1. Prepare o estado inicial descrito em [data-model.md](data-model.md).
2. Execute detectar ausência → concluir catch-up → consolidar mudanças do mundo/clube → separar decisões automáticas e prazos → priorizar ações → retomar controle.
3. Observe commands/events de [contracts/README.md](contracts/README.md).
4. Confirme: o mesmo período de ausência processado novamente não duplica efeitos e produz resumo ordenado com todas as decisões automáticas e urgências.

**Expected**: todos os steps terminam em `COMPLETED`, sem escrita fora dos owners e com correlação completa.

## Scenario 2 — Idempotent retry

Repita cada intent com o mesmo command/idempotency key após simular timeout.

**Expected**: retorno equivalente e zero duplicação de evento oficial, aggregate version ou efeito econômico.

## Scenario 3 — Failure and recovery

Injete falha após cada fronteira entre BC-002, BC-011, X-001 e X-003; retome a partir do último checkpoint ou execute a compensação prevista.

**Expected**: nenhum fato confirmado é apagado; a próxima ação/erro é observável e invariantes permanecem verdes.

## Scenario 4 — Isolation and determinism

Repita o cenário com referência de outro mundo e depois com os mesmos inputs/seed/ruleset.

**Expected**: referência cruzada é rejeitada antes de escrita; execução válida reproduz o mesmo resultado/hashes aplicáveis.

## Evidence required

Registrar revisão Git, commands, exit codes, seed, ruleset, contagens de efeitos por owner e resultado PASS/FAIL. Estado atual: scheduler persistente e catch-up temporal idempotente existem; resumo, IA explicável e cliente ainda faltam. Até todos os cenários passarem, GP-002 permanece PARTIAL.
