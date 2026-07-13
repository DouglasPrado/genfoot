# Contracts: Clube, elenco e infraestrutura

**Version**: 1.0.0 · **Owner**: C3 · Clube/Estrutura · **Compatibility**: additive within major 1.

## Common command envelope

Every mutation carries `commandId`, `idempotencyKey`, `gameWorldId`, `clubId`, `expectedVersion`, logical `occurredAt`, `rulesetVersion` and `actorId`. A repeated key with the same fingerprint returns the original `ClubCommandReceipt`; reuse with another payload returns `IDEMPOTENCY_KEY_CONFLICT`. Stale aggregate versions return `CLUB_VERSION_CONFLICT` without an event.

## Commands

| Command                        | Required payload                                                                          | Result / invariant                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `UpdateClubIdentity`           | `name`, `shortCode`                                                                       | Closes the previous identity period and opens one active period.                                         |
| `AssignSquadSlot`              | `squadId`, `playerId`, `slot`                                                             | One player per slot and one primary membership in the squad. Player remains an external C4/C6 reference. |
| `RemoveSquadMember`            | `squadId`, `playerId`                                                                     | Removes only C3 membership; never changes player or contract.                                            |
| `SetDepartmentPlan`            | `kind`, `targetLevel`, `capacity`                                                         | Level 1–10, one active plan per department and capacity within the level band.                           |
| `SetTicketPrices`              | integer `priceMinor` and `effectiveOn`                                                    | Positive integer price; policy is versioned and historical values remain immutable.                      |
| `SignCommercialDeal`           | `asset`, `exclusive`, `startsOn`, `endsOn`, `externalAgreementRef`                        | No overlapping exclusive right for the same asset. Money remains in C9.                                  |
| `RecordBoardDecision`          | `decisionType`, `authorId`, `justification`, `effectiveFrom`, optional `effectiveThrough` | Author, reason and validity are mandatory and append-only.                                               |
| `ProposeInfrastructureProject` | target asset, target level/capacity, milestones, `fundingRequestRef`                      | Creates one non-terminal project per asset and opens SAGA-04.                                            |
| `ResumeInfrastructureProject`  | `projectId`, worker/lease data                                                            | Executes the next checkpoint only.                                                                       |
| `AbortInfrastructureProject`   | `projectId`, reason                                                                       | Compensates future/unspent value; completed sunk milestones remain facts.                                |

## Queries

- `InspectClubPortfolio(gameWorldId)` returns schema/revision, ruleset, clubs, squads, projects and receipts.
- `InspectClub(gameWorldId, clubId)` returns one club plus its squad and active project summaries.
- `InspectInfrastructureProject(gameWorldId, projectId)` returns SAGA status, current step, milestone checkpoints, lease/fencing and compensation evidence.
- Responses carry `schemaVersion`, aggregate `version`/portfolio `revision` and logical `asOf` where applicable.

## Events

Events carry `eventId`, `eventType`, `eventVersion=1`, `gameWorldId`, `aggregateId`, `aggregateVersion`, `occurredAt`, `rulesetVersion`, `correlationId`, `causationId` and payload.

`ClubUpdated`, `SquadChanged`, `DepartmentPlanChanged`, `TicketPricePolicyChanged`, `CommercialDealSigned`, `BoardDecisionRecorded`, `InfrastructureProjectProposed`, `StadiumWorksApproved`, `FinancialReservationAcknowledged`, `ConstructionMilestoneReached`, `FacilityLicensed`, `StadiumWorksCompleted`, `ProjectCancelled`, `MaintenanceDue`.

## SAGA-04 ports

Canonical steps are `APPROVE → FINANCE → EXECUTE_MILESTONES → LICENSE → OPERATE`.

- `InfrastructureFinancingPort.reserve(...)` is owned by C9 and returns an immutable reservation/credit fact. C3 stores only its reference and acknowledged amount.
- `InfrastructureFinancingPort.disburseMilestone(...)` returns a unique C9 fact per milestone.
- `InfrastructureFinancingPort.releaseRemainder(...)` returns immutable compensation evidence.
- `InfrastructureLicensingPort.inspect(...)` returns an external decision; a rejection blocks operation.
- Every port operation receives `idempotencyKey = saga:{projectId}:step:{k}[:milestone:{m}|:COMPENSATE]` and the current fencing token.

The simulator `--approve-all` harness implements these ports synthetically. It validates C3 orchestration and does not promote C9 or C7.

## Errors

Stable codes include `CLUB_PORTFOLIO_NOT_FOUND`, `CLUB_NOT_FOUND`, `SQUAD_NOT_FOUND`, `CLUB_VERSION_CONFLICT`, `RULESET_VERSION_MISMATCH`, `IDEMPOTENCY_KEY_CONFLICT`, `SQUAD_CAPACITY_EXCEEDED`, `PLAYER_ALREADY_ASSIGNED`, `SQUAD_SLOT_OCCUPIED`, `COMMERCIAL_EXCLUSIVITY_CONFLICT`, `INFRASTRUCTURE_CONFLICT`, `PROJECT_NOT_FOUND`, `PROJECT_INVALID_TRANSITION`, `PROJECT_WAITING`, `PROJECT_RETRY_EXHAUSTED`, `PROJECT_MANUAL_REVIEW`, `PROJECT_LEASE_HELD`, `STALE_FENCING_TOKEN`, `FINANCING_PENDING` and `LICENSE_PENDING`.

Errors expose non-sensitive details and `retryable` semantics. A timeout is unknown outcome: callers query by idempotency key before retry.

## Persistence and evolution

The C3 portfolio uses schema version 1 inside simulator envelope v6. Readers remain compatible with envelope v1–v5 by treating the portfolio as absent until deterministic bootstrap. New fields are optional/defaulted within v1; semantic breaks require a new major. Published events and completed project checkpoints are never rewritten.
