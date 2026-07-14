# Feature Specification: Partida e runtime

**Feature ID**: BC-008 · **Directory**: `specs/008-match-runtime` · **Created**: 2026-07-13  
**Status**: DELIVERED · **Milestone**: M1 · **Owner**: C8 · Partida/Runtime

**Portfolio**: [catálogo](../001-game-delivery-roadmap/contracts/feature-catalog.md) · [mapa de fontes](../001-game-delivery-roadmap/contracts/source-map.md)  
**Branch**: pacote de design do roadmap mestre

## User Scenarios & Testing

### User Story 1 — Simular a partida em um kernel único (Priority: P1)

Como operador, quero o núcleo autoritativo reproduzível e auditável.

**Why this priority**: menor incremento útil.  
**Independent Test**: automático, online e offline com mesmo manifesto/log produzem resultHash e statsHash iguais.

1. **Given** versão válida, **When** repito o command com a mesma chave, **Then** há um único efeito.
2. **Given** mundos distintos, **When** executo entradas iguais, **Then** não há estado, seed ou evento compartilhado.

### User Story 2 — Retomar e provar replay online/offline (Priority: P2)

Como mantenedor, quero recuperação e integração versionada sem transferir ownership.

**Why this priority**: fecha durabilidade e consumers depois do núcleo.  
**Independent Test**: checkpoint retomado e replay integral convergem, rejeitando command fora da janela/sequence.

1. **Given** falha após commit/checkpoint, **When** retomo, **Then** não duplico efeitos.
2. **Given** versão, ordem ou transição inválida, **When** mutação chega, **Then** erro tipado e zero evento.

### Edge Cases

Concorrência, duplicata, ordem/gap, timeout após commit, limite vazio/máximo, referência cross-world, ruleset/schema antigo e retry esgotado.

## Scope & Boundaries

- **Included**: kickoff snapshot, escalação/tática, SimulationManifest, ticks, commands live/offline, F1–F21, checkpoints, replay, resultado e estatísticas.
- **Excluded**: elegibilidade (C7), estado persistente do jogador (C4), staff (C5), ledger (C9) e apresentação (X-003).
- **Ownership**: somente C8 · Partida/Runtime escreve o escopo; consumers usam contrato.
- **Dependencies**: BC-003, BC-004, BC-005, BC-007, liberadas por contrato congelado e evidência.
- **Current state**: Não existe runtime de partida implementado; apenas RNG/fundação e a baseline documental.

## Requirements

- **FR-001** C8 é owner de Match, tática, runtime, command log, resultado e stats da partida.
- **FR-002** Um único kernel e timestep canônico processam automático, online, offline e replay.
- **FR-003** SimulationManifest fixa kickoff snapshot, ruleset, engine build, RNG streams e hashes de entrada.
- **FR-004** Commands são ordenados por tick, matchSequence e commandId, com janela/cooldown e idempotência.
- **FR-005** Resultado oficial é finalizado uma vez; consequências saem por eventos e não por escrita cruzada.
- **FR-006** F1–F21 e clamps usam aritmética/ordem estáveis e testes de propriedade.

### Invariants

- **INV-001**: R-34; F1–F21; INV-27…INV-33; online ≡ offline ≡ replay.
- **INV-002**: escrita isolada por world, versionada e idempotente.
- **INV-003**: regra/seed/schema usados ficam no histórico; fatos publicados não mudam.
- **INV-004**: transação é local ao owner e integração ocorre após commit.

Consulte [data-model.md](data-model.md) e [contracts/README.md](contracts/README.md).

## Canonical Sources & Traceability

| Requirement | Canonical source                                                             | Decision                                               |
| ----------- | ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| FR-001      | `docs/02-tecnico/12-context-map-e-blueprint.md` — C8                         | R-34; F1–F21; INV-27…INV-33; online ≡ offline ≡ replay |
| FR-002      | `docs/01-game-design/05-motor-de-partida.md` — fluxo e regras                | baseline ratificada                                    |
| FR-003      | `docs/02-tecnico/07-arquitetura-do-core-ecs.md` — Match System               | baseline ratificada                                    |
| FR-004      | `docs/02-tecnico/14-maquinas-de-estado.md` — partida                         | baseline ratificada                                    |
| FR-005      | `docs/02-tecnico/15-ruleset-e-replay.md` — kernel, commands, manifesto e RNG | baseline ratificada                                    |

Aliases seguem o source-map. Não há conflito aberto; divergência futura bloqueia implementação.

## Success Criteria

- **SC-001**: P1/P2 passam com retry sem duplicação.
- **SC-002**: replay equivalente produz hashes iguais quando aplicável.
- **SC-003**: 100% das escritas respeitam world, version e owner.
- **SC-004**: status PLANNED nunca inclui escopo sem prova reproduzível.

## Assumptions

Baseline 2026-07-13 normativa; contratos congelados antes do paralelismo; escopo externo permanece com seu owner.
