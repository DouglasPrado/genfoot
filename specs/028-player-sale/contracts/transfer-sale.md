# Contract: venda de jogador v1

**Commands**: `ListPlayer`, `SubmitTransferOffer`, `AcceptTransferOffer`, `WithdrawTransferOffer`, `CancelTransferCase`.  
**Queries**: `GetTransferCase`, `GetPlayerTransferEligibility`, `GetClubTransferProjection`.  
**Events**: `TransferOfferAccepted`, `TransferReserved`, `TransferSettled`, `PlayerContractEnded`, `PlayerTransferred`, `TransferCompensated`.  
**Errors**: `OFFER_EXPIRED`, `VERSION_CONFLICT`, `PLAYER_NOT_ELIGIBLE`, `WINDOW_CLOSED`, `INSUFFICIENT_FUNDS`, `TRANSFER_ALREADY_SETTLED`.

Todos os commands carregam `gameWorldId`, `commandId`, `expectedVersion` e ator. Eventos são versionados, ordenados e deduplicáveis. BC-006 aceita/encerra vínculo; BC-009 reserva/liquida; consumidores não escrevem tabelas alheias.
