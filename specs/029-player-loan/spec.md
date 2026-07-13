# Feature Specification: Empréstimo de jogador

**ID**: GP-010 | **Slug**: `player-loan` | **Milestone**: M3 | **Status**: PLANNED  
**Owner**: BC-006 | **Contributors**: BC-004, BC-007, BC-009, X-002, X-003  
**Created**: 2026-07-13 | **Directory**: `specs/029-player-loan`

## User Scenarios & Testing

### User Story 1 — Emprestar e devolver um jogador de forma determinística (P1)

Como gestor, quero negociar um empréstimo com custos e opção definidos para usar/desenvolver o jogador e obter um desfecho previsível.

**Independent Test**: concluir empréstimo, avançar até o término e confirmar exatamente um retorno ou compra, inscrições e pagamentos reconciliados.

**Acceptance Scenarios**:

1. **Given** acordo válido, **When** é ativado, **Then** contrato temporário, divisão financeira e inscrição são aplicados uma vez.
2. **Given** fim do prazo, **When** não há opção exercida, **Then** o jogador retorna e vínculos/inscrições são atualizados deterministicamente.
3. **Given** opção válida exercida, **When** a liquidação conclui, **Then** o empréstimo vira transferência sem retorno duplicado.

### Edge Cases

- Recall proibido/permitido; opção expirada; lesão no término; janela fechada; clube sem fundos; retry após crash; menor com restrição.

## Scope & Boundaries

Inclui negociação, custos, salários, opção/obrigação, registro, acompanhamento, recall/retorno/compra. BC-006 escreve acordo/vínculos, BC-009 valores, BC-004 saúde, BC-007 inscrição. Não inclui evolução de atributos.

## Requirements

- **FR-001**: versionar termos, datas, custos, opção/obrigação e regras de recall.
- **FR-002**: aplicar pagamentos e divisão salarial uma vez via ledger.
- **FR-003**: manter no máximo um desfecho terminal: retorno ou compra.
- **FR-004**: exigir liberação médica e elegibilidade server-side quando aplicável.
- **FR-005**: reconciliar contrato, inscrição e elenco por eventos idempotentes.
- **FR-006**: preservar histórico completo do acordo e ruleset.

**Invariants**: INV-1, INV-10, INV-12, INV-16, INV-23, INV-30, INV-37; CA-MKT-06; SAGA-05.

## Canonical Sources & Traceability

| Scope     | Source                                                                     |
| --------- | -------------------------------------------------------------------------- |
| Fluxo     | `docs/01-game-design/15-fluxos-completos.md` — “10. Empréstimo de jogador” |
| Ownership | `docs/02-tecnico/12-context-map-e-blueprint.md` — C4/C6/C7/C9              |
| Workflow  | `docs/02-tecnico/16-sagas-e-workflows.md` — SAGA-05                        |
| Aceite    | `docs/02-tecnico/17-criterios-de-aceite-e-bandas.md` — CA-MKT-06           |

## Success Criteria

- **SC-001**: 100% dos acordos terminam em exatamente um retorno ou compra.
- **SC-002**: zero pagamentos, inscrições ou vínculos duplicados em retry.
- **SC-003**: toda decisão terminal é reproduzível com mesmos termos/ruleset.

## Assumptions

- Contratos e ledger autoritativos existem; políticas de competição determinam elegibilidade.
