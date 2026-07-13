# Research: Retorno após ausência longa

## Decision 1 — Golden path como convergência

**Decision**: GP-002 não cria estado oficial. Ele coordena e comprova detectar ausência → concluir catch-up → consolidar mudanças do mundo/clube → separar decisões automáticas e prazos → priorizar ações → retomar controle, preservando C2 possui relógio e catch-up; C11 possui resumo/notificações; X-001 emite decisões normais; X-003 apenas apresenta.

**Rationale**: o blueprint exige um único owner por aggregate; transformar a jornada em domínio duplicaria regras.

**Alternatives considered**: um “serviço GP-002” com banco próprio foi rejeitado por escrita cruzada; orquestração no cliente foi rejeitada por falta de autoridade.

## Decision 2 — Contratos e retomada

**Decision**: intents têm identidade, mundo, ator, versão esperada e idempotency key; queries expõem etapa/sequence; falhas usam retry ou compensação conforme o owner e R-94 e INV-27…INV-31.

**Rationale**: a jornada cruza BC-002, BC-011, X-001 e X-003 e precisa sobreviver a respostas perdidas, concorrência e entrega pelo menos uma vez.

**Alternatives considered**: transação distribuída e rollback de fatos consumados foram rejeitados; efeitos posteriores usam saga/eventos.

## Decision 3 — Evidência e estado

**Decision**: manter PARTIAL. Evidência atual: scheduler persistente e catch-up temporal idempotente existem; resumo, IA explicável e cliente ainda faltam. Conclusão exige contrato, integração e cenário E2E descrito no quickstart.

**Rationale**: documentação e metas não equivalem a execução; estados do catálogo só mudam com prova reproduzível.

**Alternatives considered**: marcar o fluxo entregue por possuir etapas documentadas ou uma fundação parcial foi rejeitado.
