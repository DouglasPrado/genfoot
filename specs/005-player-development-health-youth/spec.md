# Feature Specification: Jogador, desenvolvimento, saúde e base

**Feature ID**: BC-004 · **Directory**: `specs/005-player-development-health-youth` · **Created**: 2026-07-13  
**Status**: DELIVERED · **Milestone**: M1 · **Owner**: C4 · Jogador/Desenvolvimento · **Input**: catálogo e fontes canônicas.

**Portfolio**: [catálogo](../001-game-delivery-roadmap/contracts/feature-catalog.md) · [mapa de fontes](../001-game-delivery-roadmap/contracts/source-map.md)  
**Branch**: pacote de design do roadmap mestre

## User Scenarios & Testing

### User Story 1 — Processar desenvolvimento diário reproduzível (Priority: P1)

Como gestor do domínio, quero executar a capacidade principal com resultado autoritativo, reproduzível e auditável.

**Why this priority**: entrega o menor incremento útil.  
**Independent Test**: mesma seed/ruleset e carga produzem o mesmo histórico diário, sem ultrapassar potencial.

1. **Given** estado e versão válidos, **When** o command é repetido com a mesma chave, **Then** existe um único efeito.
2. **Given** dois mundos, **When** ambos processam a mesma data, **Then** estado, seed e eventos permanecem isolados.

### User Story 2 — Conduzir saúde e carreira sem duplicação (Priority: P2)

Como consumer autorizado, quero integrar por contrato sem assumir ownership.

**Why this priority**: fecha colaboração e histórico após o núcleo P1.  
**Independent Test**: lesão, recuperação, promoção e aposentadoria respeitam máquinas de estado e retry.

1. **Given** falha após commit, **When** o fluxo retoma, **Then** continua do checkpoint sem duplicação.
2. **Given** versão ou transição inválida, **When** há mutação, **Then** retorna erro tipado e não publica evento.

### Edge Cases

Duplicação, concorrência otimista, ordem de eventos, referência cross-world, limites vazios/máximos, timeout e retry após commit são obrigatórios.

## Scope & Boundaries

- **Included**: Person/Player, atributos, estados, traços, treino, fadiga, moral, medicina, youth, envelhecimento, aposentadoria e demografia.
- **Excluded**: vínculo/contrato (C6), inscrição (C7), staff (C5) e runtime da partida (C8).
- **Ownership**: somente C4 · Jogador/Desenvolvimento escreve o estado acima; integrações usam IDs, queries, commands ou eventos versionados.
- **Dependencies**: FND-001, BC-002; a liberação exige contrato congelado e evidência requerida.
- **Current state**: Geração determinística de 368 jogadores, origem, estado diário e evolução limitada por potencial estão implementados; treino, medicina, youth e carreira completa estão pendentes.

## Requirements

- **FR-001** C4 é o único owner de Person, Player, atributos, disponibilidade, medicina, youth e carreira.
- **FR-002** Desenvolvimento separa accrual diário da aplicação canônica e aplica clamps de idade/potencial.
- **FR-003** Fadiga, moral, treino e lesão usam data lógica, staff consultado e ruleset versionado.
- **FR-004** O controlador demográfico gera pelo gap após aposentadorias e nunca por geradores concorrentes.
- **FR-005** Cada PlayerGenerated e checkpoint diário ocorre uma vez por jogador/data/ruleset.

### Invariants

- **INV-001**: R-109…R-115; INV-25…INV-31; relógio único de progressão.
- **INV-002**: toda escrita carrega `worldId`, `expectedVersion`, chave idempotente e ruleset aplicável.
- **INV-003**: histórico é append/versionado e não é recalculado silenciosamente.
- **INV-004**: commit local precede outbox; consumer não escreve aggregate alheio.

Consulte [data-model.md](data-model.md) e [contracts/README.md](contracts/README.md).

## Canonical Sources & Traceability

| Requirement | Source                                                                           | Decisions                                               |
| ----------- | -------------------------------------------------------------------------------- | ------------------------------------------------------- |
| FR-001      | `docs/02-tecnico/12-context-map-e-blueprint.md` — C4                             | R-109…R-115; INV-25…INV-31; relógio único de progressão |
| FR-002      | `docs/01-game-design/02-sistema-de-jogadores.md` — geração, treino e carreira    | baseline ratificada                                     |
| FR-003      | `docs/02-tecnico/07-arquitetura-do-core-ecs.md` — Development/Youth              | baseline ratificada                                     |
| FR-004      | `docs/02-tecnico/13-ledger-e-conservacao-economica.md` — progressão e demografia | baseline ratificada                                     |
| FR-005      | `docs/02-tecnico/14-maquinas-de-estado.md` — jogador e medicina                  | baseline ratificada                                     |

Aliases seguem o mapa C1…C12. Não existe conflito aberto; divergência futura bloqueia a implementação até reconciliação explícita.

## Success Criteria

- **SC-001**: P1 e P2 passam com retry sem efeitos duplicados.
- **SC-002**: mesmas entradas/seed/ruleset produzem hashes equivalentes quando aplicável.
- **SC-003**: 100% das mutações preservam isolamento, versão e owner único.
- **SC-004**: somente evidência reproduzível sustenta o estado PARTIAL.

## Assumptions

Baseline 2026-07-13 normativa; contratos congelam antes do paralelismo; escopo excluído permanece com seu owner.
