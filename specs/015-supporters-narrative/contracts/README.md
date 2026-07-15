# Contracts: BC-010 Narrativa

## Consumed facts

OfficialMatchResult, ClubObjectiveSet/Evaluated, LedgerPeriodClosed, PlayerMilestone, ControlChanged, CompetitionHomologated e **ClubRebranded** (de C3). Envelope exige world/sequence/ruleset/idempotency.

`ClubRebranded` (mudança de identidade visual do clube) reduz o tamanho da torcida (headcount) de 10 a 15% de forma determinística por `worldSeed`+`factId`, idempotente por `factId`. O tamanho inicial (semente) deriva do porte do clube (banda de reputação + capacidade do estádio) e nunca cai abaixo de um piso mínimo.

## Commands

`ChooseConversationOption`, `MakePublicPromise`, `CancelPromise`, `AcknowledgeCrisis`, `SubmitRecoveryPlan`.

## Queries

`GetSupporterSnapshot`, `GetRivalries`, `GetReputation`, `ListMediaStories`, `GetPromise`, `GetNarrativeCrisis`.

## Events

`SupporterSatisfactionChanged`, `SupporterBaseChanged`, `PromiseMade/Fulfilled/Broken`, `MediaStoryPublished`, `NarrativeCrisisOpened/Resolved`, `ReputationChanged`.

`SupporterBaseChanged` payload: `clubId`, `previousSize`, `newSize`, `dropPermille` (100–150 = 10,0%–15,0%), `reason` (`REBRAND`), `factors`, `factId`.

## Errors

`FACT_NOT_OFFICIAL`, `OPTION_NOT_AVAILABLE`, `PROMISE_CONFLICT`, `PROMISE_EXPIRED`, `CRISIS_NOT_OPEN`, `EVENT_ALREADY_APPLIED`.
