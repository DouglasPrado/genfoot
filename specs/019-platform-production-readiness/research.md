# Research: prontidão de produção

## Decision 1 — Monólito modular e workers primeiro

**Decision**: escalar gateway/workers independentemente; broker dedicado/sharding só por gatilho medido.  
**Rationale**: reduz custo operacional prematuro.  
**Alternatives considered**: microsserviços/broker dedicado desde início rejeitados.

## Decision 2 — OpenTelemetry como correlação

**Decision**: trace/correlation/world IDs atravessam HTTP, jobs, events e logs; PII é mascarada.  
**Rationale**: incidentes cruzam processos.  
**Alternatives considered**: logs isolados sem contexto rejeitados.

## Decision 3 — Expand-contract e progressive delivery

**Decision**: migration/event/API compatíveis, canary e rollback/forward-fix.  
**Rationale**: versões coexistem e fatos novos não podem ser apagados.  
**Alternatives considered**: big-bang migration/deploy rejeitados.

## Decision 4 — Restore prova backup

**Decision**: restore periódico em conta/bucket/credenciais isolados, seguido de checks/replay.  
**Rationale**: backup existente não prova recuperação.  
**Alternatives considered**: inspeção de arquivo sem restore rejeitada.

## Decision 5 — Gate fail-closed

**Decision**: mesma release/ruleset deve ter G1–G8 PASS; missing/stale é NO-GO.  
**Rationale**: integridade não é compensável por outra métrica.
