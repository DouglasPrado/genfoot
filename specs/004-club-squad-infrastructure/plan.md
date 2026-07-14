# Implementation Plan: Clube, elenco e infraestrutura

**Feature**: [spec.md](spec.md) · **ID**: BC-003 · **Status**: DELIVERED · **Date**: 2026-07-13

**Directory**: `specs/004-club-squad-infrastructure` · **Branch**: pacote de design do roadmap mestre

## Summary

Entregar Club, Squad, departamentos, estádio, peças de infraestrutura, comercial, diretoria, manutenção e projetos, preservando ownership de C3 · Clube/Estrutura, determinismo, idempotência e compatibilidade histórica.

## Technical Context

- **Language/runtime**: TypeScript 5.x, Node.js 22, PNPM/Turborepo.
- **Domain/application**: módulos puros em `packages/core`; tipos compartilhados mínimos em `packages/shared`.
- **Storage**: portas de repositório no core; JSON apenas no simulador; PostgreSQL/Prisma nos adapters definitivos.
- **Integration**: commands/queries tipados e eventos versionados via X-002; sem escrita cruzada.
- **Testing**: Vitest para unidade, propriedade, contrato, integração e replay.
- **Performance**: processamento determinístico em lote por mundo, sem I/O dentro do kernel.
- **Scale**: isolamento por `worldId`, workers concorrentes e retomada por checkpoint.
- **Current vs target**: O escopo autoritativo C3 está entregue: clubes/elencos determinísticos, gestão versionada e idempotente, manutenção e projetos SAGA-04 recuperáveis. Efeitos financeiros, licenciamento competitivo e transporte durável permanecem atrás das portas de C9, C7 e X-002.

## Constitution Check

A constituição permanece placeholder; aplicam-se somente gates ratificados em `docs/`: domínio puro, determinismo/replay, idempotência, owner único, isolamento por mundo, ruleset versionado, dinheiro inteiro em C9 e clientes não autoritativos. **Pre-design: PASS documental**; promoção depende das evidências listadas abaixo.

## Project Structure

```text
specs/004-club-squad-infrastructure/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
└── checklists/requirements.md

criar módulos C3 em `packages/core/src/clubs/**` (domínio/aplicação) e adapters de persistência; testes em `packages/core/tests/clubs/**` e contratos SAGA-04
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

**Evidence**: [evidência de implementação](validation/implementation-evidence.md) e [relatório do quickstart](validation/quickstart-report.md) registram 87 testes, gates completos, replay/idempotência, concorrência, recuperação da SAGA-04 e compatibilidade do snapshot v6.

Rollback desativa novos handlers por feature flag, preserva eventos/fatos e reprocessa projeções; migração destrutiva e reinterpretação histórica são proibidas.

## Post-design Constitution Check

| Gate                                  | Result                     |
| ------------------------------------- | -------------------------- |
| Domínio puro e owner único            | PASS no desenho e execução |
| Determinismo, ruleset e isolamento    | PASS no desenho e execução |
| Idempotência, retry e compatibilidade | PASS no desenho e execução |
| Evidência de implementação            | PASS para o escopo C3      |

## Complexity Tracking

Nenhuma violação arquitetural foi aceita. Complexidade de saga/eventing permanece em X-002 e no workflow canônico, não nos aggregates consumidores.
