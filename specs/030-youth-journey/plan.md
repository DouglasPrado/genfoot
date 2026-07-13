# Implementation Plan: Jornada de um jovem

**ID**: GP-011 | **Date**: 2026-07-13 | **Spec**: [spec.md](spec.md)

## Summary

Estender o lifecycle atual com youth class, academia e jornada vertical, preservando gerador único, histórico e limites de potencial.

## Technical Context

TypeScript/Node; RNG por stream/temporada; core headless e snapshots versionados; PostgreSQL depois; Vitest de golden/property/E2E. Estado atual PARTIAL: 368 jogadores, origem e evolução diária existem; youth/academia/contrato faltam.

## Constitution Check

Constituição placeholder; gates canônicos de determinismo, idempotência, owner único, história/ruleset e isolamento. **PASS**.

## Project Structure

`packages/core/src/players/youth/`, `packages/core/src/clubs/academy/`, `packages/contracts/src/youth/`, testes em `packages/core/tests/` e `apps/simulator/tests/`.

## Research & Design

[research.md](research.md), [data-model.md](data-model.md), [contracts/youth-journey.md](contracts/youth-journey.md), [quickstart.md](quickstart.md).

## Delivery Strategy & Evidence

Safra determinística → academia/promoção → desenvolvimento → contrato/desfecho → teste de 20 temporadas. Snapshots antigos migram com defaults; rollback preserva eventos/origem.

## Post-design Constitution Check

**PASS**; status só vira entregue com bandas demográficas e CA-PLY verdes.
