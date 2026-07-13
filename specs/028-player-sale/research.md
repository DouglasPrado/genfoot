# Research: Venda de jogador

## Decision — SAGA-01 como única orquestração

**Rationale**: venda cruza mercado, contrato, ledger e elenco; checkpoints/compensações impedem efeitos parciais.  
**Alternatives considered**: transação distribuída e updates cruzados, rejeitados.

## Decision — Contrato é a fonte do vínculo

**Rationale**: evita divergência entre jogador, elenco e competição.  
**Alternatives considered**: `currentClubId` autoritativo, rejeitado; permanece projeção.

## Decision — Concorrência otimista por caso/oferta

**Rationale**: dois aceites precisam resultar em no máximo um acordo.  
**Alternatives considered**: last-write-wins, rejeitado.
