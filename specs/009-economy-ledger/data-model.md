# Data Model: Economia e ledger

**Owner**: C9 · Economia/Ledger. Estado persistido inclui world, versão, datas lógicas e ruleset/schema aplicável.

## Entities

### 1. LedgerAccount

world, owner/type, currency, status e normalBalance.

### 2. Transaction

idempotencyKey, class, occurredAt, sourceRef e status.

### 3. LedgerEntry

transaction/account, direction, amountMinor e sequence.

### 4. Reservation

account, purpose, amountMinor, expiresAt e status.

### 5. Debt

creditor/debtor refs, principal, schedule, interestRule e status.

### 6. MoneySupplySnapshot

asOf, balances, faucets, sinks e residual.

## Relationships and Validation

Referências externas são IDs lógicos. Coleções/IDs são únicos, mutação exige expectedVersion/idempotencyKey e transição inválida não emite evento.

## State, History and Migration

Command do owner muda estado; terminal rejeita mutação; retry retorna resultado gravado; workflow retoma checkpoint. Fatos são append-only, snapshots versionados, projeções reconstruíveis e migrações aditivas.
