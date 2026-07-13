# Implementation Plan: Mercado, scouting e contratos

**Branch**: `011-market-scouting-contracts` | **Date**: 2026-07-13 | **Spec**: [spec.md](spec.md)

## Summary

Implementar C6 como módulo headless autoritativo, com informação de scouting separada do Player, negociações versionadas, contratos e vínculo único; SAGA-01/SAGA-05 coordenam C4/C7/C9 via X-002 sem escrita cruzada.

## Technical Context

**Language/Version**: TypeScript 5.7.3, Node.js 22, ESM/NodeNext  
**Primary Dependencies**: Zod, shared kernel; portas de C3/C4/C5/C7/C9 e saga kernel X-002  
**Storage**: snapshots JSON versionados no headless; PostgreSQL/Prisma após M1  
**Testing**: Vitest; propriedades, contratos, integração de saga e replay  
**Target Platform**: packages/core e apps/simulator, depois workers/API Linux  
**Project Type**: módulo de domínio e aplicação em monorepo  
**Performance Goals**: processar mercados de 32 clubes sem bloquear o tick diário; retry sem efeito adicional  
**Constraints**: determinismo, dinheiro inteiro, idempotência, um owner, histórico e ruleset  
**Scale/Scope**: ~1.536 jogadores no mundo de referência e múltiplas janelas por temporada

## Constitution Check

Constituição ainda placeholder. Gates canônicos: domínio puro, ownership C6, nenhuma escrita em C3/C4/C7/C9, dinheiro inteiro, sagas idempotentes, histórico/ruleset e testes de invariantes. **Pre-design: PASS**.

## Project Structure

```text
packages/core/src/market/
├── domain/
├── application/
└── ports/
packages/core/src/market/**/*.test.ts
apps/simulator/src/commands/market-*.ts
packages/contracts/src/market/
```

**Structure Decision**: aggregates e policies ficam no core; adapters de snapshot, banco, fila, API e CLI implementam portas públicas.

## Phase 0 — Research outcome

[research.md](research.md) fixa ownership, modelo de informação imperfeita, versionamento otimista e coordenação por saga; nenhuma dúvida permanece.

## Phase 1 — Design outcome

[data-model.md](data-model.md) descreve entidades/estados; [contracts/README.md](contracts/README.md) congela commands, queries, events e erros; [quickstart.md](quickstart.md) cobre contratação, compensação e empréstimo.

## Delivery Strategy & Evidence

1. Scouting/listing e negociação versionada.
2. Contrato e vínculo único com guards.
3. SAGA-01 integrada a reserva/liquidação/inscrição.
4. SAGA-05 com retorno e opção.
5. Propriedades de concorrência, replay e reconciliação.

Evidências: testes de contrato e invariantes, traces de saga com seed/ruleset, relatório de vínculos únicos e ledger residual zero. BC-006 só vira `DELIVERED` com todos verdes.

## Post-design Constitution Check

**PASS**: o desenho mantém C6 owner, integração por contratos/eventos e efeitos econômicos em C9. Nenhuma exceção de complexidade.

## Complexity Tracking

Nenhuma violação registrada.
