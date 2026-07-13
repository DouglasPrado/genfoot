# Implementation Plan: Eventing, sagas, projeções e realtime

**Feature**: [spec.md](spec.md) · **ID**: X-002 · **Status**: PARTIAL · **Date**: 2026-07-13

**Directory**: `specs/010-eventing-sagas-projections` · **Branch**: pacote de design do roadmap mestre

## Summary

Entregar event registry/envelope, outbox/inbox/DLQ, ordenação, idempotência, process managers SAGA-01…05, replay, projeções e entrega realtime recuperável sob Concern · Eventing/Projeção, com determinismo, idempotência e compatibilidade.

## Technical Context

TypeScript 5, Node 22, PNPM/Turborepo; domínio/aplicação puros em packages; ports no core, PostgreSQL/Prisma em adapters; X-002 para integração; Vitest com unidade/propriedade/contrato/integração/replay; workers isolados por world.  
**Current vs target**: Eventos de domínio em memória, chaves/checkpoints locais e scheduler persistente existem; broker, outbox/inbox/DLQ, sagas duráveis, projeções e realtime não. O alvo é todo o escopo com evidência verde.

## Constitution Check

Constituição placeholder; gates ratificados: domínio puro, determinismo, idempotência, owner único, isolamento, ruleset, inteiro/fixed-point em C9 e clientes não autoritativos. **Pre-design: PASS documental**.

## Project Structure

```text
specs/010-eventing-sagas-projections/{spec.md,plan.md,research.md,data-model.md,quickstart.md}
specs/010-eventing-sagas-projections/{contracts/README.md,checklists/requirements.md}
criar pacotes/adapters `packages/eventing/**` e workers/backend; testes de contrato, falha injetada, concorrência, replay e websocket recovery
```

Domínio não importa adapter; integrations dependem só de contracts.

## Phase 0 — Research Outcome

[research.md](research.md) resolve ownership, versão, persistência e recovery; não há decisão aberta.

## Phase 1 — Design Outcome

[data-model.md](data-model.md), [contracts/README.md](contracts/README.md) e [quickstart.md](quickstart.md) fecham entidades/interfaces/validação. Migração é aditiva, com backfill reproduzível.

## Delivery Strategy & Evidence

1. Freeze schemas/invariantes; 2. aggregates/kernel P1; 3. adapters/outbox; 4. P2/recovery/E2E.  
   **Evidence**: Existente: tipos de DomainEvent, eventos em memória e disciplina local de idempotência/checkpoint. Pendente: toda infraestrutura durável, sagas completas, projeções e realtime.  
   Rollback desativa handler, preserva fatos e reprocessa projeção; não há reinterpretação histórica.

## Post-design Constitution Check

Owner/domínio, determinismo/isolamento e retry/compatibilidade: **PASS no desenho**. Escopo alvo: **PARCIAL**.

## Complexity Tracking

Sem exceções aceitas; coordenação distribuída permanece em X-002.
