# Research: Abandono ou troca de clube

## Decision 1 — Golden path como convergência

**Decision**: GP-003 não cria estado oficial. Ele coordena e comprova avaliar risco → solicitar saída → encerrar controle → ativar gestão interina → aplicar cooldown/restrições → escolher novo clube elegível, preservando C1 encerra/ativa controle e cooldown; C11 preserva histórico; C12 audita risco; X-001 garante continuidade; X-003 apresenta.

**Rationale**: o blueprint exige um único owner por aggregate; transformar a jornada em domínio duplicaria regras.

**Alternatives considered**: um “serviço GP-003” com banco próprio foi rejeitado por escrita cruzada; orquestração no cliente foi rejeitada por falta de autoridade.

## Decision 2 — Contratos e retomada

**Decision**: intents têm identidade, mundo, ator, versão esperada e idempotency key; queries expõem etapa/sequence; falhas usam retry ou compensação conforme o owner e R-25 e R-94.

**Rationale**: a jornada cruza BC-001, BC-011, BC-012, X-001 e X-003 e precisa sobreviver a respostas perdidas, concorrência e entrega pelo menos uma vez.

**Alternatives considered**: transação distribuída e rollback de fatos consumados foram rejeitados; efeitos posteriores usam saga/eventos.

## Decision 3 — Evidência e estado

**Decision**: manter PLANNED. Evidência atual: nenhuma fatia executável do fluxo está entregue. Conclusão exige contrato, integração e cenário E2E descrito no quickstart.

**Rationale**: documentação e metas não equivalem a execução; estados do catálogo só mudam com prova reproduzível.

**Alternatives considered**: marcar o fluxo entregue por possuir etapas documentadas ou uma fundação parcial foi rejeitado.
