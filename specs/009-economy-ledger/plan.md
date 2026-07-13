# Implementation Plan: Economia e ledger

**Feature**: [spec.md](spec.md) · **ID**: BC-009 · **Status**: PLANNED · **Date**: 2026-07-13

**Directory**: `specs/009-economy-ledger` · **Branch**: pacote de design do roadmap mestre

## Summary

Entregar contas, transações/entries dobradas, reservas, orçamento, folha, pagamentos, dívida, faucets/sinks, oferta e reconciliação sob C9 · Economia/Ledger, com determinismo, idempotência e compatibilidade.

## Technical Context

TypeScript 5, Node 22, PNPM/Turborepo; domínio/aplicação puros em packages; ports no core, PostgreSQL/Prisma em adapters; X-002 para integração; Vitest com unidade/propriedade/contrato/integração/replay; workers isolados por world.  
**Current vs target**: O ledger autoritativo e seus adapters ainda não existem no código; regras e bandas estão ratificadas nos docs. O alvo é todo o escopo com evidência verde.

## Constitution Check

Constituição placeholder; gates ratificados: domínio puro, determinismo, idempotência, owner único, isolamento, ruleset, inteiro/fixed-point em C9 e clientes não autoritativos. **Pre-design: PASS documental**.

## Project Structure

```text
specs/009-economy-ledger/{spec.md,plan.md,research.md,data-model.md,quickstart.md}
specs/009-economy-ledger/{contracts/README.md,checklists/requirements.md}
criar `packages/core/src/finance/**`, migrations/adapters em backend e testes `packages/core/tests/finance/**` com propriedades de conservação
```

Domínio não importa adapter; integrations dependem só de contracts.

## Phase 0 — Research Outcome

[research.md](research.md) resolve ownership, versão, persistência e recovery; não há decisão aberta.

## Phase 1 — Design Outcome

[data-model.md](data-model.md), [contracts/README.md](contracts/README.md) e [quickstart.md](quickstart.md) fecham entidades/interfaces/validação. Migração é aditiva, com backfill reproduzível.

## Delivery Strategy & Evidence

1. Freeze schemas/invariantes; 2. aggregates/kernel P1; 3. adapters/outbox; 4. P2/recovery/E2E.  
   **Evidence**: Nenhuma entrega de ledger é alegada. Promoção requer propriedades de soma zero, concorrência de reservas, reconciliação longa e migração.  
   Rollback desativa handler, preserva fatos e reprocessa projeção; não há reinterpretação histórica.

## Post-design Constitution Check

Owner/domínio, determinismo/isolamento e retry/compatibilidade: **PASS no desenho**. Escopo alvo: **PENDENTE**.

## Complexity Tracking

Sem exceções aceitas; coordenação distribuída permanece em X-002.
