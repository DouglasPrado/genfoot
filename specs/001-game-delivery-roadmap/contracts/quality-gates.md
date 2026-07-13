# Quality gates do programa

**Baseline**: 2026-07-13  
**Sources**: `docs/02-tecnico/17-criterios-de-aceite-e-bandas.md`, `20-modelo-fisico-constraints-e-ownership.md`, R-34 e R-88.

## Gate conjuntivo G1–G8

| Gate            | Prova bloqueante                                                  | FAIL exato                      |
| --------------- | ----------------------------------------------------------------- | ------------------------------- |
| G1 Determinismo | 100% dos replays reproduzem resultHash e golden files compatíveis | uma divergência                 |
| G2 Simulação    | BS-01…BS-22 dentro das bandas no lote R-34                        | uma banda fora                  |
| G3 Economia     | BE-01…BE-14 verdes; residual BE-01/02 = 0                         | banda fora ou residual não zero |
| G4 Demografia   | BD-01…BD-09 verdes em 10/50/100 temporadas                        | banda fora ou INV-7 violada     |
| G5 Invariantes  | INV-1…INV-37 sem violação em todo checkpoint                      | uma violação                    |
| G6 Aceite       | 100% dos CA-* aplicáveis verdes                                   | um CA vermelho/ausente          |
| G7 Regressão    | comparação pareada por seed não remove banda antes verde          | uma regressão                   |
| G8 Operação     | carga/SLO, segurança, RPO/RTO, restore e DR medidos               | meta ausente ou não atingida    |

`promovível = G1 ∧ G2 ∧ G3 ∧ G4 ∧ G5 ∧ G6 ∧ G7 ∧ G8`. `MISSING`, `STALE`, `SKIP`, `BLOCKED` e `ERROR` não são PASS.

## Enforcement DB-01…DB-16

| ID    | Constraint bloqueante                                                    |
| ----- | ------------------------------------------------------------------------ |
| DB-01 | FK composta em toda relação world-scoped                                 |
| DB-02 | um ClubControl ativo por clube e por participante/mundo                  |
| DB-03 | contrato primário de jogador sem sobreposição temporal                   |
| DB-04 | contratos incompatíveis de staff sem sobreposição                        |
| DB-05 | mandante/visitante distintos e no mesmo mundo/edição                     |
| DB-06 | uma simulação oficial por partida e manifesto imutável                   |
| DB-07 | sequência única e monotônica de commands/eventos por simulação           |
| DB-08 | inscrição única por edição/lista/camisa                                  |
| DB-09 | ledger postado com ≥2 linhas, mesma moeda, débitos=créditos, append-only |
| DB-10 | idempotência por ator/command/escopo e Inbox deduplicada                 |
| DB-11 | passo único por saga/índice e fencing crescente                          |
| DB-12 | estado terminal não retorna a ativo                                      |
| DB-13 | histórico, ledger, auditoria e eventos oficiais append-only              |
| DB-14 | valores respeitam dicionário e checks canônicos                          |
| DB-15 | anonimização separa PII e preserva fatos esportivos                      |
| DB-16 | pessoa, carreira e indisponibilidade em eixos físicos distintos          |

Cada DB exige MIGRATION/TEST real no candidato. Schema ou intenção escrita sem execução é FAIL.

## Lotes

- **R-34**: aproximadamente 10.000 partidas por cenário, seeds fixas, determinismo antes das bandas BS.
- **R-88**: ao menos 1.000 mundos × 10 temporadas, extensões 50/100, seeds fixas; mede BE/BD e invariantes.
- Ruleset, seed manifest, commit, ambiente, outputs brutos e hashes são obrigatórios.

## Marcos

| Marco | Gate de saída                                                         |
| ----- | --------------------------------------------------------------------- |
| M0    | kernel/gênese/scheduler/lifecycle comprovados por TEST+BUILD          |
| M1    | temporada headless + R-34/R-88 + G1–G7 verdes                         |
| M2    | persistência, DB-01…16, eventing e backend autoritativo verdes        |
| M3    | GP-001…016 E2E, clientes, offline/realtime e acessibilidade verdes    |
| M4    | G1–G8, LOAD_TEST, SECURITY_TEST e GAMEDAY verdes para a mesma release |

Nenhum marco é promovido por percentual ou herda evidência stale.
