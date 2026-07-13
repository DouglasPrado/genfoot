# Quickstart: Preparação e partida

Este guia valida GP-007; ele não implementa os bounded contexts dependentes.

## Prerequisites

- Node.js 22, PNPM 10 e dependências instaladas.
- Contratos verdes de BC-004, BC-005, BC-007, BC-008, X-001, X-002 e X-003.
- Mundo de teste isolado, seed `match-journey-001` e ruleset `1.0.0`.
- Implementação E2E no caminho `scripts/e2e/match-journey.test.ts`.

## Run

```bash
pnpm exec vitest run scripts/e2e/match-journey.test.ts
```

A ausência do teste ou de qualquer dependência é `FAIL`, não `SKIP`.

## Scenario 1 — Happy path

1. Prepare o estado inicial descrito em [data-model.md](data-model.md).
2. Execute agendar → preparar dossiê/treino/logística → definir escalação/tática/delegação → validar elegibilidade → congelar kickoff → simular ticks/decisões → finalizar resultado → homologar → aplicar fan-out e relatório.
3. Observe commands/events de [contracts/README.md](contracts/README.md).
4. Confirme: mesma seed, ruleset, manifesto e command log produzem o mesmo hash/result em todos os modos e um único fan-out oficial.

**Expected**: todos os steps terminam em `COMPLETED`, sem escrita fora dos owners e com correlação completa.

## Scenario 2 — Idempotent retry

Repita cada intent com o mesmo command/idempotency key após simular timeout.

**Expected**: retorno equivalente e zero duplicação de evento oficial, aggregate version ou efeito econômico.

## Scenario 3 — Failure and recovery

Injete falha após cada fronteira entre BC-004, BC-005, BC-007, BC-008, X-001, X-002 e X-003; retome a partir do último checkpoint ou execute a compensação prevista.

**Expected**: nenhum fato confirmado é apagado; a próxima ação/erro é observável e invariantes permanecem verdes.

## Scenario 4 — Isolation and determinism

Repita o cenário com referência de outro mundo e depois com os mesmos inputs/seed/ruleset.

**Expected**: referência cruzada é rejeitada antes de escrita; execução válida reproduz o mesmo resultado/hashes aplicáveis.

## Evidence required

Registrar revisão Git, commands, exit codes, seed, ruleset, contagens de efeitos por owner e resultado PASS/FAIL. Estado atual: nenhuma implementação do runtime autoritativo está entregue. Até todos os cenários passarem, GP-007 permanece PLANNED.
