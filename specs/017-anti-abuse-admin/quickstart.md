# Quickstart: validar anti-abuso/admin

## Prerequisites

C1/C9/C11/X-002, PostgreSQL/R2 de teste e identidades com papéis distintos.

```bash
pnpm test -- --run anti-abuse-admin
pnpm test -- --run audit-security
```

1. Entregar sinais duplicados e conferir score único/explicável.
2. Tentar autoaprovação e conflito de interesse; SoD deve negar.
3. Aprovar sanção com dois atores, recorrer e reverter sem apagar fatos.
4. Executar correction command com retry; owner muda uma vez.
5. Alterar fixture auditada e provar detecção da hash-chain.
6. Reprocessar DLQ e testar masking/retention/legal hold.

**Expected**: autorização estrita, cadeia íntegra, efeitos únicos e histórico/PII preservados. Ausência de testes executados mantém PLANNED.
