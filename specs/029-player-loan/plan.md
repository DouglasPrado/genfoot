# Implementation Plan: Empréstimo de jogador

**ID**: GP-010 | **Date**: 2026-07-13 | **Spec**: [spec.md](spec.md)

## Summary

Implementar SAGA-05 sobre contratos BC-006, ledger BC-009 e inscrições BC-007, consultando saúde BC-004.

## Technical Context

TypeScript/Node; domínio headless; process manager com checkpoints/fencing; armazenamento JSON no harness e PostgreSQL/Prisma no alvo; Vitest para propriedade, contrato, concorrência e E2E. Determinismo, isolamento e idempotência obrigatórios.

## Constitution Check

Constituição placeholder; gates canônicos de owner único, dinheiro inteiro, histórico e eventos versionados. **PASS**.

## Project Structure

`packages/core/src/transfers/loans/`, `packages/contracts/src/loans/`, `packages/core/tests/`, adapters futuros em `packages/database/`.

## Research & Design

[research.md](research.md), [data-model.md](data-model.md), [contracts/player-loan.md](contracts/player-loan.md), [quickstart.md](quickstart.md).

## Delivery Strategy & Evidence

Congelar termos → ativar acordo → processar pagamentos/inscrição → concluir retorno/compra → provar retries e crash recovery. Correções são eventos compensatórios; acordos históricos não são apagados.

## Post-design Constitution Check

**PASS**; conclusão exige testes de ambos os desfechos e falhas.
