# Implementation Plan: Crise esportiva

**ID**: GP-015 | **Date**: 2026-07-13 | **Spec**: [spec.md](spec.md)

## Summary

Construir projeção/detector sobre resultados C8 e respostas coordenadas por C3/C10/C11, com IA explicável pelos mesmos commands.

## Technical Context

TypeScript/Node, eventos/projeções, ruleset e RNG determinístico; core headless e clientes não autoritativos; Vitest golden/property/contract/E2E. Sem entidade autoritativa no GP.

## Constitution Check

Constituição placeholder; gates de determinismo, informação permitida, ownership e histórico. **PASS**.

## Project Structure

`packages/core/src/clubs/governance/`, `packages/core/src/narrative/`, `packages/core/src/automation/`, `packages/contracts/src/crises/`, testes correspondentes.

## Research & Design

[research.md](research.md), [data-model.md](data-model.md), [contracts/sporting-crisis.md](contracts/sporting-crisis.md), [quickstart.md](quickstart.md).

## Delivery Strategy & Evidence

Projeção/detector → diagnóstico → responses/commands → encerramento/timeline → golden/E2E. Tuning cria ruleset novo; reprocesso reconstrói projeções.

## Post-design Constitution Check

**PASS**; qualquer acesso oculto ou escrita direta da IA bloqueia conclusão.
