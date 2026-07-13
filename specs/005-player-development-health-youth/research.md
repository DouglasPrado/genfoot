# Research: Jogador, desenvolvimento, saúde e base

## Decision 1 — Owner e fronteira

**Decision**: C4 · Jogador/Desenvolvimento é o único owner; vínculo/contrato (C6), inscrição (C7), staff (C5) e runtime da partida (C8) permanecem externos.  
**Rationale**: evita escrita cruzada.  
**Alternatives considered**: tabelas e services compartilhados; rejeitados.

## Decision 2 — Determinismo

**Decision**: data lógica, seed/stream e ruleset são explícitos; histórico fixa a versão usada.  
**Rationale**: replay e auditoria.  
**Alternatives considered**: relógio/RNG global e regra atual sobre fatos antigos; rejeitados.

## Decision 3 — Consistência

**Decision**: optimistic concurrency, idempotency key, transação local+outbox e checkpoints.  
**Rationale**: retry seguro sem transação distribuída.  
**Alternatives considered**: last-write-wins e commit entre contexts; rejeitados.

## Decision 4 — Evidência

**Decision**: manter PARTIAL.  
**Rationale**: Existente: `player-lifecycle.test.ts` cobre geração única, processamento diário e limite de potencial. Pendente: treino, fadiga/moral completos, medicina, base, aposentadoria e demografia longa.  
**Alternatives considered**: tratar documentação como entrega; rejeitado.

Todas as decisões necessárias para planejar foram resolvidas.
