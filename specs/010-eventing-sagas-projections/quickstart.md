# Quickstart: Eventing, sagas, projeções e realtime

## Prerequisites

Node 22, PNPM, baseline 2026-07-13, seed `validation-x-002` e ruleset fixo.

## Current Evidence

Existente: tipos de DomainEvent, eventos em memória e disciplina local de idempotência/checkpoint. Pendente: toda infraestrutura durável, sagas completas, projeções e realtime.

## Validation

```bash
pnpm typecheck
pnpm test
```

Execute os testes específicos de [plan.md](plan.md): P1 duas vezes com a mesma chave; falha após commit e recovery; outro world com a mesma data.

**Expected P1**: commit+outbox sobrevivem falha e deliveries duplicados geram um único efeito por consumer.  
**Expected P2**: SAGA-01…05 retomam por checkpoint/fencing; projeção e cliente recuperam gap por cursor.  
Duplicata, vazamento cross-world e reescrita histórica falham.

## Promotion

Aprovação documental não promove status; escopo alvo exige testes, build e relatório reproduzíveis.
