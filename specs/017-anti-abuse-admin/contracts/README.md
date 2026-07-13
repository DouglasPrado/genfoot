# Contracts: BC-012 Anti-abuso/Admin

## Commands

`RecordRiskSignal`, `OpenCase`, `PlaceQuarantine`, `Propose/ApproveSanction`, `File/DecideAppeal`, `Request/ApproveCorrection`, `RequestReprocessing`, `Open/ResolveSupportCase`.

## Queries

`GetRiskAssessment`, `GetCase`, `ListSanctions`, `GetAppeal`, `VerifyAuditChain`, `GetReprocessingStatus` com RBAC/escopo.

## Events

`RiskThresholdReached`, `CaseOpened`, `QuarantinePlaced`, `SanctionActivated/Reversed`, `CorrectionApproved/Executed`, `AuditIntegrityFailed`, `ReprocessingCompleted`.

## CorrectionCommand

requestId, targetOwner, targetId/version, reasonCode, expectedEffect, approvals, idempotencyKey e correlationId. Owner pode rejeitar guard inválido.

## Errors

`FORBIDDEN`, `REAUTH_REQUIRED`, `SEGREGATION_CONFLICT`, `EVIDENCE_INSUFFICIENT`, `AUDIT_CHAIN_INVALID`, `TARGET_VERSION_STALE`, `LEGAL_HOLD`, `ALREADY_APPLIED`.
