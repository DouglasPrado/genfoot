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
pnpm simulator day:simulate --world <uuid-v7> --days 1
```

Os snapshots ficam em `.grinta/simulator/worlds`. Defina `GRINTA_SIMULATOR_DATA_DIR` para usar outro diretório.

O mundo nasce em `CREATING`. Nesta fatia, o avanço pelo CLI é deliberadamente rejeitado com `WORLD_NOT_ACTIVE`: a ativação exige a futura gênese válida de 16 clubes, 16 elencos de 23 jogadores e calendário validado. O comportamento positivo do relógio já está implementado e testado no domínio.

## Qualidade

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Aleatoriedade competitiva passa por `SeededRandom`, usando PCG32 e streams derivadas de `worldSeed + context`. Não use `Math.random()` no core.
