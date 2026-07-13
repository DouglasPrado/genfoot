# Implementation Plan: Torcida, imprensa e narrativa

**Branch**: `015-supporters-narrative` | **Date**: 2026-07-13 | **Spec**: [spec.md](spec.md)

## Summary

Materializar C10 como projeção/state machine determinística alimentada por fatos oficiais, com explicações, promessas e crises; geração de texto permanece adapter não autoritativo.

## Technical Context

**Language**: TypeScript/Node 22 | **Dependencies**: contracts C3/C8/C9/X-001/X-002  
**Storage**: PostgreSQL snapshots + event references; Redis cache opcional  
**Testing**: Vitest, replay, propriedades de bounds/idempotência e integração  
**Platform**: core/async worker/API Linux | **Type**: bounded context backend  
**Performance**: consumo assíncrono sem bloquear resultado oficial  
**Constraints**: 0–100, determinismo, PII, nenhuma autoridade competitiva  
**Scale**: segmentos/rivalidades/stories por 32 clubes e longos horizontes

## Constitution Check

Constituição placeholder. Gates: ownership C10, fact-driven, replay/idempotência, ruleset e non-authoritative. **Pre-design: PASS**.

## Project Structure

```text
packages/core/src/narrative/
packages/contracts/src/narrative/
apps/async-worker/src/consumers/narrative/
apps/api/src/modules/narrative/
```

## Phase 0 — Research outcome

[research.md](research.md) escolhe fact-driven projections, expectation snapshots, promessa como state machine e geração textual isolada.

## Phase 1 — Design outcome

[data-model.md](data-model.md), [contracts/README.md](contracts/README.md), [quickstart.md](quickstart.md).

## Delivery Strategy & Evidence

Segmentos/satisfação; rivalidade/reputação; conversa/promessa; crise; replay/correção. Evidências: golden fact streams, idempotência, bounds e auditoria de zero escrita competitiva.

## Post-design Constitution Check

**PASS**. C10 só escreve narrativa e publica fatos; nenhuma exceção.

## Complexity Tracking

Nenhuma violação.
