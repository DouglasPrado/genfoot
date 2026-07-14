# Tasks: Economia e ledger

**Input**: Design documents from `/specs/009-economy-ledger/`
**Prerequisites**: BC-002 e BC-003 (contratos congelados).
**Tests**: Requeridos pela spec (P1/P2) e pelo workflow TDD.

## Phase 1: Setup and contract freeze

- [x] T001 Congelar command/query/event/error schemas v1 em specs/009-economy-ledger/contracts/README.md
- [x] T002 Reconciliar entidades (conta, transação/entries, reserva, oferta) em data-model.md
- [x] T003 Criar módulo C9 em packages/core/src/ledger/ e testes em packages/core/tests/ledger/

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 IDs branded, conta/transação/entry/reserva/oferta e eventos em packages/core/src/ledger/ledger-types.ts
- [x] T005 [P] LedgerRepository (optimistic concurrency) em packages/core/src/ledger/ledger-repository.ts
- [x] T006 Bootstrap de mundo vazio + invariante de conservação (residual zero) em packages/core/src/ledger/world-ledger.ts
- [x] T007 Exportar contrato público C9 em packages/core/src/index.ts

## Phase 3: User Story 1 — Lançar e reconciliar dinheiro inteiro (Priority: P1) 🎯 MVP

**Independent Test**: cada transação balanceia débitos/créditos, residual global é zero e a oferta muda só por faucet/sink nomeado; command repetido com a mesma chave produz um único efeito.

- [x] T008 [US1] OpenLedgerAccount (tipo → normalBalance, moeda-base única) em WorldLedger.openLedgerAccount
- [x] T009 [US1] PostTransaction dobrada (>= 2 entries, soma algébrica zero, inteiro/fixed-point) + TransactionPosted
- [x] T010 [US1] Conservação: residual global zero validado em fromSnapshot e ReconcileWorldLedger
- [x] T011 [US1] ReconcileWorldLedger + MoneySupplySnapshot (residual/oferta) + LedgerReconciled
- [x] T012 [US1] Casos de uso com optimistic concurrency em packages/core/src/ledger/ledger-use-cases.ts
- [x] T013 [US1] Testes P1 (conservação, desbalanceada, reconciliação, idempotência) em packages/core/tests/ledger/ledger.test.ts

**Checkpoint**: US1 funcional e testável isoladamente.

## Phase 4: User Story 2 — Reservar e liquidar obrigação com retry (Priority: P2)

**Independent Test**: reserva repetida não duplica saldo; liquidação/expiração/compensação ocorre uma vez.

- [x] T014 [US2] ReserveFunds reduz o disponível sem alterar a razão, com vigência e idempotência + FundsReserved
- [x] T015 [US2] SettleReservation / ReleaseReservation uma única vez (terminal) + ReservationSettled
- [x] T016 [US2] Expiração automática de reservas por data lógica (job agendado)
- [x] T017 [US2] AccrueDebt (principal/schedule/juros) + DebtAccrued
- [x] T018 [US2] CloseAccountingPeriod (fecha período, projeções) + AccountingPeriodClosed

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T019 [P] Adapter de persistência + outbox para o ledger em apps/simulator
- [x] T020 Recovery/replay após falha pós-commit
- [x] T021 Rodar quickstart (pnpm typecheck && pnpm test) e promover evidência

## Implementation Strategy

- **Concluído (DELIVERED)**: US1 (conta, transação dobrada com conservação, reconciliação) e US2 completa (reserva/liquidação/liberação/expiração idempotentes, dívida AccrueDebt, fechamento de período CloseAccountingPeriod). Superfície inteira do contrato (8 commands, 6 events) + entidades Debt/MoneySupply/AccountingPeriod, adapter de persistência JSON com round-trip e recovery/replay, teste de propriedade de conservação. Gate `lint + typecheck + test + build` verde.

## Notes

- Valores em inteiro (minor units); float monetário proibido.
- Toda escrita carrega `worldId`, `expectedVersion`/revisão, chave idempotente e ruleset; fatos append-only; conservação monetária invariante.

## Phase 6: Convergence

Achados de `/speckit.converge` (2026-07-14) ainda não rastreados por T001–T021. O restante do gap (AccrueDebt, CloseAccountingPeriod, expiração, adapter/recovery) já está em **T016–T021**.

- [x] T022 Definir a entidade `Debt` (creditorRef, debtorRef, principalMinor, schedule, interestRule, status, version) em packages/core/src/ledger/ledger-types.ts per data-model entidade Debt (missing)
- [x] T023 Teste de propriedade de conservação monetária (residual global == 0 sob N sequências aleatórias de transações balanceadas) em packages/core/tests/ledger/ per Constitution VI, SC-002 (partial)
