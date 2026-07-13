# Quickstart: Abandono ou troca de clube

Este guia valida GP-003; ele não implementa os bounded contexts dependentes.

## Prerequisites

- Node.js 22, PNPM 10 e dependências instaladas.
- Contratos verdes de BC-001, BC-011, BC-012, X-001 e X-003.
- Mundo de teste isolado, seed `club-exit-switch-001` e ruleset `1.0.0`.
- Implementação E2E no caminho `scripts/e2e/club-exit-switch.test.ts`.

## Run

```bash
pnpm exec vitest run scripts/e2e/club-exit-switch.test.ts
```

A ausência do teste ou de qualquer dependência é `FAIL`, não `SKIP`.

## Scenario 1 — Happy path

1. Prepare o estado inicial descrito em [data-model.md](data-model.md).
2. Execute avaliar risco → solicitar saída → encerrar controle → ativar gestão interina → aplicar cooldown/restrições → escolher novo clube elegível.
3. Observe commands/events de [contracts/README.md](contracts/README.md).
4. Confirme: a saída encerra exatamente um controle, mantém todos os fatos do clube, ativa IA imediatamente e bloqueia novo vínculo até elegibilidade.

**Expected**: todos os steps terminam em `COMPLETED`, sem escrita fora dos owners e com correlação completa.

## Scenario 2 — Idempotent retry

Repita cada intent com o mesmo command/idempotency key após simular timeout.

**Expected**: retorno equivalente e zero duplicação de evento oficial, aggregate version ou efeito econômico.

## Scenario 3 — Failure and recovery

Injete falha após cada fronteira entre BC-001, BC-011, BC-012, X-001 e X-003; retome a partir do último checkpoint ou execute a compensação prevista.

**Expected**: nenhum fato confirmado é apagado; a próxima ação/erro é observável e invariantes permanecem verdes.

## Scenario 4 — Isolation and determinism

Repita o cenário com referência de outro mundo e depois com os mesmos inputs/seed/ruleset.

**Expected**: referência cruzada é rejeitada antes de escrita; execução válida reproduz o mesmo resultado/hashes aplicáveis.

## Evidence required

Registrar revisão Git, commands, exit codes, seed, ruleset, contagens de efeitos por owner e resultado PASS/FAIL. Estado atual: nenhuma fatia executável do fluxo está entregue. Até todos os cenários passarem, GP-003 permanece PLANNED.
