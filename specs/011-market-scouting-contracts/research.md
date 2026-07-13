# Research: mercado, scouting e contratos

## Decision 1 — Separar observação do estado real

**Decision**: ScoutingReport guarda observações, confiança e expiração; nunca copia potencial/atributos secretos como verdade pública.  
**Rationale**: preserva igualdade informacional e valor do staff.  
**Alternatives considered**: expor Player completo foi rejeitado; cache sem validade foi rejeitado por informação obsoleta invisível.

## Decision 2 — Propostas imutáveis e versionadas

**Decision**: cada alteração cria OfferVersion; aceite exige versão corrente e idempotency key.  
**Rationale**: elimina aceite de contraproposta obsoleta e facilita auditoria.  
**Alternatives considered**: atualizar oferta in-place perderia histórico; lock distribuído global criaria acoplamento desnecessário.

## Decision 3 — Sagas nas fronteiras

**Decision**: SAGA-01 e SAGA-05 coordenam steps locais de C6, C9, C7 e C4 com fencing, checkpoints e compensação.  
**Rationale**: não há transação distribuída nem escrita cruzada.  
**Alternatives considered**: C6 alterar saldo/inscrição foi rejeitado; best-effort sem checkpoints deixaria estados órfãos.

## Decision 4 — Vínculo e inscrição são conceitos distintos

**Decision**: C6 possui PlayerClubLink; C7 possui Registration.  
**Rationale**: um atleta contratado pode aguardar janela/eligibilidade.  
**Alternatives considered**: uma entidade compartilhada confundiria owners e lifecycle.
