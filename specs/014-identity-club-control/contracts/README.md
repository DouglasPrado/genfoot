# Contracts: BC-001 Identidade

## Commands

`RegisterAccount`, `StartSession`, `RefreshSession`, `RevokeSessionFamily`, `JoinWorld`, `ReserveClub`, `ConfirmOnboarding`, `ReleaseReservation`, `EndClubControl`, `RequestClubSwitch`.

## Queries

`GetCurrentIdentity`, `ListWorldParticipations`, `GetClubReservation`, `GetActiveClubControl`, `GetSwitchEligibility`.

## Events

`AccountRegistered`, `SessionFamilyRevoked`, `WorldParticipationActivated`, `ClubReserved`, `ClubControlActivated`, `ClubControlEnded`, `CooldownStarted`.

## Authorization context

accountId, sessionId, worldId, participationId, controlId, roles, reauthenticatedAt e correlationId. Todo receptor revalida ownership do recurso.

## Errors

`AUTHENTICATION_REQUIRED`, `SESSION_REVOKED`, `WORLD_FORBIDDEN`, `CLUB_NOT_ELIGIBLE`, `CLUB_ALREADY_RESERVED`, `CONTROL_CONFLICT`, `COOLDOWN_ACTIVE`, `RISK_REJECTED`, `ALREADY_APPLIED`.
