# Contracts: BC-010 Narrativa

## Consumed facts

OfficialMatchResult, ClubObjectiveSet/Evaluated, LedgerPeriodClosed, PlayerMilestone, ControlChanged e CompetitionHomologated. Envelope exige world/sequence/ruleset/idempotency.

## Commands

`ChooseConversationOption`, `MakePublicPromise`, `CancelPromise`, `AcknowledgeCrisis`, `SubmitRecoveryPlan`.

## Queries

`GetSupporterSnapshot`, `GetRivalries`, `GetReputation`, `ListMediaStories`, `GetPromise`, `GetNarrativeCrisis`.

## Events

`SupporterSatisfactionChanged`, `PromiseMade/Fulfilled/Broken`, `MediaStoryPublished`, `NarrativeCrisisOpened/Resolved`, `ReputationChanged`.

## Errors

`FACT_NOT_OFFICIAL`, `OPTION_NOT_AVAILABLE`, `PROMISE_CONFLICT`, `PROMISE_EXPIRED`, `CRISIS_NOT_OPEN`, `EVENT_ALREADY_APPLIED`.
