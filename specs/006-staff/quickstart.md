# Quickstart: Staff

## Prerequisites

Node 22, PNPM, baseline 2026-07-13, seed `validation-bc-005` e ruleset fixo.

## Current Evidence

Nenhuma evidência de implementação é alegada. Saída futura exige unidade, propriedade, contrato, integração e build verdes.

## Validation

```bash
pnpm typecheck
pnpm test
```

Nos testes específicos de [plan.md](plan.md), execute P1 duas vezes com a mesma chave, injete falha após commit e retome; repita em outro world.

**Expected P1**: contratação válida cria um vínculo único e impede sobreposição incompatível.  
**Expected P2**: C4/C6/C8 recebem snapshot versionado de capacidade e não alteram StaffMember.  
Nenhuma duplicata, vazamento cross-world ou reescrita histórica é aceita.

## Promotion

Checklist documental não promove status. O escopo alvo exige testes/build/relatório verdes e reproduzíveis.
