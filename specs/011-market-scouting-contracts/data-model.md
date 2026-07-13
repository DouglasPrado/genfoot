# Data model: mercado, scouting e contratos

## Entidades

| Entity            | Campos centrais                                                                             | Regras                                   |
| ----------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------- |
| ScoutingReport    | id, worldId, playerId, observerClubId, observations, confidence, validUntil, rulesetVersion | append-only; apenas informação permitida |
| MarketListing     | id, playerId, sellerClubId, terms, status, version                                          | uma listing ativa compatível por jogador |
| Negotiation       | id, parties, playerId, status, currentVersion                                               | serializa versões, não dinheiro          |
| OfferVersion      | negotiationId, version, terms, expiresAt, createdBy                                         | imutável; aceite só da atual             |
| PlayerContract    | id, personId, clubId, terms, startsOn, endsOn, status                                       | datas válidas e dinheiro inteiro         |
| PlayerClubLink    | playerId, clubId, kind, effectivePeriod, contractId                                         | único vínculo incompatível vigente       |
| TransferAgreement | id, negotiationId, sagaId, status                                                           | terminal único conforme SAGA-01          |
| LoanAgreement     | id, origin, destination, period, costs, option, sagaId, status                              | retorno ou compra exatamente uma vez     |

## Relationships and ownership

C6 escreve todas as entidades acima. IDs de Player/Club/Registration/LedgerReservation são referências; seus owners continuam C4/C3/C7/C9.

## State transitions

```text
Negotiation: OPEN -> OFFERED <-> COUNTERED -> ACCEPTED -> COMPLETED
                                      \-> EXPIRED/CANCELLED
Transfer: DRAFT -> RUNNING -> COMPLETED | COMPENSATING -> COMPENSATED | FAILED
Loan: AGREED -> ACTIVE -> RETURNED | PURCHASED | TERMINATED
Contract: PENDING -> ACTIVE -> EXPIRED | TERMINATED
```

Toda transição valida versão, worldId, data lógica, idempotency key e fencing token quando executada por saga.
