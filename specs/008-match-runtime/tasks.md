# Tasks: Partida e runtime

**Input**: Design documents from `/specs/008-match-runtime/`
**Prerequisites**: BC-003/004/005/007 (contratos congelados); fundação RNG (`SeededRandom`) `DELIVERED`.
**Tests**: Requeridos pela spec (P1/P2) e pelo workflow TDD.

## Phase 1: Setup and contract freeze

- [x] T001 Congelar command/query/event/error schemas v1 em specs/008-match-runtime/contracts/README.md
- [x] T002 Reconciliar entidades (Match, KickoffSnapshot, SimulationManifest, MatchResult) em data-model.md
- [x] T003 Criar módulo C8 em packages/core/src/matches/ e testes em packages/core/tests/matches/

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 IDs branded, Match/manifest/result, status e eventos em packages/core/src/matches/match-types.ts
- [x] T005 [P] MatchRepository (optimistic concurrency) em packages/core/src/matches/match-repository.ts
- [x] T006 Kernel puro determinístico (PCG32 + hash FNV-1a estável) em packages/core/src/matches/match-kernel.ts
- [x] T007 Exportar contrato público C8 em packages/core/src/index.ts

## Phase 3: User Story 1 — Simular a partida em um kernel único (Priority: P1) 🎯 MVP

**Independent Test**: automático/online/offline com mesmo manifesto/log produzem resultHash e statsHash iguais; command repetido com a mesma chave produz um único efeito.

- [x] T008 [US1] CreateMatchManifest (kickoff snapshot + inputHash + seed streams) em WorldMatches.createMatchManifest
- [x] T009 [US1] StartMatch (CREATED→IN_PROGRESS) + MatchStarted em WorldMatches.startMatch
- [x] T010 [US1] FinalizeMatch executa o kernel único, finaliza uma vez, emite MatchFinished + MatchResultOfficial (resultHash/statsHash) em WorldMatches.finalizeMatch
- [x] T011 [US1] ReplayMatch reprocessa do manifesto e prova online ≡ offline ≡ replay em WorldMatches.replayMatch
- [x] T012 [US1] Casos de uso com optimistic concurrency em packages/core/src/matches/match-use-cases.ts
- [x] T013 [US1] Testes P1 (determinismo de hashes, finalize idempotente, máquina de estado, ruleset) em packages/core/tests/matches/match.test.ts

**Checkpoint**: US1 funcional e testável isoladamente (kernel determinístico + finalize-once).

## Phase 4: User Story 2 — Retomar e provar replay online/offline (Priority: P2)

**Independent Test**: checkpoint retomado e replay integral convergem, rejeitando command fora da janela/sequence.

- [x] T014 [US2] SubmitMatchCommand com ordem por tick/matchSequence/commandId, janela/cooldown e idempotência (MatchCommandLog + MatchCommandAccepted)
- [x] T015 [US2] AdvanceMatchTicks aplicando o command log ao timestep canônico
- [x] T016 [US2] CheckpointMatch (tick, stateHash, RNG cursors) + MatchCheckpointed e ResumeMatch a partir do checkpoint sem duplicar
- [x] T017 [US2] Testes de replay integral ≡ execução incremental (online ≡ offline), command log determinístico e resume idempotente

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T018 [P] Adapter de persistência para partidas em apps/simulator (schemaVersion 9, round-trip + recovery)
- [x] T019 Integração: MatchResultOfficial alimenta RecordOfficialResult de C7 (teste de handoff de contrato; barramento automático fica em X-002)
- [x] T020 Rodar gate (pnpm lint && pnpm typecheck && pnpm test && pnpm build) e promover evidência

## Implementation Strategy

- **DELIVERED**: US1 (kernel único determinístico: manifest → start → finalize → replay) + US2 (command log ao vivo com ordem/cooldown/janela/idempotência, ticks com online ≡ offline ≡ replay, checkpoint/resume sem duplicação) + adapter de persistência (schemaVersion 9) + integração de contrato C8 → C7.
- **Fora de escopo (owner X-002)**: transporte/outbox automático que entrega MatchResultOfficial ao consumer sem chamada manual.

## Notes

- Domínio puro e determinístico; sem relógio/RNG global no kernel.
- Resultado oficial finaliza uma vez; consequências saem por eventos, sem escrita cruzada.
