# Tasks: Mercado, scouting e contratos

**Input**: Design documents from `/specs/011-market-scouting-contracts/`
**Prerequisites**: BC-003/004/005 e C9/C7 (contratos congelados); X-002 para saga transport.
**Tests**: Requeridos pela spec (P1/P2/P3) e pelo workflow TDD.

## Phase 1: Setup and contract freeze

- [x] T001 Congelar command/query/event/error schemas em specs/011-market-scouting-contracts/contracts/README.md
- [x] T002 Reconciliar entidades (scouting, negociação, contrato, vínculo) em data-model.md
- [x] T003 Criar módulo C6 em packages/core/src/market/ e testes em packages/core/tests/market/

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 IDs branded, scouting/negociação/oferta/contrato/vínculo e eventos em packages/core/src/market/market-types.ts
- [x] T005 [P] MarketRepository (optimistic concurrency) em packages/core/src/market/market-repository.ts
- [x] T006 Bootstrap de mundo vazio (initialize/fromSnapshot) em packages/core/src/market/world-market.ts
- [x] T007 Exportar contrato público C6 em packages/core/src/index.ts

## Phase 3: User Story 2 — Negociar com informação imperfeita (Priority: P2)

**Independent Test**: só informação observável (com confiança/validade) entra na decisão; versão obsoleta aceita falha sem alterar negociação/finanças.

- [x] T008 [US2] RequestScouting → ScoutingReport append-only (confiança por capacidade, validade) + ScoutingReportProduced
- [x] T009 [US2] OpenNegotiation/SubmitOffer versionado (expectedVersion, OFFERED/COUNTERED) + OfferSubmitted
- [x] T010 [US2] AcceptOffer só da versão atual (STALE_OFFER_VERSION) e não-expirada (OFFER_EXPIRED) + OfferAccepted
- [x] T011 [US2] Testes P2 (scouting insuficiente, versão obsoleta, expiração, terminal) em packages/core/tests/market/market.test.ts

## Phase 4: User Story 1 — Contratar com liquidação segura (Priority: P1) 🎯

**Independent Test**: SAGA-01 com seed fixa (sucesso, retry, falha após reserva); um único vínculo, liquidação balanceada e compensação completa.

- [x] T012 [US1] ActivateContract + PlayerClubLink único incompatível (PLAYER_LINK_CONFLICT) + PlayerContractActivated/PlayerClubLinkChanged
- [x] T013 [US1] TerminateContract encerra vínculo (ENDED) e libera o jogador
- [ ] T014 [US1] StartTransfer/AdvanceTransferStep/CompensateTransfer (SAGA-01) integrando C9 reserve/settle/release e C7 registration via X-002
- [ ] T015 [US1] Casos de uso da saga com fencing token e compensação idempotente

## Phase 5: User Story 3 — Empréstimo determinístico (Priority: P3)

- [ ] T016 [US3] StartLoan/ExerciseLoanOption/ReturnLoanedPlayer (retorno/compra exatamente uma vez) + LoanActivated/LoanReturned/LoanPurchased

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T017 [P] Adapter de persistência + outbox para o mercado em apps/simulator
- [ ] T018 Rodar quickstart (pnpm typecheck && pnpm test) e promover evidência

## Implementation Strategy

- **Incremento atual**: US2 completo (scouting + negociação versionada com stale/expiração) e núcleo de US1 (ativação de contrato + vínculo único + término).
- **Pendente**: SAGA-01 de transferência cross-context (C9/C7 via X-002), empréstimos (T014-T016); adapter (T017).

## Notes

- C6 escreve scouting/negociação/contrato/vínculo; Player/Club/Registration/LedgerReservation são referências de outros owners.
- Dinheiro inteiro; toda escrita carrega `worldId`, versão, chave idempotente e ruleset; fatos publicados não mudam.
