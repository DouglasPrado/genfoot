# Data model: automação e IA

| Entity              | Fields                                                                                 | Rules                               |
| ------------------- | -------------------------------------------------------------------------------------- | ----------------------------------- |
| AutomationRule      | id, worldId, controllerId, scope, trigger, action, risk, priority, validPeriod, status | revalidada; desativada na troca     |
| ClubAIProfile       | clubId, strategy, riskTolerance, preferences, version                                  | C3 possui profile; X-001 o consulta |
| DecisionContext     | decisionId, asOf, ruleset, seedStream, projectionVersions, allowedFacts                | imutável                            |
| DecisionOption      | commandDraft, scoreParts, constraints                                                  | somente command permitido           |
| DecisionExplanation | chosen, alternatives, factors, rejectedReasons                                         | reproduzível, sem segredo           |
| AutomationExecution | ruleId, decisionId, idempotencyKey, commandId, result                                  | append-only                         |

```text
Rule: DRAFT -> ACTIVE -> SUSPENDED -> ACTIVE | REVOKED | EXPIRED
Execution: PLANNED -> REVALIDATED -> SUBMITTED -> APPLIED | REJECTED | SKIPPED
```

X-001 escreve Rule/Decision/Execution. ClubAIProfile permanece sob C3; estados de negócio permanecem nos owners dos commands.
