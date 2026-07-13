# Contrato de evidências do roadmap

**Version**: 1.0.0  
**Baseline**: 2026-07-13  
**Applies to**: features, marcos, critérios de aceite e quality gates do programa

Este contrato define quando um resultado pode sustentar `DELIVERED`, a promoção
de um marco ou um gate `PASS`. Critério escrito, código presente e execução
presumida não são evidência. Ausência, ilegibilidade, expiração ou incompatibilidade
de uma evidência equivalem a `FAIL` para qualquer condição bloqueante.

## Conceitos

### Evidence slot

Declara uma evidência esperada antes de ela existir. Um slot contém `slotId`, tipo,
feature/marco, critérios que deverá provar e metadados obrigatórios. Slots não têm
resultado e nunca liberam um gate.

### Evidence observation

Registra uma execução ou revisão concreta que preenche um slot. Somente uma
observation válida, reproduzível e compatível com o candidato avaliado pode ter
`result: PASS`.

### Evidence set

Conjunto imutável de observations avaliado para uma mesma combinação de commit,
release, ruleset e ambiente. Misturar resultados de candidatos diferentes é
proibido, salvo evidência explicitamente independente desses campos.

## Schema normativo de uma observation

| Campo            | Obrigatório | Regra                                                                                           |
| ---------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `evidenceId`     | sim         | ID global, único e imutável; formato `EVD-<feature>-<tipo>-<sequência>`.                        |
| `slotId`         | sim         | Slot esperado que a observation preenche.                                                       |
| `featureId`      | sim         | Uma das 34 features registradas; deve coincidir com o owner do slot.                            |
| `milestoneId`    | sim         | `M0`…`M4`; deve coincidir com o marco primário ou com o gate explicitamente avaliado.           |
| `type`           | sim         | Um dos tipos fechados definidos abaixo.                                                         |
| `result`         | sim         | Apenas `PASS` ou `FAIL`; não existe `UNKNOWN` implícito.                                        |
| `location`       | sim         | Caminho relativo no repositório ou URI/ID imutável e acessível do artefato.                     |
| `artifactHash`   | sim         | Digest do artefato referido; mudanças no conteúdo invalidam a observation.                      |
| `observedAt`     | sim         | Timestamp ISO 8601 UTC da execução/revisão.                                                     |
| `commitSha`      | sim         | Commit completo do código/documentação avaliado.                                                |
| `criterionRefs`  | sim         | Lista não vazia de FR/SC/CA/INV/BS/BE/BD/G/DB ou critérios de marco provados.                   |
| `command`        | condicional | Comando reproduzível para evidência executável; só pode faltar em `REVIEW`.                     |
| `toolchain`      | sim         | Runtime, gerenciador e versões relevantes para reproduzir o resultado.                          |
| `environment`    | sim         | Ambiente/topologia, configuração relevante e referência segura a fixtures; não contém segredos. |
| `rulesetVersion` | condicional | Obrigatório quando comportamento, cálculo, simulação, replay ou promoção depende de regras.     |
| `seedSet`        | condicional | Lista/manifesto obrigatório para simulação, RNG, replay, lote ou cenário gerado.                |
| `releaseId`      | condicional | Obrigatório para evidência de M3/M4, deploy, carga, segurança, gameday ou go/no-go.             |
| `startedAt`      | condicional | Obrigatório para execução; timestamp ISO 8601 UTC.                                              |
| `finishedAt`     | condicional | Obrigatório para execução e não anterior a `startedAt`.                                         |
| `owner`          | sim         | Papel/equipe responsável por reproduzir e corrigir falhas.                                      |
| `reviewer`       | condicional | Obrigatório para `REVIEW`, `SECURITY_TEST`, `GAMEDAY` e decisão de promoção.                    |
| `inputs`         | sim         | Referências versionadas a fixtures, manifests, migrations, contratos ou dados usados.           |
| `outputs`        | sim         | Artefatos produzidos: relatório, logs, traces, hashes, métricas ou diff.                        |
| `failureSummary` | condicional | Obrigatório quando `result: FAIL`; explica falha sem ocultar resultados parciais.               |
| `supersedes`     | não         | Evidence ID anterior substituído; o registro anterior permanece histórico.                      |

Listas obrigatórias (`criterionRefs`, `inputs`, `outputs`) não podem ser vazias.
`location` e cada item de `inputs`/`outputs` precisam resolver para conteúdo
existente e legível durante a validação.

## Tipos fechados

| Tipo            | Prova mínima                                                                                                             | Metadados adicionais obrigatórios                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `TEST`          | Resultado de teste unitário, propriedade, invariante, contrato, integração, concorrência, replay, E2E ou acessibilidade. | comando, toolchain, duração, outputs; ruleset/seeds quando aplicáveis.              |
| `BUILD`         | Artefato compilado/empacotado reproduzível para o commit.                                                                | comando, toolchain, hashes dos artefatos.                                           |
| `REPORT`        | Análise gerada de dados executados, nunca meta ou banda escrita.                                                         | gerador/comando, inputs, dataset, outputs; ruleset/seeds para simulação.            |
| `TRACE`         | Sequência observada que demonstra causalidade, ordenação, replay, idempotência ou recuperação.                           | correlation/world IDs anonimizados, intervalo, comando/cenário e output imutável.   |
| `MIGRATION`     | Aplicação, compatibilidade e rollback/forward-fix de mudança persistente.                                                | versão anterior/posterior, banco alvo, comandos, backups/restore quando aplicáveis. |
| `LOAD_TEST`     | Carga/soak comparada a SLO e capacidade aprovados.                                                                       | release, topologia, perfil de carga, duração, métricas brutas e critérios.          |
| `SECURITY_TEST` | Teste de segurança/privacidade com achados e disposição explícita.                                                       | release, escopo, metodologia, reviewer e registro dos achados.                      |
| `GAMEDAY`       | Exercício operacional realizado, como restore, DR, deploy ou rollback.                                                   | release, participantes, timeline, RPO/RTO observado, incidentes e ações.            |
| `REVIEW`        | Decisão humana rastreável baseada em observations listadas.                                                              | reviewer, checklist versionado, inputs e decisão assinada/registrada.               |

Um `REVIEW` não transforma critério não executado em `PASS`: todos os resultados
técnicos citados por ele devem existir como observations válidas dos tipos
apropriados.

## Regras para ruleset e seeds

`rulesetVersion` é obrigatório sempre que o resultado possa mudar por fórmula,
probabilidade, arredondamento, calendário, competição, economia, lifecycle, IA ou
runtime de partida. A referência deve ser imutável e identificar também a política
de aritmética/rounding aplicável.

`seedSet` é obrigatório para:

- geração de mundo, clube, pessoa ou jogador;
- simulação diária, de partida, temporada ou horizonte longo;
- replay e comparação de `resultHash`;
- lotes R-34/R-88, BS/BE/BD e qualquer teste probabilístico;
- teste que alegue comportamento determinístico ou distribuição calibrada.

O seed set deve ser um manifesto versionado ou uma lista integral; expressões como
“seeds aleatórias” ou “amostra padrão” não são reproduzíveis. Streams derivados,
ordem de consumo e número de repetições devem estar nos inputs ou outputs quando
afetarem o resultado.

## Semântica de `PASS` e `FAIL`

Uma observation é `PASS` somente quando todas as condições abaixo são verdadeiras:

1. todos os campos obrigatórios e condicionais estão presentes e válidos;
2. artefato, inputs e outputs existem e seus hashes conferem;
3. commit, release, ruleset, seeds e ambiente correspondem ao candidato avaliado;
4. o comando terminou com o resultado esperado e sem subteste bloqueante omitido;
5. todos os `criterionRefs` cobertos atingiram seus limites aprovados;
6. não existe falha, invariante violada ou achado bloqueante mascarado por média;
7. a evidência permanece dentro da política de validade/staleness;
8. o resultado pode ser reproduzido por outra pessoa com as referências gravadas.

O resultado é `FAIL` quando qualquer condição de `PASS` falha, inclusive quando:

- o comando retorna código diferente de zero ou possui caso bloqueante vermelho;
- um hash diverge, replay não coincide ou uma `INV-*` é violada;
- uma banda obrigatória fica fora do intervalo aprovado;
- ledger apresenta residual diferente de zero;
- carga viola SLO/capacidade ou segurança mantém achado bloqueante;
- restore/DR não atinge RPO/RTO;
- a execução foi cancelada, incompleta, ilegível ou perdeu seus artefatos.

Resultados parciais podem ser mantidos para diagnóstico, mas não preenchem o slot
e não liberam promoção. Retry cria nova observation; nunca altera o resultado
histórico da anterior.

## Ausência, expiração e staleness

Para cada slot bloqueante:

```text
effectiveResult(slot) =
  PASS, se existe observation PASS válida para o candidato atual;
  FAIL, em qualquer outro caso.
```

Uma observation torna-se stale quando muda qualquer input material: código do
escopo, contrato, migration, ruleset, seed manifest, configuração/topologia do
teste, critério/banda ou dependência cuja saída é consumida. Evidência stale
continua no histórico, mas seu `effectiveResult` é `FAIL` até nova execução.

Exceções de reuso exigem análise de impacto registrada em `REVIEW`, com prova de
que a mudança não alcança os critérios cobertos. O review não pode dispensar
evidências cuja própria política exige nova execução, como segurança, carga,
restore, DR ou golden replay de uma release candidata.

## Agregação por feature, marco e quality gate

- `DELIVERED`: todos os slots bloqueantes da feature estão `PASS` para o candidato
  atual.
- `PARTIAL`: ao menos uma fatia está comprovada, e todo slot ausente permanece
  explicitamente `FAIL`/pendente; não há promoção integral.
- `PLANNED`: critérios podem existir, mas ainda não há alegação de execução.
- `BLOCKED`: blocker e condição de desbloqueio estão registrados; evidência não é
  fabricada para contornar o bloqueio.
- marco: todos os exit criteria e required evidence de `milestones.yaml` estão
  `PASS` em conjunto.
- ruleset/release: `G1 ∧ G2 ∧ G3 ∧ G4 ∧ G5 ∧ G6 ∧ G7 ∧ G8`; nenhum gate compensa
  outro e nenhum resultado desconhecido é verde.

Evidências podem provar mais de um critério, mas devem ser associadas a um owner.
Referências cruzadas não duplicam o artefato e não transferem ownership.

## Exemplo válido de observation

O exemplo ilustra a forma; não declara que o slot está executado no repositório.

```yaml
evidenceId: EVD-VAL-001-REPORT-001
slotId: M1-REPORT-20-SEASONS
featureId: VAL-001
milestoneId: M1
type: REPORT
result: PASS
location: specs/013-simulation-calibration/evidence/long-run-001.json
artifactHash: sha256:<digest>
observedAt: 2026-07-13T18:00:00Z
startedAt: 2026-07-13T16:00:00Z
finishedAt: 2026-07-13T18:00:00Z
commitSha: <40-character-sha>
rulesetVersion: <immutable-ruleset-version>
seedSet: specs/013-simulation-calibration/fixtures/seed-set-001.yaml
command: pnpm simulator validation:long-run --manifest <manifest>
toolchain: node@22.x + pnpm@10.33.2
environment: linux-x64; isolated validation data directory
criterionRefs: [M1-EC-01, M1-EC-03, M1-EC-04]
owner: VAL-001
inputs: [<immutable-manifest>]
outputs: [<report>, <raw-metrics>, <result-hashes>]
```

Placeholders tornam esse exemplo não registrável; uma observation real deve
substituí-los por referências e hashes concretos.

## Casos obrigatoriamente rejeitados

- `result: PASS` sem `location`, `artifactHash`, `observedAt` ou `commitSha`;
- simulação/replay sem `rulesetVersion` ou `seedSet`;
- evidence set que mistura commits, releases ou rulesets incompatíveis;
- relatório que contém apenas metas/BS/BE/BD, sem dados executados;
- `REVIEW` que aprova teste, carga, segurança ou recovery ausente;
- caminho quebrado, artefato mutável sem digest ou comando não reproduzível;
- promoção baseada em “maioria dos gates” ou média ponderada;
- alteração de `FAIL` para `PASS` no mesmo Evidence ID;
- segredo, token ou dado pessoal bruto gravado em metadados de evidência.

## Validação mínima do registry

O validador de evidências deve falhar com diagnóstico acionável quando detectar:

1. ID duplicado, slot desconhecido ou feature/marco divergente;
2. tipo/result fora dos enums;
3. campo obrigatório/condicional ausente;
4. referência, hash ou timestamp inválido;
5. ruleset/seed/release incompatível com o candidato;
6. observation stale usada como `PASS`;
7. criterion sem slot ou slot bloqueante sem observation válida;
8. feature `DELIVERED`, marco promovido ou G1–G8 verde sem conjunto completo;
9. tentativa de apagar/substituir evidência histórica em vez de supersedê-la.
