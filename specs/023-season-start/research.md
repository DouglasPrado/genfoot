# Research: Início de temporada

## Decision 1 — Golden path como convergência

**Decision**: GP-004 não cria estado oficial. Ele coordena e comprova confirmar rollover anterior → confirmar participantes → publicar calendário/regulamento → abrir janelas/inscrições → disponibilizar orçamento/objetivos → iniciar pré-temporada → iniciar temporada oficial, preservando C2 orquestra temporada/janelas; C3 possui objetivos e elenco; C7 publica competição/inscrição; C9 possui orçamento; C11 comunica.

**Rationale**: o blueprint exige um único owner por aggregate; transformar a jornada em domínio duplicaria regras.

**Alternatives considered**: um “serviço GP-004” com banco próprio foi rejeitado por escrita cruzada; orquestração no cliente foi rejeitada por falta de autoridade.

## Decision 2 — Contratos e retomada

**Decision**: intents têm identidade, mundo, ator, versão esperada e idempotency key; queries expõem etapa/sequence; falhas usam retry ou compensação conforme o owner e SAGA-02, R-94 e INV-32/INV-33.

**Rationale**: a jornada cruza BC-002, BC-003, BC-007, BC-009 e BC-011 e precisa sobreviver a respostas perdidas, concorrência e entrega pelo menos uma vez.

**Alternatives considered**: transação distribuída e rollback de fatos consumados foram rejeitados; efeitos posteriores usam saga/eventos.

## Decision 3 — Evidência e estado

**Decision**: manter PARTIAL. Evidência atual: `SeasonStarted` e temporada linear existem; publicação completa, janelas, objetivos, orçamento e pré-temporada faltam. Conclusão exige contrato, integração e cenário E2E descrito no quickstart.

**Rationale**: documentação e metas não equivalem a execução; estados do catálogo só mudam com prova reproduzível.

**Alternatives considered**: marcar o fluxo entregue por possuir etapas documentadas ou uma fundação parcial foi rejeitado.
