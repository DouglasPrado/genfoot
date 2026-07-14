# Feature Specification: Venda de jogador

**ID**: GP-009 | **Slug**: `player-sale` | **Milestone**: M3 | **Status**: DELIVERED  
**Owner**: BC-006 Mercado/Contratos | **Contributors**: BC-003, BC-009, X-002, X-003  
**Created**: 2026-07-13 | **Directory**: `specs/028-player-sale`

## User Scenarios & Testing

### User Story 1 — Concluir uma venda preservando valor e histórico (P1)

Como gestor, quero avaliar, negociar e vender um jogador para ajustar o elenco e as finanças sem duplicar pagamento ou perder o histórico do vínculo.

**Independent Test**: executar listagem até liquidação e confirmar um acordo, um pagamento, um encerramento de contrato e projeções reconciliadas.

**Acceptance Scenarios**:

1. **Given** jogador negociável e oferta válida, **When** o clube aceita, **Then** a saga reserva/liquida uma vez, encerra o vínculo anterior e publica a saída.
2. **Given** dois aceites concorrentes, **When** são processados, **Then** no máximo um acordo conclui e o outro recebe conflito explícito.
3. **Given** falha antes da liquidação, **When** a compensação roda, **Then** a reserva é liberada uma vez e o jogador permanece no clube.

### Edge Cases

- Oferta expira ou é retirada durante aceite; jogador fica inelegível; pagamento falha; retry chega duplicado; janela fecha entre proposta e assinatura.

## Scope & Boundaries

Inclui listagem/abordagem, avaliação, ofertas versionadas, aceite, liquidação, encerramento do vínculo e reconciliação de elenco. BC-006 escreve mercado/contrato; BC-009 escreve ledger; BC-003 atualiza a projeção do elenco por evento. Não inclui compra pelo clube vendedor nem UX genérica de mercado.

## Requirements

- **FR-001**: preservar todas as versões de oferta e rejeitar aceite vencido.
- **FR-002**: garantir no máximo um acordo ativo para o mesmo caso de transferência.
- **FR-003**: reservar e liquidar valor exatamente uma vez, com residual zero no ledger.
- **FR-004**: tratar o contrato de BC-006 como fonte do vínculo; elenco/currentClub são projeções.
- **FR-005**: emitir eventos idempotentes de acordo, liquidação e saída com `gameWorldId`, sequência e ruleset.
- **FR-006**: expor erros de conflito, janela, elegibilidade, fundos, expiração e compensação pendente.

**Invariants**: INV-1, INV-10, INV-12, INV-16, INV-23, INV-30; CA-MKT-01…05.

## Canonical Sources & Traceability

| Requirement       | Source                                                               |
| ----------------- | -------------------------------------------------------------------- |
| FR-001…FR-006     | `docs/01-game-design/15-fluxos-completos.md` — “9. Venda de jogador” |
| Mercado e vínculo | `docs/02-tecnico/12-context-map-e-blueprint.md` — C6                 |
| Saga/compensação  | `docs/02-tecnico/16-sagas-e-workflows.md` — SAGA-01                  |
| Aceite            | `docs/02-tecnico/17-criterios-de-aceite-e-bandas.md` — Mercado       |

## Success Criteria

- **SC-001**: 100% dos retries produzem no máximo uma liquidação e um acordo.
- **SC-002**: toda falha terminal libera reserva uma vez e preserva histórico.
- **SC-003**: contrato, elenco e ledger reconciliam sem divergência após sucesso/compensação.

## Assumptions

- BC-003, BC-006, BC-009 e X-002 estarão implementados; cliente X-003 apenas apresenta contratos autoritativos.
