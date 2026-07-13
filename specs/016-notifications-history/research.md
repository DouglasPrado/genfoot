# Research: notificações e memória

## Decision 1 — Inbox é persistente; canal é delivery

**Decision**: Notification existe independentemente de push/email; DeliveryAttempt registra canais.  
**Rationale**: indisponibilidade externa não perde informação.  
**Alternatives considered**: tratar push como registro foi rejeitado.

## Decision 2 — Checkpoint por stream/world

**Decision**: Inbox deduplica eventId e sequence detecta gaps.  
**Rationale**: at-least-once e ordem parcial exigem ambos.  
**Alternatives considered**: timestamp global e dedup só em memória rejeitados.

## Decision 3 — Reports versionados e as-of

**Decision**: definitionVersion + source versions + cutoff geram artifact imutável.  
**Rationale**: reproduzibilidade histórica.  
**Alternatives considered**: query “estado atual” sem provenance rejeitada.

## Decision 4 — Rebuild shadow/swap

**Decision**: reconstruir projeção paralela, comparar e trocar atomicamente.  
**Rationale**: evita leitura parcial e permite rollback.
