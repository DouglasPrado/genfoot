# Quickstart: Domain Kernel e simulador determinístico

## Prerequisites

- Node.js 22, PNPM e dependências instaladas.
- Baseline 2026-07-13, seed fixa `validation-fnd-001` e ruleset explicitamente registrado.
- Leia [data-model.md](data-model.md) e [contracts/README.md](contracts/README.md).

## Current Evidence

Testes em `packages/shared/tests`, `packages/core/tests` e `apps/simulator/tests`; `pnpm test`, `pnpm typecheck` e smoke do CLI. O status entregue refere-se somente a este escopo.

## Validation Scenario 1 — P1

```bash
pnpm typecheck
pnpm test
```

Execute também os testes específicos nos caminhos definidos em [plan.md](plan.md). **Expected**: duas execuções com a mesma seed e ruleset produzem snapshots e IDs equivalentes; segunda execução não cria efeitos adicionais.

## Validation Scenario 2 — Recovery and History

1. Crie fixture com seed/ruleset fixos.
2. Interrompa depois de um commit/checkpoint e antes da confirmação do caller.
3. Retome com a mesma chave e compare eventos, versões e hashes.
4. Repita em outro `worldId`.

**Expected**: um snapshot suportado é lido, avançado e regravado atomicamente sem apagar histórico; nenhum vazamento entre mundos e nenhum fato histórico reescrito.

## Promotion Rule

Para DELIVERED, somente o escopo listado como evidência atual pode sustentar a classificação. O escopo alvo permanece pendente até testes, build e relatório reproduzíveis ficarem verdes.
