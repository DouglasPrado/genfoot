# Data model: anti-abuso e administração

| Entity              | Fields                                                 | Rules           |
| ------------------- | ------------------------------------------------------ | --------------- |
| RiskSignal          | id, subject, kind, observedAt, source, dedupKey        | imutável        |
| RiskAssessment      | subject, policyVersion, score, factors, confidence     | explicável      |
| AbuseCase           | id, worldId, subjects, severity, status, evidenceRefs  | owner/reviewer  |
| Quarantine          | scope, startsAt, expiresAt, reason, status             | temporária      |
| Sanction            | subject, type, scope, period, basis, approvals, status | proporcional    |
| Appeal              | sanctionId, filedAt, grounds, reviewer, decision       | independente    |
| CorrectionRequest   | targetOwner, command, reason, approvals, status        | sem cross-write |
| AuditEvent          | sequence, actor, action, target, prevHash, eventHash   | append-only     |
| SupportCase         | requester, category, status, resolution                | PII minimizada  |
| ReprocessingRequest | stream/range, checkpoint, reason, status               | idempotente     |

```text
Case: OPEN -> INVESTIGATING -> DECIDED -> CLOSED
Sanction: PROPOSED -> APPROVED -> ACTIVE -> EXPIRED | REVERSED
Correction: REQUESTED -> APPROVED -> EXECUTED | REJECTED | FAILED
```
