# Feature Specification: Ciclo financeiro mensal

**ID**: GP-013 | **Slug**: `monthly-finance` | **Milestone**: M3 | **Status**: DELIVERED  
**Owner**: BC-009 | **Contributors**: BC-003, BC-006, BC-011, X-003  
**Created**: 2026-07-13 | **Directory**: `specs/032-monthly-finance`

## User Scenarios & Testing

### User Story 1 — Fechar o mês com números reconciliados (P1)

Como gestor, quero acompanhar receitas, obrigações, folha e projeção para tomar decisões antes que o caixa entre em risco.

**Independent Test**: processar um mês com receitas/obrigações, repetir jobs e confirmar ledger residual zero, fechamento único e alertas/projeção reconstruíveis.

**Acceptance Scenarios**:

1. **Given** obrigações e receitas vencidas, **When** o fechamento roda, **Then** todos os lançamentos balanceiam e o período fecha uma vez.
2. **Given** job repetido, **When** usa a mesma idempotency key, **Then** nenhum pagamento/receita duplica.
3. **Given** risco de caixa, **When** a projeção cruza o limite, **Then** alerta explicável é emitido sem alterar o ledger.

### Edge Cases

- Caixa insuficiente; obrigação contestada; arredondamento; período reaberto por correção; contrato expirado; crash durante lote; fechamento concorrente.

## Scope & Boundaries

Inclui geração/liquidação de obrigações, receitas, folha, fechamento, snapshot, forecast e alertas. C9 escreve ledger/finance; C3 decide orçamento, C6 fornece obrigações, C11 projeta/comunica. Não inclui negociação de contratos ou medidas de crise.

## Requirements

- **FR-001**: representar dinheiro em unidade mínima inteira e lançar débito/crédito balanceados.
- **FR-002**: deduplicar cada obrigação/receita por mundo, competência e origem.
- **FR-003**: fechar uma competência uma vez, com correção append-only.
- **FR-004**: reconciliar saldo, reservas, obrigações e snapshot com residual zero.
- **FR-005**: produzir forecast/alertas a partir de fatos sem autoridade de escrita financeira.
- **FR-006**: preservar ruleset, origem, ator e histórico de cada lançamento.

**Invariants**: INV-3a/3b, INV-8…13, INV-30; CA-ECO; BE-01/02.

## Canonical Sources & Traceability

| Scope    | Source                                                                       |
| -------- | ---------------------------------------------------------------------------- |
| Fluxo    | `docs/01-game-design/15-fluxos-completos.md` — “13. Ciclo financeiro mensal” |
| Economia | `docs/01-game-design/03-economia.md`                                         |
| Ledger   | `docs/02-tecnico/13-ledger-e-conservacao-economica.md`                       |
| Aceite   | `docs/02-tecnico/17-criterios-de-aceite-e-bandas.md` — Economia              |

## Success Criteria

- **SC-001**: residual do ledger igual a zero em 100% dos fechamentos/retries.
- **SC-002**: zero lançamento duplicado e um snapshot oficial por competência.
- **SC-003**: alertas e forecasts são reconstruíveis dos mesmos fatos.

## Assumptions

- BC-009 define contas/coA; obrigações de C6 e decisões C3 chegam por contratos versionados.
