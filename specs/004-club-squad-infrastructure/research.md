# Research: Clube, elenco e infraestrutura

## Decision 1 — Ownership

**Decision**: C3 · Clube/Estrutura é o único owner das escritas descritas no escopo.  
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

## Decision 4 — Persistência inicial

**Decision**: persistir um `WorldClubPortfolio` schema v1 no envelope JSON v6 e fazer bootstrap determinístico a partir da gênese existente.  
**Rationale**: mantém compatibilidade v1–v5, evita duplicar a gênese e oferece uma revisão única para escrita atômica no adapter atual.  
**Alternatives considered**: alterar retroativamente a gênese e usar um arquivo por aggregate; rejeitadas por reinterpretação histórica e atomicidade insuficiente no simulador.

## Decision 5 — SAGA-04

**Decision**: implementar os cinco passos canônicos como process manager C3, persistindo cada checkpoint; C9 e licenciamento entram por ports idempotentes.  
**Rationale**: prova recovery, fencing e compensação sem conceder a C3 autoridade sobre dinheiro ou inscrição competitiva.  
**Alternatives considered**: simular saldo dentro do clube e concluir a obra numa única transação; rejeitadas por ownership e ausência de espera temporal.

## Decision 6 — Limites e manutenção

**Decision**: níveis 1–10, condição 0–100, squad inicial/capacidade 23 e deterioração determinística mensal por dia lógico. Valores ficam explícitos no snapshot/ruleset e podem evoluir aditivamente.  
**Rationale**: produz invariantes testáveis e replay sem relógio global.  
**Alternatives considered**: limites implícitos e deterioração aleatória; rejeitados por ambiguidade e replay.

## Decision 7 — Simulator evidence boundary

**Decision**: expose synthetic C9 financing and licensing only behind explicit `--approve-all`; persist their immutable references as if returned by real ports.
**Rationale**: makes restart, recovery and compensation executable while keeping money and competition ownership outside C3.
**Alternatives considered**: silently approving external steps or embedding a balance in Club; rejected because they would overstate delivery and violate ownership.

## Resolution

Stack, ownership, integração, persistência, compatibilidade e validação estão decididos para geração de tarefas.
