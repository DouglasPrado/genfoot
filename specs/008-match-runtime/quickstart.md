# Quickstart: Partida e runtime

## Prerequisites

Node 22, PNPM, baseline 2026-07-13, seed `validation-bc-008` e ruleset fixo.

## Current Evidence

Nenhuma evidência de runtime é alegada. FND-001 fornece PCG32/IDs/ruleset, mas partida permanece planejada.

## Validation

```bash
pnpm typecheck
pnpm test
```

Execute os testes específicos de [plan.md](plan.md): P1 duas vezes com a mesma chave; falha após commit e recovery; outro world com a mesma data.

**Expected P1**: automático, online e offline com mesmo manifesto/log produzem resultHash e statsHash iguais.  
**Expected P2**: checkpoint retomado e replay integral convergem, rejeitando command fora da janela/sequence.  
Duplicata, vazamento cross-world e reescrita histórica falham.

## Promotion

Aprovação documental não promove status; escopo alvo exige testes, build e relatório reproduzíveis.
