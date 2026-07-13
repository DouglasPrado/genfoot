# Implementation Plan: Competições e calendário

**Feature**: [spec.md](spec.md) · **ID**: BC-007 · **Status**: PARTIAL · **Date**: 2026-07-13

**Directory**: `specs/007-competitions-calendar` · **Branch**: pacote de design do roadmap mestre

## Summary

Implementar CompetitionFormat, edição/temporada, participantes, fases, inscrição, fixtures, standings, disciplina, promoção/rebaixamento e homologação sob C7 · Competição/Calendário, preservando determinismo, ownership e histórico.

## Technical Context

TypeScript 5/Node 22; domínio e aplicação em `packages/core`; tipos mínimos em `packages/shared`; ports no core e PostgreSQL/Prisma nos adapters; integração por X-002; Vitest com unidade, propriedade, contrato, integração e replay; escala por `worldId` e workers idempotentes.

**Current vs target**: A gênese cria uma liga de 16 clubes, 30 rodadas e 240 jogos ida/volta; formatos por dados, inscrição, standings, disciplina e homologação estão pendentes. O alvo inclui todo o escopo e evidências pendentes.

## Constitution Check

A constituição é placeholder. Gates ratificados usados: domínio puro, determinismo/replay, idempotência, owner único, isolamento, ruleset e dinheiro somente em C9. **Pre-design: PASS documental**.

## Project Structure

```text
specs/007-competitions-calendar/{spec.md,plan.md,research.md,data-model.md,quickstart.md}
specs/007-competitions-calendar/{contracts/README.md,checklists/requirements.md}
evoluir genesis e criar `packages/core/src/competitions/**`; testes de propriedade do calendário e integração C2/C8 em `packages/core/tests/competitions/**`
```

Domínio não importa adapters. Persistência, transporte e consumers dependem dos contratos versionados.

## Phase 0 — Research Outcome

[research.md](research.md) fixa owner, concorrência, integração e estratégia de versão; não restam decisões técnicas abertas.

## Phase 1 — Design Outcome

[data-model.md](data-model.md), [contracts/README.md](contracts/README.md) e [quickstart.md](quickstart.md) fecham entidades, interfaces e validação. Migrações são aditivas, com backfill reproduzível e readers compatíveis.

## Delivery Strategy & Evidence

1. Congelar schemas/invariantes; 2. implementar aggregates P1; 3. adapters/outbox; 4. P2, recovery e E2E.  
   **Freeze point**: command/event schemas antes dos consumers.  
   **Evidence**: Existente: `world-genesis.test.ts` prova 16 clubes, 30 rodadas e 240 fixtures determinísticos. Pendente: todo comportamento posterior à gênese e formatos gerais.

Rollback desativa handlers novos, preserva fatos e reconstrói projeções; reinterpretação histórica é proibida.

## Post-design Constitution Check

Domínio/owner, determinismo/isolamento e retry/compatibilidade: **PASS no desenho**. Implementação alvo: **PARCIAL**.

## Complexity Tracking

Nenhuma exceção arquitetural aceita; sagas ficam no workflow/eventing canônico.
