# Feature Specification: Jornada de um jovem

**ID**: GP-011 | **Slug**: `youth-journey` | **Milestone**: M3 | **Status**: DELIVERED  
**Owner**: BC-004 | **Contributors**: BC-003, BC-005, BC-006, X-003  
**Created**: 2026-07-13 | **Directory**: `specs/030-youth-journey`

## User Scenarios & Testing

### User Story 1 — Desenvolver um jovem da safra ao futebol profissional (P1)

Como gestor, quero avaliar e desenvolver jovens para decidir promoção, contrato, empréstimo ou saída com progressão justa e rastreável.

**Independent Test**: gerar a mesma safra com a mesma seed, promover um jovem e acompanhar treino/minutagem até contrato ou saída sem exceder potencial.

**Acceptance Scenarios**:

1. **Given** seed/temporada iguais, **When** a safra é gerada ou reprocessada, **Then** a população é idêntica e não duplica.
2. **Given** jovem promovido, **When** treina e joga, **Then** mudanças registram causa e não ultrapassam potencial/cap anual.
3. **Given** jovem inelegível por idade/vínculo, **When** contratação/empréstimo é tentado, **Then** o command falha explicitamente.

### Edge Cases

- Academia sem vaga; safra já processada; potencial atingido; lesão; menor com restrição; contrato recusado; clube sem staff adequado.

## Scope & Boundaries

Inclui safra, avaliação, academia, promoção, plano, treino/minutagem, primeiro contrato e desfecho. C4 escreve jogador/youth; C3 academia/elenco; C5 capacidade; C6 contrato. Já existe geração/lifecycle básico, mas academia e jornada completa faltam.

## Requirements

- **FR-001**: gerar safra determinística/idempotente por mundo, temporada e ruleset.
- **FR-002**: registrar origem única `PlayerGenerated` e todo delta com causa.
- **FR-003**: aplicar vagas, idade, vínculo, potencial e cap de ganho.
- **FR-004**: separar avaliação observável de potencial oculto.
- **FR-005**: promover/contratar/emprestar somente pelos owners e commands oficiais.
- **FR-006**: preservar histórico mesmo após saída/aposentadoria.

**Invariants**: INV-6, INV-7, INV-29, INV-30, INV-36, INV-37; CA-PLY-01…07.

## Canonical Sources & Traceability

| Scope         | Source                                                                   |
| ------------- | ------------------------------------------------------------------------ |
| Fluxo         | `docs/01-game-design/15-fluxos-completos.md` — “11. Jornada de um jovem” |
| Jogador/youth | `docs/01-game-design/02-sistema-de-jogadores.md`                         |
| Ownership     | `docs/02-tecnico/12-context-map-e-blueprint.md` — C3/C4/C5/C6            |
| Aceite        | `docs/02-tecnico/17-criterios-de-aceite-e-bandas.md` — Jogadores         |

## Success Criteria

- **SC-001**: mesma seed produz 100% da mesma safra e retry não duplica jovens.
- **SC-002**: zero jogador sem origem ou delta sem causa.
- **SC-003**: zero violação de idade, potencial, cap e vínculo em 20 temporadas.

## Assumptions

- O lifecycle básico entregue é preservado; treino, medicina, academia e contrato chegam pelas features BC correspondentes.
