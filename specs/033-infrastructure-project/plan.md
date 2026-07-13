# Implementation Plan: Projeto de infraestrutura

**ID**: GP-014 | **Date**: 2026-07-13 | **Spec**: [spec.md](spec.md)

## Summary

Executar SAGA-04 com projeto C3, reserva/liquidação C9 e aprovação/auditoria C12.

## Technical Context

TypeScript/Node, scheduler/data lógica, process manager idempotente, valores inteiros; JSON no harness e PostgreSQL alvo; Vitest de state machine, contrato, concorrência e recovery.

## Constitution Check

Constituição placeholder; gates de owner único, ledger, idempotência, auditoria e confirmação de alto risco. **PASS**.

## Project Structure

`packages/core/src/clubs/infrastructure/`, `packages/contracts/src/infrastructure/`, testes em `packages/core/tests/`, adapters em `packages/database/`.

## Research & Design

[research.md](research.md), [data-model.md](data-model.md), [contracts/infrastructure-project.md](contracts/infrastructure-project.md), [quickstart.md](quickstart.md).

## Delivery Strategy & Evidence

Proposta/aprovação → reserva → execução/checkpoints → inspeção → operação/manutenção. Cancelamento compensa conforme estágio; fato/auditoria nunca é apagado.

## Post-design Constitution Check

**PASS**; ativação sem inspeção ou residual financeiro bloqueia conclusão.
