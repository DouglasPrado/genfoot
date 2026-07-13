# Research: Encerramento e virada de temporada

## Decision 1 — Golden path como convergência

**Decision**: GP-006 não cria estado oficial. Ele coordena e comprova resolver partidas/recursos → homologar → confirmar títulos/acessos → pagar prêmios → avaliar gestão → processar contratos → aging/aposentadoria/youth → fechar economia/história → realocar divisões → criar/publicar nova temporada → abrir pré-temporada, preservando C2 orquestra SAGA-02; C4/C6/C7/C9/C11 escrevem seus estados; C8 fornece resultados; X-002 entrega/checkpointa.

**Rationale**: o blueprint exige um único owner por aggregate; transformar a jornada em domínio duplicaria regras.

**Alternatives considered**: um “serviço GP-006” com banco próprio foi rejeitado por escrita cruzada; orquestração no cliente foi rejeitada por falta de autoridade.

## Decision 2 — Contratos e retomada

**Decision**: intents têm identidade, mundo, ator, versão esperada e idempotency key; queries expõem etapa/sequence; falhas usam retry ou compensação conforme o owner e SAGA-02, R-94, INV-32 e INV-33.

**Rationale**: a jornada cruza BC-002, BC-004, BC-006, BC-007, BC-008, BC-009, BC-011 e X-002 e precisa sobreviver a respostas perdidas, concorrência e entrega pelo menos uma vez.

**Alternatives considered**: transação distribuída e rollback de fatos consumados foram rejeitados; efeitos posteriores usam saga/eventos.

## Decision 3 — Evidência e estado

**Decision**: manter PARTIAL. Evidência atual: `SeasonDue`, scheduler, lease/fencing/retry e checkpoints básicos existem; SAGA-02 completa e domínios consumidores faltam. Conclusão exige contrato, integração e cenário E2E descrito no quickstart.

**Rationale**: documentação e metas não equivalem a execução; estados do catálogo só mudam com prova reproduzível.

**Alternatives considered**: marcar o fluxo entregue por possuir etapas documentadas ou uma fundação parcial foi rejeitado.
