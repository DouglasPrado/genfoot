# Evidência de implementação BC-002

**Executado em:** 2026-07-13  
**Revisão base:** `9d639f209faf27a47bde4ec8fdf19032c65b68be`  
**Ruleset de teste:** `1.0.0`

| Gate                                                                                        | Exit | Resultado                               |
| ------------------------------------------------------------------------------------------- | ---: | --------------------------------------- |
| `pnpm format:check`                                                                         |    0 | PASS                                    |
| `pnpm lint`                                                                                 |    0 | PASS                                    |
| `pnpm typecheck`                                                                            |    0 | PASS — 4/4 pacotes                      |
| `pnpm test`                                                                                 |    0 | PASS — 17 arquivos, 72/72 testes        |
| `pnpm build`                                                                                |    0 | PASS — 4/4 pacotes e 57 páginas do guia |
| `pnpm exec prettier --check packages/core apps/simulator specs/003-world-seasons-scheduler` |    0 | PASS                                    |

O quickstart completo também foi executado com exit 0. O relatório reproduzível, incluindo IDs do mundo e rollover, está em [quickstart-report.md](quickstart-report.md).

## Cobertura BC-002

- janelas inclusivas com ruleset/config versionados;
- `AdvanceWorldDay` com expected date/version, lease, fencing e receipt idempotente;
- isolamento de dois mundos e replay determinístico do receipt;
- snapshot JSON v5, scheduler schema v2 e leitura compatível v1–v4;
- SAGA-02 com 20 checkpoints lineares, retry budget e `MANUAL_REVIEW`;
- takeover de lease e rejeição de fencing obsoleto;
- ordem homologação antes de premiação e gate conjunto INV-5/INV-3a/INV-7;
- criação automática no `SeasonDue`, retomada CLI e abertura única de N+1.

## Limite da evidência

Os handlers C3/C4/C6/C7/C8/C9/C10/C11 usados no smoke são ports sintéticos explícitos. Esta evidência valida a autoridade e orquestração de C2; não declara os outros contexts implementados ou promovidos.

## Decisão

O escopo BC-002 pertencente a C2 atende seus critérios e foi promovido a `DELIVERED`. O marco M1 e os contexts externos continuam sem promoção.
