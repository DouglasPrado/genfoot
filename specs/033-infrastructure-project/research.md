# Research: Projeto de infraestrutura

## Decision — SAGA-04 com checkpoints por etapa

**Rationale**: obra longa cruza tempo, clube, dinheiro e aprovação.  
**Alternatives considered**: job único/transação longa, rejeitados.

## Decision — benefício só após inspeção

**Rationale**: separa conclusão física de ativação autorizada.  
**Alternatives considered**: ativação automática ao prazo, rejeitada.

## Decision — cancelamento compensa, não apaga

**Rationale**: custos realizados e decisões precisam permanecer auditáveis.  
**Alternatives considered**: rollback destrutivo, rejeitado.
