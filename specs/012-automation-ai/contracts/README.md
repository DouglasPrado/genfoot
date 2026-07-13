# Contracts: X-001 Automação/IA

## Inputs

Projeções versionadas de clube, jogadores, staff, mercado, competição, partida e ledger; nenhum adapter fornece campos além da autorização humana equivalente.

## Commands

`CreateAutomationRule`, `ActivateAutomationRule`, `SuspendAutomationRule`, `RevokeAutomationRule`, `EvaluateDecision`, `ExecuteDecisionProposal`.

## Queries

`GetAutomationRules`, `GetDecisionExplanation`, `GetAutomationExecution`, `ListPendingDecisions`.

## Events

`AutomationRuleActivated`, `DecisionProposed`, `DecisionCommandSubmitted`, `DecisionRejected`, `AutomationDisabledOnControlChange`.

## DecisionProposal

Contém decisionId, asOf, rulesetVersion, seedStream, inputVersions, chosenCommand, factors, alternatives, constraints e idempotencyKey. O owner receptor revalida tudo.

## Errors

`PROJECTION_STALE`, `NO_VALID_OPTION`, `KNOWLEDGE_FORBIDDEN`, `RULE_NOT_ACTIVE`, `CONTROL_CHANGED`, `COMMAND_REJECTED`, `RETRY_EXHAUSTED`.
