# Quickstart report BC-003

**Executed on:** 2026-07-13
**Base revision:** `9d639f209faf27a47bde4ec8fdf19032c65b68be`
**Seed:** `validation-bc-003`
**Ruleset:** `1.0.0`
**Isolated directory:** `/tmp/grinta-bc-003-validation-final`

## Result

| Scenario                | Observed evidence                                                                                                   | Result |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- | ------ |
| World/genesis bootstrap | world `019f5dee-5502-7663-8672-f778174aa73e`; envelope v6; 16 clubs and 16 squads                                   | PASS   |
| Club management         | club `019b76da-a800-73a9-8bd8-e8b591c548f6` changed once to “Clube Validado”; exact retry returned the same receipt | PASS   |
| Initial squad           | squad `019b76da-a800-759f-b3a9-9b96c83fc4f1` contained 23 unique memberships                                        | PASS   |
| SAGA-04 wait/restart    | project `44a2cdf2-8ab0-4abc-8651-72cc9ef7e3f1` persisted M1 and waited for M2                                       | PASS   |
| SAGA-04 completion      | takeover used fencing token 2; five steps and both milestones completed; inspection approved                        | PASS   |
| Asset operation         | stadium capacity changed from 10,000 to 15,000 only after `LICENSE` and restart                                     | PASS   |
| Compensation            | project `3701eb93-6030-42fe-9df6-f91e9f05cf6e` ended `FAILED` with immutable release evidence                       | PASS   |
| Workspace gates         | format, lint, typecheck, 87 tests and build exited zero                                                             | PASS   |

The initial smoke exposed that the CLI generated a different worker for every resume, temporarily blocking a legitimate immediate retry. The harness now uses stable executor identity, keeps fencing monotonic and permits lease renewal by the same operator. The corrected two-stage resume passed.

## Boundary

Synthetic financing and licensing facts were used only through the documented C3 ports. C9 and C7 remain separate features and were not promoted.

## Decision

**BC-003 / C3: DELIVERED.** Club/squad management, infrastructure state, maintenance and SAGA-04 orchestration are implemented and reproducible.

**M1: not promoted.** The milestone still depends on the remaining headless features and long-run validation.
