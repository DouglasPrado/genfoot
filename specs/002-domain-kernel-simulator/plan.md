# Implementation Plan: Domain Kernel e simulador determinístico

**Feature**: [spec.md](spec.md) · **ID**: FND-001 · **Status**: DELIVERED · **Date**: 2026-07-13

**Directory**: `specs/002-domain-kernel-simulator` · **Branch**: pacote de design do roadmap mestre

## Summary

Entregar IDs e datas de domínio, `Result`/erros, eventos, `RulesetVersion`, PCG32, UUIDv7 determinístico, gênese, snapshot JSON e CLI, preservando ownership de Fundação compartilhada, determinismo, idempotência e compatibilidade histórica.

## Technical Context

- **Language/runtime**: TypeScript 5.x, Node.js 22, PNPM/Turborepo.
- **Domain/application**: módulos puros em `packages/core`; tipos compartilhados mínimos em `packages/shared`.
- **Storage**: portas de repositório no core; JSON apenas no simulador; PostgreSQL/Prisma nos adapters definitivos.
- **Integration**: commands/queries tipados e eventos versionados via X-002; sem escrita cruzada.
- **Testing**: Vitest para unidade, propriedade, contrato, integração e replay.
- **Performance**: processamento determinístico em lote por mundo, sem I/O dentro do kernel.
- **Scale**: isolamento por `worldId`, workers concorrentes e retomada por checkpoint.
- **Current vs target**: Implementado em `packages/shared`, `packages/core` e `apps/simulator`, coberto pela suíte local. Preservar compatibilidade, determinismo e leitura histórica enquanto features posteriores evoluem.

## Constitution Check

A constituição permanece placeholder; aplicam-se somente gates ratificados em `docs/`: domínio puro, determinismo/replay, idempotência, owner único, isolamento por mundo, ruleset versionado, dinheiro inteiro em C9 e clientes não autoritativos. **Pre-design: PASS documental**; promoção depende das evidências listadas abaixo.

## Project Structure

```text
specs/002-domain-kernel-simulator/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
└── checklists/requirements.md

`packages/shared/src/**`, `packages/core/src/{foundation,genesis,world,scheduling,players}/**`, `apps/simulator/src/**`; testes homônimos em cada pacote
```

Domínio não importa Prisma, transporte ou filesystem. Aplicação depende de portas; adapters traduzem persistência e mensageria.

## Phase 0 — Research Outcome

[research.md](research.md) fixa ownership, persistência, integração e determinismo. Alternativas que duplicavam estado ou misturavam framework ao domínio foram descartadas.

## Phase 1 — Design Outcome

[data-model.md](data-model.md) define aggregates e transições; [contracts/README.md](contracts/README.md) define comandos, consultas, eventos e falhas; [quickstart.md](quickstart.md) prova os cenários. Mudanças persistidas usam schema versionado, migração progressiva e leitura compatível antes de remover versão antiga.

## Delivery Strategy & Evidence

1. Congelar IDs, schemas e invariantes do contrato.
2. Implementar aggregate e casos de uso P1 com testes de unidade/propriedade.
3. Adicionar adapter persistente, outbox/idempotência e testes de concorrência.
4. Implementar P2, replay/recuperação e smoke E2E.

**Freeze point**: nomes/versionamento de commands e eventos antes dos adapters consumidores.

**Evidence**: Testes em `packages/shared/tests`, `packages/core/tests` e `apps/simulator/tests`; `pnpm test`, `pnpm typecheck` e smoke do CLI. O status entregue refere-se somente a este escopo.

Rollback desativa novos handlers por feature flag, preserva eventos/fatos e reprocessa projeções; migração destrutiva e reinterpretação histórica são proibidas.

## Post-design Constitution Check

| Gate                                  | Result                       |
| ------------------------------------- | ---------------------------- |
| Domínio puro e owner único            | PASS no desenho              |
| Determinismo, ruleset e isolamento    | PASS no desenho              |
| Idempotência, retry e compatibilidade | PASS no desenho              |
| Evidência de implementação            | PASS para o escopo declarado |

## Complexity Tracking

Nenhuma violação arquitetural foi aceita. Complexidade de saga/eventing permanece em X-002 e no workflow canônico, não nos aggregates consumidores.
