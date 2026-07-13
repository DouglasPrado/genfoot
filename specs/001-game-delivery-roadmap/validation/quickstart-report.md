# Relatório final do quickstart

**Executado em:** 2026-07-13  
**Revisão base:** `9d639f209faf27a47bde4ec8fdf19032c65b68be`  
**Ruleset do smoke test:** `1.0.0`  
**Seed:** `roadmap-001`

## Resultado por etapa

| Etapa                  | Resultado     | Evidência observada                                                                                 |
| ---------------------- | ------------- | --------------------------------------------------------------------------------------------------- |
| Gates do workspace     | PASS          | format, lint, typecheck, 57/57 testes e build terminaram com código zero                            |
| Criação do mundo       | PASS          | mundo `019f5d14-bfed-72e2-9101-cc5d73e3e431`, data inicial `2026-01-01`, seed e ruleset persistidos |
| Gênese                 | PASS          | 16 clubes, 368 pessoas/jogadores, 16 elencos, 30 rodadas e 240 partidas; overall médio 60           |
| Ativação               | PASS          | status `ACTIVE`, scheduler/lifecycle inicializados                                                  |
| Sete dias              | PASS          | data avançou para `2026-01-08`; tarefas diárias concluídas e `SeasonStarted` emitido                |
| Resumo de jogadores    | PASS          | 368 pessoas, 368 jogadores, 368 eventos de geração e `lastProcessedOn=2026-01-08`                   |
| Índice/schema          | PASS          | 34 features, exit 0                                                                                 |
| DAG                    | PASS          | 34 nós, 163 arestas, zero ciclos, exit 0                                                            |
| Cobertura              | PASS          | 12 contexts, 3 concerns, 16 golden paths, exit 0                                                    |
| Evidência efetiva      | FAIL esperado | exit 1, 37 observations bloqueantes ausentes; apenas FND-001 está integralmente comprovada          |
| Integridade documental | PASS          | Prettier e 333 links internos                                                                       |

## Correção produzida pela execução

A primeira reprodução revelou que a CLI usa `--world`; o quickstart indicava `--world-id`. O documento foi corrigido e o fluxo completo passou na repetição. A primeira tentativa dentro do sandbox também foi bloqueada pelo socket IPC temporário do `tsx`; a execução autorizada fora do sandbox concluiu normalmente, sem indicar defeito do produto.

## Decisão

- **GO para iniciar implementação dos pacotes filhos**, seguindo as ondas, freezes e lanes documentadas. A primeira candidata determinística é BC-002/W1, retomando a menor lacuna de seu estado `PARTIAL` sem reimplementar a fundação verde.
- **NO-GO para promoção do produto ou de M1–M4**. Os 37 slots bloqueantes devem receber evidência real; ausência continua sendo `FAIL`.

O roadmap está completo e executável como plano. Essa decisão não declara as features planejadas como implementadas.
