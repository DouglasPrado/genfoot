# Research: Mundo, temporadas e scheduler

## Decision 1 — Ownership

**Decision**: C2 · Mundo/Temporada é o único owner das escritas descritas no escopo.  
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

**Decision**: preservar o status PARTIAL; somente evidência reproduzível altera a classificação.  
**Rationale**: Já reproduzível: testes de mundo/scheduler e smoke do simulador. Pendente: janelas, rollover completo, concorrência multiworker e recuperação após falha.  
**Alternatives considered**: considerar documentação ou modelo de dados como entrega; rejeitado.

## Resolution

Stack, ownership, integração, persistência, compatibilidade e validação estão decididos para geração de tarefas.

## Decision 5 — Receipt no scheduler

**Decision**: C2 persiste `WorldCommandReceipt` por `(worldId, idempotencyKey)` junto ao scheduler.  
**Rationale**: retry pode devolver a resposta original sem avançar o relógio novamente.  
**Alternatives considered**: deduplicação apenas no caller; rejeitada porque timeout perde a autoridade sobre o resultado.

## Decision 6 — Janelas como configuração histórica

**Decision**: janelas são snapshots com limites inclusivos, ruleset e config version explícitos.  
**Rationale**: calendário histórico não pode ser reinterpretado após tuning.  
**Alternatives considered**: calcular janelas com a configuração atual; rejeitada por quebrar replay.

## Decision 7 — SAGA-02 forward-only

**Decision**: os 20 passos canônicos são cursor linear persistido; depois do passo 17, três invariantes bloqueiam os passos 18–20.  
**Rationale**: impede prêmio duplicado, safra duplicada e temporada parcialmente arquivada.  
**Alternatives considered**: rollback global ou lista dinâmica de passos; rejeitados por apagar fatos e permitir mudança silenciosa de ordem.

## Decision 8 — Ports para owners externos

**Decision**: C2 chama handlers tipados com idempotency key/fencing e só grava checkpoint/evidência.  
**Rationale**: preserva ownership; os testes e o simulador podem usar handlers controlados sem escrever aggregates externos.  
**Alternatives considered**: implementar regras C3–C11 dentro do scheduler; rejeitada como escrita cruzada.
