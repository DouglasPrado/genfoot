# Feature Specification: Staff

**Feature ID**: BC-005 · **Directory**: `specs/006-staff` · **Created**: 2026-07-13  
**Status**: DELIVERED · **Milestone**: M1 · **Owner**: C5 · Staff · **Input**: catálogo e fontes canônicas.

**Portfolio**: [catálogo](../001-game-delivery-roadmap/contracts/feature-catalog.md) · [mapa de fontes](../001-game-delivery-roadmap/contracts/source-map.md)  
**Branch**: pacote de design do roadmap mestre

## User Scenarios & Testing

### User Story 1 — Contratar e alocar staff por função (Priority: P1)

Como gestor do domínio, quero executar a capacidade principal com resultado autoritativo, reproduzível e auditável.

**Why this priority**: entrega o menor incremento útil.  
**Independent Test**: contratação válida cria um vínculo único e impede sobreposição incompatível.

1. **Given** estado e versão válidos, **When** o command é repetido com a mesma chave, **Then** existe um único efeito.
2. **Given** dois mundos, **When** ambos processam a mesma data, **Then** estado, seed e eventos permanecem isolados.

### User Story 2 — Consultar capacidade sem escrita cruzada (Priority: P2)

Como consumer autorizado, quero integrar por contrato sem assumir ownership.

**Why this priority**: fecha colaboração e histórico após o núcleo P1.  
**Independent Test**: C4/C6/C8 recebem snapshot versionado de capacidade e não alteram StaffMember.

1. **Given** falha após commit, **When** o fluxo retoma, **Then** continua do checkpoint sem duplicação.
2. **Given** versão ou transição inválida, **When** há mutação, **Then** retorna erro tipado e não publica evento.

### Edge Cases

Duplicação, concorrência otimista, ordem de eventos, referência cross-world, limites vazios/máximos, timeout e retry após commit são obrigatórios.

## Scope & Boundaries

- **Included**: StaffMember, função, capacidades, reputação, disponibilidade, StaffContract e efeitos consultáveis.
- **Excluded**: departamentos (C3), negociação/vínculo de jogador (C6), medicina de jogador (C4) e decisão da IA (X-001).
- **Ownership**: somente C5 · Staff escreve o estado acima; integrações usam IDs, queries, commands ou eventos versionados.
- **Dependencies**: FND-001, BC-003; a liberação exige contrato congelado e evidência requerida.
- **Current state**: Não há aggregate ou persistência de staff no código; o catálogo e as fórmulas são somente baseline de design.

## Requirements

- **FR-001** C5 é o único owner de StaffMember e StaffContract.
- **FR-002** Funções, atributos e capacidade usam escalas e regras versionadas, inclusive F21 staffLevel.
- **FR-003** Contratos possuem vigência sem sobreposição incompatível, custo referenciado e término auditável.
- **FR-004** Alocação respeita capacidade do departamento consultada de C3.
- **FR-005** Queries retornam capacidade e confiança as-of sem permitir escrita por consumers.

### Invariants

- **INV-001**: F21; R-148; vínculo ativo único por função/período conforme regra.
- **INV-002**: toda escrita carrega `worldId`, `expectedVersion`, chave idempotente e ruleset aplicável.
- **INV-003**: histórico é append/versionado e não é recalculado silenciosamente.
- **INV-004**: commit local precede outbox; consumer não escreve aggregate alheio.

Consulte [data-model.md](data-model.md) e [contracts/README.md](contracts/README.md).

## Canonical Sources & Traceability

| Requirement | Source                                                                        | Decisions                                                         |
| ----------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| FR-001      | `docs/02-tecnico/12-context-map-e-blueprint.md` — C5                          | F21; R-148; vínculo ativo único por função/período conforme regra |
| FR-002      | `docs/01-game-design/04-estrutura-do-clube-e-staff.md` — cargos e atributos   | baseline ratificada                                               |
| FR-003      | `docs/01-game-design/07-inteligencia-artificial.md` — capacidade/recomendação | baseline ratificada                                               |
| FR-004      | `docs/02-tecnico/05-catalogo-de-regras-e-formulas.md` — F21                   | baseline ratificada                                               |

Aliases seguem o mapa C1…C12. Não existe conflito aberto; divergência futura bloqueia a implementação até reconciliação explícita.

## Success Criteria

- **SC-001**: P1 e P2 passam com retry sem efeitos duplicados.
- **SC-002**: mesmas entradas/seed/ruleset produzem hashes equivalentes quando aplicável.
- **SC-003**: 100% das mutações preservam isolamento, versão e owner único.
- **SC-004**: somente evidência reproduzível sustenta o estado PLANNED.

## Assumptions

Baseline 2026-07-13 normativa; contratos congelam antes do paralelismo; escopo excluído permanece com seu owner.
