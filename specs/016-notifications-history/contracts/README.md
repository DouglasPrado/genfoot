# Contracts: BC-011 Notificações/História

## Consumed event envelope

eventId, worldId, streamId, sequence, occurredAt, eventVersion, rulesetVersion, correlationId e payload. Gap bloqueia checkpoint.

## Commands

`MarkNotificationRead`, `DismissNotification`, `RequestReport`, `RebuildProjection`, `RetryDelivery`.

## Queries

`ListInbox`, `GetThread`, `GetDecisionTasks`, `GetReport`, `GetTimeline`, `GetRecords`, `GetProjectionHealth`.

## Events

`NotificationCreated/Read`, `DeliveryFailed`, `DigestReady`, `ReportGenerated`, `ProjectionGapDetected/Rebuilt`, `RecordEstablished`.

## Errors

`PROJECTION_GAP`, `REPORT_SOURCE_STALE`, `REPORT_NOT_READY`, `RECIPIENT_FORBIDDEN`, `DELIVERY_RETRY_EXHAUSTED`, `EVENT_ALREADY_APPLIED`.
