# Research: identidade e controle

## Decision 1 — Sessão com rotação e detecção de reúso

**Decision**: access curto e refresh family rotativa, armazenando hashes/revogações.  
**Rationale**: limita roubo e permite revogação auditável.  
**Alternatives considered**: refresh estático e JWT sem revogação foram rejeitados.

## Decision 2 — Unicidade no banco

**Decision**: constraints/locks garantem reservation/control únicos; aplicação traduz conflitos.  
**Rationale**: check-then-write não resiste à concorrência.  
**Alternatives considered**: lock só em Redis foi rejeitado.

## Decision 3 — Onboarding por SAGA-03

**Decision**: C1 coordena risk/elegibility/bootstrap por checkpoints e compensação.  
**Rationale**: owners são distintos.  
**Alternatives considered**: transação distribuída/escrita cruzada rejeitadas.

## Decision 4 — Histórico temporal

**Decision**: participation/control possuem intervalos, sem delete na troca.  
**Rationale**: memória/auditoria e cooldown dependem dos fatos.
