# Contracts: OPS-001 Plataforma

## Telemetry

Logs/traces/metrics usam service, environment, release, worldId seguro, correlationId, traceId, operation e outcome. Segredos/PII são proibidos.

## Health

`/live` prova processo; `/ready` valida capacidade/dependências; health detalhado requer autorização. Estados: HEALTHY/DEGRADED/READ_ONLY/UNAVAILABLE.

## Operations

Contratos versionados para `DeployRelease`, `RollbackRelease`, `ActivateKillSwitch`, `StartRestoreExercise`, `StartDRExercise`, `EvaluatePromotion`; todos auditados/idempotentes.

## Evidence

Load, security, restore, DR, deploy/rollback e go/no-go seguem `../../001-game-delivery-roadmap/contracts/evidence-schema.md`; candidato mistura zero releases/rulesets.

## Errors

`SLO_BREACHED`, `DEPENDENCY_NOT_READY`, `CAPACITY_LIMIT`, `BACKUP_INVALID`, `RPO_RTO_MISSED`, `MIGRATION_INCOMPATIBLE`, `ROLLBACK_UNSAFE`, `GATE_INCOMPLETE`.
