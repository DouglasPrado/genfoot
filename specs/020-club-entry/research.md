# Research: Criação e entrada em clube

## Decision 1 — Golden path como convergência

**Decision**: GP-001 não cria estado oficial. Ele coordena e comprova selecionar mundo → verificar elegibilidade/vagas → inspecionar clube → reservar vaga com TTL → ativar controle → concluir revisão inicial, preservando C1 controla conta, reserva e vínculo; C3 conserva o clube; C12 avalia risco; X-003 apenas apresenta.

**Rationale**: o blueprint exige um único owner por aggregate; transformar a jornada em domínio duplicaria regras.

**Alternatives considered**: um “serviço GP-001” com banco próprio foi rejeitado por escrita cruzada; orquestração no cliente foi rejeitada por falta de autoridade.

## Decision 2 — Contratos e retomada

**Decision**: intents têm identidade, mundo, ator, versão esperada e idempotency key; queries expõem etapa/sequence; falhas usam retry ou compensação conforme o owner e SAGA-03, R-25 e R-94.

**Rationale**: a jornada cruza BC-001, BC-003, BC-012 e X-003 e precisa sobreviver a respostas perdidas, concorrência e entrega pelo menos uma vez.

**Alternatives considered**: transação distribuída e rollback de fatos consumados foram rejeitados; efeitos posteriores usam saga/eventos.

## Decision 3 — Evidência e estado

**Decision**: manter PLANNED. Evidência atual: nenhuma fatia executável do fluxo está entregue. Conclusão exige contrato, integração e cenário E2E descrito no quickstart.

**Rationale**: documentação e metas não equivalem a execução; estados do catálogo só mudam com prova reproduzível.

**Alternatives considered**: marcar o fluxo entregue por possuir etapas documentadas ou uma fundação parcial foi rejeitado.
