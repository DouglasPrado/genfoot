# Implementation Plan: Clientes mobile e admin

**Branch**: `018-mobile-admin-clients` | **Date**: 2026-07-13 | **Spec**: [spec.md](spec.md)

## Summary

Construir app Expo e admin Next.js sobre contracts/ui compartilhados, TanStack Query/cache segregado, command tracking e realtime sequence recovery; nenhuma regra oficial vive no cliente.

## Technical Context

**Language**: TypeScript; Expo/React Native, Next.js 15/React 19  
**Dependencies**: contracts compartilhados, query/cache, Socket.IO client, design tokens  
**Storage**: secure token storage e cache local segregado; backend autoritativo  
**Testing**: unit/component, contract, E2E mobile/web, accessibility, offline/realtime  
**Platform**: Android/iOS e browsers admin suportados  
**Performance**: feedback imediato; recuperação incremental; listas virtualizadas  
**Constraints**: non-authoritative, whitelist offline, WCAG/mobile accessibility  
**Scale**: 114 mobile + 24 admin, 16 golden paths

## Constitution Check

Constituição v1.0.0 ativa. Gates aplicáveis: backend autoritativo, contratos únicos, isolamento por mundo/conta/controle, idempotência, determinismo, TDD, acessibilidade e privacidade. **Pre-design: PASS**.

## Project Structure

```text
apps/mobile/src/{features,navigation,realtime,offline}/
apps/admin/src/{app,features,realtime}/
packages/contracts/src/
packages/ui/src/
```

## Phase 0 — Research outcome

[research.md](research.md): contracts generated/shared, cache por scope, state machine de command/realtime e accessibility by default.

## Phase 1 — Design outcome

[data-model.md](data-model.md), [contracts/README.md](contracts/README.md), [quickstart.md](quickstart.md).

## Delivery Strategy & Evidence

Foundation/design system; auth/navigation; central; domain slices/golden paths; live/realtime/offline; admin; accessibility. Evidências: contract/E2E matrices 138 telas/16 GPs, gap/offline traces e accessibility reports.

## Post-design Constitution Check

**PASS**. Secure/cache storage é local derivado; backend sempre revalida. Nenhuma exceção.

## Complexity Tracking

Nenhuma violação.
