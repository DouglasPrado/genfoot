# Research: Lesão e recuperação

## Decision — Saúde pertence a BC-004

**Rationale**: disponibilidade é estado do jogador; partida só emite ocorrência.  
**Alternatives considered**: C8 alterar Player diretamente, rejeitado.

## Decision — Máquina médica com checkpoints

**Rationale**: retry/crash não pode duplicar fases.  
**Alternatives considered**: datas/flags soltas, rejeitadas.

## Decision — Elegibilidade validada no servidor

**Rationale**: UI stale ou offline não pode escalar lesionado.  
**Alternatives considered**: confiança no cliente, rejeitada.
