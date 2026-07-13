# Research: Partida e runtime

## Decision 1 — Ownership

**Decision**: C8 · Partida/Runtime é o único owner; elegibilidade (C7), estado persistente do jogador (C4), staff (C5), ledger (C9) e apresentação (X-003) ficam externos.  
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
**Rationale**: Nenhuma evidência de runtime é alegada. FND-001 fornece PCG32/IDs/ruleset, mas partida permanece planejada.  
**Alternatives considered**: usar documentação como prova; rejeitado.

Todas as decisões para planejamento estão resolvidas.
