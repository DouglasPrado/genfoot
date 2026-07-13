# Quickstart: Jogador, desenvolvimento, saúde e base

## Prerequisites

Node 22, PNPM, baseline 2026-07-13, seed `validation-bc-004` e ruleset fixo.

## Current Evidence

Existente: `player-lifecycle.test.ts` cobre geração única, processamento diário e limite de potencial. Pendente: treino, fadiga/moral completos, medicina, base, aposentadoria e demografia longa.

## Validation

```bash
pnpm typecheck
pnpm test
```

Nos testes específicos de [plan.md](plan.md), execute P1 duas vezes com a mesma chave, injete falha após commit e retome; repita em outro world.

**Expected P1**: mesma seed/ruleset e carga produzem o mesmo histórico diário, sem ultrapassar potencial.  
**Expected P2**: lesão, recuperação, promoção e aposentadoria respeitam máquinas de estado e retry.  
Nenhuma duplicata, vazamento cross-world ou reescrita histórica é aceita.

## Promotion

Checklist documental não promove status. O escopo alvo exige testes/build/relatório verdes e reproduzíveis.
