# Research: Eventing, sagas, projeções e realtime

## Decision 1 — Ownership

**Decision**: Concern · Eventing/Projeção é o único owner; regras/aggregates competitivos dos contexts e UI cliente (X-003) ficam externos.  
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

**Decision**: manter PARTIAL.  
**Rationale**: Existente: tipos de DomainEvent, eventos em memória e disciplina local de idempotência/checkpoint. Pendente: toda infraestrutura durável, sagas completas, projeções e realtime.  
**Alternatives considered**: usar documentação como prova; rejeitado.

Todas as decisões para planejamento estão resolvidas.
