# Implementation Plan: Simulação longa, calibração e promoção

**Branch**: `013-simulation-calibration` | **Date**: 2026-07-13 | **Spec**: [spec.md](spec.md)

## Summary

Construir runner determinístico shardável sobre o simulador, coletar métricas por seed, avaliar invariantes/bandas e produzir evidence set imutável para G1–G8.

## Technical Context

**Language**: TypeScript 5.7.3/Node 22  
**Dependencies**: simulator, Vitest, schemas/manifestos; workers depois  
**Storage**: JSON/artefatos content-addressed no M1; PostgreSQL/R2 no alvo  
**Testing**: golden replay, propriedades, metamórficos e regressão estatística  
**Platform**: CLI/worker Linux  
**Performance**: ~10k partidas/cenário; 1k mundos x10 temporadas, extensões 50/100  
**Constraints**: reproducibilidade, shard/resume exato, missing=FAIL  
**Scope**: esporte, economia, demografia, invariantes e promoção

## Constitution Check

Constituição placeholder. Gates canônicos: determinismo, ruleset/seeds, evidência real, invariantes absolutas e G1–G8 conjuntivos. **Pre-design: PASS**.

## Project Structure

```text
packages/core/src/validation/
apps/simulator/src/commands/validation-*.ts
scripts/calibration/
artifacts/calibration/ # gerado, não fonte
```

## Phase 0 — Research outcome

[research.md](research.md) fixa manifest content-addressed, shard determinístico, métricas brutas + resumo e gate fail-closed.

## Phase 1 — Design outcome

[data-model.md](data-model.md), [contracts/README.md](contracts/README.md) e [quickstart.md](quickstart.md) definem runner, relatório e validação.

## Delivery Strategy & Evidence

Runner/replay primeiro; collectors INV/BS/BE/BD; R-34; R-88/horizontes; evaluator G1–G8. Evidências são os próprios reports/traces com hashes. VAL-001 permanece PLANNED até lotes completos.

## Post-design Constitution Check

**PASS**. Validação não escreve domínio e falha fechada. Nenhuma exceção.

## Complexity Tracking

Nenhuma violação registrada.
