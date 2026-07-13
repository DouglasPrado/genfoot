# Research: anti-abuso e administração

## Decision 1 — Score abre caso, não condena

**Decision**: policy versionada produz assessment explicável; sanções graves exigem revisão.  
**Rationale**: reduz falso positivo e decisão opaca.  
**Alternatives considered**: ban automático por score foi rejeitado.

## Decision 2 — Quatro-olhos e SoD

**Decision**: requester/approver/reviewer obedecem matriz e conflito de interesse.  
**Rationale**: admin privilegiado também é risco.  
**Alternatives considered**: role única omnipotente rejeitada.

## Decision 3 — Correção como command

**Decision**: C12 aprova; owner executa compensação e publica fato.  
**Rationale**: preserva invariantes/ownership.  
**Alternatives considered**: update SQL direto rejeitado.

## Decision 4 — Audit chain + arquivo imutável

**Decision**: eventos encadeados, verificados e periodicamente ancorados/arquivados WORM.  
**Rationale**: detecta adulteração inclusive interna.
