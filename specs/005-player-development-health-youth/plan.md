# Implementation Plan: Jogador, desenvolvimento, saúde e base

**Feature**: [spec.md](spec.md) · **ID**: BC-004 · **Status**: PARTIAL · **Date**: 2026-07-13

**Directory**: `specs/005-player-development-health-youth` · **Branch**: pacote de design do roadmap mestre

## Summary

Implementar Person/Player, atributos, estados, traços, treino, fadiga, moral, medicina, youth, envelhecimento, aposentadoria e demografia sob C4 · Jogador/Desenvolvimento, preservando determinismo, ownership e histórico.

## Technical Context

TypeScript 5/Node 22; domínio e aplicação em `packages/core`; tipos mínimos em `packages/shared`; ports no core e PostgreSQL/Prisma nos adapters; integração por X-002; Vitest com unidade, propriedade, contrato, integração e replay; escala por `worldId` e workers idempotentes.

**Current vs target**: Geração determinística de 368 jogadores, origem, estado diário e evolução limitada por potencial estão implementados; treino, medicina, youth e carreira completa estão pendentes. O alvo inclui todo o escopo e evidências pendentes.

## Constitution Check

A constituição é placeholder. Gates ratificados usados: domínio puro, determinismo/replay, idempotência, owner único, isolamento, ruleset e dinheiro somente em C9. **Pre-design: PASS documental**.

## Project Structure

```text
specs/005-player-development-health-youth/{spec.md,plan.md,research.md,data-model.md,quickstart.md}
specs/005-player-development-health-youth/{contracts/README.md,checklists/requirements.md}
`packages/core/src/players/**` e novos módulos `development`, `medical`, `youth`; testes em `packages/core/tests/player-lifecycle.test.ts` e suítes específicas
```

Domínio não importa adapters. Persistência, transporte e consumers dependem dos contratos versionados.

## Phase 0 — Research Outcome

[research.md](research.md) fixa owner, concorrência, integração e estratégia de versão; não restam decisões técnicas abertas.

## Phase 1 — Design Outcome

[data-model.md](data-model.md), [contracts/README.md](contracts/README.md) e [quickstart.md](quickstart.md) fecham entidades, interfaces e validação. Migrações são aditivas, com backfill reproduzível e readers compatíveis.

## Delivery Strategy & Evidence

1. Congelar schemas/invariantes; 2. implementar aggregates P1; 3. adapters/outbox; 4. P2, recovery e E2E.  
   **Freeze point**: command/event schemas antes dos consumers.  
   **Evidence**: Existente: `player-lifecycle.test.ts` cobre geração única, processamento diário e limite de potencial. Pendente: treino, fadiga/moral completos, medicina, base, aposentadoria e demografia longa.

Rollback desativa handlers novos, preserva fatos e reconstrói projeções; reinterpretação histórica é proibida.

## Post-design Constitution Check

Domínio/owner, determinismo/isolamento e retry/compatibilidade: **PASS no desenho**. Implementação alvo: **PARCIAL**.

## Complexity Tracking

Nenhuma exceção arquitetural aceita; sagas ficam no workflow/eventing canônico.
