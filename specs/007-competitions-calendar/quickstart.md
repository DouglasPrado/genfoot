# Quickstart: Competições e calendário

## Prerequisites

Node 22, PNPM, baseline 2026-07-13, seed `validation-bc-007` e ruleset fixo.

## Current Evidence

Existente: `world-genesis.test.ts` prova 16 clubes, 30 rodadas e 240 fixtures determinísticos. Pendente: todo comportamento posterior à gênese e formatos gerais.

## Validation

```bash
pnpm typecheck
pnpm test
```

Nos testes específicos de [plan.md](plan.md), execute P1 duas vezes com a mesma chave, injete falha após commit e retome; repita em outro world.

**Expected P1**: mesmo formato/participantes/seed gera fixtures válidas sem colisão e com descanso mínimo.  
**Expected P2**: resultados únicos atualizam standings e somente edição completa pode ser homologada.  
Nenhuma duplicata, vazamento cross-world ou reescrita histórica é aceita.

## Promotion

Checklist documental não promove status. O escopo alvo exige testes/build/relatório verdes e reproduzíveis.
