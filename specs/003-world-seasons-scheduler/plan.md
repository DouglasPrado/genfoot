# Implementation Plan: Mundo, temporadas e scheduler

**Feature**: [spec.md](spec.md) · **ID**: BC-002 · **Status**: DELIVERED · **Date**: 2026-07-13

**Directory**: `specs/003-world-seasons-scheduler` · **Branch**: pacote de design do roadmap mestre

## Summary

Entregar mundo, relógio, configuração/ruleset ativo, janelas, Season, ScheduledTask, catch-up e rollover SAGA-02, preservando ownership de C2 · Mundo/Temporada, determinismo, idempotência e compatibilidade histórica.

## Technical Context

- **Language/runtime**: TypeScript 5.x, Node.js 22, PNPM/Turborepo.
- **Domain/application**: módulos puros em `packages/core`; tipos compartilhados mínimos em `packages/shared`.
- **Storage**: portas de repositório no core; JSON apenas no simulador; PostgreSQL/Prisma nos adapters definitivos.
- **Integration**: commands/queries tipados e eventos versionados via X-002; sem escrita cruzada.
- **Testing**: Vitest para unidade, propriedade, contrato, integração e replay.
- **Performance**: processamento determinístico em lote por mundo, sem I/O dentro do kernel.
- **Scale**: isolamento por `worldId`, workers concorrentes e retomada por checkpoint.
- **Current vs target**: o escopo C2 está entregue com janelas versionadas, receipt idempotente, persistência compatível e rollover recuperável de 20 checkpoints. Handlers internos de outros contexts permanecem fora do escopo e entram por ports públicos.

## Constitution Check

A constituição permanece placeholder; aplicam-se somente gates ratificados em `docs/`: domínio puro, determinismo/replay, idempotência, owner único, isolamento por mundo, ruleset versionado, dinheiro inteiro em C9 e clientes não autoritativos. **Pre-design: PASS documental**; promoção depende das evidências listadas abaixo.

## Project Structure

```text
specs/003-world-seasons-scheduler/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
└── checklists/requirements.md

evoluir `packages/core/src/world/**` e `packages/core/src/scheduling/**`; persistência em adapters do backend; testes em `packages/core/tests/world-scheduler.test.ts` e integração da SAGA-02
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

**Evidence**: gates completos, 72 testes e smoke executável registrados em [implementation-evidence.md](validation/implementation-evidence.md) e [quickstart-report.md](validation/quickstart-report.md). A concorrência é coberta por lease takeover e rejeição de fencing obsoleto.

Rollback desativa novos handlers por feature flag, preserva eventos/fatos e reprocessa projeções; migração destrutiva e reinterpretação histórica são proibidas.

## Post-design Constitution Check

| Gate                                  | Result                |
| ------------------------------------- | --------------------- |
| Domínio puro e owner único            | PASS no desenho       |
| Determinismo, ruleset e isolamento    | PASS no desenho       |
| Idempotência, retry e compatibilidade | PASS no desenho       |
| Evidência de implementação            | PASS para o escopo C2 |

## Complexity Tracking

Nenhuma violação arquitetural foi aceita. Complexidade de saga/eventing permanece em X-002 e no workflow canônico, não nos aggregates consumidores.
