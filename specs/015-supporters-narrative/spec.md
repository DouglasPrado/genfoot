# Feature Specification: Torcida, imprensa e narrativa

**Feature Branch**: `015-supporters-narrative` | **Created**: 2026-07-13 | **Status**: PLANNED  
**Feature ID**: BC-010 | **Milestone**: M2 | **Owner**: C10 Torcida/Narrativa

**Input**: Entregar fanbase, satisfação, rivalidades, reputação, imprensa, promessas, conversas e crises sem autoridade competitiva.

## User Scenarios & Testing

### User Story 1 — Observar reação coerente da torcida (Priority: P1)

Como gestor, quero entender como expectativa, resultados, estilo, jovens e rivalidades afetam segmentos da torcida.

**Independent Test**: Reproduzir uma sequência fixa de fatos e obter o mesmo snapshot/explicação de satisfação para cada segmento.

**Acceptance Scenarios**:

1. **Given** resultado oficial e expectativa anterior, **When** projeção narrativa processa o fato, **Then** cada segmento muda dentro de 0–100 com fatores explícitos.
2. **Given** evento duplicado, **When** reprocessado, **Then** satisfação e reputação não mudam novamente.

### User Story 2 — Responder à imprensa e cumprir promessas (Priority: P2)

Como gestor, quero escolher respostas e promessas com consequências futuras auditáveis.

**Independent Test**: Criar promessa, avançar prazo e verificar cumprimento/quebra uma vez, com reputação e mensagens explicáveis.

**Acceptance Scenarios**:

1. **Given** pergunta contextual, **When** resposta aprovada é escolhida, **Then** narrativa registra escolha e efeitos sem alterar resultado esportivo.
2. **Given** promessa vencida, **When** avaliador diário roda novamente, **Then** consequência não duplica.

### User Story 3 — Diagnosticar uma crise (Priority: P3)

Como diretoria, quero que protestos, apoio, imprensa e reputação formem um arco coerente e recuperável.

**Independent Test**: Executar crise esportiva/financeira com facts versionados e provar transições, explicação e resolução determinísticas.

**Acceptance Scenarios**:

1. **Given** sinais acumulados, **When** limiar versionado é cruzado, **Then** crise abre com causas e severity explícitas.
2. **Given** recuperação comprovada, **When** critérios fecham, **Then** crise termina sem apagar timeline.

### Edge Cases

- Resultado anulado/corrigido, fatos fora de ordem, rebranding e rivalidade nova.
- Promessas incompatíveis, vazamento confidencial e texto generativo indisponível.
- Satisfação no limite 0/100 e clube sem massa histórica suficiente.

## Scope & Boundaries

Inclui SupporterSegment/Fanbase, expectativa/satisfação/paciência, Rivalry, reputações, MediaStory, Conversation, Promise e NarrativeCrisis. Exclui resultado C8, finanças C9, clube C3, AI decision X-001 e entrega C11; C10 reage a fatos.

Dependências: BC-003 por contrato; BC-008/BC-009/X-001 devem concluir para fechar todas as narrativas.

## Requirements

- **FR-001**: C10 MUST ser único owner dos estados narrativos e MUST NOT alterar estado competitivo.
- **FR-002**: Mudanças MUST derivar de fatos oficiais versionados, ser idempotentes e registrar fatores/ruleset.
- **FR-003**: Satisfação/paciência MUST respeitar 0–100 e segmentos MUST reagir conforme perfil.
- **FR-004**: Expectativa MUST ser capturada antes do resultado para evitar viés retroativo.
- **FR-005**: Rivalidades, clássicos, ídolos e reputações MUST preservar histórico e contexto.
- **FR-006**: Promessa MUST registrar autor, alvo, métrica, prazo, estado e evidência de avaliação.
- **FR-007**: Conversas MUST oferecer opções aprovadas; escolha MUST ser auditável.
- **FR-008**: Crise MUST possuir causas, severity, lifecycle e critérios de resolução.
- **FR-009**: Correção de fato MUST produzir recomputação/compensação rastreável, nunca edição silenciosa.
- **FR-010**: Texto generativo MAY variar estilo, mas MUST NOT inventar fatos nem decidir efeitos.
- **FR-011**: PII/confidencialidade MUST ser respeitada em vazamentos e imprensa.
- **FR-012**: Eventos públicos MUST permitir reconstrução da projeção narrativa.

### Key Entities

SupporterSegment, FanbaseSnapshot, Expectation, Rivalry, Reputation, MediaStory, Conversation, Promise e NarrativeCrisis.

## Canonical Sources & Traceability

| Scope             | Sources                                                             | IDs            |
| ----------------- | ------------------------------------------------------------------- | -------------- |
| C10               | `docs/02-tecnico/12-context-map-e-blueprint.md`, “C10”              | ownership      |
| Domínio narrativo | `docs/01-game-design/11-torcida-imprensa-e-narrativa.md`            | baseline R-148 |
| Narrative system  | `docs/02-tecnico/07-arquitetura-do-core-ecs.md`, “Narrative System” | determinismo   |

## Success Criteria

- **SC-001**: Mesmo fact stream/ruleset produz 100% dos snapshots e explicações iguais.
- **SC-002**: Duplicatas e replay causam zero efeito adicional.
- **SC-003**: 100% das mudanças de satisfação/reputação possuem fatores e fatos rastreáveis.
- **SC-004**: Zero command/event de C10 altera resultado, ledger ou aggregate externo.

## Assumptions

- Owners publicam fatos oficiais; C11 entrega mensagens e histórico.
- Escalas/limiares são versionados e calibrados por VAL-001 quando aplicável.
