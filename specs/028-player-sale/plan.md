# Implementation Plan: Venda de jogador

**ID**: GP-009 | **Date**: 2026-07-13 | **Spec**: [spec.md](spec.md)

## Summary

Orquestrar a venda pela SAGA-01, mantendo oferta/contrato em BC-006, dinheiro em BC-009 e elenco como projeção de BC-003.

## Technical Context

TypeScript 5.7/Node 22; core headless, process manager idempotente, contratos versionados, PostgreSQL/Prisma após o marco headless; Vitest com testes de contrato, concorrência, integração e E2E. Meta: zero dupla venda/pagamento; isolamento por mundo e fixed-point inteiro.

## Constitution Check

Constituição ainda placeholder. Gates canônicos: owner único, ledger residual zero, Outbox/Inbox, optimistic concurrency, histórico/ruleset. **Pre-design: PASS**.

## Project Structure

`packages/core/src/transfers/`, `packages/core/src/contracts/`, `packages/core/src/finance/`, `packages/contracts/src/transfer/`, `apps/simulator/tests/` e futuros adapters em `packages/database/`.

## Research & Design

Decisões em [research.md](research.md); estados em [data-model.md](data-model.md); interfaces em [contracts/transfer-sale.md](contracts/transfer-sale.md); validação em [quickstart.md](quickstart.md).

## Delivery Strategy & Evidence

1. congelar contrato de oferta/aceite; 2. implementar saga e compensações; 3. integrar ledger/contrato/projeção; 4. provar concorrência/retry e E2E. Rollback compensa reserva antes da liquidação; fatos liquidados recebem correção, nunca exclusão.

## Post-design Constitution Check

**PASS**: nenhum owner duplicado ou motor alternativo; ausência de evidência mantém a feature não entregue.
