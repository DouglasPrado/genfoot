# Quickstart: validar produção

## Prerequisites

M3 verde, release/ruleset congelados, ambiente isolado representativo e owners de gameday.

```bash
pnpm test
pnpm build
pnpm test:load
pnpm test:security
pnpm gameday:restore
pnpm gameday:deploy-rollback
```

1. Injetar falhas e provar alert/correlation/read-only/runbook.
2. Rodar load/soak no perfil doc18 e medir SLO/custo/backpressure.
3. Executar security/privacy suite e resolver achados bloqueantes.
4. Restaurar backup em storage/credenciais isolados; verificar ledger/audit/replay e RPO/RTO.
5. Exercitar DR regional.
6. Fazer canary, provocar regressão e rollback sem perda.
7. Avaliar G1–G8 para mesma release/ruleset.

**Expected**: todos os comandos/evidências bloqueantes PASS e go/no-go GO. Os scripts são saídas futuras; comando ausente/falho mantém NO-GO.
