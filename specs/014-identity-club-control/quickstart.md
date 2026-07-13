# Quickstart: validar identidade e controle

## Prerequisites

M1/VAL-001 verdes; PostgreSQL/Redis de teste; contratos C3/C12/X-002.

```bash
pnpm test -- --run identity
pnpm test -- --run identity-concurrency
```

1. Registrar, autenticar, rotacionar refresh e tentar reutilizá-lo.
2. Concorrer duas contas pela mesma vaga; confirmar uma só.
3. Falhar SAGA-03 após reserva e provar compensação/retry.
4. Enviar command com world/control incorretos e provar negação.
5. Encerrar controle, testar cooldown e nova elegibilidade sem perder histórico.

**Expected**: família revogada no reúso, unicidade real, saga recuperável, isolamento total e histórico temporal intacto. Suites serão implementadas; ausência não conta PASS.
