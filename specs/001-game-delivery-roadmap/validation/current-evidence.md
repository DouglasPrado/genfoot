# Evidência atual das quatro fundações

**Audit date**: 2026-07-13  
**Commit auditado**: `9d639f209faf27a47bde4ec8fdf19032c65b68be`  
**Command de inventário**: `pnpm exec vitest list packages apps/simulator`  
**Resultado**: 47 testes identificados.

| Entrega               | Commit    | Código/provas locais                                                                  | Resultado      | Limite                                         |
| --------------------- | --------- | ------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------- |
| Kernel/backend        | `6445ac4` | `packages/shared`, foundation/world em `packages/core`, CLI/repositório JSON e testes | PASS histórico | não prova produto completo                     |
| Gênese determinística | `fe45240` | gerador/validator, 16 clubes, 368 jogadores, liga/fixtures e testes                   | PASS histórico | clubes/competição seguem PARTIAL               |
| Scheduler persistente | `fa43ae3` | season/scheduler, lease, fencing, retry/cancel, checkpoints e testes                  | PASS histórico | rollover completo não existe                   |
| Lifecycle diário      | `9d639f2` | geração, estado diário, evolução limitada, idempotência e testes                      | PASS histórico | treino, medicina, youth e aposentadoria faltam |

## Auditoria

Os quatro commits estão no histórico Git e os 47 testes de `packages` + `apps/simulator` são enumeráveis. Isso sustenta FND-001 DELIVERED e as fatias PARTIAL correspondentes, não G1–G8, M1 ou produção. O worktree documental atual é posterior ao commit; nova alegação executável exige observation para a revisão candidata.
