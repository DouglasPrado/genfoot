# Data model: identidade e controle

| Entity             | Fields                                                     | Rules                  |
| ------------------ | ---------------------------------------------------------- | ---------------------- |
| Account            | id, status, locale, createdAt                              | identidade global      |
| Credential         | accountId, kind, secretHash, verifiedAt                    | nunca segredo em claro |
| SessionFamily      | id, accountId, currentTokenHash, status                    | reúso revoga família   |
| Session            | id, familyId, expiresAt, revokedAt                         | escopo autenticado     |
| WorldParticipation | accountId, worldId, status, period                         | única ativa por regra  |
| ClubReservation    | id, worldId, clubId, accountId, expiresAt, version, status | exclusividade/TTL      |
| ClubControl        | id, worldId, clubId, accountId, activePeriod, endedReason  | um ativo por clube     |

```text
Reservation: HELD -> CONFIRMED | EXPIRED | RELEASED
Participation: PENDING -> ACTIVE -> ENDED
Control: PENDING -> ACTIVE -> ENDED; término inicia cooldown
```

Club/risk/automation são referências; seus owners permanecem C3/C12/X-001.
