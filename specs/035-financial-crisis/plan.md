# Implementation Plan: Crise financeira

**ID**: GP-016 | **Date**: 2026-07-13 | **Spec**: [spec.md](spec.md)

## Summary

Convergir fatos C9, governança C3, comunicação C10/C11 e sanções C12 em fluxo recuperável/auditável.

## Technical Context

TypeScript/Node, ledger bigint/fixed-point, eventos/projeções/sagas e ruleset; clientes não autoritativos; Vitest de propriedade, segurança, E2E e long-run. Meta: residual zero e auditoria íntegra.

## Constitution Check

Constituição placeholder; gates de conservação, ownership, segregação, IA justa, histórico e isolamento. **PASS**.

## Project Structure

`packages/core/src/finance/crisis/`, `packages/core/src/clubs/governance/`, `packages/core/src/operations/`, `packages/contracts/src/crises/`, testes correspondentes.

## Research & Design

[research.md](research.md), [data-model.md](data-model.md), [contracts/financial-crisis.md](contracts/financial-crisis.md), [quickstart.md](quickstart.md).

## Delivery Strategy & Evidence

Detector/alerta → plano/restrições → medidas/monitoramento → sanção/recurso → recuperação/reestruturação. Correções são append-only; thresholds mudam por ruleset.

## Post-design Constitution Check

**PASS**; ledger, auditoria ou autorização vermelhos bloqueiam conclusão.
