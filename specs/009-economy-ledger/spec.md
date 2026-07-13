# Feature Specification: Economia e ledger

**Feature ID**: BC-009 · **Directory**: `specs/009-economy-ledger` · **Created**: 2026-07-13  
**Status**: PLANNED · **Milestone**: M1 · **Owner**: C9 · Economia/Ledger

**Portfolio**: [catálogo](../001-game-delivery-roadmap/contracts/feature-catalog.md) · [mapa de fontes](../001-game-delivery-roadmap/contracts/source-map.md)  
**Branch**: pacote de design do roadmap mestre

## User Scenarios & Testing

### User Story 1 — Lançar e reconciliar dinheiro inteiro (Priority: P1)

Como operador, quero o núcleo autoritativo reproduzível e auditável.

**Why this priority**: menor incremento útil.  
**Independent Test**: cada transação balanceia débitos/créditos, residual global é zero e oferta muda só por faucet/sink nomeado.

1. **Given** versão válida, **When** repito o command com a mesma chave, **Then** há um único efeito.
2. **Given** mundos distintos, **When** executo entradas iguais, **Then** não há estado, seed ou evento compartilhado.

### User Story 2 — Reservar e liquidar obrigação com retry (Priority: P2)

Como mantenedor, quero recuperação e integração versionada sem transferir ownership.

**Why this priority**: fecha durabilidade e consumers depois do núcleo.  
**Independent Test**: reserva repetida não duplica saldo; liquidação/expiração/compensação ocorre uma vez.

1. **Given** falha após commit/checkpoint, **When** retomo, **Then** não duplico efeitos.
2. **Given** versão, ordem ou transição inválida, **When** mutação chega, **Then** erro tipado e zero evento.

### Edge Cases

Concorrência, duplicata, ordem/gap, timeout após commit, limite vazio/máximo, referência cross-world, ruleset/schema antigo e retry esgotado.

## Scope & Boundaries

- **Included**: contas, transações/entries dobradas, reservas, orçamento, folha, pagamentos, dívida, faucets/sinks, oferta e reconciliação.
- **Excluded**: decisão de gasto do clube (C3), termos contratuais (C5/C6), torcida (C10) e sanção (C12).
- **Ownership**: somente C9 · Economia/Ledger escreve o escopo; consumers usam contrato.
- **Dependencies**: BC-002, BC-003, liberadas por contrato congelado e evidência.
- **Current state**: O ledger autoritativo e seus adapters ainda não existem no código; regras e bandas estão ratificadas nos docs.

## Requirements

- **FR-001** C9 é o único owner de contas, saldo, reserva, lançamento, dívida e snapshots financeiros.
- **FR-002** Valores usam inteiro/fixed-point em uma moeda-base por mundo; float monetário é proibido.
- **FR-003** Cada Transaction possui ao menos duas Entries e soma algébrica zero por moeda.
- **FR-004** Transfer, faucet e sink usam contas sistêmicas nomeadas e alteram oferta conforme classificação.
- **FR-005** Reserva reduz disponível sem alterar razão até liquidação/expiração, com idempotência e vigência.
- **FR-006** Reconciliação periódica mede residual zero, rastreia oferta e bloqueia promoção em divergência.

### Invariants

- **INV-001**: INV-3a/3b; INV-8…INV-13; BE-*; conservação monetária.
- **INV-002**: escrita isolada por world, versionada e idempotente.
- **INV-003**: regra/seed/schema usados ficam no histórico; fatos publicados não mudam.
- **INV-004**: transação é local ao owner e integração ocorre após commit.

Consulte [data-model.md](data-model.md) e [contracts/README.md](contracts/README.md).

## Canonical Sources & Traceability

| Requirement | Canonical source                                                                   | Decision                                             |
| ----------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------- |
| FR-001      | `docs/02-tecnico/12-context-map-e-blueprint.md` — C9                               | INV-3a/3b; INV-8…INV-13; BE-*; conservação monetária |
| FR-002      | `docs/01-game-design/03-economia.md` — receitas, despesas e saúde                  | baseline ratificada                                  |
| FR-003      | `docs/02-tecnico/13-ledger-e-conservacao-economica.md` — ledger/conservação/oferta | baseline ratificada                                  |

Aliases seguem o source-map. Não há conflito aberto; divergência futura bloqueia implementação.

## Success Criteria

- **SC-001**: P1/P2 passam com retry sem duplicação.
- **SC-002**: replay equivalente produz hashes iguais quando aplicável.
- **SC-003**: 100% das escritas respeitam world, version e owner.
- **SC-004**: status PLANNED nunca inclui escopo sem prova reproduzível.

## Assumptions

Baseline 2026-07-13 normativa; contratos congelados antes do paralelismo; escopo externo permanece com seu owner.
