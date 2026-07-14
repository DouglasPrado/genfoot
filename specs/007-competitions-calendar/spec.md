# Feature Specification: Competições e calendário

**Feature ID**: BC-007 · **Directory**: `specs/007-competitions-calendar` · **Created**: 2026-07-13  
**Status**: DELIVERED · **Milestone**: M1 · **Owner**: C7 · Competição/Calendário · **Input**: catálogo e fontes canônicas.

**Portfolio**: [catálogo](../001-game-delivery-roadmap/contracts/feature-catalog.md) · [mapa de fontes](../001-game-delivery-roadmap/contracts/source-map.md)  
**Branch**: pacote de design do roadmap mestre

## User Scenarios & Testing

### User Story 1 — Gerar competição por formato versionado (Priority: P1)

Como gestor do domínio, quero executar a capacidade principal com resultado autoritativo, reproduzível e auditável.

**Why this priority**: entrega o menor incremento útil.  
**Independent Test**: mesmo formato/participantes/seed gera fixtures válidas sem colisão e com descanso mínimo.

1. **Given** estado e versão válidos, **When** o command é repetido com a mesma chave, **Then** existe um único efeito.
2. **Given** dois mundos, **When** ambos processam a mesma data, **Then** estado, seed e eventos permanecem isolados.

### User Story 2 — Homologar classificação oficial (Priority: P2)

Como consumer autorizado, quero integrar por contrato sem assumir ownership.

**Why this priority**: fecha colaboração e histórico após o núcleo P1.  
**Independent Test**: resultados únicos atualizam standings e somente edição completa pode ser homologada.

1. **Given** falha após commit, **When** o fluxo retoma, **Then** continua do checkpoint sem duplicação.
2. **Given** versão ou transição inválida, **When** há mutação, **Then** retorna erro tipado e não publica evento.

### Edge Cases

Duplicação, concorrência otimista, ordem de eventos, referência cross-world, limites vazios/máximos, timeout e retry após commit são obrigatórios.

## Scope & Boundaries

- **Included**: CompetitionFormat, edição/temporada, participantes, fases, inscrição, fixtures, standings, disciplina, promoção/rebaixamento e homologação.
- **Excluded**: relógio/temporada (C2), simulação/resultado bruto (C8), elenco (C3/C6) e pagamentos (C9).
- **Ownership**: somente C7 · Competição/Calendário escreve o estado acima; integrações usam IDs, queries, commands ou eventos versionados.
- **Dependencies**: BC-002, BC-003; a liberação exige contrato congelado e evidência requerida.
- **Current state**: A gênese cria uma liga de 16 clubes, 30 rodadas e 240 jogos ida/volta; formatos por dados, inscrição, standings, disciplina e homologação estão pendentes.

## Requirements

- **FR-001** C7 é owner de formatos, edições, participantes, fixtures, inscrições, standings e homologação.
- **FR-002** Formato deve ser dado versionado, não branch de código por campeonato.
- **FR-003** Geração respeita ida/volta, calendário C2, descanso, prioridade e indisponibilidades.
- **FR-004** Resultado oficial de C8 entra uma vez por matchId/version e recalcula projeções determinísticas.
- **FR-005** Título, acesso e rebaixamento permanecem provisórios até homologação explícita.

### Invariants

- **INV-001**: INV-25/26; INV-32/33; R-148; cada partida pertence a exatamente uma edição/fase.
- **INV-002**: toda escrita carrega `worldId`, `expectedVersion`, chave idempotente e ruleset aplicável.
- **INV-003**: histórico é append/versionado e não é recalculado silenciosamente.
- **INV-004**: commit local precede outbox; consumer não escreve aggregate alheio.

Consulte [data-model.md](data-model.md) e [contracts/README.md](contracts/README.md).

## Canonical Sources & Traceability

| Requirement | Source                                                                               | Decisions                                                                       |
| ----------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| FR-001      | `docs/02-tecnico/12-context-map-e-blueprint.md` — C7                                 | INV-25/26; INV-32/33; R-148; cada partida pertence a exatamente uma edição/fase |
| FR-002      | `docs/01-game-design/06-temporada-e-competicoes.md` — formato/calendário             | baseline ratificada                                                             |
| FR-003      | `docs/01-game-design/12-selecoes-e-calendario-internacional.md` — conflitos de datas | baseline ratificada                                                             |
| FR-004      | `docs/02-tecnico/05-catalogo-de-regras-e-formulas.md` — CompetitionFormat            | baseline ratificada                                                             |
| FR-005      | `docs/02-tecnico/14-maquinas-de-estado.md` — competição                              | baseline ratificada                                                             |

Aliases seguem o mapa C1…C12. Não existe conflito aberto; divergência futura bloqueia a implementação até reconciliação explícita.

## Success Criteria

- **SC-001**: P1 e P2 passam com retry sem efeitos duplicados.
- **SC-002**: mesmas entradas/seed/ruleset produzem hashes equivalentes quando aplicável.
- **SC-003**: 100% das mutações preservam isolamento, versão e owner único.
- **SC-004**: somente evidência reproduzível sustenta o estado PARTIAL.

## Assumptions

Baseline 2026-07-13 normativa; contratos congelam antes do paralelismo; escopo excluído permanece com seu owner.
