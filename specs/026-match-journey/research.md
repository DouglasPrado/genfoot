# Research: Preparação e partida

## Decision 1 — Golden path como convergência

**Decision**: GP-007 não cria estado oficial. Ele coordena e comprova agendar → preparar dossiê/treino/logística → definir escalação/tática/delegação → validar elegibilidade → congelar kickoff → simular ticks/decisões → finalizar resultado → homologar → aplicar fan-out e relatório, preservando C8 possui runtime/resultado; C4 possui saúde/desenvolvimento; C5 staff; C7 elegibilidade/homologação; concerns só decidem, transportam e apresentam.

**Rationale**: o blueprint exige um único owner por aggregate; transformar a jornada em domínio duplicaria regras.

**Alternatives considered**: um “serviço GP-007” com banco próprio foi rejeitado por escrita cruzada; orquestração no cliente foi rejeitada por falta de autoridade.

## Decision 2 — Contratos e retomada

**Decision**: intents têm identidade, mundo, ator, versão esperada e idempotency key; queries expõem etapa/sequence; falhas usam retry ou compensação conforme o owner e R-34, R-94, F1–F21 e INV-27…INV-33.

**Rationale**: a jornada cruza BC-004, BC-005, BC-007, BC-008, X-001, X-002 e X-003 e precisa sobreviver a respostas perdidas, concorrência e entrega pelo menos uma vez.

**Alternatives considered**: transação distribuída e rollback de fatos consumados foram rejeitados; efeitos posteriores usam saga/eventos.

## Decision 3 — Evidência e estado

**Decision**: manter PLANNED. Evidência atual: nenhuma implementação do runtime autoritativo está entregue. Conclusão exige contrato, integração e cenário E2E descrito no quickstart.

**Rationale**: documentação e metas não equivalem a execução; estados do catálogo só mudam com prova reproduzível.

**Alternatives considered**: marcar o fluxo entregue por possuir etapas documentadas ou uma fundação parcial foi rejeitado.
