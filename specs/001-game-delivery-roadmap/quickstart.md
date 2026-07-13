# Quickstart de validação: programa completo de entrega

Este guia valida os artefatos do plano e a baseline já entregue. Ele não implementa as features futuras.

## Pré-requisitos

- Node.js 22 e PNPM 10.
- Dependências do workspace instaladas.
- Repositório na raiz do projeto.

## 1. Validar a fundação existente

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

**Expected**: todos os comandos terminam com código zero. Falhas existentes fora dos artefatos desta feature devem ser registradas, não mascaradas.

## 2. Demonstrar determinismo e lifecycle atual

Use um diretório temporário para não alterar dados de trabalho:

```bash
GRINTA_SIMULATOR_DATA_DIR=/tmp/grinta-roadmap-validation pnpm simulator world:create --seed roadmap-001 --start-date 2026-01-01
```

Capture o `worldId` retornado e execute:

```bash
GRINTA_SIMULATOR_DATA_DIR=/tmp/grinta-roadmap-validation pnpm simulator world:genesis --world <worldId>
GRINTA_SIMULATOR_DATA_DIR=/tmp/grinta-roadmap-validation pnpm simulator world:activate --world <worldId>
GRINTA_SIMULATOR_DATA_DIR=/tmp/grinta-roadmap-validation pnpm simulator day:simulate --world <worldId> --days 7
GRINTA_SIMULATOR_DATA_DIR=/tmp/grinta-roadmap-validation pnpm simulator players:summary --world <worldId>
```

**Expected**: o mundo nasce com seed/ruleset imutáveis, a gênese cria 16 clubes e 368 jogadores, a ativação inicializa scheduler/lifecycle e sete dias são processados sem duplicar checkpoints.

## 3. Validar completude do catálogo

Execute os validadores canônicos:

```bash
node scripts/roadmap/validate-feature-index.mjs --index specs/001-game-delivery-roadmap/contracts/feature-index.yaml --schema specs/001-game-delivery-roadmap/contracts/feature-index.schema.json
node scripts/roadmap/validate-dependency-graph.mjs --graph specs/001-game-delivery-roadmap/contracts/dependency-graph.yaml
node scripts/roadmap/validate-coverage.mjs --index specs/001-game-delivery-roadmap/contracts/feature-index.yaml --source-map specs/001-game-delivery-roadmap/contracts/source-map.md
node scripts/roadmap/validate-evidence.mjs --registry specs/001-game-delivery-roadmap/contracts/evidence-registry.yaml --root .
```

**Expected**:

```text
34 features válidas conforme o schema.
Grafo acíclico válido: 34 nós, 163 arestas.
Cobertura válida: 34 features, 12 bounded contexts, 3 concerns e 16 golden paths.
ERROR: Evidence validation FAIL (37):
```

Os três primeiros comandos devem sair com zero. Enquanto as features futuras não estiverem implementadas, o validador de evidências deve sair com 1 e manter a decisão agregada em `NO-GO`; hoje somente FND-001 tem evidência efetiva completa. Esse resultado é o gate funcionando, não uma falha da infraestrutura. Evidência ausente, inválida ou obsoleta nunca é convertida implicitamente em `PASS`.

Abra [contracts/feature-catalog.md](contracts/feature-catalog.md) e confirme:

1. existem BC-001…BC-012;
2. existem X-001…X-003;
3. existem GP-001…GP-016;
4. FND-001, VAL-001 e OPS-001 cobrem fundação, calibração e produção;
5. cada linha declara estado, dependências, saída e fonte.

**Expected**: 34 features rastreáveis e nenhuma lacuna nas contagens acima.

## 4. Validar o grafo

Percorra as dependências da tabela e do DAG resumido.

**Expected**:

- nenhuma feature depende dela mesma;
- não há caminho que retorne ao nó de origem;
- interfaces dependem dos contratos autoritativos;
- feedback de partida, mercado e economia volta por evento/saga;
- `OPS-001` é terminal e depende de evidência, não apenas código.

## 5. Validar rastreabilidade dos fluxos

Para cada GP-001…GP-016, confira a seção homônima de `docs/01-game-design/15-fluxos-completos.md` e os critérios relacionados em `docs/02-tecnico/17-criterios-de-aceite-e-bandas.md`.

**Expected**: cada golden path tem owners de contexto, dependências e uma evidência de saída sem duplicar ownership.

## 6. Gate antes de produção

Quando `VAL-001` for implementada, executar os lotes com seeds fixas:

- aproximadamente 10.000 partidas por cenário;
- pelo menos 1.000 mundos por 10 temporadas;
- extensões de 50 e 100 temporadas;
- restore isolado e exercício regional medidos.

**Expected**: G1–G8 verdes em conjunto, `resultHash` reproduzido em 100%, residual do ledger igual a zero, nenhuma `INV-1..INV-37` violada e nenhuma banda/regressão fora do alvo. Sem essa evidência, a versão permanece não promovível.
