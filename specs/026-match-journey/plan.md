# Implementation Plan: Preparação e partida

**Feature**: GP-007  
**Directory**: `specs/026-match-journey`  
**Date**: 2026-07-13  
**Status**: PLANNED  
**Spec**: [spec.md](spec.md)

## Summary

Entregar executar a mesma partida autoritativa em modo ao vivo, offline, automático e replay, da preparação ao relatório pós-jogo. A integração usa contracts oficiais e projeção de jornada; cada escrita permanece com seu bounded context.

## Technical Context

**Language/Runtime**: TypeScript 5.7, Node.js 22, ESM.  
**Dependencies**: casos de uso e contratos de BC-004, BC-005, BC-007, BC-008, X-001, X-002 e X-003; Vitest; eventing/saga quando aplicável.  
**Storage**: nenhum storage autoritativo próprio; read models reconstruíveis e checkpoints pertencem a X-002/C2 quando aplicável.  
**Testing**: contrato, integração, idempotência, concorrência, falha/retomada e E2E.  
**Platform**: core/API/workers autoritativos e clientes Expo/Next.js não autoritativos.  
**Performance**: resposta de command assíncrona rastreável; nenhuma espera bloqueante entre contexts; budgets específicos permanecem com cada owner.  
**Constraints**: ownership único, isolamento por mundo, ruleset versionado, at-least-once seguro e histórico.  
**Scale**: uma instância correlaciona BC-004, BC-005, BC-007, BC-008, X-001, X-002 e X-003; múltiplas instâncias/mundos podem avançar concorrentemente.  
**Current vs target**: nenhuma implementação do runtime autoritativo está entregue; alvo é mesma seed, ruleset, manifesto e command log produzem o mesmo hash/result em todos os modos e um único fan-out oficial.

## Constitution Check

A constituição permanece placeholder. Aplicam-se somente gates ratificados em `docs/`: domínio puro, determinismo, idempotência, ownership único, isolamento, cliente não autoritativo e evidência positiva.

**Pre-design result**: PASS para planejamento; implementação permanece bloqueada pelas dependências e evidências descritas.

## Project Structure

```text
specs/026-match-journey/
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

**Structure decision**: não criar módulo de domínio `match-journey`; compor portas públicas dos owners e uma projeção E2E.

## Phase 0 — Research outcome

[research.md](research.md) fixa três decisões: golden path sem ownership, retry/compensação por contratos e estado PLANNED sustentado apenas por evidência existente. Não restam clarificações.

## Phase 1 — Design outcome

- [data-model.md](data-model.md): projeções/referências, invariantes e transições.
- [contracts/README.md](contracts/README.md): `SetMatchLineup`, `SetMatchTacticalPlan`, `SubmitMatchCommand`, `StartMatch`, `FinalizeMatch` (C8); `GetMatchPreparation`, `GetLiveMatchState`, `GetMatchDecisionPoint`, `GetPostMatchReport`; `MatchStarted`, `MatchDecisionPointOpened`, `MatchFinished`, `MatchResultHomologated`.
- [quickstart.md](quickstart.md): caminho feliz, retry, falha/retomada e isolamento.

Não há migration própria. Mudanças de contratos são versionadas; projeções podem ser reconstruídas.

## Delivery Strategy & Evidence

1. Congelar envelopes e erros dos owners em BC-004, BC-005, BC-007, BC-008, X-001, X-002 e X-003.
2. Implementar caminho feliz como composição, sem escrita cruzada.
3. Adicionar idempotência, concorrência, resync e compensações.
4. Materializar projeções e estados de UI.
5. Executar o quickstart e registrar evidência por revisão/seed/ruleset.

Contratos podem evoluir em paralelo nos owners; integração começa somente após freeze. Rollback desativa novos dispatches e retoma instâncias por contrato antigo/checkpoint, sem apagar fatos.

**Evidence required**: testes de contrato por owner, integração entre fronteiras, E2E do fluxo, testes de retry/concorrência e trace de ownership. Nenhuma alegação de entrega ocorre antes dessas provas.

## Post-design Constitution Check

**Result**: PASS para o design. Não há aggregate duplicado, escrita por cliente/IA ou transação distribuída. Ausência de evidência continua bloqueante para entrega.

## Complexity Tracking

Nenhuma exceção arquitetural introduzida.
