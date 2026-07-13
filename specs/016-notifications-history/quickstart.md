# Quickstart: validar notificações e memória

## Prerequisites

X-002 durável, PostgreSQL/Redis de teste e fixtures C2/C8/C10.

```bash
pnpm test -- --run notifications-history
```

1. Consumir fixture com duplicata/gap; provar dedup e checkpoint bloqueado.
2. Recuperar gap e confirmar sequência sem item extra.
3. Falhar delivery, retry e DLQ; inbox permanece uma só.
4. Gerar reports/timelines, apagar projeção, rebuild shadow e comparar hashes.
5. Testar world/account/control incorretos e anonimização.

**Expected**: zero duplicata, gaps visíveis, rebuild equivalente, provenance completa e acesso isolado. Evidência só passa após execução.
