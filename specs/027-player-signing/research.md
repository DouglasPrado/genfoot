# Research: Contratação de jogador

## Decision 1 — Golden path como convergência

**Decision**: GP-008 não cria estado oficial. Ele coordena e comprova identificar necessidade → observar/comparar → consultar disponibilidade → negociar oferta → reservar recursos → negociar contrato → realizar exame → validar integridade → assinar/registrar/liquidar → inscrever → integrar, preservando C6 possui scouting/negociação/contrato; C4 exame; C7 inscrição; C9 reserva/liquidação; X-002 orquestra SAGA-01; X-003 apresenta.

**Rationale**: o blueprint exige um único owner por aggregate; transformar a jornada em domínio duplicaria regras.

**Alternatives considered**: um “serviço GP-008” com banco próprio foi rejeitado por escrita cruzada; orquestração no cliente foi rejeitada por falta de autoridade.

## Decision 2 — Contratos e retomada

**Decision**: intents têm identidade, mundo, ator, versão esperada e idempotency key; queries expõem etapa/sequence; falhas usam retry ou compensação conforme o owner e SAGA-01, R-26 e R-94.

**Rationale**: a jornada cruza BC-004, BC-006, BC-007, BC-009, X-002 e X-003 e precisa sobreviver a respostas perdidas, concorrência e entrega pelo menos uma vez.

**Alternatives considered**: transação distribuída e rollback de fatos consumados foram rejeitados; efeitos posteriores usam saga/eventos.

## Decision 3 — Evidência e estado

**Decision**: manter PLANNED. Evidência atual: nenhuma fatia executável da contratação está entregue. Conclusão exige contrato, integração e cenário E2E descrito no quickstart.

**Rationale**: documentação e metas não equivalem a execução; estados do catálogo só mudam com prova reproduzível.

**Alternatives considered**: marcar o fluxo entregue por possuir etapas documentadas ou uma fundação parcial foi rejeitado.
