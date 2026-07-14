# Quickstart: Clube, elenco e infraestrutura

## Prerequisites

- Node.js 22, PNPM 10 and installed dependencies.
- Fixed seed `validation-bc-003`, ruleset `1.0.0` and an empty isolated directory.
- Read [data-model.md](data-model.md) and [contracts/README.md](contracts/README.md).

## 1. Gates and focused tests

```bash
pnpm typecheck
pnpm exec vitest run packages/core/tests/clubs apps/simulator/tests/json-world-repository.test.ts apps/simulator/tests/cli.test.ts
```

Expected: all commands exit zero. The suites cover 16-club bootstrap, club/squad invariants, command receipts, world isolation, SAGA-04, maintenance, JSON restart and CLI smoke.

## 2. Create the C3 portfolio

```bash
export GRINTA_SIMULATOR_DATA_DIR=/tmp/grinta-bc-003-validation
pnpm simulator world:create --seed validation-bc-003 --start-date 2026-01-01
pnpm simulator world:genesis --world <worldId>
pnpm simulator club:inspect --world <worldId>
```

Capture `worldId`, the first `club.id`, `club.version`, `club.stadium.id`, and its `squad.id`. Expected: envelope v6 contains a C3 schema-v1 portfolio with 16 clubs, 16 squads and 23 unique memberships per squad. Repeating genesis returns `created=false` and does not duplicate C3.

## 3. Idempotent club management

```bash
pnpm simulator club:identity:update \
  --world <worldId> --club <clubId> \
  --command-id identity-001 --idempotency-key club:identity:001 \
  --expected-version 1 --occurred-at 2026-01-02 --actor board:validation \
  --name "Clube Validado" --short-code VAL
```

Repeat the exact command. Expected: byte-equivalent logical receipt, one `ClubUpdated`, club version 2 and one closed plus one active identity period. Reusing the key with another payload returns `IDEMPOTENCY_KEY_CONFLICT`; stale version returns `CLUB_VERSION_CONFLICT` without mutation.

The remaining P1 commands are executable through:

```text
club:squad:assign       club:squad:remove
club:department:plan    club:tickets:set
club:commercial:sign    club:board:record
club:maintenance:summary
```

## 4. Propose SAGA-04

Use a stable UUID as `<projectId>` and the current club version:

```bash
pnpm simulator infrastructure:project:propose \
  --world <worldId> --club <clubId> --project <projectId> \
  --command-id project-001 --idempotency-key project:create:001 \
  --expected-version <clubVersion> --actor board:validation \
  --proposed-at 2026-01-02 \
  --target-kind STADIUM_CAPACITY --target-reference <stadiumId> \
  --target-value 15000 --funding-ref C9:funding:validation \
  --milestones '[{"id":"M1","name":"Fundação","dueOn":"2026-02-01","amountMinor":100000},{"id":"M2","name":"Conclusão","dueOn":"2026-03-01","amountMinor":200000}]'

pnpm simulator infrastructure:project:inspect --world <worldId> --project <projectId>
```

Expected: one `CREATED` project with five ordered steps. Repeating the proposal with the same key and payload returns the same project; a conflicting payload fails.

## 5. Wait, recover and operate

Before the second milestone, resume leaves the project in `WAITING` after checkpointing completed work:

```bash
pnpm simulator infrastructure:project:resume \
  --world <worldId> --project <projectId> \
  --world-date 2026-02-01 --approve-all

pnpm simulator infrastructure:project:resume \
  --world <worldId> --project <projectId> \
  --world-date 2026-03-01 --approve-all
```

`--approve-all` is an explicit headless harness for C9 financing and C3/C7 licensing ports. It proves only C3 orchestration; it does not promote C9 or C7.

Expected final state: `APPROVE → FINANCE → EXECUTE_MILESTONES → LICENSE → OPERATE` completed, both disbursement facts unique, positive inspection persisted and stadium capacity 15,000 after restart. A stale worker is rejected with `STALE_FENCING_TOKEN`.

## 6. Compensation and maintenance

For another non-terminal project:

```bash
pnpm simulator infrastructure:project:abort \
  --world <worldId> --project <otherProjectId> \
  --reason "cancelled by board" --approve-all
```

Expected: status `FAILED`, immutable release evidence and completed milestones preserved as sunk cost. Daily simulation executes `clubs:process-day` once per logical date; the monthly cadence deteriorates condition deterministically and `club:maintenance:summary` exposes due assets.

## Promotion Rule

BC-003 can become `DELIVERED` only after workspace gates, envelope v1–v6 compatibility, this restart/recovery smoke and reproducible evidence pass. Promotion covers C3 and its public ports only.
