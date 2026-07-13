# Freeze points de contratos

Um freeze é uma versão publicada e validada, não uma promessa verbal. Mudanças compatíveis seguem versionamento; mudanças incompatíveis exigem expand-contract e análise de impacto. `FROZEN` no índice significa que consumidores podem implementar contra a versão; não significa que a feature inteira está `DELIVERED`.

| Freeze                        | Wave | Owners                 | Artefatos congelados                                                            | Libera                       | Evidência mínima                                          |
| ----------------------------- | ---: | ---------------------- | ------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------- |
| CF-00 Kernel                  |   W0 | FND-001                | IDs, datas, Result/error, event envelope, RNG, ruleset, snapshot                | BC-002/003/004/005/X-002     | contract/golden tests e build M0                          |
| CF-01 Mundo                   |   W1 | BC-002                 | World/Season/ScheduledTask, clock/windows, lifecycle events                     | C3/C4/C7/C9/X-002            | state machine, idempotência e rollover contract tests     |
| CF-02 Clube/Jogador/Eventing  |   W2 | BC-003, BC-004, X-002  | aggregates públicos, commands/queries/events; saga envelope/fencing             | W3 e protótipos C6/C8        | schema compatibility e ownership review                   |
| CF-03 Staff/Competição/Ledger |   W3 | BC-005, BC-007, BC-009 | capacity query; fixture/registration/result; reserve/settle/release             | BC-006/008 e IA parcial      | contract/invariant tests, ledger residual zero            |
| CF-04 Mercado/Partida         |   W4 | BC-006, BC-008         | SAGA-01/05, contract/link events; match manifest/commands/result                | X-001 e VAL-001              | saga recovery e golden replay                             |
| CF-05 Automação               |   W5 | X-001                  | DecisionProposal/Explanation, AutomationRule, command-only boundary             | BC-001/010 e simulação longa | deterministic decision/knowledge-boundary tests           |
| CF-06 Ruleset headless        |   W6 | VAL-001 + C2–C9/X1/X2  | candidate ruleset, seed manifests, INV/BS/BE/BD/G reports                       | M2 authoritative backend     | M1 evidence set integralmente PASS                        |
| CF-07 Backend                 |   W8 | C1/C10/C11/C12/X2      | auth context, API commands/queries/errors, event registry, realtime sequence    | X-003                        | migration, saga, rebuild, concurrency e security evidence |
| CF-08 Clientes                |   W9 | X-003                  | generated client contracts, offline whitelist, recovery protocol, screen matrix | GP-001…016                   | contract tests e accessibility baseline                   |
| CF-09 Release                 |  W10 | X-003 + GP owners      | release/ruleset, API/event versions, migrations e artifacts                     | OPS-001/M4                   | M3 E2E/build evidence set                                 |

## Estados no índice

- `FROZEN`: versão consumível comprovada; hoje somente FND-001.
- `PENDING`: contrato ainda precisa atingir seu freeze point.
- `NOT_REQUIRED`: feature de convergência não publica autoridade nova; aplica-se a GP-001…GP-016.

## Mudança depois do freeze

Mudança aditiva mantém a versão quando consumidores antigos continuam válidos. Remoção, mudança semântica, ownership ou invariantes cria nova versão, período de coexistência e evidence rerun. Nenhum consumer escreve no banco/aggregate do owner para contornar um freeze pendente.
