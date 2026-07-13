# Baseline normativa ratificada — 2026-07-13

> **Status:** CANÔNICO · **Autoridade:** decisão do dono do produto expressa pela ordem de resolver integralmente as pendências da auditoria · **Vigência:** 2026-07-13 · **Escopo:** Série R e documentos derivados

## 1. Ato de ratificação

Ficam **RATIFICADAS** as decisões `R-02..R-148`, exceto os identificadores reservados `R-35..R-40` e `R-108`, que continuam sem conteúdo normativo. `R-01` permanece ratificada desde 2026-07-11.

A ratificação aprova:

- os princípios, contratos, máquinas de estado, fórmulas e valores de primeira passada registrados na Série R;
- a hierarquia normativa e o ownership definidos no context map;
- os critérios e bandas como **oráculos de aceitação**, não como resultados de testes já executados;
- a evolução posterior de coeficientes exclusivamente por `rulesetVersion`, preservando mundos, partidas e temporadas anteriores.

Esta decisão fecha **B-01**. Qualquer ocorrência anterior de `PROPOSTO`, `RECOMENDADA (a ratificar)` ou equivalente ligada a um `R-##` ratificado passa a ser lida como **histórico de elaboração**, não como estado normativo atual. Em conflito, este ato e o estado consolidado do ADR prevalecem.

## 2. Ajuste aprovado no ato — C-04

`R-43` e `R-57` são ratificadas com o seguinte ajuste:

- elenco inicial: **23 jogadores**;
- teto comum de força total: **1.380 pontos de overall**;
- média-alvo: **60 de overall**;
- faixa operacional aceitável na geração: média entre **58 e 60**, nunca superior a **62**;
- teto da Liga Inicial de `R-62`: **overall médio ≤ 62**, mantido;
- os demais parâmetros de R-43/R-57 permanecem inalterados.

Racional: 1.500 ÷ 23 ≈ 65,2 tornava o clube recém-gerado inelegível para a camada criada para recebê-lo. A média 60 preserva igualdade, permite identidades setoriais e deixa margem para treinamento e contratações antes de atingir o teto divisional.

## 3. Natureza dos gates que exigem sistema executável

Os itens abaixo ficam **normativamente fechados**, mas sua evidência operacional só pode ser produzida durante a implementação:

| Gate | O que está aprovado agora | Evidência exigida antes de produção |
|---|---|---|
| R-34 | metodologia, seeds, cenários, oráculos e bandas do motor | execução de aproximadamente 10.000 partidas por cenário e relatório assinado |
| R-88 | metodologia econômica/demográfica, horizontes e bandas | execução de ≥1.000 mundos por ≥10 temporadas, incluindo amostras de 50 e 100 temporadas |
| R-120 | gate conjuntivo G1..G8 | todos os critérios determinísticos verdes e bandas dentro do intervalo |
| R-136 | runbook, RPO/RTO e frequência dos gamedays | restauração isolada e exercício regional com tempos e perda medidos |

A ausência desses resultados **não reabre a documentação** nem impede desenvolvimento. Ela impede promoção do ruleset, da infraestrutura e do mundo para produção. É proibido registrar esses gates como executados antes da existência das evidências.

## 4. Efeito nos documentos

1. O ADR é a fonte única do estado de cada `R-##` e passa a registrar `R-01..R-148 RATIFICADAS`, descontados os reservados.
2. Documentos de GDD, técnico, guia e UI derivados da Série R passam a `CANÔNICO`, respeitando o ownership por assunto.
3. Materiais em `chats/` permanecem `REFERÊNCIA/SUPERADO`.
4. O schema físico só deixa o rótulo `SCAFFOLD` após a publicação do catálogo final de tabelas, ownership, constraints e migrations; isso fecha B-06 documentalmente sem fingir que migrations já foram aplicadas.
5. Mudanças futuras exigem novo ID de decisão, `rulesetVersion` e registro de impacto/migração.

## 5. Assinatura de decisão

- **Decisão:** APROVAR TODOS OS LOTES COM AJUSTE EM C-04.
- **Solicitante/autoridade:** Douglas Prado, dono do produto.
- **Registro executado por:** auditoria/arquitetura documental assistida.
- **Data:** 2026-07-13.

