# Research: Competições e calendário

## Decision 1 — Owner e fronteira

**Decision**: C7 · Competição/Calendário é o único owner; relógio/temporada (C2), simulação/resultado bruto (C8), elenco (C3/C6) e pagamentos (C9) permanecem externos.  
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
**Rationale**: Existente: `world-genesis.test.ts` prova 16 clubes, 30 rodadas e 240 fixtures determinísticos. Pendente: todo comportamento posterior à gênese e formatos gerais.  
**Alternatives considered**: tratar documentação como entrega; rejeitado.

Todas as decisões necessárias para planejar foram resolvidas.
