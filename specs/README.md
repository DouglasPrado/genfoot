# Grinta Specifications

This directory contains the master delivery roadmap and 34 independently readable child feature packets. Start with the [master specification](001-game-delivery-roadmap/spec.md), [implementation plan](001-game-delivery-roadmap/plan.md), [feature catalog](001-game-delivery-roadmap/contracts/feature-catalog.md), and [portfolio completeness report](001-game-delivery-roadmap/validation/portfolio-completeness.md).

Status is evidence-based: `DELIVERED` covers only reproduced scope, `PARTIAL` separates existing evidence from missing work, and `PLANNED` makes no implementation claim.

## Capability and platform features

| ID      | Feature specification                                                               | Status    | Milestone |
| ------- | ----------------------------------------------------------------------------------- | --------- | --------- |
| FND-001 | [Domain Kernel and deterministic simulator](002-domain-kernel-simulator/spec.md)    | DELIVERED | M0        |
| BC-002  | [World, seasons and scheduler](003-world-seasons-scheduler/spec.md)                 | DELIVERED | M1        |
| BC-003  | [Club, squad and infrastructure](004-club-squad-infrastructure/spec.md)             | PARTIAL   | M1        |
| BC-004  | [Player development, health and youth](005-player-development-health-youth/spec.md) | PARTIAL   | M1        |
| BC-005  | [Staff](006-staff/spec.md)                                                          | PLANNED   | M1        |
| BC-007  | [Competitions and calendar](007-competitions-calendar/spec.md)                      | PARTIAL   | M1        |
| BC-008  | [Match runtime](008-match-runtime/spec.md)                                          | PLANNED   | M1        |
| BC-009  | [Economy and ledger](009-economy-ledger/spec.md)                                    | PLANNED   | M1        |
| X-002   | [Eventing, sagas and projections](010-eventing-sagas-projections/spec.md)           | PARTIAL   | M2        |
| BC-006  | [Market, scouting and contracts](011-market-scouting-contracts/spec.md)             | PLANNED   | M1        |
| X-001   | [Automation and AI](012-automation-ai/spec.md)                                      | PLANNED   | M1        |
| VAL-001 | [Simulation and calibration](013-simulation-calibration/spec.md)                    | PLANNED   | M1        |
| BC-001  | [Identity and club control](014-identity-club-control/spec.md)                      | PLANNED   | M2        |
| BC-010  | [Supporters and narrative](015-supporters-narrative/spec.md)                        | PLANNED   | M2        |
| BC-011  | [Notifications and history](016-notifications-history/spec.md)                      | PLANNED   | M2        |
| BC-012  | [Anti-abuse and administration](017-anti-abuse-admin/spec.md)                       | PLANNED   | M2        |
| X-003   | [Mobile and admin clients](018-mobile-admin-clients/spec.md)                        | PLANNED   | M3        |
| OPS-001 | [Platform production readiness](019-platform-production-readiness/spec.md)          | PLANNED   | M4        |

## Golden paths

Golden paths are M3 convergence tests. They cross bounded contexts without taking ownership from them.

| ID     | Feature specification                                          | Status  | Milestone |
| ------ | -------------------------------------------------------------- | ------- | --------- |
| GP-001 | [Club entry](020-club-entry/spec.md)                           | PLANNED | M3        |
| GP-002 | [Return after absence](021-return-after-absence/spec.md)       | PARTIAL | M3        |
| GP-003 | [Club exit or switch](022-club-exit-switch/spec.md)            | PLANNED | M3        |
| GP-004 | [Season start](023-season-start/spec.md)                       | PARTIAL | M3        |
| GP-005 | [Weekly management cycle](024-weekly-management-cycle/spec.md) | PARTIAL | M3        |
| GP-006 | [Season rollover](025-season-rollover/spec.md)                 | PARTIAL | M3        |
| GP-007 | [Match journey](026-match-journey/spec.md)                     | PLANNED | M3        |
| GP-008 | [Player signing](027-player-signing/spec.md)                   | PLANNED | M3        |
| GP-009 | [Player sale](028-player-sale/spec.md)                         | PLANNED | M3        |
| GP-010 | [Player loan](029-player-loan/spec.md)                         | PLANNED | M3        |
| GP-011 | [Youth journey](030-youth-journey/spec.md)                     | PARTIAL | M3        |
| GP-012 | [Injury and recovery](031-injury-recovery/spec.md)             | PLANNED | M3        |
| GP-013 | [Monthly finance](032-monthly-finance/spec.md)                 | PLANNED | M3        |
| GP-014 | [Infrastructure project](033-infrastructure-project/spec.md)   | PLANNED | M3        |
| GP-015 | [Sporting crisis](034-sporting-crisis/spec.md)                 | PLANNED | M3        |
| GP-016 | [Financial crisis](035-financial-crisis/spec.md)               | PLANNED | M3        |

## Portfolio totals

- 34 child features: 1 delivered, 10 partial, 23 planned.
- 12 bounded contexts, 3 canonical concerns and 16 golden paths.
- Every child packet includes specification, plan, research, data model, quickstart, contract and validated requirements checklist.
