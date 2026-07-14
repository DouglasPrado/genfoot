# Feature Specification: Crise esportiva

**ID**: GP-015 | **Slug**: `sporting-crisis` | **Milestone**: M3 | **Status**: DELIVERED  
**Owner**: fluxo multicontexto; owners C3/C8/C10/C11 preservados | **Contributors**: X-001, X-003  
**Created**: 2026-07-13 | **Directory**: `specs/034-sporting-crisis`

## User Scenarios & Testing

### User Story 1 — Diagnosticar e responder a uma crise esportiva (P1)

Como gestor, quero entender por que os resultados pioraram e definir um plano para recuperar desempenho e confiança sem manipulação oculta.

**Independent Test**: alimentar sequência fixa de resultados, reconstruir diagnóstico e confirmar que mesmas entradas/seed geram as mesmas recomendações e efeitos pelos commands oficiais.

**Acceptance Scenarios**:

1. **Given** deterioração mensurável, **When** limiares são atingidos, **Then** surge crise com diagnóstico baseado em fatos e fontes.
2. **Given** respostas do gestor/IA, **When** aplicadas, **Then** passam pelos mesmos commands/guards e registram justificativas.
3. **Given** replay dos mesmos fatos, **When** projeções são reconstruídas, **Then** estado, diagnóstico e histórico coincidem.

### Edge Cases

- Pequena amostra; crise durante troca de gestor; informações ocultas; resultados anulados; moral/torcida divergentes; IA offline; crise já encerrada.

## Scope & Boundaries

Inclui detecção, diagnóstico, diretoria, moral/torcida/imprensa, resposta e plano de recuperação. C8 possui resultados, C3 governança, C10 percepção/narrativa, C11 relatório; GP não escreve estado próprio. Não inclui fórmula do motor ou demissão completa.

## Requirements

- **FR-001**: detectar crise por fatos/limiares versionados, nunca por direcionamento individual oculto.
- **FR-002**: produzir diagnóstico reconstruível com evidências e incerteza explícita.
- **FR-003**: registrar respostas/promessas/planos nos owners competentes.
- **FR-004**: exigir IA determinística, explicável e limitada à informação autorizada.
- **FR-005**: atualizar narrativa/torcida somente por eventos oficiais.
- **FR-006**: encerrar crise por critérios versionados e preservar timeline.

**Rules**: CA-IA-01…05, INV-14/17/27/30; R-94.

## Canonical Sources & Traceability

| Scope              | Source                                                               |
| ------------------ | -------------------------------------------------------------------- |
| Fluxo              | `docs/01-game-design/15-fluxos-completos.md` — “15. Crise esportiva” |
| Clube/IA/narrativa | GDD 04/07/11                                                         |
| Partida            | GDD 05                                                               |
| Aceite IA          | `docs/02-tecnico/17-criterios-de-aceite-e-bandas.md` — IA            |

## Success Criteria

- **SC-001**: mesmos fatos/seed geram 100% do mesmo diagnóstico/recomendação.
- **SC-002**: zero recomendação baseada em informação não autorizada ou escrita direta da IA.
- **SC-003**: 100% das crises possuem início, evidências, respostas e encerramento na timeline.

## Assumptions

- O fluxo converge owners existentes; tuning de limiares ocorre por ruleset e VAL-001.
