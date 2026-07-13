# Auditoria do formato de tarefas

**Executado em:** 2026-07-13  
**Entrada:** `specs/001-game-delivery-roadmap/tasks.md`  
**Resultado:** `PASS`

## Regras verificadas

- uma linha por tarefa iniciada por checkbox Markdown;
- ID no formato `T001`–`T075`, único e sem lacunas;
- `[P]` opcional imediatamente após o ID;
- `[US1]`, `[US2]` ou `[US3]` opcional imediatamente depois de `[P]`/ID;
- descrição não vazia e pelo menos um caminho de arquivo/diretório em cada tarefa;
- `x` e `X` aceitos como equivalentes para checkbox concluído, pois o Prettier normaliza Markdown para `x` minúsculo.

## Resultado observado

| Métrica               |       Valor |
| --------------------- | ----------: |
| Tarefas               |          75 |
| IDs ausentes          |           0 |
| IDs duplicados        |           0 |
| Formatos inválidos    |           0 |
| Tarefas sem caminho   |           0 |
| Marcadas `[P]`        |          60 |
| US1 / US2 / US3       | 37 / 8 / 10 |
| Compartilhadas/polish |          20 |

No momento desta auditoria, T001–T071 estavam concluídas e T072–T075 permaneciam abertas para registrar os gates finais. O estado do checkbox não altera a validade estrutural.
