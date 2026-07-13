# Data model: notificações e memória

| Entity               | Fields                                                                         | Rules             |
| -------------------- | ------------------------------------------------------------------------------ | ----------------- |
| Notification         | id, recipientScope, category, priority, sourceRef, deadline, actionRef, status | dedupKey única    |
| Thread               | id, subject, participantScopes, lastSequence                                   | ordenada          |
| DeliveryAttempt      | notificationId, channel, attempt, status, providerRef                          | retry idempotente |
| Digest               | recipient, window, itemIds, status                                             | urgente excluído  |
| ReportDefinition     | id, version, schema, sourceRequirements                                        | versionada        |
| ReportArtifact       | definition, asOf, sourceVersions, location, hash                               | imutável          |
| TimelineEntry        | subject, occurredAt, factRef, supersedes                                       | append-only       |
| Record               | category, holder, value, achievedAt, factRef                                   | fato homologado   |
| ProjectionCheckpoint | projection, worldId, stream, sequence                                          | gap-aware         |

```text
Notification: OPEN -> READ | ACTIONED | DISMISSED | EXPIRED
Projection: REBUILDING -> VERIFIED -> ACTIVE | FAILED
```
