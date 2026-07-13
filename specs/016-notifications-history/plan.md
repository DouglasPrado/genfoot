# Implementation Plan: Notificações, relatórios e memória

**Branch**: `016-notifications-history` | **Date**: 2026-07-13 | **Spec**: [spec.md](spec.md)

## Summary

Construir C11 como conjunto de consumers/projeções rebuildable, inbox persistente e report engine versionado; canais de entrega são adapters idempotentes.

## Technical Context

**Language**: TypeScript/Node 22 | **Dependencies**: X-002, contracts C2/C8/C10, Zod  
**Storage**: PostgreSQL read models/checkpoints; Redis cache/queue; R2 para reports grandes  
**Testing**: Vitest, integração broker/banco, rebuild/hash, delivery retry  
**Platform**: async/notification workers, API Linux  
**Performance**: projections acompanham sequência; relatórios pesados assíncronos  
**Constraints**: rebuildable, idempotente, world isolation, PII  
**Scale**: eventos/timelines multi-temporada e 138 telas consumidoras

## Constitution Check

Constituição placeholder. Gates: read models não autoritativos, replay/idempotência, isolamento, provenance e privacy. **Pre-design: PASS**.

## Project Structure

```text
packages/core/src/notifications-history/
packages/contracts/src/notifications-history/
apps/async-worker/src/projections/
apps/notification-worker/src/
apps/api/src/modules/reports/
```

## Phase 0 — Research outcome

[research.md](research.md): inbox como registro, event sequence/checkpoints, reports versionados e rebuild shadow/swap.

## Phase 1 — Design outcome

[data-model.md](data-model.md), [contracts/README.md](contracts/README.md), [quickstart.md](quickstart.md).

## Delivery Strategy & Evidence

Projection kernel; inbox/thread; delivery/digest; reports; timelines/records; rebuild/recovery. Evidências: duplicate/gap tests, rebuild hashes, auth/PII e DLQ recovery.

## Post-design Constitution Check

**PASS**. Commands críticos sempre revalidam no owner; nenhuma exceção.

## Complexity Tracking

Nenhuma violação.
