# Feature Specification: Mundo, temporadas e scheduler

**Feature ID**: BC-002  
**Directory**: `specs/003-world-seasons-scheduler`  
**Created**: 2026-07-13  
**Status**: DELIVERED  
**Milestone**: M1  
**Owner**: C2 · Mundo/Temporada  
**Input**: catálogo mestre, mapa de fontes e documentos canônicos.

**Portfolio**: [catálogo](../001-game-delivery-roadmap/contracts/feature-catalog.md) · [mapa de fontes](../001-game-delivery-roadmap/contracts/source-map.md)  
**Branch**: pacote de design do roadmap mestre

## User Scenarios & Testing

### User Story 1 — Avançar o mundo com segurança (Priority: P1)

Como operador do domínio, quero fazer o tempo do mundo avançar uma única vez, com temporadas e trabalho agendado recuperáveis.

**Why this priority**: estabelece o comportamento autoritativo mínimo da feature.

**Independent Test**: repetir o mesmo dia ou recuperar uma lease expirada não duplica ocorrências nem eventos.

**Acceptance Scenarios**

1. **Given** estado válido e versão esperada, **When** o comando P1 é repetido com a mesma chave, **Then** há um único efeito e a mesma resposta observável.
2. **Given** dois mundos, **When** o fluxo roda em ambos, **Then** nenhuma leitura, escrita, seed ou evento cruza `worldId`.

### User Story 2 — Encerrar e abrir temporadas por checkpoints (Priority: P2)

Como mantenedor, quero evoluir o domínio preservando histórico, compatibilidade e recuperação.

**Why this priority**: fecha a operação durável depois da fatia principal.

**Independent Test**: a SAGA-02 retoma do último checkpoint e só abre a próxima temporada após homologações obrigatórias.

**Acceptance Scenarios**

1. **Given** falha após persistência parcial, **When** o processamento é retomado, **Then** continua do checkpoint sem duplicar efeitos.
2. **Given** versão/ruleset incompatível, **When** uma mutação é solicitada, **Then** falha de modo tipado sem alterar estado.

### Edge Cases

- comando duplicado, concorrente ou fora de ordem;
- referência a outro mundo, aggregate ausente ou versão obsoleta;
- retry depois de timeout e evento já publicado;
- data-limite, coleção vazia, limite de capacidade e snapshot histórico.

## Scope & Boundaries

**Included**: mundo, relógio, configuração/ruleset ativo, janelas, Season, ScheduledTask, catch-up e rollover SAGA-02.

**Excluded**: formato e standings de competição (C7), efeitos de jogador (C4) e lançamentos financeiros (C9).

**Ownership**: C2 · Mundo/Temporada escreve somente seus aggregates. Outros contextos são consumidos por IDs, queries versionadas, commands ou eventos públicos.

**Dependencies**: FND-001. A dependência libera trabalho apenas quando seu contrato e evidência requerida estiverem disponíveis.

**Current state**: Mundo, avanço diário idempotente, temporada linear, agenda persistida, janelas versionadas, lease/fencing, retry, SAGA-02 com 20 checkpoints e abertura única da temporada seguinte estão implementados e reproduzíveis.

**Target state**: Entregue para o owner C2; integrações reais dos demais contexts permanecem nos respectivos pacotes e são consumidas por ports versionados.

## Requirements

### Functional Requirements

- **FR-001** C2 deve ser a única autoridade do relógio, status do mundo e ciclo da temporada.
- **FR-002** Cada ocorrência agendada deve ter chave única por mundo, tarefa e data lógica.
- **FR-003** Claims concorrentes devem usar lease e fencing token; um worker obsoleto não pode confirmar resultado.
- **FR-004** Janelas e regras temporais devem ser versionadas pelo ruleset do mundo.
- **FR-005** A virada deve persistir os 20 checkpoints da SAGA-02, retry e compensações previstas.
- **FR-006** `SeasonStarted` e `SeasonDue` devem ser emitidos uma vez por temporada.

### Domain Rules and Invariants

- **INV-001**: R-148; SAGA-02; INV-27…INV-31; isolamento por worldId.
- **INV-002**: toda escrita é isolada por `worldId`, versionada e idempotente.
- **INV-003**: regras comportamentais registram `rulesetVersion`; histórico não é reinterpretado.
- **INV-004**: eventos são consequência de commit local e nunca concedem escrita cruzada.

### Conceptual Entities

Consulte [data-model.md](data-model.md). Contratos observáveis estão em [contracts/README.md](contracts/README.md).

## Canonical Sources & Traceability

| Requirement group    | Canonical source                                                           | Decisions / coverage                                  |
| -------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------- |
| FR-001 e invariantes | `docs/02-tecnico/12-context-map-e-blueprint.md` — C2 · Mundo/Temporada     | R-148; SAGA-02; INV-27…INV-31; isolamento por worldId |
| FR-002 e invariantes | `docs/01-game-design/01-mundo-persistente-e-clubes.md` — Mundo persistente | baseline R-02…R-148                                   |
| FR-003 e invariantes | `docs/01-game-design/06-temporada-e-competicoes.md` — ciclo e virada       | baseline R-02…R-148                                   |
| FR-004 e invariantes | `docs/02-tecnico/14-maquinas-de-estado.md` — Mundo e Temporada             | baseline R-02…R-148                                   |
| FR-005 e invariantes | `docs/02-tecnico/16-sagas-e-workflows.md` — SAGA-02                        | baseline R-02…R-148                                   |

Aliases seguem C1…C12 e concerns do `source-map.md`. Não há conflito aberto; qualquer divergência futura bloqueia implementação e deve ser reconciliada no catálogo.

## Success Criteria

- **SC-001**: todos os cenários P1 passam com retry e concorrência sem efeito duplicado.
- **SC-002**: replay com mesma entrada, seed e ruleset produz os mesmos hashes aplicáveis.
- **SC-003**: 100% das escritas carregam `worldId`, versão esperada e chave idempotente.
- **SC-004**: evidências atuais e pendentes permanecem separadas; ausência de prova resulta em pendência.

## Assumptions

- A baseline ratificada de 2026-07-13 é normativa.
- Contratos entre owners são versionados e congelados antes de implementação paralela.
- Trabalho excluído permanece nos IDs owners indicados; este pacote não assume sua autoridade.
