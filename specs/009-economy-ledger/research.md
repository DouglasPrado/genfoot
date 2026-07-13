# Research: Economia e ledger

## Decision 1 — Ownership

**Decision**: C9 · Economia/Ledger é o único owner; decisão de gasto do clube (C3), termos contratuais (C5/C6), torcida (C10) e sanção (C12) ficam externos.  
**Rationale**: impede escrita cruzada.  
**Alternatives considered**: tabela compartilhada e transação distribuída; rejeitadas.

## Decision 2 — Replay/versioning

**Decision**: data, seed/stream, ruleset e schemas são explícitos e históricos.  
**Rationale**: reprodução e auditoria.  
**Alternatives considered**: relógio/RNG global e regra atual; rejeitados.

## Decision 3 — Consistency

**Decision**: optimistic concurrency, idempotency key, commit local+outbox e checkpoint/fencing.  
**Rationale**: retry seguro.  
**Alternatives considered**: last-write-wins e lock global; rejeitados.

## Decision 4 — Status

**Decision**: manter PLANNED.  
**Rationale**: Nenhuma entrega de ledger é alegada. Promoção requer propriedades de soma zero, concorrência de reservas, reconciliação longa e migração.  
**Alternatives considered**: usar documentação como prova; rejeitado.

Todas as decisões para planejamento estão resolvidas.
