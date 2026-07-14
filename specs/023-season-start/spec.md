# Feature Specification: Início de temporada

**Feature ID**: GP-004  
**Directory**: `specs/023-season-start`  
**Milestone**: M3  
**Status**: DELIVERED  
**Date**: 2026-07-13  
**Input**: catálogo mestre, source map e golden path canônico  
**Ownership**: C2 orquestra temporada/janelas; C3 possui objetivos e elenco; C7 publica competição/inscrição; C9 possui orçamento; C11 comunica

## User Scenarios & Testing

### User Story 1 — Completar início de temporada (Priority: P1)

Como gestor, quero abrir uma nova temporada uma única vez com participantes, calendário, regulamento, janelas, orçamento, objetivos e preparação coerentes, para que a jornada seja íntegra e compreensível.

**Why this priority**: este é o caminho principal de valor de GP-004 e sua conclusão prova a convergência dos contextos participantes.

**Independent Test**: uma temporada só entra em estado oficial após todos os pré-requisitos e retries não repetem calendário, orçamento, janelas ou notificações.

**Acceptance Scenarios**:

1. **Given** os pré-requisitos autoritativos válidos, **When** o gestor percorre confirmar rollover anterior → confirmar participantes → publicar calendário/regulamento → abrir janelas/inscrições → disponibilizar orçamento/objetivos → iniciar pré-temporada → iniciar temporada oficial, **Then** cada owner aplica somente sua mudança e a jornada apresenta um resultado único.
2. **Given** a mesma intenção e chave de idempotência, **When** a requisição é repetida, **Then** nenhum efeito oficial é duplicado.

### User Story 2 — Retomar com diagnóstico seguro (Priority: P2)

Como gestor ou operador, quero entender e retomar uma jornada interrompida sem corrupção, para não perder fatos consumados nem repetir efeitos.

**Independent Test**: injetar falha entre etapas, repetir a última intenção e confirmar retomada/compensação com histórico auditável.

**Acceptance Scenarios**:

1. **Given** uma falha após uma etapa confirmada, **When** a jornada é retomada, **Then** etapas concluídas não são refeitas e a próxima ação necessária é explícita.
2. **Given** uma intenção concorrente ou obsoleta, **When** o owner a valida, **Then** ela é rejeitada com erro observável sem escrita parcial.

### Edge Cases

- evento repetido; calendário inválido; participante sem divisão; orçamento ainda não fechado; retomada após checkpoint.
- Eventos fora de ordem ou duplicados não alteram o resultado final.
- Uma referência de outro mundo é rejeitada antes de qualquer escrita.
- Mudança de ruleset durante uma instância preserva a versão fixada no início.

## Scope & Boundaries

### Included

- Orquestração observável: confirmar rollover anterior → confirmar participantes → publicar calendário/regulamento → abrir janelas/inscrições → disponibilizar orçamento/objetivos → iniciar pré-temporada → iniciar temporada oficial.
- Queries de acompanhamento, intents oficiais, eventos e erros descritos em [contracts/README.md](contracts/README.md).
- Idempotência, isolamento por mundo, histórico e retomada/compensação aplicáveis.
- Validação E2E da colaboração entre BC-002, BC-003, BC-007, BC-009 e BC-011.

### Excluded

- Implementar integralmente os bounded contexts dependentes.
- Criar aggregate, tabela ou repositório próprio para GP-004.
- Permitir que cliente, IA ou process manager escreva estado de outro owner.
- Exceções detalhadas adiadas por R-94 além das bordas principais já documentadas.

### Dependencies and ownership

**Dependencies**: BC-002, BC-003, BC-007, BC-009 e BC-011. A jornada só inicia quando seus commands, queries, eventos e erros necessários estiverem congelados.

**Writing boundaries**: C2 orquestra temporada/janelas; C3 possui objetivos e elenco; C7 publica competição/inscrição; C9 possui orçamento; C11 comunica. GP-004 é coverage/evidência, nunca owner autoritativo.

## Requirements

- **FR-001**: A jornada MUST executar confirmar rollover anterior → confirmar participantes → publicar calendário/regulamento → abrir janelas/inscrições → disponibilizar orçamento/objetivos → iniciar pré-temporada → iniciar temporada oficial com estado e próxima ação observáveis.
- **FR-002**: Cada alteração MUST ser enviada ao command do owner correspondente; escrita cruzada é proibida.
- **FR-003**: Toda intenção mutável MUST possuir identidade, `gameWorldId`, ator, versão esperada e chave de idempotência.
- **FR-004**: Retry MUST retornar o resultado já confirmado ou continuar do checkpoint sem repetir efeito.
- **FR-005**: Falhas MUST expor erro estável, etapa, impacto e ação segura de recuperação.
- **FR-006**: Queries MUST distinguir loading, vazio, bloqueado, erro, offline e dado stale para X-003.
- **FR-007**: Histórico MUST preservar decisões humanas/automáticas, eventos oficiais e versão do ruleset.
- **FR-008**: Referências entre mundos, intents sem autoridade e versões obsoletas MUST ser rejeitadas antes de escrita.
- **FR-009**: O resultado E2E MUST ser comprovado sem promover metas ou documentos a evidência executada.
- **FR-010**: O fluxo MUST respeitar SAGA-02, R-94 e INV-32/INV-33.

### Conceptual entities

SeasonOpeningView, PublishedCalendarReference, ClubSeasonPlanView são read models/referências de jornada. Nenhum é aggregate autoritativo; veja [data-model.md](data-model.md).

## Canonical Sources & Traceability

| Requirements           | Source                                                                                                                                                                                                  | Decisions/criteria            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| FR-001, FR-005, FR-009 | `docs/01-game-design/15-fluxos-completos.md`, “4. Início de temporada”; `docs/01-game-design/06-temporada-e-competicoes.md`; `docs/02-tecnico/16-sagas-e-workflows.md`, “SAGA-02 · Virada de temporada” | R-94                          |
| FR-002, FR-003, FR-008 | `docs/02-tecnico/12-context-map-e-blueprint.md`, ownership e fronteiras transacionais                                                                                                                   | R-148                         |
| FR-004, FR-007         | `docs/02-tecnico/15-ruleset-e-replay.md` e `16-sagas-e-workflows.md`                                                                                                                                    | INV-27…INV-31                 |
| FR-006                 | `docs/02-tecnico/08-frontend-cliente-e-tempo-real.md`, recuperação e critérios                                                                                                                          | CA-UX                         |
| FR-010                 | `docs/01-game-design/15-fluxos-completos.md`, “4. Início de temporada”; `docs/01-game-design/06-temporada-e-competicoes.md`; `docs/02-tecnico/16-sagas-e-workflows.md`, “SAGA-02 · Virada de temporada” | SAGA-02, R-94 e INV-32/INV-33 |

**Aliases normalized**: nomes de telas e etapas são projeções; aggregates e owners usam C1…C12/X-001…X-003 do blueprint.

**Known gap**: `SeasonStarted` e temporada linear existem; publicação completa, janelas, objetivos, orçamento e pré-temporada faltam. A lacuna encerra somente com quickstart E2E e evidências bloqueantes verdes.

## Success Criteria

- **SC-001**: 100% das etapas do caminho feliz concluem em ordem ou exibem bloqueio acionável.
- **SC-002**: 100% dos retries testados produzem zero efeito oficial duplicado.
- **SC-003**: 100% das escritas observadas são atribuídas ao owner canônico.
- **SC-004**: Falha injetada em cada fronteira pode ser retomada ou compensada sem violar invariantes.
- **SC-005**: O cenário E2E reproduz o mesmo resultado para a mesma revisão, ruleset e inputs.

## Assumptions

- As dependências BC-002, BC-003, BC-007, BC-009 e BC-011 entregam contratos versionados antes da integração.
- X-003 permanece não autoritativo e X-001 usa os mesmos commands humanos.
- A baseline parcial é limitada a: `SeasonStarted` e temporada linear existem; publicação completa, janelas, objetivos, orçamento e pré-temporada faltam.
- Ramos adicionais previstos por R-94 serão uma evolução versionada, sem reescrever este ID.
