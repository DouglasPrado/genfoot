# Catálogo de Regras, Fórmulas, Máquinas de Estado e Invariantes

> **Status:** CANÔNICO · **Fontes:** chats/como-construir-jogo-regras.md · **Revisão:** 2026-07-10

Este documento consolida a especificação executável do **Grinta**: o catálogo de regras identificáveis, o catálogo de fórmulas versionadas, as máquinas de estado de partida e temporada, os eventos de domínio e as invariantes que o sistema jamais pode violar.

O objetivo é transformar as decisões de design — hoje dispersas em conversas de brainstorming — em uma fonte oficial e estável, que sirva de contrato entre o design de jogo e a implementação técnica. As regras recebem identificadores estáveis para poderem ser referenciadas em código, testes e documentação sem ambiguidade.

## Sumário

- [1. Catálogo de Regras](#1-catálogo-de-regras)
  - [1.1 Sistema de IDs estáveis](#11-sistema-de-ids-estáveis)
  - [1.2 Interface `GameRule`](#12-interface-gamerule)
  - [1.3 Regras catalogadas](#13-regras-catalogadas)
- [2. Catálogo de Fórmulas](#2-catálogo-de-fórmulas)
  - [2.1 Interface `GameFormula`](#21-interface-gameformula)
  - [2.2 Versionamento de fórmulas](#22-versionamento-de-fórmulas)
  - [2.3 Fórmulas conceituais previstas](#23-fórmulas-conceituais-previstas)
  - [2.4 Recomendações de balanceamento (Série R)](#24-recomendações-de-balanceamento-série-r)
- [Fórmulas do motor de partida (transcrição)](#fórmulas-do-motor-de-partida-transcrição)
  - [F1. Atributo efetivo por lance](#f1-atributo-efetivo-por-lance)
  - [F2. Fadiga por tick](#f2-fadiga-por-tick)
  - [F3. Moral atual](#f3-moral-atual)
  - [F4. Tática efetiva (TeamTacticalState)](#f4-tática-efetiva-teamtacticalstate)
  - [F5. Controle de zona e vantagem ofensiva vs defensiva](#f5-controle-de-zona-e-vantagem-ofensiva-vs-defensiva)
  - [F6. Posse e posse perigosa](#f6-posse-e-posse-perigosa)
  - [F7. Ataques esperados por tick](#f7-ataques-esperados-por-tick)
  - [F8. Duelo](#f8-duelo)
  - [F9. Criação de chance e tiers](#f9-criação-de-chance-e-tiers)
  - [F10. Qualidade da finalização](#f10-qualidade-da-finalização)
  - [F11. Defesa efetiva e chance de gol](#f11-defesa-efetiva-e-chance-de-gol)
  - [F12. Chance de falta e de cartão](#f12-chance-de-falta-e-de-cartão)
  - [F13. Risco de lesão](#f13-risco-de-lesão)
  - [F14. Momentum](#f14-momentum)
  - [F15. xG](#f15-xg)
  - [F16. Nota do jogador](#f16-nota-do-jogador)
  - [F17. decisionScore e limiares](#f17-decisionscore-e-limiares)
  - [F18. offlineDecisionQuality](#f18-offlinedecisionquality)
  - [F19. Qualidade da leitura e impacto da sugestão](#f19-qualidade-da-leitura-e-impacto-da-sugestão)
  - [F20. Deltas internos de uma ação](#f20-deltas-internos-de-uma-ação)
  - [F21. staffLevel (média ponderada)](#f21-stafflevel-média-ponderada)
- [3. Máquinas de Estado](#3-máquinas-de-estado)
  - [3.1 Partida](#31-partida)
  - [3.2 Temporada](#32-temporada)
- [4. Eventos de Domínio](#4-eventos-de-domínio)
  - [4.1 Convenção: evento interno × integration event](#41-convenção-evento-interno--integration-event)
  - [4.2 Integration events (cruzam fronteira de contexto)](#42-integration-events-cruzam-fronteira-de-contexto)
  - [4.3 Eventos internos (não cruzam fronteira, por ora)](#43-eventos-internos-não-cruzam-fronteira-por-ora)
  - [4.4 Telemetria por evento (log de depuração)](#44-telemetria-por-evento-log-de-depuração)
- [5. Invariantes](#5-invariantes)
  - [5.1 Núcleo (INV-1..INV-7)](#51-núcleo-inv-1inv-7)
  - [5.2 Contábeis e econômicas (INV-3a, INV-3b, INV-8..INV-13)](#52-contábeis-e-econômicas-inv-3a-inv-3b-inv-8inv-13)
  - [5.3 Autoridade de escrita e ownership (INV-14..INV-18)](#53-autoridade-de-escrita-e-ownership-inv-14inv-18)
  - [5.4 Unicidade (INV-19..INV-24)](#54-unicidade-inv-19inv-24)
  - [5.5 Elegibilidade e conservação contrato↔inscrição (INV-25..INV-26)](#55-elegibilidade-e-conservação-contratoinscrição-inv-25inv-26)
  - [5.6 Determinismo, replay e idempotência (INV-27..INV-31)](#56-determinismo-replay-e-idempotência-inv-27inv-31)
  - [5.7 Máquinas de estado e homologação (INV-32..INV-33)](#57-máquinas-de-estado-e-homologação-inv-32inv-33)
  - [5.8 Auditoria, operação e população (INV-34..INV-37)](#58-auditoria-operação-e-população-inv-34inv-37)
- [6. Interfaces TypeScript de Referência](#6-interfaces-typescript-de-referência)
- [7. Notas de Ligação](#7-notas-de-ligação)

---

## 1. Catálogo de Regras

O catálogo de regras é a lista oficial das decisões de design que governam o comportamento do universo. Cada regra é uma unidade nomeada, identificável e — quando aplicável — configurável, para permitir balanceamento sem reescrever o domínio.

### 1.1 Sistema de IDs estáveis

Cada regra recebe um identificador estável, composto por um **prefixo temático** e um **número sequencial** de três dígitos. O ID nunca muda depois de atribuído, mesmo que a descrição da regra seja refinada — isso garante que referências em código, testes e outros documentos permaneçam válidas.

| Prefixo | Domínio     | Escopo |
|---------|-------------|--------|
| `ECO-`  | Economia    | Caixa, oferta monetária, inflação, receitas, despesas, preços de mercado, contabilidade, transferências |
| `PLY-`  | Jogadores   | Unicidade, geração, atributos/estados/traços, evolução, formação, medicina, aposentadoria, equilíbrio etário |
| `MAT-`  | Partidas    | Simulação, intervenções táticas, eventos de jogo, comissão técnica, online/offline, resultado |
| `CMP-`  | Competições | Temporada, campeonatos, calendário, virada de temporada, promoção/rebaixamento, licenciamento e inscrição |
| `USR-`  | Usuário     | Regras específicas do jogador humano e sua relação com o clube |

A extração das regras a partir dos documentos de game design em `../01-game-design/` está consolidada em [§1.3](#13-regras-catalogadas): economia (`ECO-`, de [`../01-game-design/03-economia.md`](../01-game-design/03-economia.md)), jogadores (`PLY-`, de [`../01-game-design/02-sistema-de-jogadores.md`](../01-game-design/02-sistema-de-jogadores.md)), partidas (`MAT-`, de [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md)), competições (`CMP-`, de [`../01-game-design/06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md)) e usuário (`USR-`).

### 1.2 Interface `GameRule`

Toda regra é descrita segundo a interface abaixo. Os campos `inputs`, `outputs`, `dependencies` e `invariants` conectam a regra ao restante do sistema; `configurable` indica se a regra expõe parâmetros ajustáveis para balanceamento.

```ts
interface GameRule {
  id: string;            // Identificador estável (ex.: "ECO-001")
  name: string;          // Nome curto e legível
  description: string;   // Descrição normativa da regra
  inputs: string[];      // Dados/entidades que a regra consome
  outputs: string[];     // Efeitos/estados que a regra produz
  dependencies: string[];// Outras regras ou módulos dos quais depende
  invariants: string[];  // Invariantes que a regra ajuda a preservar
  configurable: boolean; // Se expõe parâmetros ajustáveis
}
```

### 1.3 Regras catalogadas

As regras a seguir foram **extraídas** dos documentos de game design em `../01-game-design/`, com todos os campos da interface [`GameRule`](#12-interface-gamerule) preenchidos (`inputs`, `outputs`, `dependencies`, `invariants`, `configurable`). Cada tabela cobre um prefixo temático. As **expressões numéricas** de balanceamento não vivem aqui: onde uma regra depende de coeficientes, eles ficam nas fórmulas (`F#`) e nas recomendações da [Série R](#24-recomendações-de-balanceamento-série-r). `Cfg` = `configurable`. Listas usam `·` como separador; `—` = vazio.

> **Convenção:** o ID é estável e nunca muda depois de atribuído. Refinamentos de descrição preservam o ID. Fontes por seção estão indicadas no cabeçalho de cada tabela.

#### Economia — `ECO-` (fonte: [`03-economia.md`](../01-game-design/03-economia.md))

| ID | Nome | Descrição | Inputs | Outputs | Dependências | Invariantes | Cfg |
|----|------|-----------|--------|---------|--------------|-------------|-----|
| `ECO-001` | Caixa inicial igual | Todo clube nasce com o mesmo caixa-base; ponto de partida econômico uniforme. | `worldConfig.startingCash` · evento `WorldCreated` | `ClubEconomy.cash` inicial | `01-mundo §3.1` · ECO-003 | INV-3 | true |
| `ECO-002` | Oferta monetária por clubes ativos | O dinheiro em circulação no universo é função da quantidade de clubes ativos. | `totalClubs` · `GameEconomyState` | `totalMoney` alvo · `inflationIndex` | ECO-003 · ECO-012 | INV-3 | true |
| `ECO-003` | Economia fechada (nada gerado solto) | Clube, jogador, dinheiro e preço nunca são gerados isoladamente; tudo respeita o equilíbrio global. | `GameEconomyState` (todos os campos) | geração/precificação regulada | ECO-002 · ECO-012 · PLY-002 | INV-3 · INV-7 | true |
| `ECO-004` | Saúde financeira (`financialHealth`) | Índice 0–100 resume a situação do clube e condiciona seu comportamento (venda, orçamento, moral). | caixa · dívida · folha · receita recorrente · resultado esportivo · pressão | `ClubEconomy.financialHealth` · gatilhos de crise | ECO-005 · ECO-011 | — | true |
| `ECO-005` | Folha salarial como maior risco | Folha alta = time forte no curto prazo e risco financeiro no médio; exige título ou venda. | `wageBill` · `wageBudget` · receita | pressão por venda · `boardPressure` | ECO-004 · ECO-011 | — | true |
| `ECO-006` | Mercado segmentado em camadas | O mercado se divide em camadas paralelas (geral, regional/iniciante, base local, empréstimos) por nível. | nível estrutural do clube · pool de jogadores | acesso a jogadores compatíveis com o porte | ECO-008 · CMP-010 | — | true |
| `ECO-007` | Empréstimo com limites anti-abuso | Empréstimo respeita limite por clube, salário parcial do dono, minutos mínimos e sem opção de compra vantajosa embutida. | contratos · `TransferStrategy` | vínculo de empréstimo válido | ECO-016 · Decisão 1889 | INV-1 | true |
| `ECO-008` | Economia proporcional ao estágio da liga | Receitas, custos e upgrades são proporcionais ao estágio da liga (inicial/intermediária/elite). | estágio da liga · `ClubEconomy` | receita/custo/upgrade escalados | ECO-006 · CMP-010 | — | true |
| `ECO-009` | Exclusividade comercial não-sobreposta | Direitos exclusivos não podem ser vendidos a parceiros concorrentes simultaneamente. | contratos comerciais · categorias de ativo | bloqueio de conflito contratual | — | — | false |
| `ECO-010` | Entregas comerciais como obrigação | Patrocínio cria obrigações (marca, campanha, conteúdo); descumprir reduz pagamento, trava renovação ou gera conflito. | contrato comercial · entregas prometidas | receita condicionada às entregas | ECO-009 | — | true |
| `ECO-011` | Punições econômicas por má gestão | Atraso salarial, dívida fiscal e folha estourada disparam moral↓, multas, bloqueio de inscrição e perda de pontos em casos extremos. | `Debt` · atrasos · folha vs orçamento | penalidades esportivas/financeiras | ECO-004 · CMP-017 | INV-3 | true |
| `ECO-012` | Controle global de inflação | O sistema controla o dinheiro total via entradas/saídas, estabilizando salários, preços e premiações. | `MarketInflation` · fluxos de caixa do universo | índices de inflação por categoria | ECO-002 · ECO-003 | INV-3 | true |
| `ECO-013` | Disciplina contábil (caixa ≠ orçamento ≠ disponível) | Ter caixa não é ter autorização; ter orçamento não é ter dinheiro disponível. Vale também para clubes do jogo. | caixa · saldo · valores restritos · orçamento · compromissos | separação contábil aplicada | ECO-014 | INV-3 | false |
| `ECO-014` | Regime de competência | Receitas/despesas são reconhecidas quando geradas; pagamento pode ocorrer em data distinta; histórico não se apaga (ajustes/reversões). | eventos econômicos · cronograma de pagamento | reconhecimento por competência | ECO-013 · ECO-016 | INV-3 | false |
| `ECO-015` | Contratos imunes à inflação futura | Mudanças futuras de índice não reescrevem contratos já assinados; a inflação afeta apenas novos acordos. | índices de inflação · contratos vigentes | contratos vigentes preservados | ECO-012 | — | false |
| `ECO-016` | Transferência como processo multi-etapa | Transferência é sequência (consulta→proposta→acordo→exame→registro→pagamento→conclusão); cada etapa pode falhar e compromete. | proposta · etapas · exame médico · registro | vínculo + compromissos por etapa | ECO-014 · ECO-017 · CMP-018 | INV-1 | false |
| `ECO-017` | Obrigação de compra ≠ opção de compra | Opção depende de exercício; obrigação é acionada por condição e não some por falta de caixa. | cláusulas · gatilhos (partidas/acesso) | compromisso/dívida quando acionada | ECO-016 · ECO-014 | INV-1 · INV-3 | true |

#### Jogadores — `PLY-` (fonte: [`02-sistema-de-jogadores.md`](../01-game-design/02-sistema-de-jogadores.md))

| ID | Nome | Descrição | Inputs | Outputs | Dependências | Invariantes | Cfg |
|----|------|-----------|--------|---------|--------------|-------------|-----|
| `PLY-001` | Unicidade do jogador | Cada jogador é entidade única; sem duplicatas nem clones no universo. | registro do jogador | jogador único e persistente | PLY-018 | INV-6 | false |
| `PLY-002` | Geração com equilíbrio etário | A geração corrige a pirâmide etária do universo e repõe aposentadorias. | déficit por faixa/posição · aposentadorias · `ageDistribution` | nova safra distribuída por idade/posição/qualidade | ECO-003 · CMP-005 · F(geração) | INV-6 · INV-7 | true |
| `PLY-003` | Tendência, não destino fixo | O jogador nasce com base e potencial; a carreira (clube, treino, minutos, eventos) molda o resultado. | base · potencial · história de vida | evolução dependente da trajetória | PLY-006 · PLY-007 · PLY-009 | — | true |
| `PLY-004` | Atributo × Estado × Traço | Separação entre atributo (estrutural), estado (temporário) e traço (personalidade profunda). | atributos · estados · traços | modelo de jogador consistente | PLY-005 | — | false |
| `PLY-005` | Causalidade traço→estado→desempenho→atributo | Traços influenciam estados; estados alteram desempenho; desempenho move atributos no tempo; eventos mudam estados já e traços devagar. | traços · eventos · desempenho | dinâmica de mudança do jogador | PLY-004 · F1 · F3 | — | false |
| `PLY-006` | Potencial em camadas | Potencial natural (teto), aproveitável (alcançável) e funcional (por função); formação e posição os movem. | potencial natural · formação · função | teto efetivo por contexto | PLY-003 · PLY-009 | — | true |
| `PLY-007` | Evolução direcionada por treino | Ganho por atributo = produto de fatores (aprendizado · potencial restante · foco · qualidade · compatibilidade · minutos · idade · moral) − penalidades. | treino · minutos · moral · fadiga | ganho/perda por atributo | PLY-006 · PLY-008 · F(evolução) | — | true |
| `PLY-008` | Curvas de evolução por idade | A idade define o tipo de evolução dominante (técnica jovem, auge, declínio físico tardio). | idade · tipo de treino | multiplicador de ganho por faixa | PLY-007 | — | true |
| `PLY-009` | Marca de formação do clube (`DevelopmentSignature`) | Cada clube tem identidade de desenvolvimento que altera a evolução de quem passa por ele. | `DevelopmentSignature` · foco por área | direção de evolução do jogador | PLY-007 · PLY-011 | — | true |
| `PLY-010` | Histórico de desenvolvimento acumulativo | Cada passagem por um clube adiciona uma marca; o jogador carrega memória de desenvolvimento. | `PlayerDevelopmentHistory` | insumo de valor e de perfil | PLY-009 · PLY-013 | — | false |
| `PLY-011` | Mudança de posição/perfil na carreira | Posição original + atributos desenvolvidos + necessidade do clube + visão do técnico = nova função. | histórico · treino · função pedida | novo arquétipo/posição | PLY-007 · PLY-010 | — | true |
| `PLY-012` | Informação assimétrica (scout e médica) | O clube não conhece a verdade do jogador; enxerga estimativa com incerteza (visível/scout/oculto; 4 camadas médicas). | qualidade do olheiro · observações · camada de acesso | faixa estimada + confiança (nunca verdade absoluta) | ECO-017 · PLY-016 | — | true |
| `PLY-013` | Memória do jogador e do clube | Jogador e clube lembram eventos importantes; memórias alteram reações futuras; memória histórica vira tradição. | eventos · intensidade · duração | efeitos futuros · tradição | PLY-010 | — | false |
| `PLY-014` | Risco de lesão dependente de decisões | Lesão não é evento independente: sobrecarga e uso de jogador fatigado elevam a probabilidade. | carga · fadiga · histórico · idade · prevenção | risco de lesão modulado | F13 · PLY-015 | — | true |
| `PLY-015` | Reabilitação progressiva (7 estágios) | Recuperação ordenada: dor→movimento→força→individual→parcial→completo→liberação. | diagnóstico · gravidade · tratamento | progresso de reabilitação | PLY-014 · PLY-016 | — | true |
| `PLY-016` | Liberação médica ≠ ritmo/confiança | Estar liberado não garante ritmo nem confiança; forçar retorno precoce pode gerar recaída. | liberação médica · carga prevista · importância | risco de recaída assumido | PLY-015 · PLY-012 | — | false |
| `PLY-017` | Aposentadoria contextual | A aposentadoria não é só idade: considera condição física, motivação, contrato, papel, família e propostas. | `RetirementDecision` (idade, físico, motivação…) | estado de aposentadoria | CMP-005 · PLY-018 | INV-4 | true |
| `PLY-018` | Pessoa persistente / vira funcionário | Após a carreira, o jogador pode virar funcionário mantendo identidade e memória; não é descartado. | jogador aposentado · papéis de staff | funcionário com histórico preservado | PLY-001 · PLY-017 | INV-6 | false |
| `PLY-019` | Proteção de menores | Menores têm regras próprias (movimentação, responsabilidade, alojamento, educação, privacidade, carga). | idade · vínculo · contexto institucional | restrições de uso e movimentação | PLY-020 | — | true |
| `PLY-020` | Geração ≠ promoção | Surgir no mundo (geração) não é ser promovido ao elenco principal; o jovem pode existir na base por anos. | estado do jovem · decisão do clube | separação geração/promoção | PLY-002 · PLY-019 | INV-6 | false |

#### Partidas — `MAT-` (fonte: [`05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md))

| ID | Nome | Descrição | Inputs | Outputs | Dependências | Invariantes | Cfg |
|----|------|-----------|--------|---------|--------------|-------------|-----|
| `MAT-001` | Intervenção tática em tempo real | Em partidas online o usuário intervém taticamente via pontos de decisão. | comandos do usuário · `DecisionPoint` | ajuste tático aplicado | MAT-008 · máquina `PAUSED_FOR_DECISION` | INV-2 | true |
| `MAT-002` | Placar emerge dos eventos | O placar nunca é força×força; emerge de volume, chances, finalizações, defesas, erros e eventos. | estado da simulação por tick | placar + estatísticas emergentes | F5–F15 | — | false |
| `MAT-003` | Simulação por zonas (9 zonas) | O campo é disputado setor a setor (3×3); cada jogada nasce, progride ou morre numa zona. | zonas · forças de setor | controle de zona · origem de ataque | F5 · MAT-004 | — | false |
| `MAT-004` | Posse perigosa ≠ posse de bola | Ter a bola não é criar perigo; posse total e posse perigosa são métricas distintas. | posse · posse ofensiva · qualidade | `attackingThreat` separado da posse | F6 · MAT-003 | — | false |
| `MAT-005` | Aleatoriedade controlada (3 camadas) | Base lógica + variação humana + evento raro; o azar é explicado, nunca gratuito; evento raro é raro. | seeds · scores dos lances | desfecho sorteado com contexto | F11 · MAT-015 | — | true |
| `MAT-006` | Atributos coletivos dinâmicos | A força do time muda no jogo (fadiga, moral, momentum recalculam o valor efetivo por tick). | atributos base · estados por tick | atributos efetivos correntes | F1 · F3 · F14 | — | false |
| `MAT-007` | Ações táticas mudam comportamento | Ação tática altera comportamento, não dá bônus mágico (proibido "ofensivo = +10 ataque"). | escolha tática · elenco | mudança de padrão do time | F4 · MAT-008 | — | true |
| `MAT-008` | Custo, cooldown e estabilidade tática | Mudanças têm tempo de encaixe e custo; excesso gera `TacticalConfusion` e queda de entrosamento. | mudanças recentes · comunicação · inteligência tática | penalidade por instabilidade | F4 · F20 · `CoachTrust` | — | true |
| `MAT-009` | Jogo roda online ou offline | A partida é ao vivo assíncrona: nunca depende do usuário online, mas recompensa quem acompanha. | `MatchState` · plano pré-jogo | simulação contínua | MAT-010 · MAT-014 | — | false |
| `MAT-010` | IA offline conservadora e configurável | Offline a IA age só no essencial, seguindo o plano pré-jogo; autonomia e postura são configuráveis. | plano pré-jogo · nível de autonomia · comissão | decisões offline seguras | MAT-011 · F18 | — | true |
| `MAT-011` | Comissão técnica como gate de informação | A comissão determina se/quando/como o usuário enxerga o que o motor já sabe (qualidade da leitura). | nível da comissão · sinais brutos | pontos de decisão + clareza | F17 · F19 · MAT-012 | — | true |
| `MAT-012` | Adversário invisível | A comissão estima, não entrega a verdade; melhora a informação em vez de dar bônus direto. | observação · nível da comissão | estimativa com incerteza | MAT-011 | — | true |
| `MAT-013` | Sugestões com validade contextual | Toda sugestão tem `validUntilMinute`/`conditions`/`invalidatedBy` e expira quando o contexto muda. | contexto do jogo · alvo da sugestão | sugestão válida/expirada | MAT-011 | — | false |
| `MAT-014` | Servidor autoritativo e fairness PvP | O cliente só envia comando; o servidor valida e processa; latência não vira vantagem competitiva. | comando do usuário · `MatchState` | novo estado validado | MAT-015 | INV-2 | false |
| `MAT-015` | Determinismo por seed | `matchSeed`/`tickSeed`/`eventSeed` tornam a partida reproduzível para debug, auditoria e anti-"roubo". | seeds · comandos | resultado reproduzível | MAT-005 · MAT-014 | — | true |
| `MAT-016` | Priorização de decisões concorrentes | Ordem: emergência → risco alto → problema tático → oportunidade → narrativa; evita spam de alerta. | eventos simultâneos · severidade | fila de decisões priorizada | MAT-011 | — | true |
| `MAT-017` | Anti-exploit e contra-ajuste adversário | Ações repetidas perdem efeito e custam; a IA adversária reage a padrões conforme sua comissão. | padrões do usuário · comissão adversária | contra-ajuste + limite de impacto | MAT-008 · MAT-018 | — | true |
| `MAT-018` | Reputação tática cross-match | O usuário desenvolve estilo percebido; adversários se preparam entre partidas contra padrões históricos. | histórico de partidas do usuário | preparação adversária pré-jogo | MAT-017 | — | true |
| `MAT-019` | Explicabilidade (causalidade registrada) | O motor guarda causa (primária/secundária/terciária, ação e alerta anteriores) de cada evento. | cadeia causal do lance | log de telemetria explicável | §4.4 · F11 | — | true |
| `MAT-020` | Função ≠ posição | A simulação depende da função, não só da posição; mede `PositionFit`/`RoleFit`/`FormationFamiliarity`. | posição · função pedida · formação | penalidade por improviso | F1 · MAT-007 | — | true |
| `MAT-021` | Prorrogação → pênaltis (mata-mata) | 90' → prorrogação → pênaltis, com dinâmica própria (fadiga pesa mais, mais lesões). | regras da competição · placar | fluxo de fases finais | CMP-002 · MAT-022 | — | true |
| `MAT-022` | Motor próprio de pênaltis | Disputa de pênaltis usa atributos e contexto específicos (batedor × goleiro, decisividade). | pênalti/frieza/moral · reflexo/leitura | resultado da disputa | MAT-021 | — | true |
| `MAT-023` | Expulsão em posição crítica | Goleiro/zagueiro/volante expulsos têm tratamento próprio (goleiro reserva obrigatório; reorganização). | posição do expulso · banco | reorganização defensiva | MAT-016 | — | false |
| `MAT-024` | Elegibilidade congelada no pré-jogo | A elegibilidade é validada e congelada na preparação; suspenso/não inscrito/transferido não entra. | escalação · inscrição · suspensões | escalação válida ou W.O. evitado | CMP-018 · CMP-017 | INV-4 | false |
| `MAT-025` | Pós-jogo altera o universo | Após o apito a partida altera moral, torcida, mídia, valores, reputação e finanças. | `MatchSimulationResult` | consequências no mundo | CMP-005 · ECO-004 | INV-5 | false |

#### Competições — `CMP-` (fonte: [`06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md))

| ID | Nome | Descrição | Inputs | Outputs | Dependências | Invariantes | Cfg |
|----|------|-----------|--------|---------|--------------|-------------|-----|
| `CMP-001` | Campeonatos como entidades independentes | Cada campeonato tem lógica própria sobre uma base comum (`Championship`). | `Championship` · tipo | competições criadas | CMP-002 | — | true |
| `CMP-002` | Formato configurável por dados | Regras vivem em dados (`CompetitionFormat`/`ChampionshipRules`), não em código. | `ChampionshipRules` (formato, pontos, legs…) | comportamento da competição | CMP-001 · CMP-018 | — | true |
| `CMP-003` | Qualificação entre competições | Vagas são decididas por ranking/classificação via `QualificationRule`, não por lista fixa. | classificações · `QualificationRule` | vagas atribuídas | CMP-001 | INV-5 | true |
| `CMP-004` | Temporada em 7 fases | A temporada é um ciclo de 7 fases; cada fase destrava tipos de evento. | calendário · estado da temporada | fases e eventos destravados | CMP-005 | — | true |
| `CMP-005` | Motor de virada de temporada | Checklist de ~20 passos faz o mundo reagir ao que aconteceu ao virar o ano. | `SeasonResult` · estado do mundo | mundo recalculado + nova temporada | PLY-002 · ECO-003 · CMP-016 | INV-5 · INV-7 | true |
| `CMP-006` | Avaliação da diretoria por objetivos | A diretoria avalia o técnico por posição/copa/finanças/desenvolvimento/torcida esperados vs reais. | `BoardEvaluation` · objetivos | nota + consequências (verba, pressão) | CMP-011 · ECO-004 | — | true |
| `CMP-007` | Avaliação da torcida (distinta) | A torcida avalia por emoção, rivalidade, títulos e ídolos — não por finanças. | `FanEvaluation` · resultados | humor da torcida + eventos | CMP-006 | — | true |
| `CMP-008` | Evolução/regressão multidimensional | O fim de temporada avalia cada jogador em várias dimensões; pode ser misto, nunca "+2 de overall". | `PlayerSeasonDevelopment` · fatores | ganho/perda por dimensão | PLY-007 · PLY-008 · F(evolução) | — | true |
| `CMP-009` | Promoção/rebaixamento muda status | Subir/cair de divisão altera orçamento, reputação, torcida, moral e patrocínio. | posição final · `ClubSeasonUpdate` | mudança de status do clube | CMP-013 · ECO-008 | INV-5 | true |
| `CMP-010` | Teto de força por divisão | Cada divisão tem limite natural de força; quem passa do teto é obrigado a subir. | folha/overall/estrangeiros/reputação · divisão | obrigação de acesso | ECO-006 · ECO-008 | — | true |
| `CMP-011` | Objetivos calibrados por estágio | Metas da diretoria dependem do estágio do clube (novo/médio/grande), não de meta única. | estágio do clube | objetivos da temporada | CMP-006 | — | true |
| `CMP-012` | Copa com chance de zebra | Copa aberta com formato que favorece a surpresa (jogo único, mando ao menor, prêmio por fase). | `ChampionshipRules` (copa) | zebra possível + exposição | CMP-002 | — | true |
| `CMP-013` | Homologação de competição | Só homologa com partidas concluídas, recursos/punições tratados, desempate calculado e tabela consistente. | resultados · recursos · punições | competição homologada | CMP-017 | INV-5 | false |
| `CMP-014` | Título provisório vs oficial | Celebra-se o campeão em campo, mas o registro oficial aguarda homologação; versões são preservadas. | resultado de campo · homologação | fato provisório vs oficial versionado | CMP-013 | INV-5 | false |
| `CMP-015` | Premiação financeira parcelável/condicionada | Premiação pode ser imediata, parcelada, retida, compensada em dívida ou bônus contratual. | resultado esportivo · regras de prêmio | fluxos de premiação | ECO-014 · CMP-005 | INV-3 | true |
| `CMP-016` | Transição contratual escalonada | A virada não encerra todos os contratos na mesma data; cada vínculo vira no seu marco. | expirações · opções · gatilhos | processamento escalonado | CMP-005 · ECO-016 | INV-1 | false |
| `CMP-017` | Licenciamento competitivo | A divisão exige padrões mínimos (estádio, finanças, elenco, médico…) para conceder a licença. | padrões da divisão · estado do clube | licença ou sanção (plano→multa→rebaixamento) | ECO-011 · CMP-013 | — | true |
| `CMP-018` | Inscrição e elegibilidade por competição | Cada competição tem regras de inscrição (`squadRegistrationLimit`/`foreignPlayerLimit`/`ageLimit`); contratar ≠ poder jogar. | listas · limites · janelas | elegibilidade por jogador | CMP-002 · MAT-024 · ECO-016 | INV-1 · INV-4 | true |
| `CMP-019` | Histórico permanente | Tudo importante é salvo (`PlayerHistory`/`ClubHistory`/`ChampionshipHistory`); a memória do mundo não se apaga. | eventos da temporada | registros históricos imutáveis | CMP-014 · PLY-013 | INV-5 | false |

#### Usuário — `USR-`

| ID | Nome | Descrição | Inputs | Outputs | Dependências | Invariantes | Cfg |
|----|------|-----------|--------|---------|--------------|-------------|-----|
| `USR-001` | Usuário não pode ser demitido | O usuário humano nunca é demitido do clube que controla, independentemente de desempenho. | avaliação da diretoria | vínculo do usuário preservado | CMP-006 | — | false |
| `USR-002` | Usuário é gestor + técnico | O usuário comanda gestão e parte técnica (tática, escalação, decisões ao vivo); a comissão assessora ([R-01](../99-decisoes/registro-de-decisoes.md#r-01--papel-do-usuário-gestor--técnico--ratificada)). | comandos do usuário | autoridade de gestão e técnica | MAT-001 · MAT-011 · `CoachTrust` | — | false |

> **Nota de balanceamento:** as **quantidades** ratificadas que estas regras consomem — caixa inicial (`ECO-001`), alvos da pirâmide etária (`PLY-002`), tetos por divisão (`CMP-010`) e limites de inscrição (`CMP-018`) — são valores de calibração, não decisões de extração. Os alvos numéricos de referência da pirâmide etária (16–20: 25% · 21–24: 25% · 25–29: 30% · 30–34: 15% · 35+: 5%) e da distribuição por posição/qualidade estão em [`03-economia.md §14.5`](../01-game-design/03-economia.md) como sugestões de brainstorming; os demais tetos ficam sob a [Série R](#24-recomendações-de-balanceamento-série-r) ou nos documentos de origem indicados.

---

## 2. Catálogo de Fórmulas

As **fórmulas** são separadas das regras. Enquanto uma regra descreve *o que* deve valer, uma fórmula descreve *como* um valor é calculado. Manter as fórmulas isoladas e parametrizadas permite balancear o jogo sem reescrever o domínio.

### 2.1 Interface `GameFormula`

```ts
interface GameFormula {
  id: string;                          // Identificador estável da fórmula
  version: number;                     // Versão da fórmula (ver 2.2)
  parameters: Record<string, number>;  // Parâmetros de balanceamento
  calculate(input: unknown): unknown;  // Cálculo puro a partir da entrada
}
```

O método `calculate` deve ser uma função **pura e determinística**: dada a mesma entrada e os mesmos `parameters`, produz sempre o mesmo resultado. Isso é essencial para reprodutibilidade e auditoria.

### 2.2 Versionamento de fórmulas

Cada fórmula carrega um campo `version`. Quando o cálculo de uma fórmula muda de forma que altere resultados, incrementa-se a `version` em vez de mutar silenciosamente o comportamento. O versionamento permite:

- Comparar versões do motor sobre o mesmo universo.
- Auditar resultados históricos com a fórmula vigente à época (o registro de eventos guarda `rulesetVersion`).
- Reproduzir bugs e balanceamentos anteriores.
- Evitar divergência entre servidores que rodem versões diferentes.

> **Decisão ratificada — R-24:** `GameFormula.version` é **local** a cada fórmula; `GameWorld.rulesetVersion` é o **carimbo agregado** do conjunto ativo. Proposta de 1ª passada: manter um **manifesto** `{ formulaId → version }` por universo; `rulesetVersion` = `semver` incrementada sempre que **qualquer** `GameFormula.version` do manifesto muda (bump de fórmula ⇒ bump do ruleset). Cada evento persiste `rulesetVersion`; a auditoria recompõe as versões individuais pelo manifesto vigente à época. Assim um servidor recusa processar uma partida cujo `rulesetVersion` não bate com o manifesto que possui, evitando divergência entre servidores.

### 2.3 Fórmulas conceituais previstas

As fórmulas a seguir foram identificadas nas fontes como necessárias. Suas expressões concretas vivem nos documentos de game design (ver [Notas de Ligação](#7-notas-de-ligação)) e ainda precisam ser transcritas para especificação executável.

Os **IDs estáveis** das fórmulas do motor de partida são `F1`–`F21`, fixados na seção [Fórmulas do motor de partida (transcrição)](#fórmulas-do-motor-de-partida-transcrição) — o ID nunca muda depois de atribuído. As fórmulas de **economia** e de **progressão** de jogador ficam sob responsabilidade dos seus documentos de game design (coluna "Fonte / ID"), e são referenciadas aqui por ligação; seus coeficientes serão consolidados junto às respectivas séries quando calibrados.

| Fórmula conceitual          | Domínio            | Fonte / ID estável |
|-----------------------------|--------------------|--------------------|
| Atributo efetivo por lance  | Partidas           | **F1** |
| Fadiga                      | Jogadores/partidas | **F2** |
| Moral / momentum            | Partidas           | **F3**, **F14** |
| Probabilidade de eventos    | Partidas           | **F5**–**F12** (zonas, posse, ataques, duelos, chances, gol, cartão) |
| Risco de lesão              | Jogadores/partidas | **F13** |
| Desempenho / xG / nota      | Partidas           | **F15**, **F16** |
| Impacto da comissão técnica | Partidas/progressão| **F17**–**F19**, **F21** |
| Evolução técnica            | Jogadores          | `Ganho em atributo` — [`02-sistema-de-jogadores.md §6`](../01-game-design/02-sistema-de-jogadores.md) |
| Geração de jogadores        | Jogadores/economia | [`03-economia.md §14.4–14.5`](../01-game-design/03-economia.md) |
| Inflação                    | Economia           | `MarketInflation` — [`03-economia.md §7.1, §14.7, §15.6`](../01-game-design/03-economia.md) |
| Preço de mercado            | Economia/mercado   | `Valor de Mercado` — [`03-economia.md §5.3, §14.6`](../01-game-design/03-economia.md) |
| Receita de clubes           | Economia           | `Receita Mensal` — [`03-economia.md §5.1–5.4`](../01-game-design/03-economia.md) |
| Crescimento estrutural      | Clubes             | `Tamanho Real do Clube` — [`03-economia.md §14.3`](../01-game-design/03-economia.md) |

Com isso, as fórmulas do **motor de partida** têm ID estável (`F1`–`F21`) e as fórmulas de **economia/progressão** têm dono documental. Os **coeficientes** de `F1`–`F21` — inexistentes na fonte — são propostos como recomendação de balanceamento na [§2.4](#24-recomendações-de-balanceamento-série-r).

### 2.4 Recomendações de balanceamento (Série R)

Os valores de calibração das fórmulas do motor são baseline canônica de primeira passada: a fonte fixou apenas a **estrutura** (quais termos somam/subtraem) e alguns exemplos. Cada fórmula `F#` abaixo recebe uma **proposta concreta de 1ª passada** (forma funcional + coeficientes iniciais + faixas/unidades) marcada como `> **Decisão ratificada — R-##:**`, para ser implementável e calibrável. As entradas `R-15`–`R-24` ficam **prontas para o ADR** ([Série R do registro de decisões](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11)); são baseline canônica versionável. A calibração final sai do lote estatístico de ~10.000 partidas (ver a pendência "Calibração estatística do motor" em [`05-motor-de-partida.md §18`](../01-game-design/05-motor-de-partida.md)).

| R | Título | Cobre |
|---|--------|-------|
| **R-15** | Escala dos modificadores e clamp do atributo efetivo | F1 |
| **R-16** | Curva de fadiga → penalidade e risco | F2 |
| **R-17** | Pesos de moral e janela/decaimento de momentum | F3, F14 |
| **R-18** | Mapeamento tático → `TeamTacticalState` e deltas de ação | F4, F20 |
| **R-19** | Normalização somatório → probabilidade/taxa do motor | F5, F6, F7, F8, F9 |
| **R-20** | Qualidade da finalização e **chance de gol** | F10, F11 |
| **R-21** | Faltas, cartões e matriz de lesão | F12, F13 |
| **R-22** | Nota, `decisionScore`, offline e leitura da comissão | F16, F17, F18, F19 |
| **R-23** | Pesos do `staffLevel` e escopo de atributos | F21 |
| **R-24** | Política de versionamento de fórmulas | §2.2 (`GameFormula.version` ↔ `rulesetVersion`) |

**Notação compartilhada** usada nas propostas abaixo:

- **Logística:** `σ(x) = 1 / (1 + e^(−x))` — converte um *score* assinado em probabilidade `∈ (0,1)`.
- **Razão de duelo:** `a / (a + b)` — divide uma disputa entre dois lados (usada em F5, F8).
- **Contagem por tick:** `Poisson(λ)` — sorteia um número de ocorrências dado o valor esperado `λ`.
- **Clamp:** `clamp(x, lo, hi)` — satura em `[lo, hi]`. Atributos operam na escala `0–100`; probabilidades em `0–1`; tick ≈ 1 min (90+ ticks/partida).

---

## Fórmulas do motor de partida (transcrição)

Esta seção transcreve **fielmente** as fórmulas do motor de partida do **Grinta** a partir da fonte de brainstorming (`chats/simulacao-partida.md`, a rodada de detalhamento do cálculo interno). As expressões são **conceituais**: descrevem a estrutura do cálculo (quais termos somam, quais subtraem) e, quando a fonte fornece, o exemplo numérico correspondente.

> **Importante:** a estrutura e os coeficientes de primeira passagem das fórmulas são normativos. Valores identificados como calibráveis só podem mudar por `rulesetVersion`, após os gates R-34/R-88; isso é tuning controlado da implementação, não regra ausente.

Cada fórmula resolve-se por **tick** (bloco curto de simulação, ~1 minuto). O fluxo por tick é: atualizar fadiga → moral → momentum → controle de zonas → posse perigosa → gerar ataques → resolver duelos → criar chances → resolver finalizações → eventos secundários → detectar pontos de decisão → aplicar comandos → salvar estado.

### F1. Atributo efetivo por lance

Nenhum jogador atua com o atributo base fixo: em cada lance o motor calcula um **atributo efetivo**, somando o contexto do lance ao valor base.

```
atributoEfetivo =
    atributoBase
  + moral
  + entrosamento
  + compatibilidadeTática
  + vantagemContextual
  − fadiga
  − pressãoEmocional
  − lesãoLeve
  − climaGramado
```

**Variáveis:** `atributoBase` (nota do jogador para o atributo em jogo, ex.: finalização), `moral`, `entrosamento`, `compatibilidadeTática`, `vantagemContextual` (ex.: chance clara, estar livre de marcação), `fadiga`, `pressãoEmocional`, `lesãoLeve`, `climaGramado`.

**Exemplo (atacante finalizando, base 72 → efetiva 73):**

```
Finalização base:              72
Moral alta:                    +5
Frieza boa:                    +4
Fadiga alta:                   −7
Marcação forte:                −8
Chance clara:                 +10
Pressão de jogo decisivo:      −3
────────────────────────────────
Finalização efetiva:           73
```

O mesmo jogador com finalização 72 poderia finalizar como 80 (confiante e livre) ou 59 (cansado, pressionado e sob chuva). Um jogador de finalização 68, descansado e livre, poderia finalizar como 82 naquela chance. O contexto do lance importa tanto quanto a nota.

> **Decisão ratificada — R-15:** cada modificador entra em **pontos inteiros** sobre `atributoBase` (0–100), com faixas de 1ª passada: `moral ∈ [−8, +8]` · `entrosamento ∈ [−6, +6]` · `compatibilidadeTática ∈ [−6, +6]` · `vantagemContextual ∈ [0, +12]` · `fadiga = −penal_F2` (ver R-16) · `pressãoEmocional ∈ [−6, 0]` · `lesãoLeve ∈ [−10, 0]` · `climaGramado ∈ [−8, +8]`. O efetivo é saturado: `atributoEfetivo = clamp(atributoBase + Σmodificadores, 20, 99)` (piso 20, teto 99). O exemplo da fonte (72 → 73) cai dentro dessas faixas. Calibrar por lote estatístico.

### F2. Fadiga por tick

A fadiga acumula a cada tick e degrada progressivamente velocidade, força em duelos, precisão de passe, concentração, finalização e recomposição, além de **aumentar** risco de lesão, de erro e de cartão por atraso.

```
fadigaPorTick =
    baseDaPosição
  + intensidadeDoTime
  + pressãoAplicada
  + clima
  + gramado
  + açõesIndividuais
  − resistênciaDoJogador
  − preparaçãoFísicaDoClube
```

**Variáveis:** `baseDaPosição` (custo físico da posição), `intensidadeDoTime` (mentalidade/ritmo), `pressãoAplicada` (pressing), `clima`, `gramado`, `açõesIndividuais` (sprints e duelos no tick), `resistênciaDoJogador`, `preparaçãoFísicaDoClube`.

**Exemplo (lateral sob pressão alta, +3.6 no tick):**

```
Base posição:              2.0
Intensidade alta:         +1.5
Clima quente:             +0.8
Muitos duelos:            +0.7
Resistência alta:         −1.0
Preparação física boa:    −0.4
─────────────────────────────
Fadiga no tick:           +3.6
```

Faixas de efeito citadas: ~20% de fadiga → atua quase normal; ~65% → perde intensidade e precisão; ~85% → alto risco de erro, lesão e queda brusca de rendimento.

> **Decisão ratificada — R-16:** **acúmulo** — `fadigaPorTick` soma na faixa `[0, 5]` pontos/tick, com `baseDaPosição` (pontos/tick, 1ª passada): GK 1.0 · ZAG 1.5 · LAT 2.2 · VOL 2.3 · MEI 2.4 · PON 2.6 · ATA 2.3; a fadiga acumulada `f` vive em `0–100`. **Penalidade** sobre atributos físicos/de precisão (curva convexa): `penal_F2(f) = pMax · (f/100)^γ`, com `γ = 2.5` e `pMax = 0.35` (redução máxima de 35% a 100% de fadiga) — dá ≈3,5% a 40%, ≈12% a 65%, ≈20% a 80%, ≈27% a 90%, reproduzindo as três faixas qualitativas. **Risco** (lesão/erro/cartão) sobe por multiplicador separado: `riskMult(f) = 1 + 3 · (max(0, f − 60)/40)^2` (kick-in após 60%, ×4 a 100%). Calibrar `γ`, `pMax` e as bases por posição no lote estatístico.

### F3. Moral atual

A moral oscila durante a partida em função de eventos (gol marcado/sofrido, defesas, chances, cartões, torcida, sequências de domínio ou de pressão) e influencia decisão, frieza, erro técnico, agressividade, disciplina e confiança para driblar/finalizar.

```
moralAtual =
    moralInicial
  + eventosPositivos
  − eventosNegativos
  + liderançaEmCampo
  + gestãoEmocionalDaComissão
  − pressãoDaTorcida
  − importânciaDoJogo
```

**Variáveis:** `moralInicial`, `eventosPositivos` (gol, boa defesa, chance criada, torcida apoiando, domínio, expulsão adversária), `eventosNegativos` (gol sofrido, erro individual, cartão, pênalti perdido, vaias, pressão), `liderançaEmCampo`, `gestãoEmocionalDaComissão`, `pressãoDaTorcida`, `importânciaDoJogo`.

Elenco experiente segura melhor a moral; elenco jovem oscila mais.

> **Decisão ratificada — R-17:** `moralAtual = clamp(moralInicial + Σ (pesoEvento · amplitude), 0, 100)`. Pesos de 1ª passada (pontos): gol marcado **+8** · gol sofrido **−8** · defesaça **+4** · chance clara perdida **−5** · cartão **−3** · expulsão adversária **+6** · vaia/pressão **−4** · virada no placar **+6**. O **fator de experiência** amortece a oscilação (elenco jovem oscila mais): `amplitude = 1 − 0.4 · experiênciaNorm`, com `experiênciaNorm ∈ [0,1]` (0 = muito jovem → amplitude 1.0; 1 = veterano → amplitude 0.6). Compartilha a série **R-17** com o momentum (F14). Calibrar pesos e o fator no lote estatístico.

### F4. Tática efetiva (TeamTacticalState)

A tática do time gera modificadores coletivos, materializados no estado `TeamTacticalState`. Cada escolha tática soma e subtrai propriedades (ex.: mentalidade ofensiva `+ presença ofensiva + volume de ataque − proteção defensiva − estabilidade em transição`; pressão alta `+ recuperação no campo adversário + chance de erro adversário − fadiga − espaço nas costas`; defesa baixa `+ proteção da área + bloqueio central − posse ofensiva − volume sofrido`).

```
TeamTacticalState {
  attackIntent
  defensiveSecurity
  pressingPower
  transitionRisk
  tempo
  compactness
  width
  centralPresence
  wingPresence
}
```

**Exemplo (4-3-3 ofensivo com pressão alta):**

```
attackIntent:        78
pressingPower:       82
defensiveSecurity:   52
transitionRisk:      71
fatigueCost:      alto
```

> **Decisão ratificada — R-18:** cada campo do `TeamTacticalState` (0–100) parte de um **valor-base por formação** e é deslocado por **mentalidade** e **pressão**: `campo = clamp(baseFormação + Δmentalidade + Δpressão, 0, 100)`. Deslocamentos de 1ª passada — mentalidade (muito defensiva … muito ofensiva) move `attackIntent` **±20** e `defensiveSecurity` **∓20**; pressão (baixa … máxima) move `pressingPower` **+0…+25**, `transitionRisk` **+0…+20** e `fatigueCost` **+0…+alto**. O exemplo 4-3-3 ofensivo com pressão alta (attack 78 / pressing 82 / defense 52 / transition 71) fica coerente com base 4-3-3 (≈58/62/72/51) + mentalidade ofensiva (+20/−20) + pressão alta (+20/+20). Compartilha **R-18** com os deltas de ação (F20). Tabela `formação → base` a completar e calibrar.

### F5. Controle de zona e vantagem ofensiva vs defensiva

O campo é dividido em 9 zonas (defesa/meio/ataque × esquerda/centro/direita). Para cada zona o motor calcula a força ofensiva do time e a compara com a força defensiva adversária.

```
zoneControl =
    playersInZoneQuality
  + tacticalSupport
  + numericalAdvantage
  + morale
  + chemistry
  − fatigue
  − opponentPressure
  − instability

vantagemDaZona =
    forçaOfensivaDoTime
  − forçaDefensivaAdversária
```

Forma expandida da força de um setor (ex.: lado direito): `ponta + lateral + meia de apoio + foco ofensivo pelo lado + moral + entrosamento − fadiga − marcação adversária`.

**Exemplo (Time A ataca a direita vs defesa esquerda do Time B, vantagem +42):**

```
Ofensiva (Time A, direita)          Defensiva (Time B, esquerda)
  Ponta direito efetivo:   78          Lateral esquerdo efetivo:  61
  Lateral direito apoio:   66          Zagueiro cobertura:        70
  Meia cobertura:          60          Volante cobertura:         55
  Foco tático no lado:     +8          Fadiga lateral:            −8
  Moral:                   +4          Cartão amarelo:            −4
  ───────────────────────────          ────────────────────────────
  Força ofensiva:         216          Força defensiva:          174

  Vantagem: 216 − 174 = +42  → boa chance de criar por aquele lado
```

A probabilidade de ataque por zona deriva dessa vantagem:

```
probabilidadeDeAtaqueNaZona =
    vantagemDaZona
  + focoTático
  + jogadoresDisponíveis
  + fraquezaAdversária
  + padrãoRecente
  − bloqueioAdversário
```

**Exemplo (lado direito):** vantagem +42, foco tático +10, ponta em boa fase +6, lateral adversário cansado +8 → alta probabilidade de ataques por ali.

> **Decisão ratificada — R-19:** por zona `z`, use a **razão de duelo** para a força relativa: `forçaRelativa_z = forçaOfensiva_z / (forçaOfensiva_z + forçaDefensivaAdv_z)` (exemplo da fonte: 216/(216+174) = 0,554). A **origem do ataque** entre as 9 zonas é sorteada por `softmax(α · forçaRelativa_z)` com `α = 6` (concentra o volume nas zonas de vantagem sem zerar as demais). A `probabilidadeDeAtaqueNaZona` (foco tático, jogadores disponíveis, fraqueza adversária, padrão recente − bloqueio) entra como **bônus aditivo** ao expoente do softmax, em pontos normalizados por 100. A **taxa agregada** de ataques por tick é definida em F7 (R-19). Calibrar `α`.

### F6. Posse e posse perigosa

O motor separa **posse total** de **posse perigosa** — um time pode ter 60% de posse e criar pouco. São duas fórmulas distintas.

```
posse =
    qualidadeDoMeio
  + passe
  + táticaDeControle
  + entrosamento
  + moral
  − pressãoAdversária
  − erroTécnico
  − gramadoRuim

possePerigosa =
    posseEmZonasOfensivas
  + vantagemDeZona
  + criatividade
  + movimentação
  + falhasAdversárias
  − compactaçãoDefensivaAdversária
```

**Estatística derivada:** posse (%) = soma dos ticks controlados por cada time.

> **Decisão ratificada — R-19:** por tick, a **posse** é atribuída ao time com maior `scoreControle` de forma probabilística: `p_posse_time = σ(0.05 · (scoreControle_time − scoreControle_adv))` (empate → 50%); a **posse %** da partida é a fração de ticks controlados por cada time. A **posse perigosa** é a fração de posse que ocorre com ameaça: `possePerigosa = p_posse · σ(0.05 · (scoreOfensivoZona − compactaçãoDefensivaAdv))`, marcando o tick como "perigoso" quando o segundo fator `> 0.5`. Compartilha **R-19**. Calibrar a inclinação `0.05`.

### F7. Ataques esperados por tick

Em cada tick o motor define quantos ataques relevantes podem ocorrer. Nem todo ataque vira chance — muitos morrem em passe errado, desarme ou cruzamento bloqueado.

```
ataquesEsperados =
    ritmoDoJogo
  + mentalidadeOfensiva
  + possePerigosa
  + desorganizaçãoAdversária
  + momentum
  − defesaAdversária
  − baixaIntensidade
```

**Exemplo (qualitativo):** Time A com ritmo alto, posse perigosa alta, adversário cansado e momentum positivo → maior chance de gerar 2 ou 3 ataques relevantes no bloco.

> **Decisão ratificada — R-19:** o número de ataques relevantes por tick é `Poisson(λ)` com média modulada pelo somatório: `λ = clamp(λ0 · (1 + 0.01 · (scoreOfensivo − defesaAdversária)), 0.05, 1.2)`, `λ0 = 0.35` (ataques relevantes/tick). Termos `+` (ritmo, mentalidade ofensiva, posse perigosa, desorganização, momentum) entram em `scoreOfensivo`; termos `−` (defesa, baixa intensidade) em `defesaAdversária`, ambos em pontos 0–100. Com vantagem forte, um bloco de ~5 min rende `λ·5 ≈ 2–3` ataques (bate com o exemplo qualitativo). A distribuição por zona vem de F5; a conversão ataque→chance é F9. Calibrar `λ0` e a sensibilidade `0.01`.

### F8. Duelo

Cada ataque resolve-se por duelos (ex.: ponta × lateral). A chance de vencer é uma razão entre os atributos efetivos dos dois lados.

```
chanceDeVencerDuelo =
    ataqueEfetivo / (ataqueEfetivo + defesaEfetiva)
```

**Variáveis:** `ataqueEfetivo` (drible, velocidade, técnica, imprevisibilidade, moral do atacante), `defesaEfetiva` (marcação, posicionamento, força, concentração, disciplina do defensor).

**Exemplo (ponta 82 vs lateral 64 = 56%):**

```
chance do ponta = 82 / (82 + 64) = 0,5616 ≈ 56%
```

Modificadores aplicados sobre o resultado: `+ vantagem de velocidade + lateral cansado + cartão amarelo no defensor + ajuda de cobertura − clima ruim − gramado ruim`. Com eles o resultado do exemplo poderia subir para ~63%. O duelo não é binário: pode gerar drible completo, cruzamento bloqueado, falta sofrida, perda de bola, escanteio, passe para trás, erro técnico, cartão ou lesão em disputa.

> **Decisão ratificada — R-19:** mantenha a razão-base normativa `p0 = ataqueEfetivo / (ataqueEfetivo + defesaEfetiva)` (exemplo: 82/(82+64) = 0,562). Os modificadores pós-razão (vantagem de velocidade, defensor cansado/amarelado, cobertura, clima/gramado) somam um **ajuste aditivo** limitado: `p = clamp(p0 + Σδ, 0.02, 0.98)`, com cada `δ ∈ [−0.06, +0.06]` e `Σδ ∈ [−0.12, +0.12]` — o exemplo 0,562 → 0,63 corresponde a `Σδ ≈ +0.07`. O desfecho do duelo é multinomial (drible, cruzamento bloqueado, falta, perda, escanteio, erro, cartão, lesão), não binário; `p` pondera o ramo favorável. Compartilha **R-19**. Calibrar as faixas de `δ`.

### F9. Criação de chance e tiers

Depois que o ataque progride, o motor calcula se ele vira chance e de qual qualidade.

```
chanceDeCriar =
    qualidadeDaProgressão
  + criatividade
  + movimentaçãoOfensiva
  + erroDefensivo
  + vantagemNumérica
  + zonaPerigosa
  − compactaçãoAdversária
  − pressãoNoPortador
  − fadigaOfensiva
```

**Tiers de chance:** `chance fraca` · `chance média` · `chance clara` · `chance muito clara`.

**Exemplos de mapeamento (qualitativo):** cruzamento sob pressão → fraca/média; passe infiltrado livre → clara; contra-ataque 3 contra 2 → clara/muito clara; chute de fora → chance baixa, mas pode virar golaço.

> **Decisão ratificada — R-19:** primeiro decida **se** o ataque vira chance: `p_chance = σ(0.06 · (chanceScore − 55))`, onde `chanceScore` (0–100) é o somatório assinado da fórmula. Se virar chance, classifique o **tier** por `chanceScore`: **fraca** `< 35` · **média** `35–55` · **clara** `55–75` · **muito clara** `> 75`. O tier define a base de `tipoDaChance` em F10 e alimenta a estatística "chance clara" (F15). Compartilha **R-19**. Calibrar limiares e a inclinação `0.06`.

### F10. Qualidade da finalização

Quando uma chance nasce, o motor calcula a qualidade da finalização.

```
qualidadeDaFinalização =
    finalizaçãoEfetivaDoJogador
  + frieza
  + tipoDaChance
  + péDominante
  + ângulo
  + distância
  + pressãoDoMarcador
  + fadiga
  + moral
```

> **Observação de sinal:** a fonte lista todos os termos com `+`, mas `distância`, `pressãoDoMarcador` e `fadiga` atuam como penalidades (ver exemplo — valores negativos).

**Exemplo (atacante livre na área):**

```
Tipo da chance:      +25
Distância curta:     +15
Pressão baixa:       +10
Finalização:         +72
Frieza:               +8
Fadiga:               −6
→ finalização efetiva alta
```

**Contraexemplo (chute de longe):** distância −20, pressão −5, chance base menor.

> **Decisão ratificada — R-20:** `qualidadeDaFinalização = clamp(finalizaçãoEfetiva + Σtermos assinados, 0, 100)`. Sinais e escalas de 1ª passada (resolvendo a ambiguidade da fonte): `tipoDaChance ∈ [+0, +25]` (bônus por tier de F9) · `frieza ∈ [0, +8]` · `moral ∈ [−6, +6]` · `ângulo ∈ [−10, +10]` · `péDominante ∈ [−4, +2]` · `distância ∈ [−20, 0]` (**penalidade**) · `pressãoDoMarcador ∈ [−12, 0]` (**penalidade**) · `fadiga = −penal_F2` (**penalidade**). **Base por tipo de chance** (ponto de partida antes dos termos): mano-a-mano 75 · dentro da área 60 · meia-distância 45 · cabeça difícil 30 · chute de fora 25. O exemplo (livre na área, ≈alta) e o contraexemplo (chute de longe, distância −20 / pressão −5) ficam coerentes. Compartilha **R-20** com F11. Calibrar bases e faixas.

### F11. Defesa efetiva e chance de gol

O gol não depende só do atacante: o motor calcula a resposta defensiva (goleiro + cobertura) e combina com a finalização.

```
defesaEfetiva =
    goleiroPosicionamento
  + reflexo
  + confiança
  + visãoDaBola
  + coberturaDefensiva
  + dificuldadeDoChute
  − desvio
  − bolaMolhada
  − marcaçãoAtrapalhandoVisão

chanceDeGol =
    qualidadeDaFinalização
  − defesaEfetiva
  + qualidadeDaChance
  + aleatoriedadeControlada
```

A `aleatoriedadeControlada` opera em três níveis: (1) variação normal (passes/duelos/finalizações), (2) erro humano (fadiga/pressão/concentração), (3) evento raro (frango, gol contra, golaço improvável, lesão precoce, expulsão boba, pênalti polêmico) — o evento raro tem de ser raro mesmo.

**Exemplo (chance de gol 33%):**

```
Qualidade da chance:    35
Finalização efetiva:    74
Defesa/goleiro:         68
Pressão defensiva:      −8
→ chance de gol: 33%   (sorteio dentro dos 33% = gol)
```

Se não for gol: defesa do goleiro, chute para fora, bloqueio, escanteio ou rebote.

> **Decisão ratificada — R-20:** função completa de **chance de gol**, convertendo (finalização, defesa, qualidade da chance) em probabilidade. Primeiro, o *score* linear (a mesma estrutura aditiva da fonte, que reproduz o exemplo exatamente):
>
> ```
> rawScore = (finalizaçãoEfetiva − defesaEfetiva) + qualidadeDaChance + pressãoDefensiva
> ```
>
> Exemplo da fonte: `(74 − 68) + 35 + (−8) = 33`. Em seguida a **normalização logística** (o que faltava), centrada em 50 (o "duelo justo") e ancorada para aproximar os 33% do exemplo (o valor exato sob `pMin`/`pMax` é ≈32,5%, ver abaixo):
>
> ```
> p_gol = pMin + (pMax − pMin) · σ( k · (rawScore − 50) ),   k = 0.042
> ```
>
> onde `finalizaçãoEfetiva`, `defesaEfetiva`, `qualidadeDaChance` ∈ 0–100 e `pressãoDefensiva` é o termo já assinado (ex.: −8). Os limites `pMin = 0.005` e `pMax = 0.98` são o **chão/teto** da camada de aleatoriedade rara (frango/golaço improvável nunca zeram nem cravam o resultado) e **comprimem levemente** a curva, deslocando `p_gol` para dentro desses extremos. Com `k = 0.042`, `pMin = 0.005` e `pMax = 0.98`: `rawScore = 50 → 0,005 + 0,975·σ(0) = 0,4925` (**≈49%** — o "duelo justo" fica logo abaixo de 50% por causa da compressão) e `rawScore = 33 → 0,005 + 0,975·σ(0.042·(−17)) = 0,005 + 0,975·σ(−0,714) ≈ 0,325` (**≈32,5%**, praticamente os 33% qualitativos da fonte). A resolução do lance sorteia `U ~ Uniforme(0,1)`: **gol** se `U < p_gol`; senão, o desfecho (defesa, trave/fora, bloqueio, escanteio, rebote) é sorteado entre os ramos restantes. O **xG** (F15) é a soma dos `p_gol` de cada finalização. `k` é o parâmetro de calibração-chave (quão fortemente a diferença de qualidade separa os desfechos) e sai do lote estatístico. Compartilha **R-20** com F10.

### F12. Chance de falta e de cartão

Faltas nascem de duelos, pressão e agressividade; cartões derivam da gravidade e do contexto.

```
chanceDeFalta =
    agressividadeDoJogador
  + marcaçãoForte
  + atrasoNoDuelo
  + fadiga
  + rivalMaisRápido
  + árbitroRigoroso
  − disciplina
  − concentração

chanceDeCartão =
    gravidadeDaFalta
  + árbitroRigoroso
  + repetiçãoDeFaltas
  + jogadorNervoso
  + contextoDoLance
  − disciplina
```

**Exemplo (qualitativo):** volante cansado, com amarelo, marcando forte → alto risco de segunda falta perigosa → gera ponto de decisão ("Seu volante está pendurado e chegando atrasado. Reduzir agressividade ou substituir?").

> **Decisão ratificada — R-21:** por duelo físico, `p_falta = σ(0.06 · (faltaScore − 50))`, onde `faltaScore` (0–100) é o somatório assinado (agressividade, marcação forte, atraso, fadiga, rival mais rápido, árbitro rigoroso − disciplina − concentração). Havendo falta, `p_cartão | falta = σ(0.08 · (cartãoScore − 55))`; o **segundo amarelo** soma `+15` ao `cartãoScore` de um jogador já pendurado (contexto crítico → ponto de decisão). O `árbitroRigoroso` desloca o offset de ambos os limiares em `±8`. Compartilha **R-21** com F13. Calibrar inclinações e offsets.

### F13. Risco de lesão

A lesão não é puramente aleatória: depende de **risco acumulado**.

```
riscoDeLesão =
    históricoFísico
  + fadiga
  + intensidade
  + clima
  + gramado
  + númeroDeSprints
  + númeroDeDuelos
  + idade
  − preparaçãoFísica
  − equipeMédica
```

**Tipos de lesão:** `leve` · `moderada` · `grave` · `por pancada` · `muscular` · `recorrente`.

**Exemplo (qualitativo):** jovem, descansado, gramado bom → baixo risco; jogador velho, 85% de fadiga, chuva, pressão alta → risco alto. A equipe médica influencia detecção precoce, risco real, tempo de recuperação e chance de agravar se o jogador seguir em campo.

> **Decisão ratificada — R-21:** **incidência** por tick — `p_lesão = clamp(baseRate · riskMult_F2(f) · (1 + 0.01 · (riscoScore − 50)), 0, 0.02)`, com `baseRate = 0.0004` (≈3,6% de lesão numa partida-base de 90 ticks), `riskMult_F2` vindo de R-16 e `riscoScore` (0–100) o somatório assinado (histórico, fadiga, intensidade, clima, gramado, sprints, duelos, idade − preparação − equipe médica). **Matriz de tipo** — quando dispara uma lesão, sorteia-se o tipo por pesos-base `{ leve 45, moderada 30, grave 12, muscular 8, por pancada 3, recorrente 2 }`, ajustados por contexto (multiplicativos, depois renormalizados): `muscular ×2` se `fadiga > 70`; `por pancada ×3` se o lance foi contato/duelo; `recorrente ×3` se há histórico na região; `grave ×1.5` se `idade > 32`. A equipe médica reduz `p_lesão` (via `riscoScore`) e o tempo/risco de agravamento. Compartilha **R-21** com F12. Calibrar `baseRate`, sensibilidade e pesos.

### F14. Momentum

O momentum representa o momento psicológico/tático. Sobe com gol marcado, sequência de ataques, torcida apoiando, adversário errando, duelos vencidos e mudança tática bem-sucedida; cai com gol sofrido, chance clara perdida, erro individual, vermelho, pressão adversária e fadiga coletiva.

```
momentum =
    eventosRecentes
  + controleTerritorial
  + moralColetiva
  + apoioDaTorcida
  + domínioDeZonas
  − fadiga
  − pressãoAdversária
```

O momentum não faz gol sozinho: aumenta a chance de gerar ataques (F7) e de vencer duelos próximos (F8).

> **Decisão ratificada — R-17:** momentum como **média móvel exponencial** em `[−100, +100]`: `momentum_t = clamp(ρ · momentum_{t−1} + Σ eventos_t, −100, +100)`, com fator de decaimento `ρ = 0.9` por tick (meia-vida ≈ 6–7 ticks ≈ "eventos recentes" dos últimos ~7 min). Contribuições de evento (mesma tabela de pesos de R-17/F3, controle territorial, apoio da torcida − fadiga − pressão adversária). O momentum **não faz gol**: entra como bônus em `scoreOfensivo` de F7 (`+0.1 · momentum`) e no ajuste de duelo de F8. Compartilha **R-17** com a moral (F3). Calibrar `ρ` e o acoplamento.

### F15. xG

O **xG** (expected goals) é a **soma das probabilidades de gol de cada finalização** do time na partida.

```
xG_time = Σ chanceDeGol(finalização_i)
```

**Exemplo:**

```
Chute com 0.32 de chance de gol:   xG += 0.32
Chute de fora com 0.04:            xG += 0.04
Cabeçada difícil com 0.10:         xG += 0.10
...
Final →  Time A xG: 1.84   |   Time B xG: 0.92
```

O xG ajuda a explicar se o resultado foi justo. Estatísticas irmãs saem dos mesmos eventos: finalização (chance vira chute), finalização no alvo (chute exige defesa ou vira gol), chance clara (`qualidadeDaChance` passa de um limite), escanteio, falta (duelo físico).

### F16. Nota do jogador

A nota nasce das ações, com critérios **por posição**, e é ajustada por **expectativa**.

```
Atacante:  + gol  + assistência  + chance criada  + finalização no alvo
           + duelos ofensivos vencidos
           − chance clara perdida  − impedimentos  − perdas de bola

Zagueiro:  + cortes  + duelos vencidos  + bloqueios  + interceptações
           − erro que gera chance  − falha em gol  − cartão

Goleiro:   + defesas difíceis  + pênalti defendido  + saída segura
           − falha  − gol evitável sofrido

Meia:      + passes-chave  + controle de posse  + assistências
           + recuperação de bola
           − passes perigosos errados  − sumir do jogo
```

**Ajuste por expectativa:** um zagueiro sob ataque muito forte pode tirar nota alta mesmo sofrendo pressão; um atacante pode marcar gol e ainda ter nota média se perdeu muitas chances.

> **Decisão ratificada — R-22:** `nota = clamp(6.0 + Σ (ação · peso) − Σ penalidades + ajusteExpectativa, 0.0, 10.0)`, nota-base **6.0**. Pesos por ação (1ª passada, aplicados conforme os critérios por posição da fonte): gol **+1.2** · assistência **+0.8** · chance criada **+0.4** · finalização no alvo **+0.3** · duelo vencido **+0.15** · defesaça (GK) **+1.0** · pênalti defendido **+1.5**; penalidades: chance clara perdida **−0.6** · erro que gera gol **−1.5** · falha em gol **−1.2** · cartão vermelho **−1.5** · perda de bola **−0.1**. O **ajuste por expectativa** ∈ `[−1.0, +1.0]` compara o desempenho ao contexto (zagueiro sob ataque muito forte ganha; atacante que perdeu muitas chances perde), via `ajusteExpectativa = 0.5 · (desempenhoNorm − dificuldadeNorm)`. Compartilha **R-22**. Calibrar pesos e o ajuste.

### F17. decisionScore e limiares

O motor gera sinais brutos por tick (ex.: `leftSideThreat = 82`, `midfieldLoss = 67`, `injuryRiskPlayer8 = 76`, `yellowCardRiskPlayer5 = 84`, `opportunityRightWing = 79`) e decide se cada um vira **ponto de decisão**.

```
decisionScore =
    severidade
  + urgência
  + tendênciaRecente
  + impactoPotencial
  + capacidadeDeAção
  − ruído
```

**Limiares (motor bruto):**

```
decisionScore > 70     → gera ponto de decisão
decisionScore 40–70    → observação interna
decisionScore < 40     → ignora
```

**A comissão altera o limiar:**

```
Comissão nível 1 → só alerta acima de 85, e tarde
Comissão nível 5 → alerta acima de 60 se o padrão for consistente e houver ação útil
```

Complemento (§26 da fonte — chance de detectar por nível): nível 1 ≈ 35% (mensagem genérica, tarde), nível 3 ≈ 65% (quando o padrão fica claro), nível 5 ≈ 90% (antes de virar chance clara, com sugestões detalhadas).

> **Decisão ratificada — R-22:** `decisionScore = clamp(Σ w_i · fator_i, 0, 100)` com pesos de 1ª passada `severidade 0.30 · urgência 0.20 · tendênciaRecente 0.15 · impactoPotencial 0.20 · capacidadeDeAção 0.15 − ruído` (ruído subtraído, 0–100 cada). Limiares brutos da fonte preservados (`>70` gera ponto de decisão · `40–70` observação · `<40` ignora). **Curva nível → limiar** (linear entre os extremos da fonte): `limiar(nível) = 90 − 6 · (nível − 1)` → nível 1 ≈ 90 (só o óbvio, tarde), nível 5 = 66 (≈60 com padrão consistente). **Chance de detecção por nível:** `p_det(nível) = 0.35 + 0.1375 · (nível − 1)` → n1 ≈ 35%, n3 ≈ 62%, n5 = 90% (bate com a fonte: 35/65/90). Compartilha **R-22**. Calibrar pesos e as duas curvas.

### F18. offlineDecisionQuality

Quando o usuário está ausente, a qualidade da IA que decide por ele é calculada assim:

```
offlineDecisionQuality =
    nívelDaComissão
  + autonomiaPermitida
  + clarezaDoPlanoPréJogo
  + leituraTática
  + comunicação
  − pressãoDoJogo
  − complexidadeDaSituação
```

Qualidade baixa → só ações seguras (substituir lesionado, reorganizar após expulsão). Qualidade alta → ações inteligentes (ajustar bloco, explorar setor, proteger jogador pendurado, alterar ritmo). O motor offline consulta, em ordem: existe emergência? existe regra no plano pré-jogo? a comissão tem qualidade para agir? a ação é segura? o risco de não agir supera o de agir?

> **Decisão ratificada — R-22:** `offlineDecisionQuality = clamp(Σ w_i · fator_i − pressãoDoJogo − complexidadeDaSituação, 0, 100)`, pesos de 1ª passada `nívelDaComissão 0.30 · autonomiaPermitida 0.15 · clarezaDoPlano 0.15 · leituraTática 0.20 · comunicação 0.10` (penalidades subtraídas em pontos 0–100). **Limiar de comportamento:** `< 60` → apenas ações seguras (substituir lesionado, reorganizar após expulsão); `≥ 60` → ações inteligentes (ajustar bloco, explorar setor, proteger pendurado, alterar ritmo). O fluxo de consulta offline (emergência? plano? qualidade? segurança? risco de não agir?) permanece o gate lógico. Compartilha **R-22**. Calibrar pesos e o limiar 60.

### F19. Qualidade da leitura e impacto da sugestão

Duas fórmulas conceituais da comissão técnica (§26–27 da fonte).

```
qualidadeDaLeitura =
    leituraTáticaDaComissão
  + familiaridadeComElenco
  + entrosamentoDaComissão
  + dadosDisponíveis
  + nívelDeAnáliseDoClube
  − pressãoDoJogo
  − caosDaPartida
  − mudançasRecentes

impactoDaSugestão =
    adequaçãoAoProblema
  + capacidadeDosJogadoresExecutarem
  + comunicaçãoDaComissão
  + tempoDisponívelParaEncaixar
  + compatibilidadeComTáticaBase
  − fadiga
  − pressãoEmocional
  − resistênciaDoAdversário
  − instabilidadePorMudançasExcessivas
```

**Exemplo (qualitativo):** final de campeonato, estádio cheio, jogador expulso e chuva forte → mesmo uma comissão boa tem leitura menos precisa porque o jogo está caótico (mantém imprevisibilidade). Uma sugestão boa ainda depende do elenco executá-la.

> **Decisão ratificada — R-22:** ambas são médias ponderadas 0–100 passadas por logística para virar probabilidade de acerto/execução. `qualidadeDaLeitura = clamp(Σ w_i·fator_i − caos, 0, 100)` (pesos: leituraTática 0.30 · familiaridadeElenco 0.15 · entrosamentoComissão 0.15 · dados 0.15 · nívelDeAnálise 0.15 · comunicação 0.10; menos pressão/caos/mudanças) → `p_lerCerto = σ(0.06·(qualidadeDaLeitura − 55))`. `impactoDaSugestão = clamp(Σ w_i·fator_i − resistências, 0, 100)` (adequação 0.30 · capacidadeDeExecutar 0.25 · comunicação 0.15 · tempoParaEncaixar 0.15 · compatibilidade 0.15; menos fadiga/pressão/adversário/instabilidade) → ganho aplicado `= (impactoDaSugestão/100) · efeitoNominalDaAção`. Compartilha **R-22**. Calibrar pesos e inclinações.

### F20. Deltas internos de uma ação

Uma decisão do usuário/IA aplica deltas diretos sobre o estado interno da simulação, que valem nos próximos ticks. Cada ação carrega benefício, custo, tempo de encaixe, risco e duração.

**Exemplo (usuário manda "dar cobertura com volante no lado esquerdo"):**

```
leftSideDefensiveStrength     += 12
centralMidfieldControl        −= 6
defensiveMidfielderFatigueRate += 0.4
leftBackDuelPenalty           −= 8
```

Efeitos qualitativos correspondentes: `+ defesa no lado esquerdo`, `+ proteção ao lateral`, `− presença no meio central`, `− saída de bola central`, `+ fadiga do volante`. Como resposta, o adversário pode insistir com menos sucesso, mudar para o centro, inverter o jogo ou perder momentum.

> **Decisão ratificada — R-18:** cada ação tática aplica **deltas assinados** sobre campos de estado interno, com magnitude típica `±[5, 15]` pontos por campo (fadiga em `±[0.2, 0.5]`/tick). O efeito **rampa linearmente** na janela de encaixe `t_encaixe = 2–5 min` (0% no comando → 100% ao fim da janela) e tem **duração ideal 10–15 min** para intensidades altas (ex.: "pressão alta"), após a qual o custo de fadiga passa a superar o ganho. O exemplo da fonte (cobertura com volante: `leftSideDefensiveStrength += 12` · `centralMidfieldControl −= 6` · `defensiveMidfielderFatigueRate += 0.4` · `leftBackDuelPenalty −= 8`) é a linha-base do catálogo. Compartilha **R-18** com F4. O **catálogo completo** de ações → deltas fica como tabela de dados a preencher e calibrar (uma linha por ação disponível).

### F21. staffLevel (média ponderada)

O nível geral da comissão técnica é uma média ponderada de seus atributos (§3 da fonte, rodada C).

```
staffLevel =
    tacticalReading      * 0.25
  + communication        * 0.15
  + emotionalManagement  * 0.15
  + physicalPreparation  * 0.15
  + substitutions        * 0.15
  + adaptability         * 0.15
```

**Observação:** os pesos citados somam **1.00** (0.25 + 0.15×5). A fonte ressalva que o ideal **não** é usar apenas o nível geral: cada atributo (incluindo os não ponderados no exemplo, como `offensiveTraining`, `defensiveTraining`, `setPieces`, `offlineAutonomy`) deve impactar sistemas diferentes.

> **Decisão ratificada — R-23:** manter os **seis pesos da fonte** (que somam 1.00): `tacticalReading 0.25 · communication 0.15 · emotionalManagement 0.15 · physicalPreparation 0.15 · substitutions 0.15 · adaptability 0.15`. `offlineAutonomy`, `offensiveTraining`, `defensiveTraining` e `setPieces` **não** entram no `staffLevel` agregado: operam em **subsistemas dedicados** (respectivamente autonomia da IA offline em F18, treino/progressão em `PLY-007`, e especialização de bola parada), evitando dupla contagem. O `staffLevel` é um resumo para exibição/thresholds; cada atributo impacta o seu sistema-alvo diretamente. Calibrar se algum treino deve reentrar com peso pequeno.

---

## 3. Máquinas de Estado

As máquinas de estado definem os ciclos de vida das entidades temporais do jogo. Transições que não aparecem no diagrama são proibidas e devem ser rejeitadas pelo domínio.

### 3.1 Partida

```
SCHEDULED
  → PRE_MATCH
    → LIVE
      → PAUSED_FOR_DECISION
        → LIVE
      → FINISHED
        → PROCESSED
```

| Estado                | Significado |
|-----------------------|-------------|
| `SCHEDULED`           | Partida agendada no calendário; ainda não iniciada. |
| `PRE_MATCH`           | Preparação: escalações e táticas iniciais confirmadas. |
| `LIVE`                | Partida em andamento, simulada em intervalos pequenos. |
| `PAUSED_FOR_DECISION` | Pausa em ponto de decisão para intervenção tática (ver `MAT-001`). Retorna a `LIVE`. |
| `FINISHED`            | Partida encerrada; resultado definido. |
| `PROCESSED`           | Consequências aplicadas: classificação, físico/mental, finanças, eventos. |

O ciclo `LIVE → PAUSED_FOR_DECISION → LIVE` pode ocorrer múltiplas vezes durante a mesma partida. Uma vez em `FINISHED`, a partida jamais retorna a `LIVE` (ver [INV-2](#5-invariantes)).

### 3.2 Temporada

```
PLANNING
  → REGISTRATION
    → IN_PROGRESS
      → FINALIZING
        → OFF_SEASON
          → COMPLETED
```

| Estado         | Significado |
|----------------|-------------|
| `PLANNING`     | Definição de competições, formatos e calendário da temporada. |
| `REGISTRATION` | Inscrição de clubes e ajustes de elenco pré-temporada. |
| `IN_PROGRESS`  | Temporada em curso; rodadas e partidas sendo disputadas. |
| `FINALIZING`   | Encerramento de competições, apuração de classificação, promoção/rebaixamento e premiação. |
| `OFF_SEASON`   | Período entre temporadas: aposentadorias, geração de jogadores, mercado. |
| `COMPLETED`    | Temporada concluída; estado consistente para iniciar a próxima. |

---

## 4. Eventos de Domínio

Os eventos de domínio formam o registro imutável do que aconteceu no universo. São a base para notificações, narrativa, histórico, partidas ao vivo, auditoria, estatísticas, replay e processamento assíncrono. Este catálogo consolida os eventos **derivados** do context map ([`../02-tecnico/12-context-map-e-blueprint.md §5`](./12-context-map-e-blueprint.md)), das máquinas de estado ([`./14-maquinas-de-estado.md`](./14-maquinas-de-estado.md)) e dos 43 commands ([`./10-catalogo-de-commands.md`](./10-catalogo-de-commands.md)) — nenhum evento é inventado aqui: todo evento tem um **produtor rastreável** (command, transição de máquina de estado ou job).

### 4.1 Convenção: evento interno × integration event

Regras de contrato de evento (derivadas de [`./12-context-map-e-blueprint.md §5.2`](./12-context-map-e-blueprint.md)):

- **Nome:** `PascalCase` no **passado** — um evento descreve um fato **consumado** ("aconteceu"). Pedir ação a outro contexto é **command/saga**, nunca evento.
- **Integration event** = evento que **cruza fronteira de bounded context** (tem consumidor em outro contexto). Publicado pela **Outbox** na **mesma transação** do agregado, transportado com `aggregateVersion` (ordem por agregado) e `worldSequence` (ordem por mundo). Garantia **`AT_LEAST_ONCE`** + idempotência de consumo (Inbox).
- **Evento interno** = fato de um agregado consumido **só dentro do próprio contexto** (ou projeção da partida ao vivo). Não entra no barramento público; **pode ser promovido** a integration event sem quebra (só ganha um consumidor externo).
- **Registry versionado:** todo evento entra no **event registry** (`/packages/contracts`, análogo do apêndice de errorCodes do doc 10) com `eventVersion` (começa em `v1`), produtor, schema Zod do payload e consumidores declarados. Mudança **incompatível** de payload **incrementa `eventVersion`** — nunca muta o schema silenciosamente. Payload **autocontido**: carrega os IDs suficientes para o consumidor agir sem *callback* síncrono ao produtor.
- **Envelope de persistência:** `id`, `gameWorldId`, `aggregateType`, `aggregateId`, `eventType`, `eventVersion`, `gameDate`, `sequence` (`worldSequence`/`clubSequence`/`matchSequence`), `payload`, `rulesetVersion`, `createdAt`. O `rulesetVersion` sustenta o **replay determinístico** ([INV-28](#5-invariantes)).

Na coluna **v** das tabelas, `v1` é a versão inicial do schema; **todos** os eventos são versionáveis pelo registry (a coluna registra a versão vigente, não se é ou não versionável). Contextos: **C1** Identidade · **C2** Mundo/Temporada · **C3** Clube/Estrutura · **C4** Jogador/Desenvolvimento · **C5** Staff · **C6** Mercado/Contratos · **C7** Competição/Calendário · **C8** Partida/Runtime · **C9** Economia/Ledger · **C10** Torcida/Narrativa · **C11** Notificação/Relatório · **C12** Anti-abuso/Admin.

### 4.2 Integration events (cruzam fronteira de contexto)

Os eventos públicos essenciais (produtor → consumidores), com o **payload mínimo** que torna cada um autocontido. As 24 famílias abaixo correspondem às linhas de [`./12-context-map-e-blueprint.md §5.1`](./12-context-map-e-blueprint.md); algumas agrupam nomes irmãos (`...Opened`/`...Closed`, `...Fulfilled`/`...Broken`).

| Evento | Payload essencial | Produtor (contexto · agregado) | Consumidores (contexto : reação) | v |
|---|---|---|---|---|
| `ClubControlActivated` | `controlId, clubId, participantId, inheritedState` | C1 · `ClubControl` | C3 liga controlador · Automação cede IA · C11 notifica · C12 registra | v1 |
| `ClubLeft` | `controlId, clubId, participantId, cooldownUntil` | C1 · `ClubControl` | C3 desliga · Automação assume IA · C11 · C12 | v1 |
| `AiControlAssumed` | `clubId, reason, sinceGameDate` | C1 · `ClubControl` | Automação assume · C3 · C11 | v1 |
| `WorldDayAdvanced` | `gameWorldId, gameDate, worldSequence` | C2 · `WorldClock` | C4 aging/treino · C6 expira contratos/ofertas · C9 folha/juros · C7 rodadas devidas · C8 dispara partidas do dia | v1 |
| `SeasonRolledOver` | `seasonId, nextSeasonId, standingsRef` | C2 · `Season` | C7 nova edição/fixtures · C9 fechamento · C4 aging/aposentadoria/safra · C3 metas/orçamento · C11 relatório | v1 |
| `TransferWindowOpened` / `...Closed` | `gameWorldId, windowType, opensAt`/`closesAt` | C2 · `WorldClock` | C6 habilita/inibe ofertas · C11 | v1 |
| `RegistrationWindowOpened` / `...Closed` | `gameWorldId, competitionEditionId, window` | C2 · `WorldClock` | C7 habilita/fecha inscrição · C11 | v1 |
| `DepartmentUpgradeCompleted` | `clubId, departmentType, newLevel` | C3 · `ClubDepartment` | C5 nova capacidade · C4 multiplicadores · C9 baixa reserva · C10 expectativa | v1 |
| `StadiumWorksCompleted` | `clubId, projectId, newCapacity` | C3 · `InfrastructureProject` | C9 baixa reserva · C10 pressão/expectativa · C11 | v1 |
| `CommercialDealSigned` | `clubId, sponsorId, value(Money), seasons, obligations` | C3 · `SponsorshipAgreement` | C9 receita/obrigação no ledger · C11 | v1 |
| `YouthPlayerPromoted` | `playerId, clubId, contractRef` | C4 · `Player` | C6 `ContractSigned` do jovem · C3 squad · C7 elegibilidade | v1 |
| `PlayerInjured` | `playerId, clubId, severity, expectedReturnAt, matchId?` | C4 · `PlayerInjury` | C8 elegibilidade · C6 valor/negociação · C10 narrativa · C11 | v1 |
| `PlayerRecovered` | `playerId, injuryId, recoveredAt` | C4 · `PlayerInjury` | C8 elegibilidade · C6 · C10 · C11 | v1 |
| `PlayerRetired` | `playerId, personId, reason, gameDate` | C4 · `Player` | C6 encerra contrato/vínculo · C7 baixa inscrição · Youth (equação demográfica) · C11 histórico | v1 |
| `StaffCapacityChanged` (`StaffHired`/`StaffReleased`) | `clubId, staffId, role, capacitySnapshot` | C5 · `StaffContract` | C4 treino/medicina · C6 scouting · C8 comissão · C9 folha | v1 |
| `TransferAgreementReached` (`OfferAccepted`) | `transferCaseId, playerId, buyerClubId, sellerClubId?, agreedTerms` | C6 · `TransferCase` | **SAGA-01** dispara exame/contrato/registro/liquidação · C10 · C11 | v1 |
| `TransferSigned` / `TransferCompleted` | `transferCaseId, playerId, fromClubId, toClubId, fee(Money), scheduleRef` | C6 · `TransferCase` | C4/C3 projeta vínculo/squad · C9 reserva→`Payment` · C7 reabre inscrição · C10/C11 | v1 |
| `ContractSigned` / `ContractRenewed` / `ContractExpired` | `contractId, playerId, clubId, salary(Money), startSeason, endSeason` | C6 · `PlayerContract` | C9 folha · C3 squad/projeção · C4 satisfação · C7 elegibilidade · C11 | v1 |
| `PlayerLoaned` | `playerId, ownerClubId, destClubId, seasons, salaryShareBps, clauses` | C6 · `PlayerLoanAgreement` | C3(destino) squad · C9 divisão salarial · C7 inscrição destino · C11 | v1 |
| `MatchScheduled` / `FixturesGenerated` | `matchId(s), competitionEditionId, homeClubId, awayClubId, kickoffAt` | C7 · `CompetitionSeason` | C8 cria `Match`/agenda runtime · C2 prazos no scheduler · C11 calendário | v1 |
| `CompetitionEditionHomologated` / `QualificationDetermined` | `competitionEditionId, finalStandings, champions, qualifications` | C7 · `CompetitionSeason` | C9 premiação/cotas · C3 reputação/metas · C4 convocação/valor · C11 histórico/títulos | v1 |
| `MatchFinished` | `matchId, score, events[], playerStats[], resultStatus` | C8 · `MatchResult` | **fan-out**: C7 standings/suspensão · C4 física/lesão/desenvolvimento · C9 bilheteria/premiação · C10 narrativa · C11 stats | v1 |
| `GoalScored` / `CardIssued` / `SubstitutionMade` | `matchId, minute, playerId, teamId, detail` | C8 · `MatchRuntime` | C10 narrativa ao vivo · C11 timeline/stream · (C7 disciplina consolida em `MatchFinished`) | v1 |
| `FinancialReservationCreated` | `reservationId, clubId, amount(Money), purpose` | C9 · `FinancialReservation` | C6/C3 confirma compromisso · C11 | v1 |
| `FinancialCrisisRaised` / `RecoveryPlanImposed` | `clubId, severity, planTargets` | C9 · `ClubFinanceSnapshot` | C3 aplica plano/limita ações · Automação ajusta política · C11 | v1 |
| `WagesPaid` / `LedgerEntryPosted` | `clubId, journalEntryId, amount(Money), sinkAccount?` | C9 · `LedgerTransaction` | C3 snapshot financeiro · C11 histórico/relatório | v1 |
| `PublicPromiseMade` / `PromiseFulfilled` / `PromiseBroken` | `promiseId, clubId, targets, verifiedAt?` | C10 · `PublicPromise` | C4 moral/satisfação · C3 reputação · C11 | v1 |
| `SupporterSatisfactionChanged` | `clubId, delta, drivers` | C10 · `SupporterSatisfaction` | C9 receita de torcida/bilheteria · C3 pressão/expectativa | v1 |
| `RiskFlagRaised` / `AntiAbuseQuarantineApplied` | `caseId, subjectRef, riskScore, scope` | C12 · `AntiAbuseCase` | C6 bloqueia negociação · C1 cooldown · C11 · Automação suspende | v1 |
| `AdministrativeCorrectionApplied` / `SanctionApplied` | `correctionId, targetRef, before, after, reason, operatorId` | C12 · `AdministrativeCorrection`/`Sanction` | contexto-alvo aplica correção · C11 · **sempre** com `GameAuditLog` | v1 |

### 4.3 Eventos internos (não cruzam fronteira, por ora)

Fatos de um agregado consumidos **dentro do próprio contexto** (ou projeções da partida ao vivo). Emitidos por command/transição/job; **não** publicados no barramento público, mas persistidos e versionados igualmente. Cada um pode ser promovido a integration event (§4.1) ao ganhar um consumidor externo. Coluna "Produtor" = agregado · gatilho (command `10-*` ou transição da máquina `14-*`).

**C1 · Identidade / onboarding**

| Evento | Payload essencial | Produtor (agregado · gatilho) | v |
|---|---|---|---|
| `ClubSlotReserved` / `ClubEntryReservationOpened` | `reservationId, participantId, clubId?, ttlUntil` | `WorldEntryProcess` · `ReserveClubSlot` | v1 |
| `ClubExpansionRequested` / `ExpansionClubConfigured` | `projectId, participantId, config` | `ClubExpansionProject` · `CreateClub` | v1 |
| `ClubCreated` | `clubId, regionId, name, slug` | `Club` (C3) · `CreateClub`/`ActivateClubControl` — *bridge C1→C3, promovível* | v1 |
| `ClubOnboardingStarted` | `clubId, controlId` | `ClubControl` · `ActivateClubControl` (SAGA-03) | v1 |
| `AccountCooldownStarted` | `participantId, reason, until` | `WorldParticipant` · `LeaveClub`/sanção | v1 |

**C2 · Mundo / Temporada (ciclo de vida — `SeasonRolledOver` e janelas são os integration umbrellas)**

| Evento | Payload essencial | Produtor (agregado · gatilho) | v |
|---|---|---|---|
| `WorldCreated` / `WorldActivated` | `gameWorldId, seed, rulesetVersion` | `GameWorld` · M1-1 — *genesis: fan-out para `SYS_INITIAL_ENDOWMENT` (C9), clubes (C3), jogadores (C4)* | v1 |
| `WorldPaused` / `WorldResumed` | `gameWorldId, reason` | `GameWorld` · M1-2/M1-3 | v1 |
| `WorldFinished` / `WorldArchived` / `WorldRestored` | `gameWorldId, reason` | `GameWorld` · M1-4..M1-7 *(`WorldArchived`/`WorldRestored` BASELINE RATIFICADA — R-56)* | v1 |
| `SeasonPlanned` / `SeasonStarted` / `SeasonRunInEnded` | `seasonId, phase` | `Season` · S2-1..S2-3 | v1 |
| `SeasonSportingClosed` / `SeasonCompleted` / `SeasonBootstrapped` | `seasonId, nextSeasonId?` | `Season` · S2-4..S2-6 (SAGA-02) | v1 |

**C3 · Clube / Estrutura**

| Evento | Payload essencial | Produtor (agregado · gatilho) | v |
|---|---|---|---|
| `DepartmentUpgradeStarted` | `clubId, departmentType, targetLevel, reservationId` | `ClubDepartment` · `UpgradeDepartment` | v1 |
| `StadiumWorksStarted` / `ConstructionAgreementSigned` | `clubId, projectId, contractorId, budget(Money)` | `InfrastructureProject` · `StartStadiumWorks` (SAGA-04) | v1 |
| `TicketPricesSet` | `clubId, prices[]` | `TicketPricePolicy` · `SetTicketPrices` | v1 |
| `MaintenanceScheduled` | `facilityId, type, scheduledFor` | `MaintenancePlan` · `ScheduleMaintenance` | v1 |
| `BudgetSet` / `BudgetRevisionCreated` | `clubId, seasonId, allocations[]` | `Budget` · `SetBudget` | v1 |
| `TransferStrategySet` | `clubId, seasonId, stance, maxSpend(Money)?` | `Club`/`TransferStrategy` · `SetTransferStrategy` | v1 |
| `ClubIdentityApplied` / `ClubIdentityPeriodOpened` | `clubId, crestAssetId?, colors?` | `Club`/`ClubIdentityPeriod` · `ApplyClubIdentity` | v1 |
| `BoardResponded` / `BoardPromiseMade` | `clubId, boardMessageId, commitments?` | `BoardPromise`/`ClubGovernance` · `RespondToBoard` | v1 |
| `OfflinePlanSet` / `AutomationSaved` / `AutomationToggled` | `clubId, ruleId?, level, status?` | `ClubAIProfile`/`AutomationRule` · `SetOfflinePlan`/`SaveAutomation`/`ToggleAutomation` | v1 |

**C4 · Jogador / Desenvolvimento / Medicina**

| Evento | Payload essencial | Produtor (agregado · gatilho) | v |
|---|---|---|---|
| `PlayerGenerated` | `playerId, personId, source, cohort` | `Player` · job de geração (única origem — INV-6) | v1 |
| `PlayerPromoted` / `YouthReleased` / `LoanStarted` | `playerId, clubId` | `Player` · P4B-2/P4B-3 | v1 |
| `RetirementConsidered` / `RetirementPostponed` | `playerId, factors` | `Player` · P4B-4/P4B-6 | v1 |
| `TrainingPlanSet` / `TrainingPlayerEntryUpdated` | `clubId, planId, focus, entries[]` | `TrainingPlan` · `SetTrainingPlan` | v1 |
| `PlayerCareerPlanSet` | `playerId, developmentTrack, mentoringStaffId?` | `PlayerDevelopment` · `SetPlayerCareerPlan` | v1 |
| `MedicalPlanSet` | `playerId, injuryId, treatmentOption` | `PlayerInjury` · `SetMedicalPlan` | v1 |
| `InjurySuspected` / `MedicalExamOrdered` / `InjuryDiagnosed` | `playerId, injuryId, severity?` | `PlayerInjury` · MED-1..MED-3 | v1 |
| `RehabStarted` / `RehabStageAdvanced` / `ReturnedToTraining` | `playerId, injuryId, stage` | `PlayerInjury` · MED-4..MED-6 | v1 |
| `MedicallyCleared` / `DiagnosisRevised` | `playerId, injuryId` | `PlayerInjury` · MED-7/MED-9 — *`MedicallyCleared` é **server-side** (C-07)* | v1 |

**C5 · Staff** — `StaffContractSigned` / `StaffContractTerminated` (`StaffContract` · `HireStaff`/`ReleaseStaff`; capacidade agregada sai por `StaffCapacityChanged`, §4.2). `v1`

**C6 · Mercado / Contratos**

| Evento | Payload essencial | Produtor (agregado · gatilho) | v |
|---|---|---|---|
| `PlayerListed` / `PlayerUnlisted` | `playerId, clubId, listingId, askingPrice(Money)` | `TransferListing` · `ListPlayer`/`UnlistPlayer` | v1 |
| `TransferOfferSent` / `CounterOfferSent` / `OfferReceived` / `OfferRejected` | `transferCaseId, offerVersionId, terms` | `TransferCase` · `MakeTransferOffer`/`MakeCounterOffer`/T6-2/`RejectOffer` | v1 |
| `TransferCancelled` / `TransferExpired` / `TransferTermsRevised` | `transferCaseId, reason` | `TransferCase` · T6-6/T6-7/T6-9 (SAGA-01) | v1 |
| `PlayerContractSigned` / `PaymentScheduled` / `PlayerClubHistoryOpened` | `contractId, playerId, scheduleRef` | `PlayerContract` · sub-eventos de `SignTransfer` | v1 |
| `ScoutMissionStarted` | `scoutStaffId, target, durationTicks` | `ScoutingMission` · `StartScoutMission` | v1 |
| `PlayerRegistered` | `competitionEditionId, playerId, squadType, shirtNumber?` | `CompetitionRegistration` (C7) · `RegisterPlayer` — *bridge C6→C7* | v1 |

**C7 · Competição**

| Evento | Payload essencial | Produtor (agregado · gatilho) | v |
|---|---|---|---|
| `CompetitionStarted` | `competitionEditionId` | `CompetitionSeason` · C3-1 | v1 |
| `StageAdvanced` / `KnockoutBracketSeeded` | `competitionEditionId, stageOrder, seeds?` | `CompetitionStage` · C3-2/C3-3 | v1 |
| `CompetitionHomologated` / `CompetitionArchived` | `competitionEditionId, finalStandings` | `CompetitionSeason` · C3-4/C3-5 (umbrella público = `CompetitionEditionHomologated`) | v1 |
| `PlayerSuspended` / `SuspensionServed` | `playerId, matches, competitionEditionId` | `CompetitionRegistration`/disciplina · P4-3/P4-4 — *bridge C7→C4/C8* | v1 |

**C8 · Partida / Runtime (projeções ao vivo — `MatchFinished` e os live `GoalScored`/`CardIssued`/`SubstitutionMade` são os umbrellas públicos)**

| Evento | Payload essencial | Produtor (agregado · gatilho) | v |
|---|---|---|---|
| `TacticsSet` / `LineupSet` / `GamePlanSet` | `matchId?, clubId, plan` | `MatchTacticalPlan`/`MatchLineup` · `SetTactics`/`SetLineup`/`SetGamePlan` | v1 |
| `LineupsLocked` / `MatchStarted` / `MatchProcessed` | `matchId, runtimeEpoch` | `MatchRuntime` · MR-1/MR-2/MR-6 | v1 |
| `DecisionPointOpened` / `DecisionPointResolved` / `TacticalInstructionIssued` | `matchId, decisionPointId, minute, choice?` | `MatchRuntime`/`MatchDecisionPoint` · MR-3/MR-4 | v1 |
| `MatchCommandIssued` | `matchId, commandKind, intensity?, matchSequence` | `MatchRuntime` · `IssueMatchCommand` | v1 |

**C9 · Economia** — `CreditFacilityOpened` / `ClubDebtCreated` (`CreditFacility`/`ClubDebt` · `OpenCreditFacility`); demais fluxos de caixa saem por `FinancialReservationCreated`/`WagesPaid`/`LedgerEntryPosted`/`FinancialCrisisRaised` (§4.2). `v1`

**C10/C12 · Comunicação, loja e suporte**

| Evento | Payload essencial | Produtor (agregado · gatilho) | v |
|---|---|---|---|
| `PlayerConversationHeld` / `PlayerPromiseMade` | `clubId, playerId, topic, promise?` | `PlayerConversation` · `TalkToPlayer` | v1 |
| `PressResponded` | `pressQuestionId, stance` | `PressResponse` · `RespondToPress` | v1 |
| `StoreItemPurchased` | `productId, quantity, paymentReference` | conta/`WorldParticipant` · `PurchaseStoreItem` | v1 |
| `AppealSubmitted` / `SupportTicketOpened` | `supportTicketId, blockedActionRef` | `SupportTicket` · `SubmitAppeal` | v1 |

### 4.4 Telemetria por evento (log de depuração)

Além do registro imutável de eventos de domínio, o motor mantém um **log interno de telemetria** por evento, voltado a desenvolvimento, balanceamento e auditoria. Esses campos **não aparecem para o usuário comum** — são invisíveis na experiência, mas essenciais para depuração e para explicar por que um resultado aconteceu. Por evento, o log registra:

- **chance real de gol** aplicada no lance;
- **causa dos gols** (o que originou cada gol);
- **ação que influenciou** o evento (comando do usuário/IA que alterou o desfecho);
- **setor de origem** da jogada;
- **xG** da finalização;
- **probabilidade aplicada** no sorteio;
- **principais modificadores** que pesaram no cálculo;
- **cadeia causal** completa do lance.

Esse log sustenta a explicabilidade do motor (ver a pendência "Registrar causalidade dos eventos" em [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md)) e a calibração estatística em massa (gols por jogo, finalizações, cartões, lesões, empates, viradas, goleadas, vitórias de favoritos, zebras, vantagem de mando, impacto da comissão, impacto do usuário online e quantidade de alertas).

---

## 5. Invariantes

Invariantes são condições que o sistema **nunca** pode violar em nenhum estado consistente. Cada uma traz um enunciado testável e o ponto de verificação. O conjunto deriva do ledger, context map, máquinas de estado e regras `ECO-*`/`PLY-*`/`MAT-*`/`CMP-*`. Itens marcados **BASELINE RATIFICADA** são normativos; somente parâmetros explicitamente calibráveis podem mudar por ruleset versionado.

> **Convenção de referência.** Onde um command cita "invariante" no [catálogo de commands](./10-catalogo-de-commands.md) ou um agregado cita "invariante protegida" no context map (§3), o `INV-##` abaixo é o alvo. Numeração estável: `INV-1..INV-7` (núcleo) já existiam; `INV-3` é **desdobrada** em `INV-3a`/`INV-3b`; `INV-8..INV-37` completam o conjunto.

### 5.1 Núcleo (INV-1..INV-7)

| ID | Invariante (enunciado testável) | Onde é verificada |
|----|---------------------------------|-------------------|
| INV-1 | **Um contrato principal ativo por jogador.** Nunca existem dois `PlayerContract` ativos para o mesmo `playerId`. | C6 · exclusion constraint em `PlayerContract`; guarda de `SignContract`/`RenewContract` (`PLAYER_HAS_ACTIVE_CONTRACT`) |
| INV-2 | **Partida finalizada não volta a `LIVE`.** `MatchRuntimeStatus ∈ {FINISHED, PROCESSED}` jamais transita para `LIVE`. | C8 · máquina de runtime (MR-5/MR-6, doc 14 §8.1); toda transição não listada é rejeitada |
| INV-3 | **Conservação do dinheiro** *(desdobrada em [INV-3a](#52-contábeis-e-econômicas-inv-3a-inv-3b-inv-8inv-13)/INV-3b — §5.2).* O dinheiro não é criado nem destruído sem porta nomeada; nenhum caixa aparece sem origem. | C9 · ledger de partidas dobradas (doc 13 §3) |
| INV-4 | **Aposentado não pode ser escalado.** Nenhum `Player` com `PlayerStatus=RETIRED` entra em escalação. | C4/C8 · terminal `RETIRED` (doc 14 §5); guarda de `SetLineup`/elegibilidade pré-jogo |
| INV-5 | **Classificação corresponde aos resultados processados.** `Standings` reflete exatamente os `MatchFinished` já processados — reconstruível e determinística. | C7 · projeção de `Standings`/`ClubSeasonStats` a partir de `MatchFinished` |
| INV-6 | **Todo jogador tem origem.** Nenhum `Player` existe sem um `PlayerGenerated` correspondente. | C4 · teste populacional; único ponto de criação é o job de geração |
| INV-7 | **Faixa de equilíbrio populacional.** `activePlayers ∈ [targetActive·0.90, targetActive·1.10]`. | C2/C4 · controlador demográfico (doc 13 §6.5) |

### 5.2 Contábeis e econômicas (INV-3a, INV-3b, INV-8..INV-13)

| ID | Invariante (enunciado testável) | Onde é verificada |
|----|---------------------------------|-------------------|
| INV-3a | **Balanço do lançamento.** Para todo `FinancialJournalEntry` em `POSTED`, `Σ débitos = Σ créditos` por moeda. *(BASELINE RATIFICADA — R-111.)* | C9 · constraint do razão (modelo §6.3.9); teste em cada lançamento |
| INV-3b | **Oferta rastreável.** `Δ totalMoney = Σ faucets − Σ sinks`; toda criação/destruição de caixa de clube passa por uma conta `SYS_*` nomeada. *(BASELINE RATIFICADA — R-111.)* | C9 · reconciliação de oferta (doc 13 §4); classe de fluxo obrigatória |
| INV-8 | **Saldo derivado do ledger.** Não existe campo de caixa editável isolado: `saldo(conta) = Σ lançamentos`. | C9 · sem coluna de saldo mutável (fecha C-06) |
| INV-9 | **Money homogêneo.** Nenhuma operação soma `Money` de `currencyId` distintos. | C9 · tipo `Money { amountMinor, currencyId }`; guarda em toda agregação |
| INV-10 | **Reserva não dupla.** `FinancialReservation` impede comprometer o mesmo orçamento duas vezes. | C9 · `MakeTransferOffer`/`UpgradeDepartment`/`StartStadiumWorks` |
| INV-11 | **Orçamento ≥ comprometido.** `SetBudget` nunca desfinancia uma reserva ativa. | C9 · `Budget` (`BUDGET_BELOW_COMMITTED`) |
| INV-12 | **Pagamento de transferência não duplicado.** `SignTransfer` liquida uma única vez por acordo (idempotência por `commandId`). | C6/C9 · `TRANSFER_PAYMENT_NOT_DUPLICATED` |
| INV-13 | **Reversão contábil imutável.** Correção de caixa só por **novo** lançamento com `reversalOfJournalEntryId`; nunca `UPDATE`/`DELETE` do original. | C9 · razão append-only (doc 13 §3.1) |

### 5.3 Autoridade de escrita e ownership (INV-14..INV-18)

| ID | Invariante (enunciado testável) | Onde é verificada |
|----|---------------------------------|-------------------|
| INV-14 | **Um agregado, um dono de escrita.** Só o contexto dono grava as tabelas do agregado; os demais reagem por evento ou leem por query — nunca SQL cruzado. | todos · context map §1/§3; revisão de arquitetura + teste de acesso |
| INV-15 | **Escrita escopada por mundo.** Chave `(gameWorldId, id)`; nenhuma relação ou transação atravessa mundos. | todos · FK composta; teste de isolamento de mundo |
| INV-16 | **Vínculo autoritativo = `PlayerContract`.** `SquadMembership` e `Player.currentClubId` são **projeções** de `ContractSigned`/`TransferSigned`, não fontes de verdade. | C6 dono · quebra Q5; reconciliação projeção↔contrato |
| INV-17 | **IA sem escrita cruzada.** Automação/IA emite os **mesmos commands** que um humano; nunca escreve agregado alheio. | Automação · quebra Q6; validada pelas mesmas invariantes de command |
| INV-18 | **Narrativa read-only.** `Narrative.effectsJson` não altera placar, atributo, saldo nem validade de ação. | C10 · quebra Q7; teste de não-mutação de estado competitivo |

### 5.4 Unicidade (INV-19..INV-24)

| ID | Invariante (enunciado testável) | Onde é verificada |
|----|---------------------------------|-------------------|
| INV-19 | **Um controle ativo por clube; um clube ativo por participante/mundo.** | C1 · índice único parcial em `ClubControl` |
| INV-20 | **Um runtime ativo por partida; um resultado oficial por partida.** | C8 · `MatchRuntime` (1/partida, `runtimeEpoch`) + unique result version em `MatchResult` |
| INV-21 | **Uma inscrição por jogador/clube/edição; número de camisa único por edição.** | C7 · `CompetitionRegistration` (`PLAYER_ALREADY_REGISTERED`/`SHIRT_NUMBER_TAKEN`) |
| INV-22 | **Identidade oficial ativa única por clube; slug único por mundo.** | C3 · `@@unique([gameWorldId, slug])`; `ClubIdentityPeriod` |
| INV-23 | **≤1 acordo por `TransferCase`.** Contraproposta cria nova `TransferOfferVersion`; nunca sobrescreve a anterior. | C6 · `expectedVersion` do case (não cruza contrapropostas) |
| INV-24 | **Papel de staff não duplicado + contrato ativo único; sem dois direitos exclusivos sobrepostos por ativo comercial.** | C5/C3 · `STAFF_ROLE_ALREADY_FILLED`/`COMMERCIAL_RIGHT_CONFLICT` |

### 5.5 Elegibilidade e conservação contrato↔inscrição (INV-25..INV-26)

| ID | Invariante (enunciado testável) | Onde é verificada |
|----|---------------------------------|-------------------|
| INV-25 | **Elegibilidade congelada no pré-jogo.** Suspenso/lesionado/não inscrito/transferido **não** entra; 11 titulares elegíveis ou W.O. evitado. | C8 · `PRE_MATCH` (MAT-024); `SetLineup` (`PLAYER_INELIGIBLE_FOR_MATCH`) |
| INV-26 | **Contratar ≠ poder jogar (conservação contrato↔inscrição).** Contrato e inscrição competitiva são vínculos distintos; toda **baixa de contrato** (transferência/expiração/aposentadoria) baixa a inscrição correspondente. | C6→C7 · reação a `TransferSigned`/`ContractExpired`/`PlayerRetired` (CMP-018) |

### 5.6 Determinismo, replay e idempotência (INV-27..INV-31)

| ID | Invariante (enunciado testável) | Onde é verificada |
|----|---------------------------------|-------------------|
| INV-27 | **Determinismo por seed.** `matchSeed`/`tickSeed`/`eventSeed` reproduzem a partida de forma idêntica. | C8 · MAT-015; teste de replay |
| INV-28 | **Replay carimbado.** Todo evento persiste `rulesetVersion`; o replay/auditoria usa a fórmula vigente à época pelo manifesto. *(BASELINE RATIFICADA — R-24.)* | Eventing · §2.2; servidor recusa `rulesetVersion` divergente |
| INV-29 | **Progressão aplicada uma única vez.** Atributo estrutural muda só no passo 7 da virada (accrual pós-partida, buffer zerado na aplicação). *(BASELINE RATIFICADA — R-113.)* | C4/C2 · relógio único de progressão (doc 13 §5) |
| INV-30 | **Idempotência ponta a ponta.** `commandId` único devolve o resultado sem reexecutar; o consumo de evento é idempotente (Inbox, `AT_LEAST_ONCE` + dedupe). | todos · `CommandExecution.unique(commandId)`; Inbox |
| INV-31 | **Concorrência otimista + fencing.** Escrita por `expectedVersion` (conflito → `AGGREGATE_VERSION_CONFLICT`); executores usam fencing token monotônico (`runtimeEpoch`/`worldSequence`). | todos · optimistic concurrency; sagas/runtime (doc 12 §6.3) |

### 5.7 Máquinas de estado e homologação (INV-32..INV-33)

| ID | Invariante (enunciado testável) | Onde é verificada |
|----|---------------------------------|-------------------|
| INV-32 | **Transição fechada.** Toda transição não listada nas máquinas de estado (doc 14) é proibida; estados terminais (`RETIRED`/`PROCESSED`/`ARCHIVED`/`COMPLETED`) são absorventes. | donos de cada agregado · guardas de transição server-side |
| INV-33 | **Homologação precede oficialização.** Registro histórico oficial e premiação só **após** homologação; título em campo é provisório (`PROVISIONAL` ≠ `HOMOLOGATED`). | C7/C9 · C-10 (CMP-013/CMP-014); ordem interna da SAGA-02 |

### 5.8 Auditoria, operação e população (INV-34..INV-37)

| ID | Invariante (enunciado testável) | Onde é verificada |
|----|---------------------------------|-------------------|
| INV-34 | **Auditoria append-only.** Correção nunca apaga: cria novo `GameAuditLog` (cadeia de hash) referenciando o anterior (correção sobre o futuro, não sobre o passado). | C12 · `A-AUDIT` (docs UI/UX 20/21); trilha imutável |
| INV-35 | **Mundo não-escrevível rejeita gameplay.** Em `PAUSED`/`FINISHED`/`ARCHIVED`/`READ_ONLY`, toda escrita de jogador retorna `WORLD_READ_ONLY`. | C2 · doc 14 §2; envelope de command (comum a todos) |
| INV-36 | **Gerador populacional único.** Um só gerador dirigido por gap; `generationNeed ≥ 0` e geração/temporada `≤ capTemporada (≤ 8%)`; reposição 1,25/aposentado é só teto de ritmo. *(BASELINE RATIFICADA — R-115.)* | C4/C2 · controlador demográfico (doc 13 §6.3–6.5) |
| INV-37 | **Proteção de menores.** Movimentação, minutos, alojamento e negociação de menores são restritos por idade/vínculo. | C4/C6 · PLY-019; guarda em empréstimo/transferência de jovem |

> As invariantes centrais destacadas nas fontes de brainstorming são INV-1, INV-2, INV-3 e INV-4; INV-5 a INV-37 completam o conjunto de condições de consistência exigidas pelo modelo conceitual, pelo ledger e pelas máquinas de estado. Cada `INV-##` é alvo de teste de invariante/propriedade no pacote correspondente.

---

## 6. Interfaces TypeScript de Referência

As interfaces abaixo são as citadas nas fontes e servem de contrato para os pacotes `rules`, `simulation`, `match-engine` e `domain`.

### `GameRule`

```ts
interface GameRule {
  id: string;
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  invariants: string[];
  configurable: boolean;
}
```

### `GameFormula`

```ts
interface GameFormula {
  id: string;
  version: number;
  parameters: Record<string, number>;
  calculate(input: unknown): unknown;
}
```

### `CompetitionFormat`

O formato de competição é configurável por dados, não por código.

```ts
interface CompetitionFormat {
  participantCount: number;
  phases: CompetitionPhaseDefinition[];
  tieBreakers: TieBreaker[];
  promotionRules: MovementRule[];
  relegationRules: MovementRule[];
}
```

### `MatchSimulationInput`

Entrada do motor de partidas. A simulação integral (sem intervenção humana) deve funcionar primeiro; os comandos táticos em tempo real são adicionados depois.

```ts
interface MatchSimulationInput {
  home: TeamSnapshot;
  away: TeamSnapshot;
  homeTactics: Tactics;
  awayTactics: Tactics;
  context: MatchContext;
  seed: string;
}
```

### `MatchSimulationResult`

Saída do motor de partidas. Reúne placar, eventos, desempenhos individuais, consequências físicas e o relatório tático da partida simulada.

```ts
interface MatchSimulationResult {
  score: Score;
  events: MatchEvent[];
  playerPerformances: PlayerPerformance[];
  physicalConsequences: PhysicalImpact[];
  tacticalReport: TacticalReport;
}
```

### `SectorState` (estado persistente por setor)

Estrutura citada como pendência em [`../01-game-design/05-motor-de-partida.md §18`](../01-game-design/05-motor-de-partida.md) (`SectorState`): mantém um estado por setor entre ticks, em vez de recalcular tudo do zero, e facilita a detecção de pontos de decisão (`MAT-003`, F5). **Esboço** (extração da estrutura; os campos numéricos são valores de simulação, não constantes fixas):

```ts
type SectorId =
  | 'DEF_L' | 'DEF_C' | 'DEF_R'
  | 'MID_L' | 'MID_C' | 'MID_R'
  | 'ATT_L' | 'ATT_C' | 'ATT_R';   // 3×3 (F5)

interface SectorState {
  sector: SectorId;
  strength: number;        // 0–100, força efetiva corrente do setor
  fatigue: number;         // 0–100, fadiga média do setor (F2)
  pressureTaken: number;   // 0–100, pressão sofrida acumulada
  recentDuels: { won: number; lost: number };
  recentErrors: number;    // erros no bloco recente
  risk: number;            // 0–100, risco de colapso (alimenta pontos de decisão)
  confidence: number;      // 0–100, confiança do setor (contágio entre setores)
}
```

> **Decisão ratificada — R-19:** os limiares que transformam `SectorState` em alerta (ex.: `risk > 70` ou `confidence < 30` gera ponto de decisão) e a taxa de decaimento de `pressureTaken`/`recentErrors` (janela ≈ 5–7 ticks, decaimento `ρ = 0.9`, alinhado ao momentum de R-17) são valores de balanceamento.

### `MatchPatternMemory` (memória de padrões na partida)

Estrutura citada como pendência em [`../01-game-design/05-motor-de-partida.md §18`](../01-game-design/05-motor-de-partida.md) (`MatchPatternMemory`): impede que o motor calcule cada tick isolado, lembrando ataques por zona, duelos, erros recentes, pressão acumulada e a resposta às mudanças táticas — insumo do contra-ajuste adversário (`MAT-017`) e da reputação tática (`MAT-018`). **Esboço**:

```ts
interface MatchPatternMemory {
  attacksByZone: Record<SectorId, number>;     // volume de ataque por zona
  duelHistory: Record<SectorId, { won: number; lost: number }>;
  recentErrors: { minute: number; sector: SectorId; type: string }[];
  accumulatedPressure: Record<SectorId, number>;
  tacticalChangeResponses: {                    // efeito medido de cada mudança
    minute: number; change: string; observedDelta: number;
  }[];
  repeatedUserPattern?: {                        // padrão detectável (ex.: "ataca sempre a direita")
    pattern: string; occurrences: number; window: number;
  };
}
```

> **Decisão ratificada — R-17:** o **tamanho da janela** de memória (nº de ticks/eventos retidos), o decaimento por antiguidade e o **gatilho de detecção** de padrão repetido (ex.: `occurrences ≥ 4` na janela → contra-ajuste da IA, `MAT-017`) são valores de balanceamento, alinhados à janela de eventos recentes de R-17.

> **Nota de implementação:** os tipos auxiliares (`CompetitionPhaseDefinition`, `TieBreaker`, `MovementRule`, `TeamSnapshot`, `Tactics`, `MatchContext`, `Score`, `MatchEvent`, `PlayerPerformance`, `PhysicalImpact`, etc.) serão definidos no **Domain Kernel** (código), derivados do schema canônico e destas fórmulas — não é pendência de design.

---

## 7. Notas de Ligação

As fórmulas conceituais deste catálogo têm sua definição matemática e de balanceamento nos documentos de game design:

- **Economia** (inflação, oferta monetária, receita de clubes, preço de mercado, `ECO-*`) → [`../01-game-design/03-economia.md`](../01-game-design/03-economia.md).
- **Motor de partidas** (desempenho, probabilidade de eventos, fadiga, lesão, `MAT-*`, `F1`–`F21`) → [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md).
- **Jogadores** (evolução técnica, geração, aposentadoria, equilíbrio etário, `PLY-*`) → [`../01-game-design/02-sistema-de-jogadores.md`](../01-game-design/02-sistema-de-jogadores.md).
- **Competições** (temporada, campeonatos, licenciamento/inscrição, `CMP-*`) → [`../01-game-design/06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md).

Este catálogo é a camada técnica que referencia essas fontes; ele fixa **IDs, interfaces, estados, eventos e invariantes**, enquanto as expressões numéricas e curvas de balanceamento permanecem nos documentos de game design correspondentes (e, para o motor de partida, nas recomendações da [§2.4](#24-recomendações-de-balanceamento-série-r)).
