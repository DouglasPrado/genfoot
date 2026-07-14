# Data Model: Clube, elenco e infraestrutura

**Owner**: C3 · Clube/Estrutura. Every persisted record carries `gameWorldId`; mutations record `rulesetVersion`, logical date and optimistic version.

## WorldClubPortfolio

World-scoped persistence boundary with `schemaVersion=1`, `gameWorldId`, `rulesetVersion`, `clubs`, `squads`, `projects`, command receipts, processed maintenance-day keys and monotonic `revision`. It is bootstrapped exactly once from genesis; deterministic IDs derive from the world seed and stable contexts.

## Club

`id`, current identity, immutable identity periods, `regionId`, reputation band, status, departments, stadium, ticket policies, commercial agreements, board decisions and `version`.

- Exactly one identity period is open.
- Department level is 1–10; condition is 0–100; target level cannot skip dependencies.
- Stadium capacity is a positive safe integer; condition is 0–100; `OPERATING` requires approved licensing.
- Ticket prices are positive integer minor units.
- Exclusive commercial agreements cannot overlap on the same asset.
- Board decisions require author, justification and bounded validity.

## Squad

`id`, `clubId`, `capacity`, ordered memberships and `version`. Membership stores only `playerId`, slot, category and effective date. Player/contract state is never embedded or mutated. Slot and player are unique within a squad; the initial capacity is 23.

## InfrastructureProject / SAGA-04

`id`, `clubId`, target asset, desired effect, five step checkpoints, milestones, external funding facts, inspection, lease/fencing state, retry budget, compensation evidence and `version`.

```text
CREATED → RUNNING → WAITING → RUNNING → COMPLETED
                    └ failure → COMPENSATING → FAILED
                                           └ compensation failure → MANUAL_REVIEW
```

Steps: `APPROVE`, `FINANCE`, `EXECUTE_MILESTONES`, `LICENSE`, `OPERATE`. Milestones are individually idempotent and become sunk cost after completion. Abort releases only the unspent external reservation. The target asset changes only in `OPERATE`, after a positive inspection.

## Maintenance

Daily processing is idempotent by `(gameWorldId, worldDate)`. Each 30 logical days lowers facility/department condition by one point unless a maintenance plan covers the asset. Reaching the configured threshold emits one `MaintenanceDue` fact for that asset/date. No wall-clock or random source is read.

## History and migration

Simulator envelope v6 adds nullable `clubPortfolio`; v1–v5 remain readable. Existing worlds bootstrap from their immutable genesis when the feature is first invoked. Events, receipts, identity periods, board decisions, milestones and compensation facts are append-only.

The implemented project record also stores `commandId`, `idempotencyKey`, `actorId` and `proposedAt`. SAGA retries use step keys, while each milestone uses `saga:{projectId}:step:3:milestone:{milestoneId}`. The JSON reader validates all five ordered steps and all persisted recovery fields.
