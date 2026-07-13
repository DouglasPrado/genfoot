# Feature Specification: Automação e IA decisória

**Feature Branch**: `012-automation-ai`  
**Created**: 2026-07-13  
**Status**: PLANNED  
**Feature ID**: X-001 | **Milestone**: M1 | **Owner**: Concern Automação/IA

**Input**: Entregar Strategic, Squad, Match e Narrative AI determinísticas, explicáveis e limitadas aos mesmos commands humanos.

## User Scenarios & Testing

### User Story 1 — Manter clubes autônomos competitivos (Priority: P1)

Como operador do mundo, quero que clubes sem gestor tomem decisões válidas para sustentar temporadas longas.

**Why this priority**: O universo não fecha M1 se clubes inativos deixarem de escalar, contratar ou gerir recursos.

**Independent Test**: Rodar duas temporadas com seeds/ruleset iguais e provar command logs e hashes idênticos, sem command inválido ou escrita direta.

**Acceptance Scenarios**:

1. **Given** clube automatizado, **When** chega uma decisão, **Then** a IA consulta projeções permitidas, explica opções e emite um command oficial.
2. **Given** command rejeitado por estado novo, **When** a IA reavalia, **Then** não força a escrita e registra decisão/retry limitado.

### User Story 2 — Delegar com limites visíveis (Priority: P2)

Como gestor, quero configurar automações por responsabilidade para reduzir trabalho sem perder autoridade.

**Independent Test**: Ativar, limitar e revogar regra; provar precedência humana, desativação na troca de controlador e nenhum efeito fora do escopo.

**Acceptance Scenarios**:

1. **Given** regra ativa e ação de baixo risco, **When** a condição ocorre, **Then** a automação executa uma vez e registra explicação.
2. **Given** decisão humana conflitante ou controle trocado, **When** a automação dispara, **Then** ela é bloqueada/revalidada.

### User Story 3 — Explicar decisões de elenco, partida e narrativa (Priority: P3)

Como gestor, quero entender fatores e alternativas da IA sem receber conhecimento oculto.

**Independent Test**: Inspecionar DecisionExplanation para cenários Strategic/Squad/Match/Narrative e reproduzir a escolha pelos mesmos inputs autorizados.

**Acceptance Scenarios**:

1. **Given** dois cenários idênticos, **When** a IA decide, **Then** command e explicação são idênticos.
2. **Given** dado confidencial não observável, **When** a IA avalia, **Then** esse dado não aparece em inputs ou explicação.

### Edge Cases

- Empate de alternativas, deadline perdido, projeção stale e command concorrente.
- Clube sem opção válida, orçamento reservado ou elenco elegível.
- Regra recursiva, excesso de retries ou automações conflitantes.
- Modelo generativo indisponível ou saída inválida: nunca decide estado oficial.

## Scope & Boundaries

Inclui profiles e policies Strategic/Squad/Match/Narrative, AutomationRule, DecisionContext/Explanation, prioridades, delegação, revalidação e command emission. Exclui escrita em aggregates C1–C12, cálculo do runtime C8, UI X-003 e texto generativo com autoridade.

Dependências: BC-003…BC-009 concluídas para fechar X-001; contratos congelados permitem desenvolvimento parcial paralelo.

## Requirements

### Functional Requirements

- **FR-001**: IA MUST usar somente queries/projeções permitidas e os mesmos commands/guards humanos.
- **FR-002**: Toda decisão MUST registrar rulesetVersion, seed/stream, inputs versionados, alternativas, fatores, command e resultado.
- **FR-003**: Mesmos inputs, seed e ruleset MUST produzir a mesma decisão e explicação.
- **FR-004**: Strategic AI MUST gerir prioridades, orçamento e risco sem alterar ledger diretamente.
- **FR-005**: Squad AI MUST respeitar disponibilidade, inscrição, fadiga, papéis e capacidade de staff.
- **FR-006**: Match AI MUST emitir apenas commands aceitos pelo runtime e dentro da janela/sequence.
- **FR-007**: Narrative AI MUST escolher opções aprovadas sem alterar resultado competitivo.
- **FR-008**: AutomationRule MUST definir owner, escopo, condição, ação, risco, prioridade, validade e idempotency key.
- **FR-009**: Ação humana explícita MUST prevalecer; troca de controlador MUST desativar/revalidar regras.
- **FR-010**: Retry MUST ser limitado e command rejeitado MUST NOT ser contornado por escrita direta.
- **FR-011**: IA generativa MAY redigir texto, mas MUST NOT escolher ou executar decisão oficial.
- **FR-012**: Todas as decisões MUST ser auditáveis e reproduzíveis em replay.

### Key Entities

- **AutomationRule**, **ClubAIProfile**, **DecisionContext**, **DecisionOption**, **DecisionExplanation**, **AutomationExecution**.

## Canonical Sources & Traceability

| Scope                | Sources                                                                                                                        | Criteria             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| Camadas e autoridade | `docs/01-game-design/07-inteligencia-artificial.md`; `docs/02-tecnico/12-context-map-e-blueprint.md`, “Concern · Automação/IA” | F17–F20              |
| Fórmulas             | `docs/02-tecnico/05-catalogo-de-regras-e-formulas.md`, F17–F20                                                                 | ruleset/replay       |
| Operação             | `docs/02-tecnico/09-operacao-e-admin-do-mundo.md`, “IA generativa”                                                             | fronteira de decisão |
| Aceite               | `docs/02-tecnico/17-criterios-de-aceite-e-bandas.md`, §4.5                                                                     | CA-IA, G1–G7         |

## Success Criteria

- **SC-001**: 100% das decisões repetidas com mesmo manifest produzem command/explanation idênticos.
- **SC-002**: Zero escrita direta ou uso de conhecimento não autorizado nos lotes de teste.
- **SC-003**: 100% dos commands rejeitados permanecem sem efeito e possuem explicação/reavaliação rastreável.
- **SC-004**: Clubes automatizados completam 20 temporadas dentro dos gates de VAL-001.

## Assumptions

- Owners fornecem commands/queries estáveis; X-001 não corrige contratos ausentes.
- Heurísticas determinísticas são a autoridade inicial; geração de linguagem é opcional e não autoritativa.
