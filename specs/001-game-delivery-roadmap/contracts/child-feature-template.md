# Contrato do pacote de feature filha

Este contrato define a estrutura mínima e as seções obrigatórias de cada uma das
34 features filhas do programa. Um pacote só pode ser considerado completo quando
for compreensível isoladamente, estiver rastreado ao catálogo mestre e contiver
evidência verificável para o estado que declara.

## Estrutura obrigatória

Cada entrada do catálogo deve apontar para um único diretório
`specs/<NNN>-<slug>/` com esta estrutura:

```text
specs/<NNN>-<slug>/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── <contrato-ou-README>.md
└── checklists/
    └── requirements.md
```

- `spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md` e
  `checklists/requirements.md` são obrigatórios.
- `contracts/` é obrigatório. Quando a feature não expuser interface, deve conter
  um `README.md` que justifique a ausência e identifique as interfaces internas
  consumidas.
- `data-model.md` não pode ser omitido. Features sem estado próprio devem declarar
  explicitamente que não possuem entidades autoritativas e listar apenas as
  referências de leitura relevantes.
- `tasks.md` não integra o pacote de design inicial; ele é criado posteriormente
  por `$speckit-tasks` e deve preservar as histórias e os caminhos definidos aqui.
- Diagramas e anexos podem ser adicionados, mas não substituem nenhum artefato ou
  seção obrigatória.

## Identidade e rastreabilidade comuns

Todos os artefatos devem usar a mesma identidade registrada em
`feature-index.yaml` e no catálogo mestre:

- ID canônico (`FND-*`, `BC-*`, `X-*`, `VAL-*`, `OPS-*` ou `GP-*`), slug e título;
- diretório, marco e estado (`DELIVERED`, `PARTIAL`, `PLANNED`, `BLOCKED` ou
  `DEFERRED`);
- owner autoritativo e contributors, sem ownership de escrita duplicado;
- dependências por ID e resultado necessário, sem depender apenas de nomes;
- fontes canônicas como caminho relativo sob `docs/`, seção e decision IDs
  aplicáveis;
- referências locais relativas entre os artefatos do pacote.

IDs publicados não podem ser reutilizados. Uma divergência entre o pacote e o
catálogo bloqueia a validação até que seja reconciliada explicitamente.

## `spec.md`

O specification descreve valor e comportamento, sem escolher implementação. Deve
conter, nesta ordem lógica, as seções abaixo.

### Cabeçalho

- título da feature;
- branch/diretório, data, estado e input que originou a especificação;
- ID canônico, marco, owner e links para a linha do catálogo e fontes principais.

### User Scenarios & Testing

- ao menos uma história de usuário priorizada (`P1`, `P2`, ...);
- justificativa da prioridade e valor entregue por história;
- teste independente e demonstrável para cada história;
- cenários de aceite em formato Given/When/Then;
- edge cases, incluindo falhas, limites, retry/idempotência e concorrência quando
  aplicáveis.

Cada história deve ser uma fatia verificável. Histórias que apenas enumeram
camadas técnicas ou dependem integralmente de uma história posterior não são
aceitas como independentes.

### Scope & Boundaries

- capacidades incluídas;
- exclusões explícitas;
- owner de cada escrita e dados apenas consultados de outros contextos;
- dependências de início/fim/contrato e condição objetiva que as libera;
- para golden paths, participantes e fronteiras atravessadas sem transferir a
  autoridade dos bounded contexts.

### Requirements

- requisitos funcionais numerados e testáveis (`FR-001`, ...);
- invariantes e regras de domínio aplicáveis, com seus IDs canônicos;
- requisitos de determinismo, idempotência, isolamento por mundo, histórico,
  ruleset, economia, segurança ou acessibilidade quando aplicáveis;
- entidades conceituais e seus relacionamentos, quando houver dados;
- comandos, consultas, eventos e erros observáveis exigidos, sem definir detalhes
  de framework.

### Canonical Sources & Traceability

- tabela ligando cada grupo de requisitos a documento, seção e decision ID;
- aliases documentais normalizados para um único conceito/owner;
- lacunas e conflitos registrados com owner, impacto e critério de encerramento;
- vínculos para CA/INV/BS/BE/BD/G e golden paths aplicáveis.

Nenhuma lacuna pode ser resolvida por uma decisão implícita. O pacote não pode
seguir para implementação com marcadores `NEEDS CLARIFICATION`.

### Success Criteria

- resultados mensuráveis e independentes de tecnologia (`SC-001`, ...);
- condição demonstrável de conclusão do escopo;
- métricas e bandas canônicas aplicáveis, sem transformar metas ainda não
  executadas em evidência verde.

### Assumptions

- premissas adotadas, limites de validade e dependências externas;
- comportamento esperado diante de premissa inválida;
- trabalho deliberadamente adiado, com ID de destino quando já existir.

## `plan.md`

O plano traduz a especificação em uma abordagem técnica executável. Deve conter as
seções abaixo.

### Cabeçalho, Summary e Technical Context

- branch/diretório, data e link relativo para `spec.md`;
- resumo do resultado e da abordagem escolhida;
- linguagem/runtime, dependências, armazenamento, testes, plataforma, tipo de
  projeto, metas de desempenho, restrições e escala;
- estado atual versus estado alvo para features `DELIVERED` ou `PARTIAL`.

Todos os campos devem ter decisão ou `N/A` justificado após a pesquisa. Nenhum
`NEEDS CLARIFICATION` pode permanecer.

### Constitution Check

- gates constitucionais efetivamente ratificados;
- quando a constituição continuar como placeholder, registro explícito do risco e
  aplicação apenas dos gates canônicos já aprovados em `docs/`;
- resultado pré-design e violações justificadas ou bloqueantes.

O check deve cobrir, quando aplicável: domínio puro, determinismo/replay,
idempotência, ownership único, isolamento entre mundos, ruleset versionado,
dinheiro inteiro/fixed-point, clientes não autoritativos e promoção conjuntiva.

### Project Structure

- árvore documental do pacote;
- caminhos reais de código e testes que serão criados ou alterados;
- decisão de estrutura e fronteiras entre domínio, aplicação e adapters;
- contratos usados para integração sem escrita cruzada.

### Phase 0 — Research outcome

- link para `research.md`;
- decisões tomadas, razões e alternativas descartadas;
- resolução de todas as dúvidas técnicas e integrações relevantes.

### Phase 1 — Design outcome

- links para `data-model.md`, `contracts/` e `quickstart.md`;
- resumo das entidades, transições, interfaces e cenários de validação produzidos;
- estratégia de migração/compatibilidade para estado persistido ou contratos
  versionados, quando aplicável.

### Delivery Strategy & Evidence

- incrementos implementáveis e ordem interna;
- dependências e freeze points que permitem paralelismo seguro;
- estratégia de teste por requisito: unidade, propriedade, contrato, integração,
  replay, E2E, carga, segurança, recuperação ou gameday conforme aplicável;
- evidências necessárias para justificar o estado final e os gates que bloqueiam a
  promoção;
- rollback, reprocessamento e compatibilidade histórica quando houver mudança de
  estado vivo.

### Post-design Constitution Check e Complexity Tracking

- reavaliação dos mesmos gates depois do desenho;
- tabela de exceções somente quando houver violação justificada;
- resultado `PASS` ou bloqueio explícito. Ausência de evidência não equivale a
  `PASS`.

## `checklists/requirements.md`

O checklist valida a qualidade da especificação, não a implementação. Deve conter
título, propósito, data, link para `spec.md`, notas da revisão e os grupos abaixo.

### Content Quality

- ausência de detalhes de implementação no `spec.md`;
- foco em valor e necessidades do domínio;
- linguagem compreensível por stakeholders;
- preenchimento de todas as seções obrigatórias.

### Requirement Completeness

- zero marcadores `NEEDS CLARIFICATION`;
- requisitos testáveis, numerados e sem ambiguidade;
- critérios mensuráveis e independentes de tecnologia;
- cenários de aceite, edge cases, escopo e exclusões definidos;
- dependências, premissas, ownership e fontes identificados;
- invariantes e condições de falha/retry/concorrência cobertas quando aplicáveis.

### Traceability & Portfolio Alignment

- ID, slug, marco, estado e diretório iguais aos manifests mestre;
- cada requisito ligado a fonte canônica e critério de aceite;
- dependências coerentes com o DAG e sem escrita cruzada;
- coverage IDs e quality gates aplicáveis cobertos;
- `DELIVERED` e `PARTIAL` sustentados por evidência local reproduzível;
- ausência de evidência registrada como pendência, nunca como aprovação.

### Feature Readiness

- histórias independentes cobrem os fluxos primários;
- todo requisito possui forma objetiva de validação;
- resultado de sucesso pode ser demonstrado pelo `quickstart.md`;
- pacote contém todos os artefatos e links internos válidos;
- nenhuma decisão aberta bloqueia planejamento ou implementação.

Cada item usa checkbox Markdown. Um item marcado `[x]` representa uma verificação
realizada; itens não aplicáveis permanecem visíveis, marcados `[x]`, acompanhados
de justificativa em **Notes**. Qualquer item aplicável não atendido permanece
`[ ]` e impede que o pacote seja declarado pronto.

## Artefatos de apoio

### `research.md`

Registra cada decisão no formato **Decision**, **Rationale** e **Alternatives
considered**, incluindo stack, dependências e padrões de integração. Deve resolver
todos os pontos em aberto do contexto técnico.

### `data-model.md`

Define entidades, campos conceituais, relações, validações, invariantes e
transições de estado. Deve declarar owner de escrita, chaves de idempotência,
versão de regras e estratégia de histórico quando aplicáveis.

### `contracts/`

Documenta as interfaces externas da feature no formato adequado: comandos,
consultas, eventos, erros, schemas, endpoints, CLI ou contratos de UI. Cada
contrato identifica versão, owner, consumidores, compatibilidade e semântica de
falha/retry. Não deve duplicar autoridade de outro contexto.

### `quickstart.md`

Fornece pré-requisitos, comandos executáveis, seeds/ruleset necessários, cenários
de ponta a ponta e resultados esperados. Ele referencia o modelo e os contratos em
vez de incluir implementação completa ou uma suíte de testes.

## Critério de aceite do pacote

Um pacote filho está pronto para gerar tarefas somente quando:

1. todos os arquivos e diretórios obrigatórios existem;
2. o checklist está integralmente aprovado, com itens não aplicáveis justificados;
3. não há placeholders nem clarificações não resolvidas;
4. IDs, dependências, fontes, marco e estado coincidem com os manifests mestre;
5. spec, plano, modelo, contratos e quickstart são mutuamente consistentes;
6. o estado declarado possui a evidência exigida, e evidência ausente é `FAIL`;
7. links internos e referências a `docs/` resolvem para destinos existentes.

Falha em qualquer condição mantém o pacote incompleto e deve produzir diagnóstico
acionável; não é permitido promover o pacote por inspeção informal.
