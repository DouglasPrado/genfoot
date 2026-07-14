# Tasks: Competições e calendário

**Input**: Design documents from `/specs/007-competitions-calendar/`
**Prerequisites**: BC-002 e BC-003 `DELIVERED`; contratos v1.0.0 congelados.
**Tests**: Requeridos pela spec (P1/P2) e pelo workflow TDD.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup and contract freeze

- [x] T001 Congelar command/query/event/error schemas v1 em specs/007-competitions-calendar/contracts/README.md
- [x] T002 Reconciliar entidades (formato, edição, participante, fixture, standing) em data-model.md
- [x] T003 Criar módulo C7 em packages/core/src/competitions/ e testes em packages/core/tests/competitions/

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 IDs branded, edição/participante/fixture, status e eventos em packages/core/src/competitions/competition-types.ts
- [x] T005 [P] CompetitionRepository (optimistic concurrency) em packages/core/src/competitions/competition-repository.ts
- [x] T006 Bootstrap de mundo vazio (initialize/fromSnapshot) em packages/core/src/competitions/world-competitions.ts
- [x] T007 Exportar contrato público C7 em packages/core/src/index.ts

## Phase 3: User Story 1 — Gerar competição por formato versionado (Priority: P1) 🎯 MVP

**Independent Test**: mesmo formato/participantes/seed gera fixtures válidas sem colisão e com descanso mínimo; command repetido com a mesma chave produz um único efeito.

- [x] T008 [US1] CreateCompetitionEdition (formato como dado versionado) + CompetitionCreated
- [x] T009 [US1] RegisterParticipant (unicidade + capacidade + janela) + RegistrationAccepted
- [x] T010 [US1] GenerateFixtures turno-returno determinístico (método do círculo, sem colisão, descanso por rodada, kickoff pelo calendário) + FixturesPublished
- [x] T011 [US1] Casos de uso com optimistic concurrency em packages/core/src/competitions/competition-use-cases.ts
- [x] T012 [US1] Testes P1 (12 fixtures/4 clubes, todos os pares, sem colisão por rodada, determinismo, idempotência) em packages/core/tests/competitions/competition.test.ts

**Checkpoint**: US1 funcional e testável isoladamente.

## Phase 4: User Story 2 — Homologar classificação oficial (Priority: P2)

**Independent Test**: resultados únicos atualizam standings e somente edição completa pode ser homologada.

- [x] T013 [US2] RecordOfficialResult (uma vez por matchId/version) recalculando standings determinísticos + StandingChanged
- [x] T014 [US2] StandingEntry (pontos, saldo, disciplina, rank provisório) e query as-of
- [x] T015 [US2] ApplyDiscipline ajustando standings + evento
- [x] T016 [US2] HomologateCompetition (bloqueia homologação prematura; título/acesso/rebaixamento provisórios até homologar) + CompetitionHomologated

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T017 [P] Adapter de persistência + outbox para competições em apps/simulator
- [x] T018 Recovery/replay após falha pós-commit
- [x] T019 Rodar quickstart (pnpm typecheck && pnpm test) e promover evidência PARTIAL

## Implementation Strategy

- **Concluído (DELIVERED)**: US1 (edição + inscrição + fixtures turno-returno) e US2 completa (RecordOfficialResult/standings determinísticos, ApplyDiscipline, HomologateCompetition com bloqueio de homologação prematura). Superfície inteira do contrato (6 commands, 5 events) + entidades StandingEntry/Homologation, adapter de persistência JSON (schemaVersion 8) com round-trip e recovery. Gate lint+typecheck+test+build verde.

## Notes

- Cada partida pertence a exatamente uma edição/fase.
- Toda escrita carrega `worldId`, `expectedVersion`/revisão, chave idempotente e ruleset; fatos append-only.
