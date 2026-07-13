# Grinta

Monorepo do Grinta, um manager de futebol com mundo persistente. A primeira fatia do backend é um núcleo headless: o domínio não depende de Prisma, Redis, HTTP ou interface.

## Requisitos

- Node.js 22
- PNPM 10.33.2

```bash
corepack enable
pnpm install
```

## Estrutura inicial

```text
apps/
  guide/       guia público estático
  simulator/   CLI e persistência JSON local
packages/
  core/        regras, RNG e World Engine
  shared/      tipos, IDs, datas e contratos básicos
```

O schema Prisma existente continua como baseline física pré-migration. API, banco, filas e workers entram em fatias posteriores.

## Simulador

Crie e inspecione um mundo local:

```bash
pnpm simulator world:create --seed grinta-001 --start-date 2026-01-01
pnpm simulator world:inspect --world <uuid-v7>
pnpm simulator world:genesis --world <uuid-v7>
pnpm simulator world:activate --world <uuid-v7>
pnpm simulator day:simulate --world <uuid-v7> --days 1
pnpm simulator scheduler:inspect --world <uuid-v7>
```

Os snapshots ficam em `.grinta/simulator/worlds`. Defina `GRINTA_SIMULATOR_DATA_DIR` para usar outro diretório.

O mundo nasce em `CREATING`. A gênese gera deterministicamente 16 clubes, 368 pessoas/jogadores, 16 elencos de 23 atletas e uma Liga Inicial de 30 rodadas. Somente depois da validação integral desses dados o comando `world:activate` libera o avanço do relógio.

A ativação também inicializa a primeira temporada e sua agenda persistente. O avanço diário processa tarefas por data, prioridade e ID, com idempotência, retry limitado, checkpoints, lease e fencing token. Operações disponíveis:

```bash
pnpm simulator scheduler:run --world <uuid-v7>
pnpm simulator scheduler:schedule --world <uuid-v7> --type <tipo> --due-on 2026-01-10 --idempotency-key <chave>
pnpm simulator scheduler:retry --world <uuid-v7> --task <uuid-v7>
pnpm simulator scheduler:cancel --world <uuid-v7> --task <uuid-v7>
```

A gênese também materializa o lifecycle autoritativo das 368 pessoas/jogadores e um evento `PlayerGenerated` por atleta. O scheduler mantém um job diário recorrente para atualizar os checkpoints e estados dinâmicos sem duplicar processamento:

```bash
pnpm simulator players:summary --world <uuid-v7>
pnpm simulator player:inspect --world <uuid-v7> --player <uuid-v7>
```

## Qualidade

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Aleatoriedade competitiva passa por `SeededRandom`, usando PCG32 e streams derivadas de `worldSeed + context`. Não use `Math.random()` no core.
