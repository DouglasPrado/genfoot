# Feature Specification: Eventing, sagas, projeções e realtime

**Feature ID**: X-002 · **Directory**: `specs/010-eventing-sagas-projections` · **Created**: 2026-07-13  
**Status**: DELIVERED · **Milestone**: M2 · **Owner**: Concern · Eventing/Projeção

**Portfolio**: [catálogo](../001-game-delivery-roadmap/contracts/feature-catalog.md) · [mapa de fontes](../001-game-delivery-roadmap/contracts/source-map.md)  
**Branch**: pacote de design do roadmap mestre

## User Scenarios & Testing

### User Story 1 — Publicar e consumir fatos duráveis uma vez (Priority: P1)

Como operador, quero o núcleo autoritativo reproduzível e auditável.

**Why this priority**: menor incremento útil.  
**Independent Test**: commit+outbox sobrevivem falha e deliveries duplicados geram um único efeito por consumer.

1. **Given** versão válida, **When** repito o command com a mesma chave, **Then** há um único efeito.
2. **Given** mundos distintos, **When** executo entradas iguais, **Then** não há estado, seed ou evento compartilhado.

### User Story 2 — Retomar saga/projeção/realtime por sequência (Priority: P2)

Como mantenedor, quero recuperação e integração versionada sem transferir ownership.

**Why this priority**: fecha durabilidade e consumers depois do núcleo.  
**Independent Test**: SAGA-01…05 retomam por checkpoint/fencing; projeção e cliente recuperam gap por cursor.

1. **Given** falha após commit/checkpoint, **When** retomo, **Then** não duplico efeitos.
2. **Given** versão, ordem ou transição inválida, **When** mutação chega, **Then** erro tipado e zero evento.

### Edge Cases

Concorrência, duplicata, ordem/gap, timeout após commit, limite vazio/máximo, referência cross-world, ruleset/schema antigo e retry esgotado.

## Scope & Boundaries

- **Included**: event registry/envelope, outbox/inbox/DLQ, ordenação, idempotência, process managers SAGA-01…05, replay, projeções e entrega realtime recuperável.
- **Excluded**: regras/aggregates competitivos dos contexts e UI cliente (X-003).
- **Ownership**: somente Concern · Eventing/Projeção escreve o escopo; consumers usam contrato.
- **Dependencies**: FND-001, BC-002, liberadas por contrato congelado e evidência.
- **Current state**: Eventos de domínio em memória, chaves/checkpoints locais e scheduler persistente existem; broker, outbox/inbox/DLQ, sagas duráveis, projeções e realtime não.

## Requirements

- **FR-001** X-002 transporta fatos e coordena workflows sem possuir regras ou aggregates competitivos.
- **FR-002** Evento público usa registry e envelope versionado com world, aggregateVersion, correlation e causation.
- **FR-003** Outbox é atômica ao commit do owner; Inbox deduplica por consumer/event e DLQ preserva falha.
- **FR-004** Ordenação é garantida por aggregate/stream; gaps são detectados e recuperáveis por cursor/replay.
- **FR-005** Saga persiste passo, lease/fencing, retry/timeout/compensação e authority conforme SAGA-01…05.
- **FR-006** Projeções são reconstruíveis e realtime usa sequence/resume token sem ser fonte autoritativa.

### Invariants

- **INV-001**: Decisões 19.8/19.10; R-138…R-142; SAGA-01…05; INV-27…INV-31.
- **INV-002**: escrita isolada por world, versionada e idempotente.
- **INV-003**: regra/seed/schema usados ficam no histórico; fatos publicados não mudam.
- **INV-004**: transação é local ao owner e integração ocorre após commit.

Consulte [data-model.md](data-model.md) e [contracts/README.md](contracts/README.md).

## Canonical Sources & Traceability

| Requirement | Canonical source                                                            | Decision                                                    |
| ----------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- |
| FR-001      | `docs/02-tecnico/12-context-map-e-blueprint.md` — Concern Eventing/Projeção | Decisões 19.8/19.10; R-138…R-142; SAGA-01…05; INV-27…INV-31 |
| FR-002      | `docs/02-tecnico/01-arquitetura-de-dados.md` — Outbox/Inbox e concorrência  | baseline ratificada                                         |
| FR-003      | `docs/02-tecnico/08-frontend-cliente-e-tempo-real.md` — sequence/recovery   | baseline ratificada                                         |
| FR-004      | `docs/02-tecnico/15-ruleset-e-replay.md` — eventos/replay                   | baseline ratificada                                         |
| FR-005      | `docs/02-tecnico/16-sagas-e-workflows.md` — kernel SAGA-01…05               | baseline ratificada                                         |

Aliases seguem o source-map. Não há conflito aberto; divergência futura bloqueia implementação.

## Success Criteria

- **SC-001**: P1/P2 passam com retry sem duplicação.
- **SC-002**: replay equivalente produz hashes iguais quando aplicável.
- **SC-003**: 100% das escritas respeitam world, version e owner.
- **SC-004**: status PARTIAL nunca inclui escopo sem prova reproduzível.

## Assumptions

Baseline 2026-07-13 normativa; contratos congelados antes do paralelismo; escopo externo permanece com seu owner.
