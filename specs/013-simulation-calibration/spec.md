# Feature Specification: Simulação longa, calibração e promoção

**Feature Branch**: `013-simulation-calibration`  
**Created**: 2026-07-13 | **Status**: DELIVERED  
**Feature ID**: VAL-001 | **Milestone**: M1 | **Owner**: validação transversal, sem aggregate

**Input**: Executar lotes R-34/R-88, horizontes longos, bandas BS/BE/BD, invariantes e gate G1–G8.

## User Scenarios & Testing

### User Story 1 — Provar temporadas longas sem corrupção (Priority: P1)

Como responsável pelo ruleset, quero simular muitos mundos/temporadas para impedir promoção de um universo que degrada silenciosamente.

**Independent Test**: Executar manifesto fixo por 20–30 temporadas e produzir relatório reproduzível de estado, standings, demografia, economia e invariantes.

**Acceptance Scenarios**:

1. **Given** manifest versionado, **When** o lote termina, **Then** todos os seeds têm hashes, métricas e violações rastreáveis.
2. **Given** uma violação em qualquer seed, **When** o relatório agrega, **Then** o gate permanece FAIL sem ser mascarado por média.

### User Story 2 — Calibrar partida, economia e demografia (Priority: P2)

Como game designer, quero comparar dados executados às bandas ratificadas para ajustar regras sem reescrever históricos.

**Independent Test**: Rodar R-34 (~10 mil partidas/cenário) e R-88 (mundos multi-temporada), classificando cada BS/BE/BD como PASS/FAIL.

**Acceptance Scenarios**:

1. **Given** banda aprovada, **When** intervalo observado fica fora, **Then** relatório falha e aponta dimensão/seed.
2. **Given** ruleset recalibrado, **When** reexecutado, **Then** nova evidência não altera resultados históricos anteriores.

### User Story 3 — Decidir promoção conjuntiva (Priority: P3)

Como release owner, quero uma decisão G1–G8 auditável para promover somente um candidato integralmente verde.

**Independent Test**: Montar evidence set de uma versão e provar que qualquer gate ausente/stale/falho resulta NO-GO.

**Acceptance Scenarios**:

1. **Given** G1–G7 PASS e G8 ausente, **When** a promoção é avaliada, **Then** resultado é NO-GO.
2. **Given** todos os gates PASS para o mesmo candidato, **When** owners assinam a revisão, **Then** decisão é GO e permanece imutável.

### Edge Cases

- Lote interrompido, seed faltante, artefato corrompido ou commit divergente.
- Outlier que revela bug mesmo com média dentro da banda.
- Mudança de banda após execução; evidência anterior torna-se stale.
- Comparação entre plataformas com hash divergente.

## Scope & Boundaries

Inclui manifests, seed sets, runners, métricas, relatórios, comparação a bandas, regressão, evidence sets e decisão de promoção. Exclui alterar regras/aggregates; VAL-001 reporta, owners corrigem e nova ruleset é avaliada.

Dependências: BC-002…BC-009, X-001 e X-002 concluídas para fechar M1.

## Requirements

- **FR-001**: Cada execução MUST fixar commit, rulesetVersion, seedSet, toolchain e manifest hash.
- **FR-002**: R-34 MUST cobrir aproximadamente 10.000 partidas por cenário aprovado.
- **FR-003**: R-88 MUST cobrir ao menos 1.000 mundos por 10 temporadas e extensões de 50/100 conforme baseline.
- **FR-004**: Relatórios MUST preservar dados por seed e agregados; outlier bloqueante não pode ser ocultado.
- **FR-005**: Toda INV aplicável MUST ter contador e exemplos de falha; qualquer violação é FAIL.
- **FR-006**: BS, BE e BD MUST comparar intervalo observado ao oráculo versionado.
- **FR-007**: Replay MUST reproduzir 100% dos hashes para manifest idêntico.
- **FR-008**: Evidence stale, ausente ou incompatível MUST equivaler a FAIL.
- **FR-009**: Promoção MUST calcular G1 ∧ G2 ∧ G3 ∧ G4 ∧ G5 ∧ G6 ∧ G7 ∧ G8.
- **FR-010**: Recalibração MUST criar nova versão efetiva e preservar fatos/evidências anteriores.
- **FR-011**: Runner MUST permitir shard/resume sem duplicar ou omitir seeds.
- **FR-012**: Relatório MUST ser reproduzível por comando e conter artefatos brutos com digest.

### Key Entities

SimulationManifest, SeedSet, BatchRun, ScenarioRun, MetricObservation, BandEvaluation, InvariantViolation, GateEvaluation, PromotionDecision.

## Canonical Sources & Traceability

| Scope              | Sources                                                 | IDs                          |
| ------------------ | ------------------------------------------------------- | ---------------------------- |
| Ordem e testes     | `docs/02-tecnico/06-roadmap-de-implementacao.md`, §§7–8 | primeiro marco               |
| Metodologia/gates  | `docs/02-tecnico/17-criterios-de-aceite-e-bandas.md`    | R-34, R-88, R-116…124, G1–G8 |
| Replay             | `docs/02-tecnico/15-ruleset-e-replay.md`                | resultHash/ruleset           |
| Operação em volume | `docs/02-tecnico/09-operacao-e-admin-do-mundo.md`       | testes em grande volume      |

## Success Criteria

- **SC-001**: 100% dos runs possuem manifest, seed, hashes e artefatos reproduzíveis.
- **SC-002**: 100% das INV/BS/BE/BD aplicáveis recebem resultado explícito, nunca desconhecido verde.
- **SC-003**: Mesma execução reproduz 100% dos result hashes.
- **SC-004**: Promoção retorna GO somente com G1–G8 PASS para o mesmo candidato.

## Assumptions

- Bandas são oráculos ratificados, não resultados já verdes.
- Capacidade distribuída pode evoluir, preservando manifest/shard semantics.
