# Implementation Plan: Lesão e recuperação

**ID**: GP-012 | **Date**: 2026-07-13 | **Spec**: [spec.md](spec.md)

## Summary

Adicionar máquina médica idempotente ao lifecycle BC-004, consumindo ocorrência C8 e capacidade C5.

## Technical Context

TypeScript/Node, core headless e scheduler; snapshots JSON versionados no harness e PostgreSQL alvo; Vitest para state machine, property, retry e integração. Meta: zero participação inelegível/efeito duplicado.

## Constitution Check

Constituição placeholder; gates canônicos de owner único, determinismo, idempotência, histórico e cliente não autoritativo. **PASS**.

## Project Structure

`packages/core/src/players/medical/`, `packages/contracts/src/medical/`, testes em `packages/core/tests/` e `apps/simulator/tests/`.

## Research & Design

[research.md](research.md), [data-model.md](data-model.md), [contracts/injury-recovery.md](contracts/injury-recovery.md), [quickstart.md](quickstart.md).

## Delivery Strategy & Evidence

Ocorrência/diagnóstico → máquina/tratamento → integração com treino/partida → recuperação/retry. Snapshots migram sem inventar casos; correções preservam histórico.

## Post-design Constitution Check

**PASS**; conclusão exige CA-PLY-04/05 e guards de partida verdes.
