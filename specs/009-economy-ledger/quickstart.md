# Quickstart: Economia e ledger

## Prerequisites

Node 22, PNPM, baseline 2026-07-13, seed `validation-bc-009` e ruleset fixo.

## Current Evidence

Nenhuma entrega de ledger é alegada. Promoção requer propriedades de soma zero, concorrência de reservas, reconciliação longa e migração.

## Validation

```bash
pnpm typecheck
pnpm test
```

Execute os testes específicos de [plan.md](plan.md): P1 duas vezes com a mesma chave; falha após commit e recovery; outro world com a mesma data.

**Expected P1**: cada transação balanceia débitos/créditos, residual global é zero e oferta muda só por faucet/sink nomeado.  
**Expected P2**: reserva repetida não duplica saldo; liquidação/expiração/compensação ocorre uma vez.  
Duplicata, vazamento cross-world e reescrita histórica falham.

## Promotion

Aprovação documental não promove status; escopo alvo exige testes, build e relatório reproduzíveis.
