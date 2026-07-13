# Feature Specification: Lesão e recuperação

**ID**: GP-012 | **Slug**: `injury-recovery` | **Milestone**: M3 | **Status**: PLANNED  
**Owner**: BC-004 | **Contributors**: BC-005, BC-008, X-003  
**Created**: 2026-07-13 | **Directory**: `specs/031-injury-recovery`

## User Scenarios & Testing

### User Story 1 — Recuperar um jogador com segurança e previsibilidade (P1)

Como gestor, quero receber diagnóstico e acompanhar um plano médico para saber quando o atleta pode retornar sem burlar indisponibilidade.

**Independent Test**: provocar lesão, diagnosticar, executar fases com retry e validar indisponibilidade até retorno gradual autorizado.

**Acceptance Scenarios**:

1. **Given** ocorrência de lesão, **When** processada, **Then** nasce um caso médico único e o jogador fica indisponível.
2. **Given** fase médica reprocessada, **When** o mesmo checkpoint chega, **Then** nenhum efeito/fase duplica.
3. **Given** recuperação insuficiente, **When** retorno/escalação é tentado, **Then** guard server-side rejeita.

### Edge Cases

- Lesão sobre lesão; diagnóstico revisado; staff ausente; partida durante reabilitação; crash entre fases; transferência/aposentadoria com caso aberto.

## Scope & Boundaries

Inclui ocorrência, diagnóstico, plano, indisponibilidade, tratamento, reavaliação e retorno gradual. C4 escreve saúde/disponibilidade; C5 fornece capacidade; C8 emite ocorrência e consulta elegibilidade. Não inclui fórmula completa do motor nem contratação de staff.

## Requirements

- **FR-001**: criar no máximo um caso por ocorrência idempotente.
- **FR-002**: manter máquina médica linear, versionada e recuperável.
- **FR-003**: bloquear treino/partida incompatíveis com fase/gravidade.
- **FR-004**: aplicar capacidade de staff por contrato de leitura, sem escrita cruzada.
- **FR-005**: registrar diagnóstico, fases, alterações e causa no histórico.
- **FR-006**: autorizar retorno somente por guard de recuperação e ruleset vigente.

**Invariants**: INV-25, INV-29, INV-30; CA-PLY-04/05; máquina médica do doc 14.

## Canonical Sources & Traceability

| Scope   | Source                                                                   |
| ------- | ------------------------------------------------------------------------ |
| Fluxo   | `docs/01-game-design/15-fluxos-completos.md` — “12. Lesão e recuperação” |
| Saúde   | `docs/01-game-design/02-sistema-de-jogadores.md`                         |
| Máquina | `docs/02-tecnico/14-maquinas-de-estado.md` — Medicina                    |
| Aceite  | `docs/02-tecnico/17-criterios-de-aceite-e-bandas.md` — CA-PLY            |

## Success Criteria

- **SC-001**: zero fase/efeito duplicado em retries e crash recovery.
- **SC-002**: zero participação indevida enquanto indisponível.
- **SC-003**: 100% dos retornos possuem diagnóstico, plano e guard aprovados.

## Assumptions

- O motor emite ocorrência determinística; staff apenas modula tratamento; cliente não decide elegibilidade.
