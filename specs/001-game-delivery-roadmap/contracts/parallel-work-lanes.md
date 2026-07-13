# Lanes de trabalho paralelo seguro

## Princípios

- Cada lane possui caminhos/aggregates próprios; integração usa contracts congelados.
- Schema, commands, events e errors compartilhados têm um owner e janela de review.
- Uma lane pode preparar adapters/fixtures antes da predecessora terminar, mas não integrar nem concluir sem o gate da aresta.
- Conflito de ownership ou mudança de contrato pausa o consumer; não se resolve por escrita cruzada.

| Lane                  | Waves  | Features                       | Ownership/caminhos principais                   | Pode avançar em paralelo quando               | Ponto de convergência         |
| --------------------- | ------ | ------------------------------ | ----------------------------------------------- | --------------------------------------------- | ----------------------------- |
| L1 Clube/Staff        | W2–W3  | BC-003, BC-005                 | `packages/core/src/club`, `staff`               | CF-01/CF-02 publicados                        | CF-03 e C8/C6 contract tests  |
| L2 Jogador            | W2     | BC-004                         | `packages/core/src/player`                      | CF-01 publicado                               | CF-02, depois C6/C8/VAL       |
| L3 Eventing           | W2     | X-002                          | event/saga/projection infrastructure            | CF-00/CF-01 publicados                        | CF-02, saga recovery em W4/M2 |
| L4 Competição         | W3     | BC-007                         | competition/calendar owner                      | CF-01 e club identity congelados              | CF-03, runtime/rollover       |
| L5 Economia           | W3     | BC-009                         | ledger/reservations                             | CF-01 e club contracts                        | CF-03, mercado/infraestrutura |
| L6 Mercado            | W4     | BC-006                         | scouting/contracts/link                         | CF-02 + ledger/saga executáveis               | SAGA-01/05 e GP-008…010       |
| L7 Partida            | W4     | BC-008                         | match runtime/result                            | CF-02 + C5/C7 contracts                       | CF-04, X-001/VAL/GP-007       |
| L8 IA                 | W5     | X-001                          | decision policies/explanations                  | commands C3–C9 congelados                     | CF-05 e simulação longa       |
| L9 Backend services   | W6–W8  | BC-001, BC-010, BC-011, BC-012 | identity/narrative/history/operations separados | M1/CF-06; contracts por owner                 | CF-07/M2                      |
| L10 Clients prototype | W6–W8  | X-003 contract/UI scaffolds    | `apps/mobile`, `apps/admin`, `packages/ui`      | somente mocks gerados de contracts congelados | integração autoritativa em W9 |
| L11 Golden paths      | W10    | GP-001…016                     | testes/fixtures, sem aggregate                  | CF-08 e todas as capacidades do fluxo         | M3 evidence set               |
| L12 Operations        | W7–W10 | OPS-001 preparação             | infra/runbooks/telemetry, sem promoção          | SLO/runbook/telemetry contract work           | execução/promoção somente W11 |

## Reservas de coordenação

- `packages/contracts`: mudança por PR do owner; consumers atualizam depois do freeze.
- `packages/shared`: somente FND-001/governança transversal.
- migrations: uma sequência global revisada, mas cada tabela/constraint tem owner.
- event registry: X-002 controla envelope/compatibilidade; payload pertence ao publisher.
- UI contracts: X-003 controla apresentação; permissões/erros continuam nos owners backend.

## Paralelismo proibido

- Mercado antes de reserve/settle e saga kernel executáveis.
- IA final antes dos commands/knowledge boundaries congelados.
- Integração cliente antes de M1/VAL e CF-07.
- Promoção OPS antes dos 16 golden paths/M3, mesmo que load/security tooling já exista.
