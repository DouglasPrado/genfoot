# Implementation Plan: Plataforma e prontidão de produção

**Branch**: `019-platform-production-readiness` | **Date**: 2026-07-13 | **Spec**: [spec.md](spec.md)

## Summary

Operacionalizar API/workers/gateway/PostgreSQL/Redis/R2 com OpenTelemetry, SLOs, segurança, CI/CD progressivo e recovery exercitado; gate M4 consome evidence set G1–G8 fail-closed.

## Technical Context

**Language**: Node 22/TypeScript; IaC/CI declarativos  
**Dependencies**: PostgreSQL, Redis/BullMQ, R2, Socket.IO, OTel, Prometheus/Grafana/Loki/Tempo  
**Storage**: PostgreSQL source, Redis efêmero, R2 backup/archive WORM  
**Testing**: load/soak, security/privacy, migration, restore/DR, gameday  
**Platform**: Linux containers, multi-AZ; regional recovery alvo  
**Performance**: bands doc18; ~10k sockets/instância soft cap, escala ~70%  
**Constraints**: RPO/RTO, G1–G8, encryption, isolation, rollback  
**Scale**: mundo referência 32 clubes e crescimento 1/10/50 temporadas

## Constitution Check

Constituição placeholder. Gates: evidence real, least privilege, observability, recovery measured, G1–G8 conjunction. **Pre-design: PASS**.

## Project Structure

```text
apps/{api,realtime-gateway,world-scheduler,simulation-worker,async-worker,notification-worker}/
packages/observability/
infra/
runbooks/
scripts/{load,recovery,security}/
```

## Phase 0 — Research outcome

[research.md](research.md): OTel correlation, BullMQ primeiro, expand-contract, backup isolado/WORM e progressive delivery.

## Phase 1 — Design outcome

[data-model.md](data-model.md), [contracts/README.md](contracts/README.md), [quickstart.md](quickstart.md).

## Delivery Strategy & Evidence

Telemetry/SLO; security/privacy; capacity/queues; backup/restore; HA/DR; deploy/migration/rollback; M4 gameday/go-no-go. Evidências LOAD_TEST, SECURITY_TEST, GAMEDAY e REPORT conforme master schema.

## Post-design Constitution Check

**PASS**. Infra não ganha escrita de domínio; promoção permanece conjuntiva. Nenhuma exceção.

## Complexity Tracking

Nenhuma violação.
