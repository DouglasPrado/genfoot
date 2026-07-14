# GAP-ANALYSIS — cobertura real vs. escopo planejado

**Data:** 2026-07-14 · **Método:** superfície de contrato (commands/events do `contracts/README.md`) e entidades do `data-model.md` **exigidas** vs. **implementadas** em `packages/core`. Heurístico (camelCase p/ command, string literal p/ evento) — ordem de grandeza, não exato.

> **Conclusão (atualizada):** **31 specs** atingiram a barra `DELIVERED` na reconciliação evidenciada e **não resta nenhum PARTIAL**. Entregues: os 12 bounded contexts de domínio (C1, C3–C12) + os 3 concerns (FND-001 kernel, X-002 eventing, **X-001 automação/IA**) + **os 16 golden paths E2E**. Reconciliação atual: **31 DELIVERED / 0 PARTIAL / 3 PLANNED**. Todo o domínio persiste no adapter JSON (schemaVersion 17) com round-trip + recovery; as sagas SAGA-01/02/03 e a SAGA-04 de obras rodam de ponta a ponta; a automação decide por seedStream com precedência humana, escopo de risco e filtro de conhecimento. `PLANNED` restante (3): **VAL-001** (calibração), **X-003** (clientes mobile/admin) e **OPS-001** (plataforma/produção).

## Cobertura por spec

| Spec | Commands impl/total | Events impl/total | Faltando (destaque) |
|------|:---:|:---:|---|
| 004 club/squad ✅ **DELIVERED** | 10/10 | 14/14 | — (SAGA-04 infra + 8 eventos de obra/manutenção + adapter; commit `5d74f07`) |
| 005 player/dev ✅ **DELIVERED** | 8/8 | 6/6 | — (geração/treino/desenvolvimento/youth + médico/aposentadoria + adapter; commit `c26b933`) |
| 006 staff ✅ **DELIVERED** | 5/5 | 4/4 | — (contratos/alocação + capacidade as-of + query cursor + adapter; commit `1f19763`) |
| 007 competitions ✅ **DELIVERED** | 6/6 | 5/5 | — (US2 completa: resultado/standings/homologação + adapter; commit `076e1e7`) |
| 008 match ✅ **DELIVERED** | 8/8 | 5/5 | — (US2 ao vivo: command log/ticks/checkpoint/resume + adapter; commit `f14fa55`) |
| 009 ledger ✅ **DELIVERED** | 8/8 | 6/6 | — (contrato completo + adapter + property test; commit `88540c9`) |
| 010 eventing/sagas ✅ **DELIVERED** | 9/9 | 6/6 | — (US2: sagas duráveis/projeções/realtime + adapter; commit `caa338a`) |
| 011 market ✅ **DELIVERED** | 14/14 | 12/12 | — (SAGA-01 transferência + empréstimos + listing/cancel + adapter; commit `ed5f0cd`) |
| 012 automation ✅ **DELIVERED** | 6/6 | 5/5 | — (precedência humana + risco + explicação + knowledge filter + adapter schemaVersion 17) |
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

~~`C9 ledger`~~ ✅ → ~~`C7 standings/homologação`~~ ✅ → ~~`C8 partida ao vivo`~~ ✅ → ~~`X-002 saga runner`~~ ✅ → ~~`C6 transferência/empréstimo`~~ ✅ → ~~`C1 conta/sessão`~~ ✅ → ~~`C12 anti-abuso/admin`~~ ✅ → ~~`C10 narrativa`~~ ✅ → ~~`C11 notificações`~~ ✅ → ~~`C5 staff`~~ ✅ → ~~`C4 player-dev`~~ ✅ → ~~`C2/C3 reconciliação`~~ ✅ → ~~`16 golden paths E2E`~~ ✅ → ~~`X-001 automação`~~ ✅ → **VAL-001 calibração → X-003 clientes → OPS-001 plataforma**.

Cada uma seguindo o processo do `CLAUDE.md` (§3) via `/speckit.tasks → /speckit.analyze → /speckit.implement → /speckit.converge`, até a Definição de Pronto (§4).
