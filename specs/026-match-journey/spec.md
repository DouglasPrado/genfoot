# Feature Specification: Preparação e partida

**Feature ID**: GP-007  
**Directory**: `specs/026-match-journey`  
**Milestone**: M3  
**Status**: PLANNED  
**Date**: 2026-07-13  
**Input**: catálogo mestre, source map e golden path canônico  
**Ownership**: C8 possui runtime/resultado; C4 possui saúde/desenvolvimento; C5 staff; C7 elegibilidade/homologação; concerns só decidem, transportam e apresentam

## User Scenarios & Testing

### User Story 1 — Completar preparação e partida (Priority: P1)

Como gestor, quero executar a mesma partida autoritativa em modo ao vivo, offline, automático e replay, da preparação ao relatório pós-jogo, para que a jornada seja íntegra e compreensível.

**Why this priority**: este é o caminho principal de valor de GP-007 e sua conclusão prova a convergência dos contextos participantes.

**Independent Test**: mesma seed, ruleset, manifesto e command log produzem o mesmo hash/result em todos os modos e um único fan-out oficial.

**Acceptance Scenarios**:

1. **Given** os pré-requisitos autoritativos válidos, **When** o gestor percorre agendar → preparar dossiê/treino/logística → definir escalação/tática/delegação → validar elegibilidade → congelar kickoff → simular ticks/decisões → finalizar resultado → homologar → aplicar fan-out e relatório, **Then** cada owner aplica somente sua mudança e a jornada apresenta um resultado único.
2. **Given** a mesma intenção e chave de idempotência, **When** a requisição é repetida, **Then** nenhum efeito oficial é duplicado.

### User Story 2 — Retomar com diagnóstico seguro (Priority: P2)

Como gestor ou operador, quero entender e retomar uma jornada interrompida sem corrupção, para não perder fatos consumados nem repetir efeitos.

**Independent Test**: injetar falha entre etapas, repetir a última intenção e confirmar retomada/compensação com histórico auditável.

**Acceptance Scenarios**:

1. **Given** uma falha após uma etapa confirmada, **When** a jornada é retomada, **Then** etapas concluídas não são refeitas e a próxima ação necessária é explícita.
2. **Given** uma intenção concorrente ou obsoleta, **When** o owner a valida, **Then** ela é rejeitada com erro observável sem escrita parcial.

### Edge Cases

- jogador torna-se indisponível antes do kickoff; command duplicado/atrasado; desconexão; troca de executor; replay diverge; finalização concorrente.
- Eventos fora de ordem ou duplicados não alteram o resultado final.
- Uma referência de outro mundo é rejeitada antes de qualquer escrita.
- Mudança de ruleset durante uma instância preserva a versão fixada no início.

## Scope & Boundaries

### Included

- Orquestração observável: agendar → preparar dossiê/treino/logística → definir escalação/tática/delegação → validar elegibilidade → congelar kickoff → simular ticks/decisões → finalizar resultado → homologar → aplicar fan-out e relatório.
- Queries de acompanhamento, intents oficiais, eventos e erros descritos em [contracts/README.md](contracts/README.md).
- Idempotência, isolamento por mundo, histórico e retomada/compensação aplicáveis.
- Validação E2E da colaboração entre BC-004, BC-005, BC-007, BC-008, X-001, X-002 e X-003.

### Excluded

- Implementar integralmente os bounded contexts dependentes.
- Criar aggregate, tabela ou repositório próprio para GP-007.
- Permitir que cliente, IA ou process manager escreva estado de outro owner.
- Exceções detalhadas adiadas por R-94 além das bordas principais já documentadas.

### Dependencies and ownership

**Dependencies**: BC-004, BC-005, BC-007, BC-008, X-001, X-002 e X-003. A jornada só inicia quando seus commands, queries, eventos e erros necessários estiverem congelados.

**Writing boundaries**: C8 possui runtime/resultado; C4 possui saúde/desenvolvimento; C5 staff; C7 elegibilidade/homologação; concerns só decidem, transportam e apresentam. GP-007 é coverage/evidência, nunca owner autoritativo.

## Requirements

- **FR-001**: A jornada MUST executar agendar → preparar dossiê/treino/logística → definir escalação/tática/delegação → validar elegibilidade → congelar kickoff → simular ticks/decisões → finalizar resultado → homologar → aplicar fan-out e relatório com estado e próxima ação observáveis.
- **FR-002**: Cada alteração MUST ser enviada ao command do owner correspondente; escrita cruzada é proibida.
- **FR-003**: Toda intenção mutável MUST possuir identidade, `gameWorldId`, ator, versão esperada e chave de idempotência.
- **FR-004**: Retry MUST retornar o resultado já confirmado ou continuar do checkpoint sem repetir efeito.
- **FR-005**: Falhas MUST expor erro estável, etapa, impacto e ação segura de recuperação.
- **FR-006**: Queries MUST distinguir loading, vazio, bloqueado, erro, offline e dado stale para X-003.
- **FR-007**: Histórico MUST preservar decisões humanas/automáticas, eventos oficiais e versão do ruleset.
- **FR-008**: Referências entre mundos, intents sem autoridade e versões obsoletas MUST ser rejeitadas antes de escrita.
- **FR-009**: O resultado E2E MUST ser comprovado sem promover metas ou documentos a evidência executada.
- **FR-010**: O fluxo MUST respeitar R-34, R-94, F1–F21 e INV-27…INV-33.

### Conceptual entities

MatchJourneyView, KickoffManifestReference, LiveMatchProjection, PostMatchReport são read models/referências de jornada. Nenhum é aggregate autoritativo; veja [data-model.md](data-model.md).

## Canonical Sources & Traceability

| Requirements           | Source                                                                                                                                                          | Decisions/criteria                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| FR-001, FR-005, FR-009 | `docs/01-game-design/15-fluxos-completos.md`, “7. Preparação e partida”; `docs/01-game-design/05-motor-de-partida.md`; `docs/02-tecnico/15-ruleset-e-replay.md` | R-94                               |
| FR-002, FR-003, FR-008 | `docs/02-tecnico/12-context-map-e-blueprint.md`, ownership e fronteiras transacionais                                                                           | R-148                              |
| FR-004, FR-007         | `docs/02-tecnico/15-ruleset-e-replay.md` e `16-sagas-e-workflows.md`                                                                                            | INV-27…INV-31                      |
| FR-006                 | `docs/02-tecnico/08-frontend-cliente-e-tempo-real.md`, recuperação e critérios                                                                                  | CA-UX                              |
| FR-010                 | `docs/01-game-design/15-fluxos-completos.md`, “7. Preparação e partida”; `docs/01-game-design/05-motor-de-partida.md`; `docs/02-tecnico/15-ruleset-e-replay.md` | R-34, R-94, F1–F21 e INV-27…INV-33 |

**Aliases normalized**: nomes de telas e etapas são projeções; aggregates e owners usam C1…C12/X-001…X-003 do blueprint.

**Known gap**: nenhuma implementação do runtime autoritativo está entregue. A lacuna encerra somente com quickstart E2E e evidências bloqueantes verdes.

## Success Criteria

- **SC-001**: 100% das etapas do caminho feliz concluem em ordem ou exibem bloqueio acionável.
- **SC-002**: 100% dos retries testados produzem zero efeito oficial duplicado.
- **SC-003**: 100% das escritas observadas são atribuídas ao owner canônico.
- **SC-004**: Falha injetada em cada fronteira pode ser retomada ou compensada sem violar invariantes.
- **SC-005**: O cenário E2E reproduz o mesmo resultado para a mesma revisão, ruleset e inputs.

## Assumptions

- As dependências BC-004, BC-005, BC-007, BC-008, X-001, X-002 e X-003 entregam contratos versionados antes da integração.
- X-003 permanece não autoritativo e X-001 usa os mesmos commands humanos.
- Não há baseline executável reivindicada para este fluxo.
- Ramos adicionais previstos por R-94 serão uma evolução versionada, sem reescrever este ID.
