# Implementation Plan: Encerramento e virada de temporada

**Feature**: GP-006  
**Directory**: `specs/025-season-rollover`  
**Date**: 2026-07-13  
**Status**: PARTIAL  
**Spec**: [spec.md](spec.md)

## Summary

Entregar homologar e fechar a temporada, aplicar consequências em ordem e abrir a seguinte com checkpoints recuperáveis e sem efeitos duplicados. A integração usa contracts oficiais e projeção de jornada; cada escrita permanece com seu bounded context.

## Technical Context

**Language/Runtime**: TypeScript 5.7, Node.js 22, ESM.  
**Dependencies**: casos de uso e contratos de BC-002, BC-004, BC-006, BC-007, BC-008, BC-009, BC-011 e X-002; Vitest; eventing/saga quando aplicável.  
**Storage**: nenhum storage autoritativo próprio; read models reconstruíveis e checkpoints pertencem a X-002/C2 quando aplicável.  
**Testing**: contrato, integração, idempotência, concorrência, falha/retomada e E2E.  
**Platform**: core/API/workers autoritativos e clientes Expo/Next.js não autoritativos.  
**Performance**: resposta de command assíncrona rastreável; nenhuma espera bloqueante entre contexts; budgets específicos permanecem com cada owner.  
**Constraints**: ownership único, isolamento por mundo, ruleset versionado, at-least-once seguro e histórico.  
**Scale**: uma instância correlaciona BC-002, BC-004, BC-006, BC-007, BC-008, BC-009, BC-011 e X-002; múltiplas instâncias/mundos podem avançar concorrentemente.  
**Current vs target**: `SeasonDue`, scheduler, lease/fencing/retry e checkpoints básicos existem; SAGA-02 completa e domínios consumidores faltam; alvo é uma falha injetada em cada checkpoint pode ser retomada sem duplicar prêmio, promoção, aposentadoria, geração ou nova temporada.

## Constitution Check

A constituição permanece placeholder. Aplicam-se somente gates ratificados em `docs/`: domínio puro, determinismo, idempotência, ownership único, isolamento, cliente não autoritativo e evidência positiva.

**Pre-design result**: PASS para planejamento; implementação permanece bloqueada pelas dependências e evidências descritas.

## Project Structure

```text
specs/025-season-rollover/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
└── checklists/requirements.md

packages/contracts/       # envelopes compartilhados
packages/core/            # regras dos owners, sem framework
apps/api/                 # dispatch de commands/queries
apps/*-worker/            # saga/eventos e projeções
apps/mobile|admin/        # apresentação não autoritativa
scripts/e2e/              # validação da jornada
```

**Structure decision**: não criar módulo de domínio `season-rollover`; compor portas públicas dos owners e uma projeção E2E.

## Phase 0 — Research outcome

[research.md](research.md) fixa três decisões: golden path sem ownership, retry/compensação por contratos e estado PARTIAL sustentado apenas por evidência existente. Não restam clarificações.

## Phase 1 — Design outcome

- [data-model.md](data-model.md): projeções/referências, invariantes e transições.
- [contracts/README.md](contracts/README.md): `RequestSeasonRollover` e `ResumeSeasonRollover` (C2); commands de checkpoint dirigidos a C4/C6/C7/C9/C11; `GetSeasonRolloverStatus`, `GetRolloverCheckpoint`, `GetSeasonClosureReport`; `SeasonDue`, `CompetitionEditionHomologated`, `SeasonRolloverCompleted`, `SeasonStarted`.
- [quickstart.md](quickstart.md): caminho feliz, retry, falha/retomada e isolamento.

Não há migration própria. Mudanças de contratos são versionadas; projeções podem ser reconstruídas.

## Delivery Strategy & Evidence

1. Congelar envelopes e erros dos owners em BC-002, BC-004, BC-006, BC-007, BC-008, BC-009, BC-011 e X-002.
2. Implementar caminho feliz como composição, sem escrita cruzada.
3. Adicionar idempotência, concorrência, resync e compensações.
4. Materializar projeções e estados de UI.
5. Executar o quickstart e registrar evidência por revisão/seed/ruleset.

Contratos podem evoluir em paralelo nos owners; integração começa somente após freeze. Rollback desativa novos dispatches e retoma instâncias por contrato antigo/checkpoint, sem apagar fatos.

**Evidence required**: testes de contrato por owner, integração entre fronteiras, E2E do fluxo, testes de retry/concorrência e trace de ownership. A evidência parcial deve permanecer separada da prova E2E.

## Post-design Constitution Check

**Result**: PASS para o design. Não há aggregate duplicado, escrita por cliente/IA ou transação distribuída. Ausência de evidência continua bloqueante para entrega.

## Complexity Tracking

Nenhuma exceção arquitetural introduzida.
