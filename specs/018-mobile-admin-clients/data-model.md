# Data model: clientes

| Local model          | Fields                                                  | Rules                    |
| -------------------- | ------------------------------------------------------- | ------------------------ |
| ClientSession        | account, worlds, activeControl, contractVersion         | tokens em secure storage |
| QueryCacheEntry      | scopeKey, queryKey, asOf, projectionVersion, payload    | derivado/expirável       |
| OfflineIntent        | id, kind, payload, createdAt, expiresAt, idempotencyKey | whitelist/reversível     |
| RealtimeCursor       | worldId, streamId, lastSequence, status                 | gap-aware                |
| CommandTracking      | commandId, correlationId, status, error                 | não presume sucesso      |
| ScreenState          | loading/empty/content/error/blocked/offline             | explícito                |
| AccessibilityProfile | textScale, reducedMotion, assistive flags               | não muda regra           |

```text
Command: DRAFT -> SUBMITTING -> ACCEPTED -> APPLIED | REJECTED | UNKNOWN_RECOVERING
Realtime: CONNECTING -> LIVE -> GAP -> RECOVERING -> LIVE | OFFLINE
Intent: QUEUED -> REVALIDATING -> SUBMITTED | EXPIRED | REJECTED
```
