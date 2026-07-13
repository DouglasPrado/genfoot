# Relatório do quickstart BC-002

**Executado em:** 2026-07-13  
**Revisão base:** `9d639f209faf27a47bde4ec8fdf19032c65b68be`  
**Seed:** `validation-bc-002`  
**Ruleset:** `1.0.0`  
**Diretório isolado:** `/tmp/grinta-bc-002-validation-final`

## Resultado

| Cenário                    | Evidência observada                                                                                       | Resultado |
| -------------------------- | --------------------------------------------------------------------------------------------------------- | --------- |
| Criação, gênese e ativação | mundo `019f5d42-f83e-74b7-a380-9f2cb4cb7632` ativado em `2026-01-01`                                      | PASS      |
| Janela temporal            | janela `TRANSFER` encontrada no limite inclusivo `2026-01-10`                                             | PASS      |
| Avanço idempotente         | duas execuções do mesmo command produziram o mesmo receipt, data `2026-01-02`, versão 4 e fencing token 1 | PASS      |
| Disparo por `SeasonDue`    | após mais 89 dias, rollover `019b76da-a800-744b-a02e-c0316dc8584d` criado automaticamente                 | PASS      |
| Recuperação SAGA-02        | inspect e resume concluíram os 20 checkpoints em ordem                                                    | PASS      |
| Fechamento e abertura      | `SeasonClosed` e `SeasonStarted` emitidos uma vez; temporada 1 `ARCHIVED` e temporada 2 `PLANNED`         | PASS      |
| Gates do workspace         | format, lint, typecheck, 72 testes e build concluídos com exit 0                                          | PASS      |

Todos os comandos descritos em [quickstart.md](../quickstart.md) terminaram com exit 0. O snapshot final preservou `worldId` e `rulesetVersion`, e uma retomada não reaplicou handlers concluídos.

## Limite do harness

O comando `season:rollover:resume --approve-all` fornece handlers sintéticos explícitos para os owners C3/C4/C6/C7/C8/C9/C10/C11. O teste comprova a orquestração, os checkpoints, os gates e a recuperação pertencentes a C2; não comprova nem promove a implementação interna desses contexts.

## Decisão

**BC-002 / C2: DELIVERED.** As janelas configuráveis, o receipt idempotente de avanço, a persistência compatível, os 20 checkpoints da SAGA-02, takeover/fencing, retry/manual review e a abertura única de N+1 estão implementados e reproduzíveis.

**M1: não promovido.** O marco continua dependente das demais features headless e da validação longa previstas no catálogo mestre.
