# Arquitetura Multiplayer e Mundos

> **Status:** Rascunho consolidado · **Fontes:** chats/campeonatos-fim-de-temporadas.md · **Revisão:** 2026-07-10

Este documento consolida a arquitetura online do **Grinta**: como o jogo organiza mundos persistentes, distribui clubes entre humanos e IA, resolve o problema da assincronia entre jogadores por meio de rodadas com prazo, dimensiona divisões pela quantidade de usuários e opera o mercado de transferências online. O modelo-base é **online assíncrono**: ninguém precisa estar conectado ao mesmo tempo, e o campeonato avança sozinho em horários fixos.

## Sumário

1. [Mundos e servidores](#1-mundos-e-servidores)
2. [Clubes: humanos vs. IA](#2-clubes-humanos-vs-ia)
3. [O problema da assincronia](#3-o-problema-da-assincronia)
4. [Rodadas com prazo](#4-rodadas-com-prazo)
5. [Fluxo de rodada em ~10 passos](#5-fluxo-de-rodada-em-10-passos)
6. [Formatos de liga e competição](#6-formatos-de-liga-e-competição)
7. [Divisões dimensionadas por usuários](#7-divisões-dimensionadas-por-usuários)
8. [Quando o usuário não escala](#8-quando-o-usuário-não-escala)
9. [Mercado de transferências online](#9-mercado-de-transferências-online)
10. [Auditoria da partida online](#10-auditoria-da-partida-online)

---

## 1. Mundos e servidores

O Grinta é organizado em **mundos** (servidores) independentes. Cada mundo tem seus próprios clubes, jogadores, campeonatos, calendário e temporadas, sem qualquer compartilhamento com outros mundos.

Exemplos de mundos:

- Brasil 2027
- Europa 2027
- América do Sul 2027
- Liga Global
- Mundo privado só para amigos

Isso permite que coexistam realidades muito diferentes: um mundo com 20 usuários, outro com 200, um com clubes fictícios, outro com clubes inspirados em reais (mas com nomes próprios), outro fechado para um grupo.

Estrutura conceitual do mundo:

```
GameWorld {
  id
  name
  currentSeason
  currentDate
  status: "preseason" | "running" | "season_end"
  speed
  clubs
  championships
}
```

O mundo controla a **data corrente** e o ritmo (`speed`). O tempo é **acelerado**, não em tempo real: um mundo em que uma temporada durasse um ano real seria lento demais.

O ritmo pode ser expresso de duas formas equivalentes:

- **Por razão de tempo** — `1 dia real = 1 semana no jogo`, deixando o calendário avançar de forma constante.
- **Por duração de temporada** — `45 dias reais = 1 temporada inteira`, a recomendação padrão.

O campo `speed` do mundo materializa essa escolha. Exemplos:

```
speed: { seasonDays: 45 }        // 1 temporada = 45 dias reais (padrão)
speed: { realDay: "1 week" }     // 1 dia real = 1 semana no jogo
speed: { seasonDays: 30 }        // temporada mais curta e intensa
speed: { seasonDays: 60 }        // temporada mais longa e pausada
```

As duas notações descrevem o mesmo mundo acelerado; a temporada de 45 dias continua sendo a referência inicial recomendada.

### Mundos por geração (eras temporais)

Como cada mundo é independente e persistente, o Grinta pode operar **eras** ou **servidores temporais**: mundos que começaram em temporadas globais diferentes e, por isso, estão em estágios de maturidade distintos no momento em que um usuário chega. Em vez de forçar todo novato a entrar num universo já muito avançado, o jogo permite que ele **escolha em qual mundo entrar**.

Exemplo:

| Mundo | Começou na | Estado na entrada de um novato |
| --- | --- | --- |
| Mundo 1 | Temporada 1 | Economia madura, clubes históricos, mais desafio |
| Mundo 2 | Temporada 10 | Universo intermediário |
| Mundo 3 | Temporada 20 | Universo recente |

O usuário novo pode optar por:

- **Entrar num mundo antigo** — economia madura, clubes históricos consolidados, competição mais difícil.
- **Entrar num mundo novo** — todo mundo começa junto, competição mais equilibrada desde o início.

Esse modelo é especialmente bom para um jogo online e pode coexistir em camadas:

- um **mundo persistente principal**;
- **novos mundos sazonais** abertos periodicamente;
- **ligas de novatos**;
- **campeonatos especiais de início** para quem acabou de entrar.

As eras não substituem os mecanismos de entrada dentro de um mundo já maduro (divisões por nível estrutural, programa de desenvolvimento inicial): são uma alternativa de escolha de servidor, complementar a eles.

> Ciclo de temporada, competições e transição de fim de temporada: ver [`../01-game-design/06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md).

---

## 2. Clubes: humanos vs. IA

Cada clube do mundo tem um **tipo de comando**: humano ou bot (IA). Um clube pode alternar entre os dois ao longo do tempo, sem quebrar o campeonato.

```
Club {
  id
  name
  country
  division
  reputation
  budget
  squad
  managerType: "human" | "bot"
  userId?: string
}
```

O vínculo entre usuário e clube é registrado à parte:

```
UserClub {
  userId
  clubId
  role: "manager" | "president" | "admin"
  joinedAt
  lastActiveAt
}
```

### Estados de comando

| Estado do usuário | O que acontece com o clube |
| --- | --- |
| Ativo | Controla escalação, treino, mercado e decisões |
| Inativo (temporário) | IA assume as decisões básicas |
| Saiu / liberado | Clube volta para a fila de seleção de novos usuários |

**Os bots são obrigatórios.** Sem eles o mundo trava por falta de gente. Um bot precisa, no mínimo: escalar um time válido, renovar contratos importantes, comprar/vender com lógica, treinar o elenco, evitar a falência e usar jovens quando necessário.

Bots podem ter **identidade** própria, o que deixa o mundo mais vivo:

- Bot conservador
- Bot vendedor (clube pequeno formador que vende promessas cedo)
- Bot formador (aposta em jovens)
- Bot agressivo no mercado (clube rico que compra jogador pronto)
- Bot que contrata veteranos
- Clube endividado que aceita propostas menores

### Entrada de usuários

Há dois caminhos de entrada, e o Grinta deve suportar ambos:

- **No início da temporada** — melhor para assumir clubes importantes. No fim de cada temporada, clubes sem dono ficam disponíveis; usuários se candidatam e o sistema aprova por ordem, reputação ou ranking.
- **No meio da temporada** — mantém o jogo sempre vivo. O usuário assume um clube bot a qualquer momento, mas **pega a situação atual**: não reseta elenco, finanças nem tabela. Isso gera histórias interessantes.

---

## 3. O problema da assincronia

O ponto mais crítico de um jogo online de clubes: **nem todo mundo joga ao mesmo tempo**. Fusos horários, rotinas e disponibilidade variam. Se a partida dependesse de os dois técnicos estarem online juntos, o campeonato travaria.

Dois modelos foram considerados:

### Modelo A — Rodadas com horário fixo (recomendado)

A rodada acontece num horário pré-definido; até o prazo, os usuários ajustam o time; no horário, o sistema simula todos os jogos em lote.

Vantagens:

- Não exige os dois usuários online ao mesmo tempo.
- O campeonato anda sozinho — sensação de mundo vivo.
- Permite notificações.
- Funciona bem em mobile/web.

### Modelo B — Partida só quando os dois estão prontos (não recomendado como base)

Os dois técnicos precisam clicar em "pronto" e a partida é simulada na hora. Problemas: campeonatos travam, usuários somem, uma pessoa segura a liga inteira, e exige prazo e punição de qualquer forma.

**Uso limitado:** o Modelo B pode existir apenas para amistosos, torneios rápidos ou mata-mata entre amigos.

### Recomendação

- **Campeonatos principais:** rodadas automáticas em horário fixo (Modelo A).
- **Amistosos / copas rápidas:** jogadores podem iniciar manualmente (Modelo B).

---

## 4. Rodadas com prazo

A solução para a assincronia é a **rodada com prazo**, um ciclo de quatro fases:

1. **Janela de preparação** — o sistema abre a rodada e os usuários ajustam escalação, tática e treino.
2. **Prazo fecha** — chega o horário-limite; o sistema bloqueia alterações.
3. **Simulação em lote** — todos os jogos da rodada são simulados de uma vez.
4. **Publicação** — resultados, tabela e eventos pós-jogo são divulgados; a próxima rodada abre.

Exemplo de regra concreta: usuários têm até **19h59** para ajustar a escalação; às **20h** o sistema simula todos os jogos.

O calendário precisa ser **fixo e previsível**. Ritmo recomendado para começar: 1 temporada = 45 dias reais, com rodadas principais em dias definidos da semana e o mercado aberto todos os dias, fechando antes dos jogos.

Exemplo de semana:

| Dia | Atividade |
| --- | --- |
| Segunda 20h | Liga |
| Terça | Treino, mercado, eventos |
| Quarta 20h | Liga |
| Quinta 20h | Copa |
| Sexta 20h | Liga |
| Sábado | Amistosos, base, mercado |
| Domingo 20h | Liga ou continental |

> Como o técnico intervém durante a partida (online e offline) e o papel do plano de jogo: ver [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md).

---

## 5. Fluxo de rodada em ~10 passos

O ciclo completo de uma rodada:

1. Sistema abre a preparação da rodada.
2. Usuários ajustam escalação, tática e treino.
3. Prazo fecha.
4. Sistema bloqueia alterações.
5. Jogos são simulados.
6. Resultado é publicado.
7. Tabela é atualizada.
8. Jogadores evoluem, cansam ou se lesionam.
9. Eventos pós-jogo são gerados (notícias, moral, histórias).
10. Próxima rodada abre.

Em lógica de código:

```
runMatchday(matchdayId) {
  lockLineups()
  for each match in matchday:
    simulateMatch(match)
    updatePlayers(match)
    updateClubMorale(match)
    updateCompetitionTable(match)
  generateNews()
  unlockNextMatchday()
}
```

O `lockLineups()` no passo 3/4 é o que garante que o prazo é respeitado antes de a simulação começar.

---

## 6. Formatos de liga e competição

Um **Competition Manager** decide, para cada campeonato: quantos clubes participam, o formato, o calendário, os critérios de desempate, a premiação, o rebaixamento, o acesso e a classificação para outros torneios.

```
Competition {
  id
  worldId
  seasonId
  name
  type: "league" | "cup" | "groups_knockout"
  status: "scheduled" | "running" | "finished"
  clubs
  rules
  rounds
}
```

### Liga de pontos corridos

Boa para campeonato nacional. Exemplo: 20 clubes, turno e returno (38 rodadas), 3 pontos por vitória e 1 por empate, 4 rebaixados, 6 classificados para o continental.

```
LeagueRules {
  clubs: 20
  rounds: 38
  legs: 2
  relegationSlots: 4
  promotionSlots: 4
  continentalSlots: 6
}
```

### Copa mata-mata

Boa para copa nacional. Exemplo: 32 clubes, jogo único ou ida e volta, empate decidido nos pênaltis, premiação por fase.

```
CupRules {
  clubs: 32
  legs: 1
  extraTime: false
  penalties: true
}
```

### Grupos + mata-mata

Boa para competições continentais ou globais. Exemplo: 32 clubes, 8 grupos de 4, 2 classificados por grupo, seguido de oitavas, quartas, semifinal e final.

```
GroupKnockoutRules {
  groups: 8
  clubsPerGroup: 4
  qualifiedPerGroup: 2
  knockoutLegs: 2
  finalLegs: 1
}
```

### Campeonatos oficiais e privados

Os campeonatos existem em dois níveis:

- **Oficiais** — criados pelo sistema (Liga Nacional, Copa Nacional, Continental, Mundial, Supercopa). Valem reputação, dinheiro e ranking.
- **Privados** — criados por usuários (liga entre amigos, copa relâmpago, torneio de pré-temporada, amistosos organizados). Têm impacto oficial menor ou nenhum.

```
CustomTournament {
  creatorUserId
  name
  invitedClubs
  format
  startDate
  prize
  reputationImpact: "none" | "low"
}
```

Para não bagunçar o calendário oficial, um campeonato privado **não pode conflitar com jogo oficial**: ou usa time reserva, ou só acontece em datas livres.

---

## 7. Divisões dimensionadas por usuários

Princípio central: **o mundo não depende de todos os clubes terem donos humanos.** O sistema mistura humanos e bots em cada divisão, e a proporção evolui conforme mais usuários entram.

Exemplo de composição inicial:

| Divisão | Clubes | Humanos | Bots |
| --- | --- | --- | --- |
| Série A | 20 | 8 | 12 |
| Série B | 20 | 3 | 17 |

Com o tempo, mais usuários entram, mais clubes bots viram humanos e o mundo fica mais competitivo. **Se o jogo dependesse de todos os clubes terem humanos, travaria no começo.**

### Sistema de divisões

O modelo usa divisões hierárquicas (Divisão 1, 2, 3, 4...), cada uma com clubes humanos e bots. No fim da temporada:

- Os 4 últimos de cada divisão caem.
- Os 4 primeiros da divisão de baixo sobem.
- Clubes classificados entram em copas.
- Clubes campeões ganham reputação.

Isso cria objetivo para todos — não só para quem briga por título, mas também para quem foge do rebaixamento ou busca o acesso.

### Divisões por nível estrutural do clube (ligas de desenvolvimento)

O modelo hierárquico acima (Divisão 1, 2, 3…) organiza os clubes por **resultado esportivo** — sobe quem vence, cai quem perde. Isso não basta para um mundo persistente em que clubes antigos cresceram muito: se um clube recém-criado (estrutura nível 1, base nível 1, estádio nível 1, elenco inicial velho, reputação baixa) cair direto contra um gigante de temporadas anteriores (estrutura nível 7, base nível 8, torcida grande, caixa maior), o novato não tem chance real. Por isso o Grinta usa também um segundo eixo: **divisões/ligas por nível estrutural do clube**. Um clube novo entra numa camada compatível com seu nível de estrutura, e não contra o topo do mundo.

As faixas seguem o nível estrutural (1 a 10) do clube:

| Nível estrutural | Liga |
| --- | --- |
| 1–2 | Liga Inicial |
| 3–4 | Liga de Acesso |
| 5–6 | Liga Intermediária |
| 7–8 | Liga Principal |
| 9–10 | Elite |

Assim, um clube novo joga contra clubes parecidos: continua no **mesmo universo persistente**, mas compete numa **camada compatível**. Numa temporada global avançada (ex.: temporada 20), os clubes grandes disputam a Elite, os médios a Liga Principal / Intermediária e os novos a Liga Inicial — o que preserva o mérito dos antigos sem massacrar os que chegam.

O clube novo cresce **subindo de camada** (Liga Inicial → Liga de Acesso → Liga Intermediária → Liga Principal → Elite), sentindo progressão sem precisar vencer um gigante logo na primeira temporada: ele renova o elenco, estrutura o clube, forma jovens, ganha reputação e aumenta receita até chegar gradualmente à elite.

**Coexistência dos dois eixos.** As divisões por resultado (as Séries / Divisões 1, 2, 3…, com promoção e rebaixamento por desempenho) e as ligas por nível estrutural são **complementares, não substitutas**: a primeira organiza a disputa esportiva dentro de uma faixa; a segunda garante que o adversário de um clube tenha porte estrutural compatível. Ambas descrevem o mesmo mundo, por ângulos diferentes.

> **Recomendação (a ratificar — R-83):** os dois eixos combinam-se como **moldura × disputa**: a **liga por nível estrutural** (Inicial → Acesso → Intermediária → Principal → Elite) é a **moldura** dentro da qual existem as **Séries por resultado** (1, 2, 3…), e não o contrário. Um clube compete nas Séries **da sua liga de nível**; promoção/rebaixamento por resultado o movem entre Séries **dentro da mesma liga de nível**. A mudança de **liga de nível** é um eixo separado, guiado pelo **nível estrutural do clube** (1–10, faixas da tabela acima), não pelo resultado esportivo — logo subir de Série e subir de nível estrutural são eventos **independentes**, podendo ocorrer na mesma temporada, mas por gatilhos distintos. **Limiares:** o clube muda de liga de nível ao **cruzar a faixa de nível estrutural** (ex.: atingir nível 3 promove da Liga Inicial para a de Acesso; recuar para nível 2 rebaixa de volta), avaliado na **virada de temporada**, com **histerese** (margem para evitar oscilação a cada temporada) a calibrar. Racional: preserva o mérito dos clubes antigos (nível estrutural) sem massacrar novatos e mantém a disputa esportiva viva dentro de cada faixa.

### Modelo recomendado para começar

- 1 mundo, 40 clubes, 2 divisões de 20 clubes.
- Liga de pontos corridos (38 rodadas, 4 rebaixados / 4 promovidos).
- Copa nacional em mata-mata (40 clubes, jogos às quintas).
- Bots preenchendo as vagas sem dono.
- Temporada de 45 dias, com rodadas 4 vezes por semana.

Expansões posteriores: Divisão C, competição continental, mundial, categorias de base, seleções e torneios privados.

### Exemplos de mundo dimensionado

Para ilustrar como a composição escala, dois exemplos concretos de mundo:

**Exemplo A — Brasil Online 1 (temporada 2027), mundo grande em 4 divisões:**

| Item | Valor |
| --- | --- |
| Clubes totais | 80 |
| Humanos | 34 |
| Bots | 46 |
| Divisões | 4 (Séries A, B, C e D, com 20 clubes cada) |
| Competições | Liga Nacional, Copa Nacional, Supercopa, Copa Continental, torneios de base, amistosos |
| Calendário | Segunda/Quarta/Sexta liga, Quinta copa, Domingo continental ou liga |

No fim da temporada: campeões definidos, rebaixados caem, promovidos sobem, usuários recebem avaliação, jogadores evoluem, contratos vencem, mercado abre, clubes bots podem ser assumidos e a nova temporada começa.

**Exemplo B — Brasil Online 1 (temporada 2028), mundo médio com ruleset explícito:**

| Item | Valor |
| --- | --- |
| Duração | 45 dias reais |
| Clubes totais | 60 |
| Humanos | 28 |
| Bots | 32 |
| Competições | Série A, Série B, Série C, Copa Nacional, Supercopa, Copa Sub-20 |
| Calendário | Segunda/Quarta/Sexta liga, Quinta copa, Domingo liga ou final |

Ruleset resumido do Exemplo B: usuário confirma a escalação antes das 19h; jogos simulam às 20h; ausente usa a última escalação; 5 ausências seguidas liberam o clube; transferências entre usuários passam por validação; jogadores podem recusar propostas; e bots completam os clubes vazios. Esse já é um modelo muito bom para começar.

> **Recomendação (a ratificar — R-84):** limiares de dimensionamento do mundo. **Nova divisão/Série:** criar quando a divisão-alvo ultrapassar sua lotação (ex.: 20 clubes) e houver **fila de humanos** suficiente para formar a próxima — proposta: abrir nova Série quando **≥ 60% das vagas humanas** da divisão vigente estiverem ocupadas e existirem **≥ 20 humanos aguardando**; caso contrário, novos entrantes preenchem vagas de bots existentes antes de fragmentar em nova divisão. **Conversão bot → humano:** um clube-bot vira vaga humana de forma **automática** quando (a) está elegível (não em crise terminal, dentro da faixa de nível estrutural do entrante) e (b) há humano compatível na fila; conversões sensíveis (clubes de topo, disputa por uma vaga) passam por **confirmação manual** do admin. Racional: crescer por preenchimento antes de fragmentar mantém as divisões cheias e competitivas. Compartilha **R-84** com a penalidade de ausência (§8). Calibrar faixas por tamanho de mundo.

---

## 8. Quando o usuário não escala

O usuário **nunca é demitido** por desempenho; o time simplesmente joga com um fallback quando ele não escala. A prioridade é proteger o campeonato de time sem jogar ou de escalações inválidas.

Escada de inatividade recomendada:

| Rodada ausente | Ação do sistema |
| --- | --- |
| 1ª ausência | Usa a última escalação |
| 2ª ausência | IA corrige lesões e suspensões (escalação válida) |
| 3ª ausência seguida | Alerta ao usuário |
| 5ª ausência seguida | Clube pode ser liberado para outro usuário |

```
ManagerInactivityRule {
  useLastLineup: true
  autoFixInvalidLineup: true
  warningAfterMissedRounds: 3
  releaseClubAfterMissedRounds: 5
}
```

Pontos-chave:

- Enquanto ausente, o clube joga com a **última escalação**; a IA só intervém para manter a escalação **válida** (remover lesionados/suspensos).
- A liberação do clube após 5 ausências seguidas é o único momento em que o usuário perde o comando — e ainda assim é por ausência prolongada, não por resultado.
- O usuário gerencia entre rodadas; ele não joga a partida manualmente. Definir tática, treinar, negociar, conversar com jogadores e planejar a próxima rodada são as atividades do dia a dia.

> **Recomendação (a ratificar — R-84):** penalidade por não escalar **além** do fallback. Proposta: **sem penalidade competitiva** nas 1ª–2ª ausências (só usa a última escalação / IA valida); a partir da **3ª ausência seguida**, além do alerta, aplica-se uma **penalidade leve e não retroativa** — ex.: pequena queda de **moral/entrosamento** do elenco e/ou leve redutor de desempenho do time no fallback — **nunca** punição direta no placar nem dedução de pontos. A liberação do clube na 5ª ausência (acima) permanece o único evento de perda de comando. Racional: cria incentivo suave à presença sem transformar ausência em derrota automática, preservando o princípio "nunca demitido por desempenho". Compartilha **R-84** com os limiares de dimensionamento (§7). Calibrar magnitude e rodada de início.

---

## 9. Mercado de transferências online

O mercado online exige cuidado para não virar bagunça. Há **três tipos de negociação**:

1. **Jogador livre** — o usuário faz proposta; o jogador avalia salário, clube, divisão, reputação e projeto.
2. **Compra de jogador de clube bot** — o sistema avalia a proposta; o clube bot aceita, recusa ou negocia.
3. **Compra entre usuários** — o usuário A propõe; o usuário B aceita, recusa ou contrapropõe; e o **jogador ainda precisa aceitar o contrato**.

Fluxo geral:

1. Clube comprador envia proposta.
2. Clube vendedor responde.
3. Jogador / empresário avalia.
4. Transferência fica pendente.
5. Janela precisa estar aberta.
6. Sistema confirma.

### Jogadores têm vontade própria

Mesmo em negociação entre usuários, **o jogador não é um objeto morto**. Sendo único, ele tem vontade própria e pode romper o acordo:

- O clube aceitou vender, mas o jogador recusou por não querer disputar divisão inferior.
- O jogador quer sair porque perdeu espaço e tem relação ruim com o técnico.

### Leilão

Para jogadores muito disputados, o leilão pode ser melhor que a negociação direta: o jogador é listado, os clubes interessados fazem propostas até um prazo, e o jogador **escolhe o melhor projeto — não necessariamente o maior salário**. Critérios considerados: salário, luvas, divisão, reputação do clube, chance de ser titular, relação com o técnico, distância da família, ambição e personalidade.

### Proteção contra abuso

O mercado entre usuários precisa de validação anti-abuso: impedir vendas por valores absurdos entre amigos, bloquear transferência fácil de dinheiro entre clubes, aplicar valores mínimo e máximo de mercado, auditar transferências suspeitas, impedir múltiplas contas controlando clubes relacionados e limitar empréstimos e rescisões em massa.

```
TransferValidation {
  minAllowedValue
  maxAllowedValue
  suspiciousTransferScore
  sameIpCheck
  repeatedTradeCheck
  newAccountRestriction
}
```

Transferências suspeitas ficam em análise automática, podem ser bloqueadas pelo sistema e revisadas por um admin.

> Regras completas de anti-abuso, multicontas e onboarding: ver [`../01-game-design/09-anti-abuso-e-onboarding.md`](../01-game-design/09-anti-abuso-e-onboarding.md).

---

## 10. Auditoria da partida online

Como o jogo é online, o usuário precisa **confiar que o resultado não foi "roubado"**. Antes de cada partida, o sistema salva um snapshot do estado, e a simulação roda sobre ele:

```
MatchSnapshot {
  matchId
  homeClubState
  awayClubState
  lineups
  tactics
  playerMorale
  fatigue
  injuries
  randomSeed
}
```

Com o `randomSeed` fixado e o estado congelado, a partida é **determinística e auditável**: se alguém reclamar, é possível reconstruir o resultado e mostrar que ele veio da escalação, dos atributos, da tática, da moral, da fadiga e da seed — e não de manipulação.

> O funcionamento interno do motor de partida está detalhado em [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md).

---

## Modelo online consolidado

O modelo recomendado para o Grinta reúne:

- Online assíncrono, com mundos persistentes.
- Clubes humanos + bots na mesma competição.
- Rodadas automáticas em horários fixos.
- Temporadas de 45 dias.
- Campeonatos oficiais criados pelo sistema; torneios privados criados por usuários.
- Mercado entre usuários com regras anti-abuso.
- Jogadores únicos com vontade própria.
- Fim de temporada transformando o mundo.

Esse conjunto une a simplicidade do estilo Brasfoot, a profundidade de um manager tático, a competição online e um mundo vivo com jogadores únicos — sem travar por ausência de jogadores.
