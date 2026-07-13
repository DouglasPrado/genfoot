# Research: Staff

## Decision 1 — Owner e fronteira

**Decision**: C5 · Staff é o único owner; departamentos (C3), negociação/vínculo de jogador (C6), medicina de jogador (C4) e decisão da IA (X-001) permanecem externos.  
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

**Decision**: manter PLANNED.  
**Rationale**: Nenhuma evidência de implementação é alegada. Saída futura exige unidade, propriedade, contrato, integração e build verdes.  
**Alternatives considered**: tratar documentação como entrega; rejeitado.

Todas as decisões necessárias para planejar foram resolvidas.
