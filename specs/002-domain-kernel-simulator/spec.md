# Feature Specification: Domain Kernel e simulador determinístico

**Feature ID**: FND-001  
**Directory**: `specs/002-domain-kernel-simulator`  
**Created**: 2026-07-13  
**Status**: DELIVERED  
**Milestone**: M0  
**Owner**: Fundação compartilhada  
**Input**: catálogo mestre, mapa de fontes e documentos canônicos.

**Portfolio**: [catálogo](../001-game-delivery-roadmap/contracts/feature-catalog.md) · [mapa de fontes](../001-game-delivery-roadmap/contracts/source-map.md)  
**Branch**: pacote de design do roadmap mestre

## User Scenarios & Testing

### User Story 1 — Reproduzir um mundo pela seed (Priority: P1)

Como operador do domínio, quero manter uma fundação reproduzível para criar, inspecionar e avançar mundos sem acoplamento a frameworks.

**Why this priority**: estabelece o comportamento autoritativo mínimo da feature.

**Independent Test**: duas execuções com a mesma seed e ruleset produzem snapshots e IDs equivalentes.

**Acceptance Scenarios**

1. **Given** estado válido e versão esperada, **When** o comando P1 é repetido com a mesma chave, **Then** há um único efeito e a mesma resposta observável.
2. **Given** dois mundos, **When** o fluxo roda em ambos, **Then** nenhuma leitura, escrita, seed ou evento cruza `worldId`.

### User Story 2 — Evoluir snapshots sem perder mundos existentes (Priority: P2)

Como mantenedor, quero evoluir o domínio preservando histórico, compatibilidade e recuperação.

**Why this priority**: fecha a operação durável depois da fatia principal.

**Independent Test**: um snapshot suportado é lido, avançado e regravado atomicamente sem apagar histórico.

**Acceptance Scenarios**

1. **Given** falha após persistência parcial, **When** o processamento é retomado, **Then** continua do checkpoint sem duplicar efeitos.
2. **Given** versão/ruleset incompatível, **When** uma mutação é solicitada, **Then** falha de modo tipado sem alterar estado.

### Edge Cases

- comando duplicado, concorrente ou fora de ordem;
- referência a outro mundo, aggregate ausente ou versão obsoleta;
- retry depois de timeout e evento já publicado;
- data-limite, coleção vazia, limite de capacidade e snapshot histórico.

## Scope & Boundaries

**Included**: IDs e datas de domínio, `Result`/erros, eventos, `RulesetVersion`, PCG32, UUIDv7 determinístico, gênese, snapshot JSON e CLI.

**Excluded**: regras completas de competição, partida, finanças e clientes.

**Ownership**: Fundação compartilhada escreve somente seus aggregates. Outros contextos são consumidos por IDs, queries versionadas, commands ou eventos públicos.

**Dependencies**: Nenhuma. A dependência libera trabalho apenas quando seu contrato e evidência requerida estiverem disponíveis.

**Current state**: Implementado em `packages/shared`, `packages/core` e `apps/simulator`, coberto pela suíte local.

**Target state**: Preservar compatibilidade, determinismo e leitura histórica enquanto features posteriores evoluem.

## Requirements

### Functional Requirements

- **FR-001** O sistema deve representar IDs, datas, ruleset, resultados, erros e eventos sem dependência de infraestrutura.
- **FR-002** O gerador e o scheduler devem consumir somente RNG PCG32 derivado de seed explícita.
- **FR-003** O CLI deve criar, gerar, ativar, inspecionar e avançar um mundo por casos de uso do core.
- **FR-004** O repositório JSON deve versionar snapshots, ler versões suportadas e substituir arquivos atomicamente.
- **FR-005** Eventos e checkpoints devem impedir duplicação ao repetir a mesma operação.

### Domain Rules and Invariants

- **INV-001**: R-34; INV-27…INV-31; mesma seed + ruleset + commands implica mesmo resultado.
- **INV-002**: toda escrita é isolada por `worldId`, versionada e idempotente.
- **INV-003**: regras comportamentais registram `rulesetVersion`; histórico não é reinterpretado.
- **INV-004**: eventos são consequência de commit local e nunca concedem escrita cruzada.

### Conceptual Entities

Consulte [data-model.md](data-model.md). Contratos observáveis estão em [contracts/README.md](contracts/README.md).

## Canonical Sources & Traceability

| Requirement group    | Canonical source                                                                   | Decisions / coverage                                                         |
| -------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| FR-001 e invariantes | `docs/02-tecnico/00-arquitetura-geral.md` — Princípios arquiteturais e Engines     | R-34; INV-27…INV-31; mesma seed + ruleset + commands implica mesmo resultado |
| FR-002 e invariantes | `docs/02-tecnico/05-catalogo-de-regras-e-formulas.md` — IDs, eventos e invariantes | baseline R-02…R-148                                                          |
| FR-003 e invariantes | `docs/02-tecnico/07-arquitetura-do-core-ecs.md` — Regra de Ouro                    | baseline R-02…R-148                                                          |
| FR-004 e invariantes | `docs/02-tecnico/15-ruleset-e-replay.md` — kernel, timestep e RNG                  | baseline R-02…R-148                                                          |

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
