# Data model: portfólio de features do Grinta

Este modelo descreve os artefatos de planejamento do programa. Os modelos de domínio do jogo continuam definidos nos documentos canônicos de cada contexto.

## Feature

Unidade estável e demonstrável de entrega.

| Campo            | Tipo conceitual                                          | Regra                                                     |
| ---------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| `id`             | `GRI-NNN`                                                | Imutável e único; nunca reutilizado.                      |
| `slug`           | texto curto                                              | Único, legível e estável após publicação.                 |
| `title`          | texto                                                    | Resultado de negócio/técnico identificável.               |
| `milestoneId`    | referência                                               | Exatamente um marco primário.                             |
| `status`         | `DELIVERED \| PARTIAL \| PLANNED \| BLOCKED \| DEFERRED` | Mudança exige evidência ou motivo.                        |
| `scope`          | lista                                                    | Capacidades incluídas, sem sobrepor ownership de escrita. |
| `outOfScope`     | lista                                                    | Limites explícitos.                                       |
| `owners`         | lista de contextos/concerns                              | Ao menos um; apenas um owner de escrita por agregado.     |
| `sourceRefs`     | lista de referências                                     | Ao menos uma fonte canônica.                              |
| `acceptanceRefs` | lista de critérios                                       | Ao menos um resultado verificável.                        |
| `evidenceRefs`   | lista de evidências                                      | Obrigatória para `DELIVERED`; parcial para `PARTIAL`.     |

### Validações

- Uma feature não pode depender de si mesma.
- `DELIVERED` exige todas as evidências bloqueantes verdes.
- `BLOCKED` exige blocker identificado e condição de desbloqueio.
- `DEFERRED` exige justificativa de marco; não equivale a descartado.
- Uma alteração incompatível cria nova versão/feature; não reescreve o significado histórico do ID.

### Transições de estado

```text
PLANNED ──início parcial──> PARTIAL ──evidências verdes──> DELIVERED
   │                           │
   ├──impedimento real──> BLOCKED ──resolução──> PLANNED/PARTIAL
   └──fora do marco─────> DEFERRED ──repriorização──> PLANNED
```

`DELIVERED` só volta a trabalho ativo por uma nova feature de correção/evolução; a evidência histórica permanece.

## Dependency

Relação direcionada `prerequisiteFeatureId → dependentFeatureId`.

| Campo              | Regra                                                |
| ------------------ | ---------------------------------------------------- |
| `kind`             | `STARTS_AFTER`, `FINISHES_AFTER` ou `CONTRACT_ONLY`. |
| `reason`           | Explica qual resultado da predecessora é consumido.  |
| `requiredEvidence` | Evidência mínima para liberar a dependente.          |

### Validações

- O grafo completo deve ser acíclico.
- Dependência síncrona entre dois owners em sentidos opostos é proibida.
- `CONTRACT_ONLY` permite paralelismo depois que o contrato estiver congelado.

## Milestone

Incremento demonstrável do produto.

| Campo          | Regra                                               |
| -------------- | --------------------------------------------------- |
| `id`           | `M0` a `M4`, único.                                 |
| `name`         | Nome orientado ao resultado.                        |
| `exitCriteria` | Condição conjunta e verificável.                    |
| `featureIds`   | Features cujo resultado primário pertence ao marco. |

### Marcos

- `M0` — Fundação já entregue.
- `M1` — Temporadas headless completas e calibráveis.
- `M2` — Backend multiplayer autoritativo e operável.
- `M3` — MVP jogável nos clientes mobile/admin.
- `M4` — Produção segura, observável e promovida.

## Evidence

Prova associada a uma feature ou gate.

| Campo            | Regra                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| `type`           | `TEST`, `BUILD`, `REPORT`, `TRACE`, `MIGRATION`, `LOAD_TEST`, `SECURITY_TEST`, `GAMEDAY` ou `REVIEW`. |
| `location`       | Caminho ou identificador reproduzível.                                                                |
| `rulesetVersion` | Obrigatório quando o comportamento depende de regras.                                                 |
| `seedSet`        | Obrigatório para simulação/replay.                                                                    |
| `result`         | `PASS` ou `FAIL`; ausência não equivale a `PASS`.                                                     |
| `observedAt`     | Momento da execução.                                                                                  |

## CanonicalSource

Referência normativa que fundamenta escopo e critérios.

| Campo         | Regra                                                     |
| ------------- | --------------------------------------------------------- |
| `document`    | Caminho relativo sob `docs/`.                             |
| `section`     | Cabeçalho/âncora estável.                                 |
| `decisionIds` | IDs ratificados aplicáveis, quando existirem.             |
| `authority`   | GDD, técnico, ADR, baseline ou UI/UX conforme hierarquia. |

## CoverageLink

Vínculo muitos-para-muitos que prova cobertura.

| Campo          | Regra                                                                        |
| -------------- | ---------------------------------------------------------------------------- |
| `featureId`    | Feature responsável por parte do fluxo/contexto.                             |
| `coverageType` | `BOUNDED_CONTEXT`, `CONCERN`, `GOLDEN_PATH`, `SCREEN_SET` ou `QUALITY_GATE`. |
| `coverageId`   | ID canônico do item coberto.                                                 |
| `role`         | `OWNER`, `CONTRIBUTOR` ou `EVIDENCE`.                                        |

## QualityGate

Condição bloqueante composta.

| Campo                     | Regra                                                   |
| ------------------------- | ------------------------------------------------------- |
| `id`                      | `G1` a `G8`.                                            |
| `conditions`              | Todas precisam estar verdes; operação conjuntiva.       |
| `evidenceRefs`            | Resultados executados, nunca apenas critérios escritos. |
| `effectiveRulesetVersion` | Versão candidata à promoção.                            |

### Invariante de promoção

```text
promovível = G1 ∧ G2 ∧ G3 ∧ G4 ∧ G5 ∧ G6 ∧ G7 ∧ G8
```

Não há transição parcial para produção.
