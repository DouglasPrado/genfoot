# Contract: catálogo completo de features do Grinta

**Version**: 1.1.0  
**Baseline**: 2026-07-13  
**Reconciled**: 2026-07-13 against all 34 child packets  
**Purpose**: definir o conjunto mínimo rastreável de features que leva o repositório atual até um produto promovível para produção.

## Regras do contrato

1. IDs são permanentes e nunca reutilizados.
2. `DELIVERED` exige evidência local reproduzível; presença em documentação não é evidência de execução.
3. `PARTIAL` descreve somente a fatia comprovada e lista o restante como saída esperada.
4. As dependências abaixo formam um DAG. Feedback entre contextos retorna por evento ou saga, nunca por escrita cruzada.
5. As features `BC-*` e `X-*` possuem comportamento/ownership. As `GP-*` são fatias verticais e testes de convergência; elas não criam um segundo owner para os mesmos dados.
6. Uma versão de ruleset ou release só avança quando `VAL-001` e `OPS-001` estiverem verdes para o escopo promovido.
7. A tabela de reconciliação liga cada linha ao pacote filho canônico. O cabeçalho do pacote deve repetir ID, estado e marco; escopo e evidência detalhados não promovem ausência de prova.

## Marcos

| ID  | Marco               | Critério de saída                                                                                                                           |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| M0  | Fundação executável | Kernel, gênese, relógio e scheduler reproduzíveis; snapshots versionados e testes locais verdes.                                            |
| M1  | Temporada headless  | Mundo disputa, encerra e reinicia temporadas com jogadores, clubes, competição, partida, ledger, mercado e IA; 20 temporadas sem corrupção. |
| M2  | Backend multiplayer | Persistência definitiva, eventos/sagas duráveis, identidade, narrativa, histórico e operação autoritativa fecham os fluxos sem cliente.     |
| M3  | MVP jogável         | Mobile e admin completam os 16 golden paths, inclusive realtime, offline permitido e acessibilidade.                                        |
| M4  | Produção            | G1–G8 verdes, carga e segurança aprovadas, restore/DR medidos, observabilidade e rollback exercitados.                                      |

## Features de capacidade e plataforma

| ID      | Feature                                               | Estado    | Marco | Dependências                                                                   | Saída demonstrável e fontes principais                                                                                                                                                                                                                                                           |
| ------- | ----------------------------------------------------- | --------- | ----- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FND-001 | Domain Kernel e simulador determinístico              | DELIVERED | M0    | —                                                                              | IDs, datas, ruleset, erros/resultados, eventos, PCG32, CLI e snapshot JSON versionado; `docs/02-tecnico/00`, `05`, `06`, `07`, `15`. Evidência: `packages/shared`, `packages/core`, `apps/simulator` e testes.                                                                                   |
| BC-002  | Mundo, temporadas e scheduler                         | DELIVERED | M1    | FND-001                                                                        | Entrega mundo, relógio, janelas versionadas, scheduler, receipt idempotente e rollover SAGA-02 recuperável com 20 checkpoints. Evidência: pacote BC-002, 72 testes e quickstart; handlers externos continuam em seus owners. Fontes: blueprint C2, GDD 01/06, docs 14–16.                        |
| BC-003  | Clube, elenco e infraestrutura                        | DELIVERED | M1    | FND-001, BC-002                                                                | Entrega 16 clubes/elencos determinísticos, gestão versionada e idempotente, departamentos, estádio, comercial, diretoria, manutenção e projetos SAGA-04 recuperáveis. Evidência: pacote BC-003, 87 testes e quickstart; C9/C7/X-002 permanecem owners externos. Fontes: blueprint C3, GDD 04/08. |
| BC-004  | Jogador, desenvolvimento, saúde e base                | PARTIAL   | M1    | FND-001, BC-002                                                                | Já entrega geração, origem, estado diário e evolução limitada; deve completar treino, medicina, fadiga, moral, youth, aposentadoria e demografia. Fontes: blueprint C4, GDD 02.                                                                                                                  |
| BC-005  | Staff                                                 | PLANNED   | M1    | FND-001, BC-003                                                                | Staff por função, capacidade, contrato e efeitos consultáveis sem escrita cruzada. Fontes: blueprint C5, GDD 04/07.                                                                                                                                                                              |
| BC-007  | Competições e calendário                              | PARTIAL   | M1    | BC-002, BC-003                                                                 | A gênese entrega liga/fixtures; faltam formato por dados, edição, inscrição, standings, disciplina, promoção/rebaixamento e homologação. Fontes: blueprint C7, GDD 06/12.                                                                                                                        |
| BC-008  | Partida e runtime                                     | PLANNED   | M1    | BC-003, BC-004, BC-005, BC-007                                                 | Um kernel para automático/online/offline/replay, com snapshot de kickoff, tática, ticks, comandos, checkpoint e resultado único. Fontes: blueprint C8, GDD 05, docs 07/14/15.                                                                                                                    |
| BC-009  | Economia e ledger                                     | PLANNED   | M1    | BC-002, BC-003                                                                 | Ledger dobrado, reservas, orçamento, folha, pagamentos, dívida, faucets/sinks e reconciliação residual zero. Fontes: blueprint C9, GDD 03, doc 13.                                                                                                                                               |
| X-002   | Eventing, sagas, projeções e realtime                 | PARTIAL   | M2    | FND-001, BC-002                                                                | Evoluir eventos em memória/idempotência local para registry, Outbox/Inbox/DLQ, ordenação, process managers, replay, projeções e entrega realtime. Fontes: blueprint concern Eventing, docs 01/08/15/16.                                                                                          |
| BC-006  | Mercado, scouting e contratos                         | PLANNED   | M1    | BC-003, BC-004, BC-005, BC-009, X-002                                          | Scouting, listagem, proposta versionada, reserva, transferência, empréstimo, contrato e vínculo autoritativo jogador–clube. Fontes: blueprint C6, GDD 02/03, saga 01/05.                                                                                                                         |
| X-001   | Automação e IA decisória                              | PLANNED   | M1    | BC-003, BC-004, BC-005, BC-006, BC-007, BC-008, BC-009                         | Strategic/Squad/Match/Narrative AI determinísticas, explicáveis e executadas pelos mesmos commands humanos. Fontes: concern IA, GDD 07.                                                                                                                                                          |
| VAL-001 | Simulação longa, calibração e promoção de ruleset     | PLANNED   | M1    | BC-002, BC-003, BC-004, BC-005, BC-006, BC-007, BC-008, BC-009, X-001, X-002   | Relatórios de 20–30 temporadas, lotes R-34/R-88, BS/BE/BD, INV e gate G1–G8 com seeds fixas. Fontes: roadmap §§7–8, doc 17.                                                                                                                                                                      |
| BC-001  | Identidade, conta e controle de clube                 | PLANNED   | M2    | BC-003, X-001, X-002, VAL-001                                                  | Conta, sessão, participação, reserva, onboarding, controle, abandono/troca e cooldown. Fontes: blueprint C1, GDD 09, multiplayer.                                                                                                                                                                |
| BC-010  | Torcida, imprensa e narrativa                         | PLANNED   | M2    | BC-003, BC-008, BC-009, X-001                                                  | Fanbase, satisfação, rivalidade, reputação, imprensa, promessas, conversas e crises sem autoridade sobre resultado. Fontes: blueprint C10, GDD 11.                                                                                                                                               |
| BC-011  | Notificações, relatórios e memória                    | PLANNED   | M2    | BC-002, BC-008, BC-010, X-002                                                  | Inbox, threads, entrega, digest, timeline, recordes, estatísticas e relatórios reconstruíveis. Fontes: blueprint C11, GDD 13.                                                                                                                                                                    |
| BC-012  | Anti-abuso, suporte e administração                   | PLANNED   | M2    | BC-001, BC-009, BC-011, X-002                                                  | Risco/multiconta, quarentena, sanções, recursos, correções aprovadas, auditoria hash-chain, suporte e reprocesso. Fontes: blueprint C12, GDD 09, docs 09/19.                                                                                                                                     |
| X-003   | Clientes mobile e admin                               | PLANNED   | M3    | BC-001, BC-006, BC-007, BC-008, BC-009, BC-010, BC-011, BC-012, X-002, VAL-001 | Expo mobile e Next.js admin não autoritativos, contratos comuns, design system, cache/offline limitado, realtime e 138 telas mapeadas. Fontes: concern Clientes, doc 08, UI/UX 00–24.                                                                                                            |
| OPS-001 | Plataforma, segurança, observabilidade e continuidade | PLANNED   | M4    | BC-012, X-002, X-003, VAL-001                                                  | API/workers operáveis, RBAC, privacidade, métricas/traces/logs, carga, backups, restore isolado, DR, deploy/rollback e custo dentro das bandas. Fontes: docs 04/18/19 e arquitetura §§7–10.                                                                                                      |

## Golden paths como features de convergência

**Marco primário**: M3 para GP-001…GP-016, pois o critério de saída do MVP jogável exige os 16 fluxos completos.

| ID     | Feature vertical                   | Estado  | Dependências principais                                       | Evidência de saída                                                                                                        |
| ------ | ---------------------------------- | ------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| GP-001 | Criação e entrada em clube         | PLANNED | BC-001, BC-003, BC-012, X-003                                 | Conta → reserva válida → onboarding → controle → central, sem duplicar vaga.                                              |
| GP-002 | Retorno após ausência longa        | PARTIAL | BC-002, BC-011, X-001, X-003                                  | Catch-up idempotente, resumo explicável e pendências prioritárias; scheduler já cobre a base temporal.                    |
| GP-003 | Abandono ou troca de clube         | PLANNED | BC-001, BC-011, BC-012, X-001, X-003                          | Controle anterior encerrado, cooldown aplicado e histórico preservado.                                                    |
| GP-004 | Início de temporada                | PARTIAL | BC-002, BC-003, BC-007, BC-009, BC-011                        | Calendário, objetivos, orçamento, elenco e inscrições abertos uma vez; `SeasonStarted` já existe.                         |
| GP-005 | Ciclo semanal de gestão            | PARTIAL | BC-002–BC-011, X-001, X-003                                   | Decisões, treino, mercado, finanças, tática, partida e consequências fecham a semana; avanço diário já existe.            |
| GP-006 | Encerramento e virada de temporada | PARTIAL | BC-002, BC-004, BC-006, BC-007, BC-008, BC-009, BC-011, X-002 | Homologação precede prêmios; rollover recuperável completa checkpoints e abre a próxima temporada; `SeasonDue` já existe. |
| GP-007 | Preparação e partida               | PLANNED | BC-004, BC-005, BC-007, BC-008, X-001, X-002, X-003           | Escalação/tática elegível → runtime → decisões → resultado oficial → fan-out sem duplicata.                               |
| GP-008 | Contratação de jogador             | PLANNED | BC-004, BC-006, BC-007, BC-009, X-002, X-003                  | Scouting → proposta → reserva/liquidação → contrato → inscrição, compensável em falha.                                    |
| GP-009 | Venda de jogador                   | PLANNED | BC-003, BC-006, BC-009, X-002, X-003                          | Negociação versionada, liquidação única, saída e projeções reconciliadas.                                                 |
| GP-010 | Empréstimo de jogador              | PLANNED | BC-004, BC-006, BC-007, BC-009, X-002, X-003                  | Duração/custos/opção registrados e retorno/compra determinísticos.                                                        |
| GP-011 | Jornada de um jovem                | PARTIAL | BC-003, BC-004, BC-005, BC-006, X-003                         | Safra → avaliação → promoção → desenvolvimento → contrato/saída; geração genérica já existe.                              |
| GP-012 | Lesão e recuperação                | PLANNED | BC-004, BC-005, BC-008, X-003                                 | Ocorrência → diagnóstico → plano → indisponibilidade → retorno gradual idempotente.                                       |
| GP-013 | Ciclo financeiro mensal            | PLANNED | BC-003, BC-006, BC-009, BC-011, X-003                         | Receitas/obrigações/folha fecham com ledger balanceado, projeção e alertas.                                               |
| GP-014 | Projeto de infraestrutura          | PLANNED | BC-003, BC-009, BC-012, X-002, X-003                          | Aprovação → reserva/financiamento → obra → inspeção → operação/manutenção, com compensação.                               |
| GP-015 | Crise esportiva                    | PLANNED | BC-003, BC-008, BC-010, BC-011, X-001, X-003                  | Queda de desempenho produz diagnóstico, resposta de diretoria/torcida/imprensa e plano auditável.                         |
| GP-016 | Crise financeira                   | PLANNED | BC-003, BC-009, BC-010, BC-011, BC-012, X-001, X-003          | Alerta → restrições → recuperação/sanções → reestruturação sem apagar fatos ou expulsar arbitrariamente.                  |

## Reconciliação dos pacotes filhos

Os estados abaixo foram conferidos entre este catálogo, `feature-index.yaml` e os cabeçalhos das especificações. `DELIVERED` e `PARTIAL` mantêm somente a evidência descrita na linha original e no pacote; os demais resultados continuam pendentes.

| ID      | Pacote canônico                                                                      | Estado    | Marco |
| ------- | ------------------------------------------------------------------------------------ | --------- | ----- |
| FND-001 | [domain-kernel-simulator](../../002-domain-kernel-simulator/spec.md)                 | DELIVERED | M0    |
| BC-002  | [world-seasons-scheduler](../../003-world-seasons-scheduler/spec.md)                 | DELIVERED | M1    |
| BC-003  | [club-squad-infrastructure](../../004-club-squad-infrastructure/spec.md)             | DELIVERED | M1    |
| BC-004  | [player-development-health-youth](../../005-player-development-health-youth/spec.md) | PARTIAL   | M1    |
| BC-005  | [staff](../../006-staff/spec.md)                                                     | PLANNED   | M1    |
| BC-007  | [competitions-calendar](../../007-competitions-calendar/spec.md)                     | PARTIAL   | M1    |
| BC-008  | [match-runtime](../../008-match-runtime/spec.md)                                     | PLANNED   | M1    |
| BC-009  | [economy-ledger](../../009-economy-ledger/spec.md)                                   | PLANNED   | M1    |
| X-002   | [eventing-sagas-projections](../../010-eventing-sagas-projections/spec.md)           | PARTIAL   | M2    |
| BC-006  | [market-scouting-contracts](../../011-market-scouting-contracts/spec.md)             | PLANNED   | M1    |
| X-001   | [automation-ai](../../012-automation-ai/spec.md)                                     | PLANNED   | M1    |
| VAL-001 | [simulation-calibration](../../013-simulation-calibration/spec.md)                   | PLANNED   | M1    |
| BC-001  | [identity-club-control](../../014-identity-club-control/spec.md)                     | PLANNED   | M2    |
| BC-010  | [supporters-narrative](../../015-supporters-narrative/spec.md)                       | PLANNED   | M2    |
| BC-011  | [notifications-history](../../016-notifications-history/spec.md)                     | PLANNED   | M2    |
| BC-012  | [anti-abuse-admin](../../017-anti-abuse-admin/spec.md)                               | PLANNED   | M2    |
| X-003   | [mobile-admin-clients](../../018-mobile-admin-clients/spec.md)                       | PLANNED   | M3    |
| OPS-001 | [platform-production-readiness](../../019-platform-production-readiness/spec.md)     | PLANNED   | M4    |
| GP-001  | [club-entry](../../020-club-entry/spec.md)                                           | PLANNED   | M3    |
| GP-002  | [return-after-absence](../../021-return-after-absence/spec.md)                       | PARTIAL   | M3    |
| GP-003  | [club-exit-switch](../../022-club-exit-switch/spec.md)                               | PLANNED   | M3    |
| GP-004  | [season-start](../../023-season-start/spec.md)                                       | PARTIAL   | M3    |
| GP-005  | [weekly-management-cycle](../../024-weekly-management-cycle/spec.md)                 | PARTIAL   | M3    |
| GP-006  | [season-rollover](../../025-season-rollover/spec.md)                                 | PARTIAL   | M3    |
| GP-007  | [match-journey](../../026-match-journey/spec.md)                                     | PLANNED   | M3    |
| GP-008  | [player-signing](../../027-player-signing/spec.md)                                   | PLANNED   | M3    |
| GP-009  | [player-sale](../../028-player-sale/spec.md)                                         | PLANNED   | M3    |
| GP-010  | [player-loan](../../029-player-loan/spec.md)                                         | PLANNED   | M3    |
| GP-011  | [youth-journey](../../030-youth-journey/spec.md)                                     | PARTIAL   | M3    |
| GP-012  | [injury-recovery](../../031-injury-recovery/spec.md)                                 | PLANNED   | M3    |
| GP-013  | [monthly-finance](../../032-monthly-finance/spec.md)                                 | PLANNED   | M3    |
| GP-014  | [infrastructure-project](../../033-infrastructure-project/spec.md)                   | PLANNED   | M3    |
| GP-015  | [sporting-crisis](../../034-sporting-crisis/spec.md)                                 | PLANNED   | M3    |
| GP-016  | [financial-crisis](../../035-financial-crisis/spec.md)                               | PLANNED   | M3    |

## DAG resumido

```text
FND-001
  └─ BC-002
      ├─ BC-003 ─┬─ BC-005 ─┐
      │          ├─ BC-007 ─┼─ BC-008 ─┐
      │          └─ BC-009 ─┼─ BC-006 ─┼─ X-001
      ├─ BC-004 ─────────────┘          │
      └─ X-002 ─────────────────────────┘
                    │
                    └─ VAL-001
                        ├─ BC-001
                        ├─ BC-010 ── BC-011 ── BC-012
                        └────────────────────── X-003 ── OPS-001
```

## Cobertura obrigatória

- **12 bounded contexts**: BC-001…BC-012, sem lacunas.
- **3 concerns canônicos**: X-001 (IA), X-002 (eventing/projeção), X-003 (clientes).
- **16 fluxos completos**: GP-001…GP-016.
- **Plataforma e gates**: FND-001, VAL-001 e OPS-001.
- **Total deste contrato**: 34 features rastreáveis.
