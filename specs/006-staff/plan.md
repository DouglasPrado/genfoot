# Implementation Plan: Staff

**Feature**: [spec.md](spec.md) · **ID**: BC-005 · **Status**: PLANNED · **Date**: 2026-07-13

**Directory**: `specs/006-staff` · **Branch**: pacote de design do roadmap mestre

## Summary

Implementar StaffMember, função, capacidades, reputação, disponibilidade, StaffContract e efeitos consultáveis sob C5 · Staff, preservando determinismo, ownership e histórico.

## Technical Context

TypeScript 5/Node 22; domínio e aplicação em `packages/core`; tipos mínimos em `packages/shared`; ports no core e PostgreSQL/Prisma nos adapters; integração por X-002; Vitest com unidade, propriedade, contrato, integração e replay; escala por `worldId` e workers idempotentes.

**Current vs target**: Não há aggregate ou persistência de staff no código; o catálogo e as fórmulas são somente baseline de design. O alvo inclui todo o escopo e evidências pendentes.

## Constitution Check

A constituição é placeholder. Gates ratificados usados: domínio puro, determinismo/replay, idempotência, owner único, isolamento, ruleset e dinheiro somente em C9. **Pre-design: PASS documental**.

## Project Structure

```text
specs/006-staff/{spec.md,plan.md,research.md,data-model.md,quickstart.md}
specs/006-staff/{contracts/README.md,checklists/requirements.md}
criar `packages/core/src/staff/**`, ports e adapters; testes em `packages/core/tests/staff/**` e contratos de query para C4/C6/C8
```

Domínio não importa adapters. Persistência, transporte e consumers dependem dos contratos versionados.

## Phase 0 — Research Outcome

[research.md](research.md) fixa owner, concorrência, integração e estratégia de versão; não restam decisões técnicas abertas.

## Phase 1 — Design Outcome

[data-model.md](data-model.md), [contracts/README.md](contracts/README.md) e [quickstart.md](quickstart.md) fecham entidades, interfaces e validação. Migrações são aditivas, com backfill reproduzível e readers compatíveis.

## Delivery Strategy & Evidence

1. Congelar schemas/invariantes; 2. implementar aggregates P1; 3. adapters/outbox; 4. P2, recovery e E2E.  
   **Freeze point**: command/event schemas antes dos consumers.  
   **Evidence**: Nenhuma evidência de implementação é alegada. Saída futura exige unidade, propriedade, contrato, integração e build verdes.

Rollback desativa handlers novos, preserva fatos e reconstrói projeções; reinterpretação histórica é proibida.

## Post-design Constitution Check

Domínio/owner, determinismo/isolamento e retry/compatibilidade: **PASS no desenho**. Implementação alvo: **PENDENTE**.

## Complexity Tracking

Nenhuma exceção arquitetural aceita; sagas ficam no workflow/eventing canônico.
