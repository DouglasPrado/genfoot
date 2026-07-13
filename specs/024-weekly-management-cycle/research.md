# Research: Ciclo semanal de gestão

## Decision 1 — Golden path como convergência

**Decision**: GP-005 não cria estado oficial. Ele coordena e comprova abrir Central → revisar urgências/agenda → avaliar elenco → ajustar treino → tratar mercado/contratos → revisar finanças/estrutura → preparar partida → definir delegação → acompanhar resultado → revisar pós-jogo, preservando C2 coordena tempo; C3…C11 escrevem somente seus aggregates; X-001 usa commands normais; X-003 apresenta read models.

**Rationale**: o blueprint exige um único owner por aggregate; transformar a jornada em domínio duplicaria regras.

**Alternatives considered**: um “serviço GP-005” com banco próprio foi rejeitado por escrita cruzada; orquestração no cliente foi rejeitada por falta de autoridade.

## Decision 2 — Contratos e retomada

**Decision**: intents têm identidade, mundo, ator, versão esperada e idempotency key; queries expõem etapa/sequence; falhas usam retry ou compensação conforme o owner e R-94 e invariantes aplicáveis a cada command de domínio.

**Rationale**: a jornada cruza BC-002, BC-003, BC-004, BC-005, BC-006, BC-007, BC-008, BC-009, BC-010, BC-011, X-001 e X-003 e precisa sobreviver a respostas perdidas, concorrência e entrega pelo menos uma vez.

**Alternatives considered**: transação distribuída e rollback de fatos consumados foram rejeitados; efeitos posteriores usam saga/eventos.

## Decision 3 — Evidência e estado

**Decision**: manter PARTIAL. Evidência atual: avanço diário e lifecycle básico existem; Central e integrações de gestão/partida ainda faltam. Conclusão exige contrato, integração e cenário E2E descrito no quickstart.

**Rationale**: documentação e metas não equivalem a execução; estados do catálogo só mudam com prova reproduzível.

**Alternatives considered**: marcar o fluxo entregue por possuir etapas documentadas ou uma fundação parcial foi rejeitado.
