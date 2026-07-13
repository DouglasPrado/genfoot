# Relatório de validação de dependências

**Observed at**: 2026-07-13  
**Inputs**: `contracts/feature-index.yaml`, `contracts/dependency-graph.yaml`, `contracts/milestones.yaml`  
**Result**: PASS

## Resultados executados

```text
34 features válidas conforme o schema.
Grafo acíclico válido: 34 nós, 163 arestas.
Cobertura válida: 34 features, 12 bounded contexts, 3 concerns e 16 golden paths.
Vitest: 1 arquivo, 5 testes, 5 PASS.
```

Distribuição: 9 `STARTS_AFTER`, 29 `CONTRACT_ONLY` e 125 `FINISHES_AFTER`. Não existem autodependências, pares duplicados ou kind inválido.

## Ondas efetivas ordenadas

| Wave | Features               | Gate de término                         |
| ---: | ---------------------- | --------------------------------------- |
|   W0 | FND-001                | M0/fundação congelada                   |
|   W1 | BC-002                 | contracts de mundo/tempo                |
|   W2 | BC-003, BC-004, X-002  | owners primários e event/saga contracts |
|   W3 | BC-005, BC-007, BC-009 | staff, competição e ledger              |
|   W4 | BC-006, BC-008         | mercado/sagas e runtime/replay          |
|   W5 | X-001                  | command-only AI                         |
|   W6 | BC-010, VAL-001        | narrativa fact-driven e M1 PASS         |
|   W7 | BC-001, BC-011         | identidade e projeções/memória          |
|   W8 | BC-012                 | M2 security/admin/reprocessing PASS     |
|   W9 | X-003                  | clients/contracts/realtime/offline/a11y |
|  W10 | GP-001…GP-016          | M3/16 golden paths PASS                 |
|  W11 | OPS-001                | M4/G1–G8 GO                             |

O nível matemático mínimo colocaria GP-004/GP-006 em W8 e OPS-001 em W10. O índice os atrasa deliberadamente: golden paths concluem juntos como evidência M3 e OPS espera o gate integral de M3. Nenhuma feature foi adiantada em relação a uma predecessora.

## Reachability e ciclos

- Raiz: FND-001.
- Nós alcançáveis a partir da raiz: 34/34.
- Nós inalcançáveis: nenhum.
- Ciclos: nenhum.
- Self-dependencies: nenhuma.
- Terminal de promoção: OPS-001.

## Grupos paralelos seguros

- W2: BC-003, BC-004 e X-002 em owners/caminhos distintos após CF-01.
- W3: BC-005, BC-007 e BC-009 após seus contracts C2/C3.
- W4: BC-006 e BC-008 compartilham somente contracts congelados; não compartilham escrita.
- W6: BC-010 pode projetar fatos enquanto VAL-001 executa lotes headless.
- W7: BC-001 e BC-011 têm stores/owners independentes.
- W10: GP-001…GP-016 podem executar fixtures/E2E em paralelo por mundo/seed isolados; nenhum cria aggregate.
- Preparação transversal: protótipos X-003 e tooling OPS podem avançar nas condições limitadas de `parallel-work-lanes.md`, mas integração/promoção respeita W9/W11.

## Coerência index ↔ graph

Para cada uma das 34 features, `prerequisites` no índice coincide exatamente com as arestas diretas cujo `to` é a feature. O validator também exige `wave(dependent) > wave(prerequisite)`, IDs existentes, lista sem duplicata e contract freeze válido.

## Comandos reproduzíveis

```bash
node scripts/roadmap/validate-feature-index.mjs \
  --index specs/001-game-delivery-roadmap/contracts/feature-index.yaml \
  --schema specs/001-game-delivery-roadmap/contracts/feature-index.schema.json
node scripts/roadmap/validate-dependency-graph.mjs \
  --graph specs/001-game-delivery-roadmap/contracts/dependency-graph.yaml
node scripts/roadmap/validate-coverage.mjs \
  --index specs/001-game-delivery-roadmap/contracts/feature-index.yaml \
  --source-map specs/001-game-delivery-roadmap/contracts/source-map.md
pnpm exec vitest run scripts/roadmap/validate-feature-roadmap.test.ts
```

## Decision

**PASS**: o portfólio possui ordem determinística, zero ciclo, zero nó inalcançável e paralelismo delimitado por ownership/freeze. Este PASS valida o contrato do DAG; não declara as features ou os marcos entregues.
