# GAP-ANALYSIS — cobertura real vs. escopo planejado

**Data:** 2026-07-14 · **Método:** superfície de contrato (commands/events do `contracts/README.md`) e entidades do `data-model.md` **exigidas** vs. **implementadas** em `packages/core`. Heurístico (camelCase p/ command, string literal p/ evento) — ordem de grandeza, não exato.

> **Conclusão:** ~52% dos commands e ~60% dos events implementados; ~151 tarefas `[ ]` pendentes. Nenhuma spec atingiu a barra `DELIVERED` ("reproduced scope"). O que existe hoje é um **esqueleto funcional e testado (slice P1/P2)** por contexto — um começo, não a entrega.

## Cobertura por spec

| Spec | Commands impl/total | Events impl/total | Faltando (destaque) |
|------|:---:|:---:|---|
| 004 club/squad | 7/10 | 6/14 | infra-project propose/resume/abort; metade dos eventos |
| 005 player/dev | 3/8 | 4/6 | GeneratePlayer, ApplyDailyDevelopment, SetTrainingDirection, GenerateYouthCohort, PromoteYouth |
| 006 staff | 5/5 | 4/4 | superfície ok; faltam queries/adapter/US2 integração C3 |
| 007 competitions | 3/6 | 3/5 | RecordOfficialResult, ApplyDiscipline, HomologateCompetition (toda a US2) |
| 008 match | 4/8 | 3/5 | SubmitMatchCommand, AdvanceMatchTicks, CheckpointMatch, ResumeMatch (US2 ao vivo) |
| 009 ledger ✅ **DELIVERED** | 8/8 | 6/6 | — (contrato completo + adapter + property test; commit `88540c9`) |
| 010 eventing/sagas | 3/9 | 2/6 | StartSaga, ClaimSaga, AdvanceSagaStep, CompensateSaga, RebuildProjection, ResumeRealtimeStream |
| 011 market | ~8/16 | 5/12 | toda a SAGA de transferência (Start/Advance/Compensate) + empréstimos + PublishListing + CancelNegotiation |
| 012 automation | 6/6 | 5/5 | superfície ok; faltam precedência humana, knowledge filter, adapter |
| 014 identity | 7/10 | 5/7 | RegisterAccount, JoinWorld, Refresh/RevokeSessionFamily reais + credenciais |
| 015 narrative | 2/5 | 4/8 | ChooseConversationOption, AcknowledgeCrisis, CancelPromise; mídia/rivalidades |
| 016 notifications | 2/5 | 5/8 | RequestReport, RebuildProjection, RetryDelivery; DeliveryAttempt |
| 017 anti-abuse | 3/12 | 3/9 | OpenCase, PlaceQuarantine, Request/ApproveCorrection, RequestReprocessing, Support |
| 019 platform | 0/6 | — | DeployRelease/Rollback/KillSwitch/Restore/DR como commands (só fiz kernel de lógica) |
| 020–035 golden paths | — | — | jornadas E2E reais (só provei convergência em teste de integração) |

## Buracos grandes por tema

1. **Sagas cross-context (X-002 + C6 + C1):** `StartSaga/Claim/AdvanceStep/Compensate` não existem → transferência (SAGA-01) e onboarding (SAGA-03) **não rodam de ponta a ponta**.
2. **Partida ao vivo (C8 US2):** só `finalize`. Faltam ticks, command log, checkpoints, resume.
3. **Competição (C7 US2):** resultado oficial → standings → homologação (o miolo da liga).
4. **Ledger (C9):** dívida e fechamento de período.
5. **Identidade (C1):** conta/registro/sessão de verdade.
6. **Admin (C12):** caso/quarentena/correção/reprocessamento/suporte.
7. **Plataforma/Clientes:** só kernels de lógica; sem telemetria/IaC/apps.
8. **Persistência:** só o BC-004 persiste; o resto roda em memória.

## Ordem sugerida de conclusão (respeita dependências)

`C9 ledger` → `C7 standings/homologação` → `C8 partida ao vivo` → `X-002 saga runner` (aí os golden paths viram jornadas reais) → C6 transferência/empréstimo → C1 conta/sessão → C12/C10/C11 → adapters → apps.

Cada uma seguindo o processo do `CLAUDE.md` (§3) via `/speckit.tasks → /speckit.analyze → /speckit.implement → /speckit.converge`, até a Definição de Pronto (§4).
