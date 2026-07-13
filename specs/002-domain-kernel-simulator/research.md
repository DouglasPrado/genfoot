# Research: Domain Kernel e simulador determinístico

## Decision 1 — Ownership

**Decision**: Fundação compartilhada é o único owner das escritas descritas no escopo.  
**Rationale**: preserva o context map e elimina transações distribuídas.  
**Alternatives considered**: tabelas compartilhadas e escrita direta por consumers; rejeitadas por acoplamento e ambiguidade.

## Decision 2 — Determinismo e versão

**Decision**: todo comportamento temporal ou aleatório recebe data lógica, seed/stream e `rulesetVersion` explícitos.  
**Rationale**: permite replay, auditoria e comparação de cenários.  
**Alternatives considered**: relógio/RNG global e recalcular histórico com regra atual; rejeitados.

## Decision 3 — Persistência e concorrência

**Decision**: optimistic concurrency no aggregate, chave idempotente por operação, commit local com outbox e checkpoint para workflow longo.  
**Rationale**: retry seguro e isolamento por mundo sem lock distribuído no domínio.  
**Alternatives considered**: transação entre contextos e last-write-wins; rejeitados.

## Decision 4 — Estado atual

**Decision**: preservar o status DELIVERED; somente evidência reproduzível altera a classificação.  
**Rationale**: Testes em `packages/shared/tests`, `packages/core/tests` e `apps/simulator/tests`; `pnpm test`, `pnpm typecheck` e smoke do CLI. O status entregue refere-se somente a este escopo.  
**Alternatives considered**: considerar documentação ou modelo de dados como entrega; rejeitado.

## Resolution

Stack, ownership, integração, persistência, compatibilidade e validação estão decididos para geração de tarefas.
