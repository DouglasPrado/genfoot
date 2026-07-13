# Implementation Plan: Programa completo de entrega do Grinta

**Branch**: `001-game-delivery-roadmap` | **Date**: 2026-07-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-game-delivery-roadmap/spec.md`

## Summary

Transformar a baseline canônica do Grinta em um portfólio executável de 34 features: fundação, 12 bounded contexts, 3 concerns transversais, 16 golden paths e gates explícitos de calibração/operação. A execução preserva as quatro fundações já entregues e segue domain-first: fechar temporadas no simulador headless, validar longos horizontes, materializar persistência/eventing autoritativos e somente então concluir API, mobile, admin e promoção para produção.

## Technical Context

**Language/Version**: TypeScript 5.7.3, Node.js `>=22 <23`, ESM/NodeNext, PNPM 10.33.2

**Primary Dependencies**: atuais — Vitest 3.2, tsup 8.5, Commander 14, Zod 3.25, UUID 11, Turborepo 2.5; alvo ratificado — NestJS, PostgreSQL/Prisma, Redis/BullMQ, Socket.IO, Expo/React Native, Next.js 15/React 19, OpenTelemetry/Prometheus/Grafana/Loki/Tempo

**Storage**: atual — snapshots JSON versionados e atômicos para o simulador; alvo — PostgreSQL como fonte de verdade, Prisma como mapper, SQL/migrations para constraints avançadas, Redis somente para cache/filas/presença e R2 para objetos/backups/arquivo frio

**Testing**: Vitest para unitários, propriedades, invariantes e golden replay; integração com serviços reais em contêineres; concorrência, recuperação, E2E, carga, segurança e DR conforme o marco

**Target Platform**: núcleo headless e processos Linux/containers; app do jogador Android/iOS via Expo; admin web via Next.js

**Project Type**: monorepo de monólito modular com CLI, API, workers, gateway realtime, app mobile e admin web

**Performance Goals**: referência de 32 clubes/2 divisões, 1.536 jogadores, ~515 partidas e ~50 mil ticks por temporada; rodada em menos de 1 s de CPU em lote; gateway com teto brando ~10.000 sockets/instância e escala em ~70%; 20–30 temporadas sem corrupção no marco headless

**Constraints**: determinismo bit a bit; dinheiro em unidade mínima inteira e escalas fixed-point; zero escrita cruzada; isolamento por mundo; `AT_LEAST_ONCE` + idempotência; ledger com residual zero; cliente não autoritativo; G1–G8 conjuntivos; RPO/RTO e restore medidos antes de produção

**Scale/Scope**: 34 features, 12 bounded contexts, 3 concerns, 16 golden paths, 138 telas mapeadas, evolução de single-host para escala horizontal/sharding somente por gatilhos medidos

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

O arquivo `.specify/memory/constitution.md` ainda contém somente placeholders e não define princípios ratificados. Portanto, não há gate constitucional formal que possa ser violado ou aprovado. O plano não preenche essa lacuna implicitamente.

Como gates de projeto já ratificados em `docs/`, este plano aplica:

- domínio puro sem dependência de infraestrutura ou clientes;
- determinismo, replay, idempotência e versionamento desde a fundação;
- ownership único de escrita e integração por contratos/eventos;
- headless antes de persistência definitiva e clientes;
- testes de propriedades/invariantes e gate G1–G8 antes de promoção;
- nenhuma decisão documental nova implícita.

**Pre-design result**: PASS. Nenhuma violação; ausência da constituição substantiva registrada como risco de governança, não ocultada.

## Project Structure

### Documentation (this feature)

```text
specs/001-game-delivery-roadmap/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── feature-catalog.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
apps/
├── simulator/              # atual: CLI headless e adapter JSON
├── guide/                  # atual: guia estático
├── api/                    # alvo: commands, queries e auth
├── mobile/                 # alvo: Expo/React Native
├── admin/                  # alvo: Next.js operacional
├── realtime-gateway/       # alvo: Socket.IO, presença e sequência
├── world-scheduler/        # alvo: relógios e leases por mundo
├── simulation-worker/      # alvo: partidas e lotes
├── async-worker/           # alvo: sagas e jobs gerais
└── notification-worker/    # alvo: entregas e digests

packages/
├── shared/                 # atual: tipos/value objects transversais
├── core/                   # atual/alvo: domínio headless e casos de uso
├── database/               # alvo: Prisma/PostgreSQL e adapters
├── contracts/              # alvo: commands, queries, eventos e erros
└── ui/                     # alvo: tokens/componentes compartilhados

prisma/
└── schema.prisma           # scaffold físico pré-migration

docs/                       # baseline funcional, técnica e UI/UX canônica
```

**Structure Decision**: Manter o monorepo e expandi-lo conforme a topologia ratificada. `packages/core` não importa frameworks, banco, broker ou UI; aplicações e workers chamam casos de uso por portas públicas. O schema Prisma atual permanece scaffold até DB-01…DB-16 e os testes longos liberarem migrations.

## Phase 0 — Research outcome

As decisões e alternativas estão consolidadas em [research.md](research.md). Todos os pontos técnicos necessários ao plano foram resolvidos; não há `NEEDS CLARIFICATION` remanescente.

Principais decisões: portfólio em duas camadas (capacidade + golden paths), núcleo headless, preservação das fundações entregues, monólito modular, persistência híbrida, sagas idempotentes, único kernel de partida, ledger conservativo, IA pelos mesmos commands, clientes não autoritativos e promoção absoluta por G1–G8.

## Phase 1 — Design outcome

- [data-model.md](data-model.md) define Feature, Dependency, Milestone, Evidence, CanonicalSource, CoverageLink e QualityGate.
- [contracts/feature-catalog.md](contracts/feature-catalog.md) registra 34 features, estados, dependências, marcos, fontes e saídas.
- [quickstart.md](quickstart.md) define validação reproduzível do plano e da fundação atual.

## Delivery strategy

### M0 — Consolidar a fundação existente

Congelar contratos já verdes e completar as lacunas explicitamente parciais de mundo, clubes, jogadores, competição e eventing sem reimplementar o que existe.

### M1 — Fechar o universo headless

Implementar staff, clubes/estruturas, lifecycle completo, competições, partida, ledger, mercado e IA. Depois executar virada completa e simulação longa. O marco sai apenas quando o mesmo universo pode avançar ao menos 20 temporadas sem corrupção, com classificação, demografia e dinheiro reconciliados.

### M2 — Tornar o backend autoritativo e multiplayer

Materializar PostgreSQL/Prisma, Outbox/Inbox/DLQ, sagas, projeções, identidade/controle de clube, narrativa, relatórios, anti-abuso e administração. Congelar commands/queries/eventos/erros antes da integração final dos clientes.

### M3 — Entregar o MVP jogável

Construir o app Expo e o admin Next.js sobre contratos comuns. Validar GP-001…GP-016 ponta a ponta, estados de tela, offline permitido, realtime recuperável e acessibilidade.

### M4 — Promover com evidência

Executar lotes R-34/R-88, carga, segurança, privacidade, restore e DR. Instrumentar SLOs e rollback. Produção só é autorizada quando G1–G8 estiverem simultaneamente verdes.

## Safe parallelism

- Após contratos de fundação: Clube/Staff e Jogador podem avançar em paralelo; Competição pode evoluir formatos/fixtures enquanto Jogador completa lifecycle.
- Após ledger e saga kernel: Mercado/Contratos e Infraestrutura/Comercial podem avançar em paralelo.
- IA, Identidade e consumidores de Narrativa/Relatórios podem avançar por fatias quando commands/eventos correspondentes estiverem congelados.
- API read-side e protótipos dos clientes podem usar contratos congelados, mas integração autoritativa e estado de conclusão dependem do gate headless.

## Post-design Constitution Check

**Result**: PASS com a mesma ressalva de governança: a constituição permanece placeholder.

O desenho mantém domínio isolado, ordem headless-first, DAG sem ciclos, ownership único, clientes não autoritativos e evidência bloqueante. Não há exceções de complexidade a justificar; workers e clientes adicionais correspondem à topologia canônica e só entram nos marcos que precisam deles.

## Complexity Tracking

Nenhuma violação constitucional ou exceção arquitetural foi introduzida.
