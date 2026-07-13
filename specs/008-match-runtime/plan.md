# Implementation Plan: Partida e runtime

**Feature**: [spec.md](spec.md) · **ID**: BC-008 · **Status**: PLANNED · **Date**: 2026-07-13

**Directory**: `specs/008-match-runtime` · **Branch**: pacote de design do roadmap mestre

## Summary

Entregar kickoff snapshot, escalação/tática, SimulationManifest, ticks, commands live/offline, F1–F21, checkpoints, replay, resultado e estatísticas sob C8 · Partida/Runtime, com determinismo, idempotência e compatibilidade.

## Technical Context

TypeScript 5, Node 22, PNPM/Turborepo; domínio/aplicação puros em packages; ports no core, PostgreSQL/Prisma em adapters; X-002 para integração; Vitest com unidade/propriedade/contrato/integração/replay; workers isolados por world.  
**Current vs target**: Não existe runtime de partida implementado; apenas RNG/fundação e a baseline documental. O alvo é todo o escopo com evidência verde.

## Constitution Check

Constituição placeholder; gates ratificados: domínio puro, determinismo, idempotência, owner único, isolamento, ruleset, inteiro/fixed-point em C9 e clientes não autoritativos. **Pre-design: PASS documental**.

## Project Structure

```text
specs/008-match-runtime/{spec.md,plan.md,research.md,data-model.md,quickstart.md}
specs/008-match-runtime/{contracts/README.md,checklists/requirements.md}
criar `packages/core/src/matches/**` e adapters de execução; testes em `packages/core/tests/matches/**`, golden replays e propriedades F1–F21
```

Domínio não importa adapter; integrations dependem só de contracts.

## Phase 0 — Research Outcome

[research.md](research.md) resolve ownership, versão, persistência e recovery; não há decisão aberta.

## Phase 1 — Design Outcome

[data-model.md](data-model.md), [contracts/README.md](contracts/README.md) e [quickstart.md](quickstart.md) fecham entidades/interfaces/validação. Migração é aditiva, com backfill reproduzível.

## Delivery Strategy & Evidence

1. Freeze schemas/invariantes; 2. aggregates/kernel P1; 3. adapters/outbox; 4. P2/recovery/E2E.  
   **Evidence**: Nenhuma evidência de runtime é alegada. FND-001 fornece PCG32/IDs/ruleset, mas partida permanece planejada.  
   Rollback desativa handler, preserva fatos e reprocessa projeção; não há reinterpretação histórica.

## Post-design Constitution Check

Owner/domínio, determinismo/isolamento e retry/compatibilidade: **PASS no desenho**. Escopo alvo: **PENDENTE**.

## Complexity Tracking

Sem exceções aceitas; coordenação distribuída permanece em X-002.
