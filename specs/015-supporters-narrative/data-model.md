# Data model: torcida e narrativa

| Entity           | Fields                                     | Rules                 |
| ---------------- | ------------------------------------------ | --------------------- |
| SupporterSegment | clubId, kind, size, weights, patience      | perfis versionados    |
| FanbaseSnapshot  | asOf, segmentScores, overall, factors, fanbaseSize | 0–100 (scores); `fanbaseSize` é headcount inteiro ≥ piso |
| Expectation      | subject, capturedAt, expectedBand          | anterior ao fato      |
| Rivalry          | clubs, intensity, history                  | simétrica e histórica |
| Reputation       | subject, dimensions, score, asOf           | mudança explicável    |
| MediaStory       | factRefs, frame, status, visibility        | não inventa fato      |
| Conversation     | context, options, choice, effects          | opções aprovadas      |
| Promise          | target, metric, deadline, status, evidence | avaliada uma vez      |
| NarrativeCrisis  | causes, severity, status, recoveryPlan     | timeline preservada   |

```text
Promise: PROPOSED -> ACTIVE -> FULFILLED | BROKEN | CANCELLED
Crisis: WATCH -> OPEN -> RECOVERY -> RESOLVED
```

`fanbaseSize` (headcount): semeado por `seedFanbaseSize(reputationBand, stadiumCapacity)`; um `ClubRebranded` reduz `fanbaseSize` em 10–15% (permilagem determinística por `worldSeed`+`factId`), respeitando um piso mínimo; idempotente por `factId`. Emite `SupporterBaseChanged`.
