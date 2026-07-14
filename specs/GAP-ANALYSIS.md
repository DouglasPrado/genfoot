# GAP-ANALYSIS — cobertura real vs. escopo planejado

**Data:** 2026-07-14 · **Método:** superfície de contrato (commands/events do `contracts/README.md`) e entidades do `data-model.md` **exigidas** vs. **implementadas** em `packages/core`. Heurístico (camelCase p/ command, string literal p/ evento) — ordem de grandeza, não exato.

> **Conclusão (atualizada):** **11 specs** já atingiram a barra `DELIVERED` de verdade ("reproduced scope" + adapter + gate verde): FND-001, C1, C5 (staff), C6, C7, C8, C9, C10, C11, C12 e X-002. **Todos os bounded contexts de domínio (C1, C3–C12) estão entregues**, além do concern X-002. As sagas SAGA-01/SAGA-03 rodam de ponta a ponta. Restam **PARTIAL** BC-004 (player-dev) e algum resíduo, e os `PLANNED` (VAL-001 calibração, X-001 automação, X-003/OPS clientes/plataforma e os 16 golden paths).

## Cobertura por spec

| Spec | Commands impl/total | Events impl/total | Faltando (destaque) |
|------|:---:|:---:|---|
| 004 club/squad | 7/10 | 6/14 | infra-project propose/resume/abort; metade dos eventos |
| 005 player/dev | 3/8 | 4/6 | GeneratePlayer, ApplyDailyDevelopment, SetTrainingDirection, GenerateYouthCohort, PromoteYouth |
| 006 staff ✅ **DELIVERED** | 5/5 | 4/4 | — (contratos/alocação + capacidade as-of + query cursor + adapter; commit `1f19763`) |
| 007 competitions ✅ **DELIVERED** | 6/6 | 5/5 | — (US2 completa: resultado/standings/homologação + adapter; commit `076e1e7`) |
| 008 match ✅ **DELIVERED** | 8/8 | 5/5 | — (US2 ao vivo: command log/ticks/checkpoint/resume + adapter; commit `f14fa55`) |
| 009 ledger ✅ **DELIVERED** | 8/8 | 6/6 | — (contrato completo + adapter + property test; commit `88540c9`) |
| 010 eventing/sagas ✅ **DELIVERED** | 9/9 | 6/6 | — (US2: sagas duráveis/projeções/realtime + adapter; commit `caa338a`) |
| 011 market ✅ **DELIVERED** | 14/14 | 12/12 | — (SAGA-01 transferência + empréstimos + listing/cancel + adapter; commit `ed5f0cd`) |
| 012 automation | 6/6 | 5/5 | superfície ok; faltam precedência humana, knowledge filter, adapter |
| 014 identity ✅ **DELIVERED** | 10/10 | 7/7 | — (conta/sessão/credencial + SAGA-03 onboarding + adapter; commit `3f57ebf`) |
| 015 narrative ✅ **DELIVERED** | 5/5 | 8/8 | — (conversa/mídia/promessa/crise/rivalidade + adapter; commit `764c330`) |
| 016 notifications ✅ **DELIVERED** | 5/5 | 8/8 | — (inbox/digest/relatório/projeção/entrega + adapter; commit `3e2f896`) |
| 017 anti-abuse ✅ **DELIVERED** | 12/12 | 9/9 | — (caso/quarentena/correção/reprocessamento/suporte + adapter; commit `1afed28`) |
| 019 platform | 0/6 | — | DeployRelease/Rollback/KillSwitch/Restore/DR como commands (só fiz kernel de lógica) |
| 020–035 golden paths | — | — | jornadas E2E reais (só provei convergência em teste de integração) |

## Buracos grandes por tema

1. **Sagas cross-context:** ✅ a **máquina durável** (X-002), a **transferência SAGA-01** (C6+C9+X-002) e o **onboarding SAGA-03** (C1+X-002) rodam de ponta a ponta com fencing e compensação.
2. ~~**Partida ao vivo (C8 US2):**~~ ✅ entregue — command log/ticks/checkpoint/resume + adapter (commit `f14fa55`).
3. ~~**Competição (C7 US2):**~~ ✅ entregue — resultado oficial → standings → homologação.
4. ~~**Ledger (C9):**~~ ✅ entregue — dívida e fechamento de período.
5. ~~**Identidade (C1):**~~ ✅ entregue — conta/registro/sessão/credencial + SAGA-03.
6. ~~**Admin (C12):**~~ ✅ entregue — caso/quarentena/correção/reprocessamento/suporte + audit hash-chain.
7. **Plataforma/Clientes:** só kernels de lógica; sem telemetria/IaC/apps.
8. **Persistência:** BC-004 + C3/C7/C8/C9/X-002/C6/C1/C12 persistem (adapter JSON schemaVersion 13); faltam C2 scheduler-only e os `PLANNED`.

## Ordem sugerida de conclusão (respeita dependências)

~~`C9 ledger`~~ ✅ → ~~`C7 standings/homologação`~~ ✅ → ~~`C8 partida ao vivo`~~ ✅ → ~~`X-002 saga runner`~~ ✅ → ~~`C6 transferência/empréstimo`~~ ✅ → ~~`C1 conta/sessão`~~ ✅ → ~~`C12 anti-abuso/admin`~~ ✅ → ~~`C10 narrativa`~~ ✅ → ~~`C11 notificações`~~ ✅ → ~~`C5 staff`~~ ✅ → **golden paths E2E (GP-001…016) + VAL-001/X-001/apps**.

Cada uma seguindo o processo do `CLAUDE.md` (§3) via `/speckit.tasks → /speckit.analyze → /speckit.implement → /speckit.converge`, até a Definição de Pronto (§4).
