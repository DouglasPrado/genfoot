# Implementation Plan: Identidade e controle de clube

**Branch**: `014-identity-club-control` | **Date**: 2026-07-13 | **Spec**: [spec.md](spec.md)

## Summary

Implementar C1 em módulo NestJS/core com autenticação segura, autorização por mundo/controle, constraints concorrentes e SAGA-03 via X-002.

## Technical Context

**Language**: TypeScript 5.7.3/Node 22 | **Dependencies**: NestJS, Zod, crypto, contracts X-002/C3/C12  
**Storage**: PostgreSQL/Prisma + constraints SQL; Redis apenas sessão/cache efêmero  
**Testing**: Vitest, integração PostgreSQL/Redis, concorrência, segurança e saga  
**Platform**: API/workers Linux | **Project Type**: módulo backend  
**Performance**: auth p95 dentro do SLO; reserva concorrente serializada  
**Constraints**: tokens não persistidos em claro, isolation worldId, idempotência/auditoria  
**Scale**: múltiplos mundos e sessões por conta

## Constitution Check

Constituição placeholder. Gates: ownership único, isolamento, least privilege, idempotência, histórico e saga. **Pre-design: PASS**.

## Project Structure

```text
packages/core/src/identity/
packages/contracts/src/identity/
apps/api/src/modules/identity/
packages/database/src/identity/
```

## Phase 0 — Research outcome

[research.md](research.md): access curto + refresh rotativo, constraints para reserva/controle e SAGA-03.

## Phase 1 — Design outcome

[data-model.md](data-model.md), [contracts/README.md](contracts/README.md), [quickstart.md](quickstart.md).

## Delivery Strategy & Evidence

Account/session; participation/authz; reservation/control; SAGA-03; exit/cooldown. Evidências: security tests, corrida real no PostgreSQL, traces de compensação e isolamento. Status só muda com slots verdes.

## Post-design Constitution Check

**PASS**. Redis não é fonte autoritativa; C1 não escreve clube/risco/automação.

## Complexity Tracking

Nenhuma violação.
