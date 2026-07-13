# Implementation Plan: Anti-abuso, suporte e administração

**Branch**: `017-anti-abuse-admin` | **Date**: 2026-07-13 | **Spec**: [spec.md](spec.md)

## Summary

Implementar C12 com case management, policies versionadas, workflows de aprovação/recurso, correction commands e audit log encadeado; integrações acontecem via X-002.

## Technical Context

**Language**: TypeScript/Node 22 | **Dependencies**: NestJS, PostgreSQL/Prisma+SQL, X-002, C1/C9/C11  
**Storage**: PostgreSQL append-only/audit; R2 WORM para arquivo; Redis queue/cache  
**Testing**: Vitest, integração, security/RBAC, tamper, reprocess/DLQ  
**Platform**: API/admin/async worker Linux  
**Performance**: ações críticas priorizam integridade; triage assíncrono escalável  
**Constraints**: SoD, privacy, hash chain, no cross-write  
**Scale**: casos/sinais/audit events multi-mundo

## Constitution Check

Constituição placeholder. Gates: least privilege, SoD, audit append-only, ownership, privacy e idempotência. **Pre-design: PASS**.

## Project Structure

```text
packages/core/src/operations/
packages/contracts/src/operations/
apps/api/src/modules/operations/
apps/async-worker/src/consumers/operations/
packages/database/src/audit/
```

## Phase 0 — Research outcome

[research.md](research.md): risk explainable, four-eyes, correction-command e hash-chain/WORM.

## Phase 1 — Design outcome

[data-model.md](data-model.md), [contracts/README.md](contracts/README.md), [quickstart.md](quickstart.md).

## Delivery Strategy & Evidence

Audit/RBAC; risk/cases; quarantine/sanction/appeal; correction/support; DLQ/reprocessing. Evidências: security matrix, chain tamper, concurrent approval, correction trace e PII tests.

## Post-design Constitution Check

**PASS**. C12 autoriza e registra, owners executam correções. Nenhuma exceção.

## Complexity Tracking

Nenhuma violação.
