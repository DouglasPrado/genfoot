# Implementation Plan: Automação e IA decisória

**Branch**: `012-automation-ai` | **Date**: 2026-07-13 | **Spec**: [spec.md](spec.md)

## Summary

Criar um motor determinístico de decisão que avalia opções sobre snapshots permitidos e retorna command + explicação; adapters executam o command normal e registram o resultado.

## Technical Context

**Language/Version**: TypeScript 5.7.3, Node.js 22  
**Dependencies**: shared kernel, PCG32, contracts C1–C12; sem SDK generativo autoritativo  
**Storage**: snapshots JSON no M1; PostgreSQL/projeções depois  
**Testing**: Vitest, golden decisions, propriedades, replay e simulação longa  
**Platform**: core headless/simulator e workers Linux  
**Project Type**: concern de domínio/aplicação  
**Performance Goals**: decisões de todos os clubes dentro do tick diário e match command antes do deadline  
**Constraints**: determinismo, explicabilidade, conhecimento permitido, command-only  
**Scale**: 32 clubes e ~1.536 jogadores de referência

## Constitution Check

Constituição placeholder. Gates canônicos: domínio puro, IA sem privilégio, RNG por stream, ruleset, command-only, replay e idempotência. **Pre-design: PASS**.

## Project Structure

```text
packages/core/src/automation/{domain,application,ports}/
packages/core/src/automation/**/*.test.ts
packages/contracts/src/automation/
apps/simulator/src/commands/automation-*.ts
```

## Phase 0 — Research outcome

[research.md](research.md) escolhe evaluate-then-command, explicação estruturada, policies por camada e fallback determinístico.

## Phase 1 — Design outcome

[data-model.md](data-model.md), [contracts/README.md](contracts/README.md) e [quickstart.md](quickstart.md) definem decisões, integrações e prova de replay.

## Delivery Strategy & Evidence

1. Decision engine e explanation schema; 2. Strategic/Squad; 3. Match; 4. Narrative e delegação; 5. lotes longos. Evidências: golden decisions, traces command-only, auditoria de knowledge boundary e relatório de 20 temporadas.

## Post-design Constitution Check

**PASS**. O concern não possui aggregates competitivos nem caminho de escrita alternativo. Nenhuma exceção.

## Complexity Tracking

Nenhuma violação registrada.
