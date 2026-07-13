# Matriz de rastreabilidade do portfólio

**Baseline**: 2026-07-13  
**Coverage**: 34/34 features

Esta matriz liga identidade, fonte, requisitos da spec mestre, critérios normativos e owner. Golden paths são coverage/convergência; a coluna owner lista participantes e não transfere escrita.

| Feature | Tipo        | Fonte/seção                                                                          | FR/SC mestre                | CA/INV/bandas/gates      | Owner/participantes       |
| ------- | ----------- | ------------------------------------------------------------------------------------ | --------------------------- | ------------------------ | ------------------------- |
| FND-001 | Foundation  | `docs/02-tecnico/05-catalogo-de-regras-e-formulas.md`, “Sistema de IDs estáveis”     | FR-006/FR-009/SC-004        | INV-1…37                 | shared/core/simulator     |
| BC-001  | C1          | `docs/02-tecnico/12-context-map-e-blueprint.md`, “C1 · Identidade/Conta”             | FR-002/FR-008/SC-002        | CA-UX-03/DB-02           | C1 identity               |
| BC-002  | C2          | `docs/02-tecnico/12-context-map-e-blueprint.md`, “C2 · Mundo/Temporada”              | FR-002/FR-009/SC-005        | INV-27…33/SAGA-02        | C2 worlds/scheduling      |
| BC-003  | C3          | `docs/02-tecnico/12-context-map-e-blueprint.md`, “C3 · Clube/Estrutura”              | FR-002/FR-008/SC-005        | DB-01/DB-14              | C3 clubs                  |
| BC-004  | C4          | `docs/02-tecnico/12-context-map-e-blueprint.md`, “C4 · Jogador/Desenvolvimento”      | FR-002/FR-009/SC-005        | CA-PLY/BD-01…09/DB-16    | C4 players                |
| BC-005  | C5          | `docs/02-tecnico/12-context-map-e-blueprint.md`, “C5 · Staff”                        | FR-002/FR-008/SC-002        | DB-04                    | C5 staff                  |
| BC-006  | C6          | `docs/02-tecnico/12-context-map-e-blueprint.md`, “C6 · Mercado/Contratos”            | FR-002/FR-010/SC-002        | CA-MKT/SAGA-01/05/DB-03  | C6 transfers/contracts    |
| BC-007  | C7          | `docs/02-tecnico/12-context-map-e-blueprint.md`, “C7 · Competição/Calendário”        | FR-002/FR-009/SC-005        | CA-CMP/INV-32…33/DB-08   | C7 competitions           |
| BC-008  | C8          | `docs/02-tecnico/12-context-map-e-blueprint.md`, “C8 · Partida/Runtime”              | FR-002/FR-011/SC-006        | CA-SIM/BS-01…22/DB-05…07 | C8 matches                |
| BC-009  | C9          | `docs/02-tecnico/12-context-map-e-blueprint.md`, “C9 · Economia/Ledger”              | FR-002/FR-010/SC-006        | CA-ECO/BE-01…14/DB-09    | C9 finance                |
| BC-010  | C10         | `docs/02-tecnico/12-context-map-e-blueprint.md`, “C10 · Torcida/Narrativa”           | FR-002/FR-008/SC-002        | R-148                    | C10 supporters/narrative  |
| BC-011  | C11         | `docs/02-tecnico/12-context-map-e-blueprint.md`, “C11 · Notificação/Relatório”       | FR-002/FR-014/SC-002        | CA-UX-02/04              | C11 notifications/history |
| BC-012  | C12         | `docs/02-tecnico/12-context-map-e-blueprint.md`, “C12 · Anti-abuso/Admin”            | FR-002/FR-014/SC-002        | INV-34…37/DB-13/15       | C12 audit/operations      |
| X-001   | AI          | `docs/02-tecnico/12-context-map-e-blueprint.md`, “Concern · Automação/IA”            | FR-002/FR-012/SC-002        | CA-IA                    | Automation/AI             |
| X-002   | Eventing    | `docs/02-tecnico/12-context-map-e-blueprint.md`, “Concern · Eventing/Projeção”       | FR-002/FR-008/FR-009        | INV-27…31/DB-10/11       | messaging/projections     |
| X-003   | Clients     | `docs/02-tecnico/12-context-map-e-blueprint.md`, “Concern · Clientes (App/Admin)”    | FR-002/FR-013/SC-008        | CA-UX-01…06              | mobile/admin              |
| VAL-001 | Validation  | `docs/02-tecnico/17-criterios-de-aceite-e-bandas.md`, “Gate de promoção a CANÔNICO”  | FR-014/FR-015/SC-006        | R-34/R-88/BS/BE/BD/G1…G8 | validation                |
| OPS-001 | Operations  | `docs/02-tecnico/19-seguranca-dr-ha.md`, “DR e recuperação comprovada”               | FR-014/FR-015/SC-006        | G8/DB-01…16/R-131…137    | platform/operations       |
| GP-001  | Golden path | `docs/01-game-design/15-fluxos-completos.md`, “1. Criação e entrada em clube”        | FR-003/FR-004/FR-014/SC-001 | R-94                     | C1+C3+C12+X-003           |
| GP-002  | Golden path | `docs/01-game-design/15-fluxos-completos.md`, “2. Retorno após ausência longa”       | FR-003/FR-004/FR-014/SC-001 | R-94                     | C2+C11+X-001+X-003        |
| GP-003  | Golden path | `docs/01-game-design/15-fluxos-completos.md`, “3. Abandono ou troca de clube”        | FR-003/FR-004/FR-014/SC-001 | R-94                     | C1+C11+C12+X-001+X-003    |
| GP-004  | Golden path | `docs/01-game-design/15-fluxos-completos.md`, “4. Início de temporada”               | FR-003/FR-004/FR-014/SC-001 | SAGA-02/R-94             | C2+C3+C7+C9+C11           |
| GP-005  | Golden path | `docs/01-game-design/15-fluxos-completos.md`, “5. Ciclo semanal de gestão”           | FR-003/FR-004/FR-014/SC-001 | R-94                     | C2+C3…C11+X-001+X-003     |
| GP-006  | Golden path | `docs/01-game-design/15-fluxos-completos.md`, “6. Encerramento / final de temporada” | FR-003/FR-004/FR-014/SC-001 | SAGA-02/R-94             | C2+C4+C6+C7+C9+C11+X-002  |
| GP-007  | Golden path | `docs/01-game-design/15-fluxos-completos.md`, “7. Preparação e partida”              | FR-003/FR-004/FR-014/SC-001 | R-94                     | C4+C5+C7+C8+X-001/2/3     |
| GP-008  | Golden path | `docs/01-game-design/15-fluxos-completos.md`, “8. Contratação de jogador”            | FR-003/FR-004/FR-014/SC-001 | SAGA-01/R-94             | C4+C6+C7+C9+X-002/3       |
| GP-009  | Golden path | `docs/01-game-design/15-fluxos-completos.md`, “9. Venda de jogador”                  | FR-003/FR-004/FR-014/SC-001 | SAGA-01/R-94             | C3+C6+C9+X-002/3          |
| GP-010  | Golden path | `docs/01-game-design/15-fluxos-completos.md`, “10. Empréstimo de jogador”            | FR-003/FR-004/FR-014/SC-001 | SAGA-05/R-94             | C4+C6+C7+C9+X-002/3       |
| GP-011  | Golden path | `docs/01-game-design/15-fluxos-completos.md`, “11. Jornada de um jovem”              | FR-003/FR-004/FR-014/SC-001 | R-94                     | C3+C4+C5+C6+X-003         |
| GP-012  | Golden path | `docs/01-game-design/15-fluxos-completos.md`, “12. Lesão e recuperação”              | FR-003/FR-004/FR-014/SC-001 | R-94                     | C4+C5+C8+X-003            |
| GP-013  | Golden path | `docs/01-game-design/15-fluxos-completos.md`, “13. Ciclo financeiro mensal”          | FR-003/FR-004/FR-014/SC-001 | R-94                     | C3+C6+C9+C11+X-003        |
| GP-014  | Golden path | `docs/01-game-design/15-fluxos-completos.md`, “14. Projeto de infraestrutura”        | FR-003/FR-004/FR-014/SC-001 | SAGA-04/R-94             | C3+C9+C12+X-002/3         |
| GP-015  | Golden path | `docs/01-game-design/15-fluxos-completos.md`, “15. Crise esportiva”                  | FR-003/FR-004/FR-014/SC-001 | R-94                     | C3+C8+C10+C11+X-001/3     |
| GP-016  | Golden path | `docs/01-game-design/15-fluxos-completos.md`, “16. Crise financeira”                 | FR-003/FR-004/FR-014/SC-001 | R-94                     | C3+C9+C10+C11+C12+X-001/3 |

## Regras de validação

- Cada ID deve existir no feature index, source map, registry e pacote filho.
- Fonte ou heading inexistente é `STALE_SOURCE` e bloqueia evidência.
- Todo `DELIVERED` exige observations válidas; `PARTIAL` comprova apenas a fatia declarada.
- G1–G8 são conjuntivos; BS/BE/BD e CA não podem ser aprovados por média.
- C1…C12 permanecem únicos owners; concerns e GP não escrevem aggregates alheios.
