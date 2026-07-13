# Research: Empréstimo de jogador

## Decision — SAGA-05 controla o ciclo completo

**Rationale**: coordena vínculo, inscrição e dinheiro sem transação distribuída.  
**Alternatives considered**: cron isolado e updates cruzados, rejeitados.

## Decision — retorno e compra são mutuamente exclusivos

**Rationale**: um estado terminal único impede duplo vínculo.  
**Alternatives considered**: flags independentes, rejeitadas.

## Decision — liberação médica é autoritativa

**Rationale**: cliente/IA não pode forjar elegibilidade.  
**Alternatives considered**: confirmação do cliente, rejeitada.
