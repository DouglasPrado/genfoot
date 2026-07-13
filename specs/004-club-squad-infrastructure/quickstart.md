# Quickstart: Clube, elenco e infraestrutura

## Prerequisites

- Node.js 22, PNPM e dependências instaladas.
- Baseline 2026-07-13, seed fixa `validation-bc-003` e ruleset explicitamente registrado.
- Leia [data-model.md](data-model.md) e [contracts/README.md](contracts/README.md).

## Current Evidence

Já reproduzível: gênese e invariantes básicos de 16 clubes/elencos em `world-genesis.test.ts`. Pendente: todos os aggregates e fluxos de gestão além da gênese.

## Validation Scenario 1 — P1

```bash
pnpm typecheck
pnpm test
```

Execute também os testes específicos nos caminhos definidos em [plan.md](plan.md). **Expected**: mudanças válidas preservam um único vínculo de slot e rejeitam versão concorrente; segunda execução não cria efeitos adicionais.

## Validation Scenario 2 — Recovery and History

1. Crie fixture com seed/ruleset fixos.
2. Interrompa depois de um commit/checkpoint e antes da confirmação do caller.
3. Retome com a mesma chave e compare eventos, versões e hashes.
4. Repita em outro `worldId`.

**Expected**: um projeto aprovado progride por etapas, cobra C9 por saga e só opera após inspeção; nenhum vazamento entre mundos e nenhum fato histórico reescrito.

## Promotion Rule

Para PARTIAL, somente o escopo listado como evidência atual pode sustentar a classificação. O escopo alvo permanece pendente até testes, build e relatório reproduzíveis ficarem verdes.
