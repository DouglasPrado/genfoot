# Validação do portfólio de features

Este diretório concentra relatórios reproduzíveis do roadmap. Os relatórios registram resultados; os contratos em `../contracts/` definem o esperado. Um documento planejado, uma checklist marcada ou a simples existência de código não substituem evidência executada.

## Entradas autoritativas

| Entrada                                                                              | Papel na validação                                                 | Disponibilidade                                   |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------- |
| `../contracts/feature-catalog.md`                                                    | Baseline humana dos 34 IDs, estados, dependências, marcos e saídas | Obrigatória desde o início                        |
| `../contracts/source-map.md`                                                         | Fontes, cabeçalhos, decisões e ownership de cada ID                | Obrigatória desde T003                            |
| `../contracts/feature-index.yaml` e schema                                           | Índice legível por máquina e suas restrições                       | Obrigatórios após T001/T005                       |
| `../contracts/dependency-graph.yaml`                                                 | Arestas, tipos e razões do DAG                                     | Obrigatória para validação de dependências        |
| `../contracts/milestones.yaml`                                                       | Associação M0–M4 e gates de entrada/saída                          | Obrigatória para promoção entre marcos            |
| `../contracts/evidence-registry.yaml` e `evidence-schema.md`                         | Slots e semântica das provas por feature/gate                      | Obrigatórios para alegações `PARTIAL`/`DELIVERED` |
| `../spec.md`, `../plan.md`, `../research.md`, `../data-model.md`, `../quickstart.md` | Requisitos e decisões da spec mestre                               | Sempre obrigatórios                               |
| `specs/002-*` a `specs/035-*`                                                        | Pacotes filhos e checklists de cada feature                        | Obrigatórios para completude do portfólio         |
| `docs/`                                                                              | Baseline canônica referenciada pelo source map                     | Toda referência precisa existir                   |
| Código, Git, testes, builds, migrations, traces e relatórios                         | Evidência observada, datada e reproduzível                         | Obrigatória conforme estado e gate alegados       |

Entradas ainda não materializadas devem ser reportadas como `MISSING` e produzir `FAIL` no validator que depende delas. Isso é esperado enquanto as tarefas fundacionais correspondentes não terminarem; nunca se converte em aprovação silenciosa.

## Validators e relatórios gerados

| Validação                | Entrada principal                                   | Relatório persistido        |
| ------------------------ | --------------------------------------------------- | --------------------------- |
| Índice/schema/diretórios | feature index, schema, catálogo e pacotes filhos    | `portfolio-completeness.md` |
| Cobertura                | índice, catálogo e source map                       | `coverage-report.md`        |
| DAG e ordem              | dependency graph, índice e marcos                   | `dependency-report.md`      |
| Evidência atual          | registry, código, Git e comandos locais             | `current-evidence.md`       |
| Integridade de evidência | registry, schema, fontes e artefatos observados     | `final-evidence-report.md`  |
| Governança               | constituição e baseline ratificada                  | `governance-risk.md`        |
| Documentos e links       | Markdown da spec mestre e dos pacotes filhos        | `document-integrity.md`     |
| Gates do workspace       | format, lint, typecheck, test e build               | `workspace-gates.md`        |
| Formato de tarefas       | `../tasks.md`                                       | `task-format.md`            |
| Quickstart integral      | `../quickstart.md` e todas as evidências anteriores | `quickstart-report.md`      |

Os scripts ficam em `scripts/roadmap/` e devem imprimir um resumo no terminal, retornar um exit code coerente e gravar o relatório indicado quando a tarefa pedir persistência. Um relatório não deve sobrescrever evidência histórica sem registrar data, comando, revisão Git e parâmetros relevantes.

## Semântica de resultado

### Estados dos checks

- `PASS`: a condição foi executada e satisfeita, com evidência reproduzível presente.
- `FAIL`: a condição foi executada e não satisfeita, ou uma entrada/evidência obrigatória está ausente, inválida, inconsistente ou obsoleta.
- `SKIP`: o check não se aplica ao escopo declarado. Exige razão explícita e não conta como `PASS`.
- `BLOCKED`: a execução não pôde começar por dependência externa identificada. É reportado como não aprovado e bloqueia o resultado agregado.
- `ERROR`: o próprio validator falhou antes de produzir uma avaliação confiável. É reportado como não aprovado.

`MISSING`, `STALE`, `INVALID` e `DUPLICATE` são diagnósticos que sempre resultam em `FAIL`; não são estados aprováveis.

### Resultado agregado

```text
PASS agregado = todos os checks obrigatórios são PASS
FAIL agregado = existe FAIL, BLOCKED ou ERROR obrigatório
```

Checks opcionais com `SKIP` não promovem nem rebaixam sozinhos, mas precisam aparecer no relatório. Um gate conjuntivo, inclusive G1–G8, passa somente quando todos os seus componentes obrigatórios têm `PASS` executado para a mesma revisão, ruleset e conjunto de seeds aplicável.

### Exit codes

- `0`: todos os checks obrigatórios passaram.
- `1`: validação concluída com pelo menos um `FAIL` ou `BLOCKED`.
- `2`: erro de uso, parsing ou execução impediu avaliação confiável.

## Regras bloqueantes

1. ID ausente, duplicado ou fora do conjunto de 34: `FAIL`.
2. Cobertura diferente de 12 contexts, 3 concerns ou 16 golden paths: `FAIL`.
3. Referência de documento/cabeçalho inexistente ou stale: `FAIL`.
4. Feature sem owner, aggregate com owners concorrentes ou `GP-*` com ownership próprio: `FAIL`.
5. Autodependência, ciclo, nó inalcançável obrigatório ou milestone ausente: `FAIL`.
6. `DELIVERED` sem todas as evidências bloqueantes verdes: `FAIL`.
7. `PARTIAL` sem delimitação do entregue e da lacuna, ou sem evidência da fatia entregue: `FAIL`.
8. Resultado de simulação/replay sem `rulesetVersion`, seeds ou hash exigidos: `FAIL`.
9. Evidência de outra revisão, ruleset ou janela sem justificativa de compatibilidade: `STALE` e `FAIL`.
10. Arquivo, comando ou relatório esperado ausente: `MISSING` e `FAIL`.

## Metadados mínimos de relatório

Todo relatório deve registrar:

- validator e versão/commit;
- data/hora e revisão Git avaliada;
- comandos executados e exit codes;
- entradas e versões utilizadas;
- ruleset e conjunto de seeds, quando aplicáveis;
- contagem de `PASS`, `FAIL`, `SKIP`, `BLOCKED` e `ERROR`;
- diagnóstico acionável por ID/caminho;
- resultado agregado e condição necessária para nova execução.

## Promoção e histórico

Relatórios intermediários podem permanecer `FAIL` durante a construção. Um estado de feature ou marco só muda mediante evidência correspondente no registry e relatório verde. `DELIVERED` e a promoção M0→M4 nunca são inferidos por percentual, média ou ausência de falhas registradas; exigem provas positivas. Resultados anteriores permanecem auditáveis e um novo run registra sua relação com a revisão anterior.
