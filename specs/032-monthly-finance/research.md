# Research: Ciclo financeiro mensal

## Decision — Ledger dobrado append-only

**Rationale**: conserva valor e permite auditoria/rebuild.  
**Alternatives considered**: update direto de saldo, rejeitado.

## Decision — Competência e origem formam idempotência

**Rationale**: retries não duplicam folha/receita.  
**Alternatives considered**: dedupe apenas temporal, rejeitado.

## Decision — Forecast é projeção

**Rationale**: projeções podem ser reconstruídas e não mudam fatos.  
**Alternatives considered**: forecast autoritativo no ledger, rejeitado.
