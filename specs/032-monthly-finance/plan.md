# Implementation Plan: Ciclo financeiro mensal

**ID**: GP-013 | **Date**: 2026-07-13 | **Spec**: [spec.md](spec.md)

## Summary

Orquestrar competência financeira em BC-009 com ledger dobrado, idempotência e projeções C11.

## Technical Context

TypeScript/Node; `bigint`/fixed-point; core headless; snapshots JSON no harness e PostgreSQL com constraints no alvo; Vitest de propriedade, reconciliação, concorrência e long-run. Meta absoluta: residual zero.

## Constitution Check

Constituição placeholder; gates canônicos de conservação, owner único, histórico, isolamento e idempotência. **PASS**.

## Project Structure

`packages/core/src/finance/closing/`, `packages/contracts/src/finance/`, `packages/core/tests/`, adapters em `packages/database/`.

## Research & Design

[research.md](research.md), [data-model.md](data-model.md), [contracts/monthly-close.md](contracts/monthly-close.md), [quickstart.md](quickstart.md).

## Delivery Strategy & Evidence

Contas/obrigações → liquidação idempotente → fechamento/snapshot → forecast/alerta → testes multi-temporada. Correção reverte por novos lançamentos; nunca edita ledger.

## Post-design Constitution Check

**PASS**; qualquer residual ou duplicação bloqueia conclusão/promoção.
