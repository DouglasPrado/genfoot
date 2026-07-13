# Contracts: BC-006 Mercado/Contratos

**Versioning**: envelopes incluem contractVersion, worldId, correlationId, causationId e idempotencyKey.

## Commands

- `RequestScouting`, `PublishListing`, `OpenNegotiation`, `SubmitOffer`, `AcceptOffer`, `CancelNegotiation`.
- `StartTransfer`, `AdvanceTransferStep`, `CompensateTransfer`.
- `StartLoan`, `ExerciseLoanOption`, `ReturnLoanedPlayer`.
- `ActivateContract`, `TerminateContract`.

Commands exigem expectedVersion e retornam `ACCEPTED`, `REJECTED` ou `ALREADY_APPLIED`.

## Queries

- `GetScoutingReport`, `SearchMarketListings`, `GetNegotiation`, `GetPlayerContract`, `GetPlayerClubLink`, `GetLoanStatus`.
- Queries ocultam atributos não observados e expõem `asOf`/versão da projeção.

## Events

- `ScoutingReportProduced`, `OfferSubmitted`, `OfferAccepted`, `NegotiationExpired`.
- `TransferStarted`, `TransferCompleted`, `TransferCompensated`.
- `LoanActivated`, `LoanReturned`, `LoanPurchased`.
- `PlayerContractActivated`, `PlayerClubLinkChanged`.

## External ports

- C3: elegibilidade/autoridade do clube; C4: jogador e disponibilidade; C5: capacidade de scouting.
- C9: reserve, settle, release; C7: request registration; X-002: saga/event transport.

## Errors

`STALE_OFFER_VERSION`, `OFFER_EXPIRED`, `PLAYER_LINK_CONFLICT`, `WINDOW_CLOSED`, `INSUFFICIENT_SCOUTING`, `FUNDS_NOT_RESERVED`, `SAGA_FENCED`, `ALREADY_APPLIED`.

Consumers não podem inferir sucesso de timeout; consultam status pelo correlationId.
