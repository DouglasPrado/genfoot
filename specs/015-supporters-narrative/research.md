# Research: torcida e narrativa

## Decision 1 — Fact-driven e reproduzível

**Decision**: fatos oficiais + expectation snapshot + ruleset produzem mudanças e explicações.  
**Rationale**: narrativa não reinterpreta resultado retrospectivamente.  
**Alternatives considered**: consultar estado atual durante replay foi rejeitado.

## Decision 2 — Segmentos, não média única

**Decision**: SupporterSegment possui pesos e paciência próprios; snapshot agrega sem apagar dimensões.  
**Rationale**: reações heterogêneas são requisito do GDD.  
**Alternatives considered**: um mood global foi rejeitado.

## Decision 3 — Promessa/crise como state machines

**Decision**: prazos, avaliações e terminais são explícitos/idempotentes.  
**Rationale**: evita consequência repetida e arco preso.

## Decision 4 — Texto fora da autoridade

**Decision**: templates estruturados são canônicos; gerador só parafraseia facts/opções.  
**Rationale**: disponibilidade/aleatoriedade externa não pode mudar jogo.
