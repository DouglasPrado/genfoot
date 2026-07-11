# Seleções e Calendário Internacional

> **Status:** Rascunho consolidado · **Fontes:** chats/documento-definitivo-escopo.md (Seção 15) · **Revisão:** 2026-07-10

## Resumo

Este documento define como as **seleções nacionais** e o **calendário internacional** operam no **Grinta**. A nacionalidade do jogador influencia elegibilidade para seleção, adaptação cultural, limites de estrangeiros nos elencos, conexão com a torcida e mercado — mas **não define a qualidade** do jogador. As convocações são tratadas como parte integrada do calendário: quando convocado, o jogador se ausenta do clube, viaja, pode acumular fadiga, ganhar (ou perder) moral, valorizar-se e ganhar exposição, ou retornar lesionado.

Como regra de mundo, o **clube não pode impedir uma convocação oficial**, salvo recomendação médica reconhecida pelo regulamento. As **seleções são controladas pela inteligência do jogo (IA) inicialmente**, com gestão por usuários de alta reputação prevista como expansão futura. O documento também trata de **conflito de datas** (prioridade definida por regulamento), **lesão em convocação** com possibilidade de compensação parcial, e a previsão de **seleções de base e competições continentais** como expansão.

## Sumário

1. [Nacionalidade e limites de estrangeiros](#1-nacionalidade-e-limites-de-estrangeiros)
2. [Convocações integradas ao calendário](#2-convocacoes-integradas-ao-calendario)
3. [Autoridade da convocação e recomendação médica](#3-autoridade-da-convocacao-e-recomendacao-medica)
4. [Controle das seleções: IA e expansão para usuários](#4-controle-das-selecoes-ia-e-expansao-para-usuarios)
5. [Conflito de datas e prioridade por regulamento](#5-conflito-de-datas-e-prioridade-por-regulamento)
6. [Lesão em convocação e compensação parcial](#6-lesao-em-convocacao-e-compensacao-parcial)
7. [Seleções de base e competições internacionais (expansão)](#7-selecoes-de-base-e-competicoes-internacionais-expansao)

---

## 1. Nacionalidade e limites de estrangeiros

A **nacionalidade** é um atributo de identidade do jogador que influencia diversos sistemas do Grinta, mas **não determina sua qualidade técnica**. Ela impacta:

- **Elegibilidade para seleção** — define por qual seleção nacional o jogador pode ser convocado.
- **Adaptação e cultura** — afeta a integração do jogador em clubes e mundos de cultura diferente da sua origem.
- **Limites de estrangeiros** — regula quantos jogadores de fora podem compor um elenco, conforme as regras do mundo/competição.
- **Conexão com a torcida** — jogadores locais tendem a ter vínculo distinto com a base de torcedores.
- **Mercado** — influencia percepção de valor, interesse e movimentação de transferências.

> **Pendência:** Definir a estrutura de dados de nacionalidade (nacionalidade única vs. dupla nacionalidade / naturalização) e as regras numéricas dos limites de estrangeiros por mundo e competição. Ver efeitos de adaptação e valorização em [`./02-sistema-de-jogadores.md`](./02-sistema-de-jogadores.md).

---

## 2. Convocações integradas ao calendário

As convocações no Grinta são **completas e integradas ao calendário**, não eventos abstratos. Quando um jogador é convocado para a seleção, uma série de efeitos reais se aplica ao jogador e ao clube:

- **Ausência do clube** — o jogador deixa de estar disponível ao clube durante a data oficial, incluindo o período de viagem.
- **Viagem** — deslocamento consome tempo e contribui para o desgaste; o retorno considera viagem e clima.
- **Fadiga** — a participação em jogos e treinos da seleção acumula fadiga que retorna com o jogador ao clube.
- **Moral** — a experiência com a seleção pode elevar (ou reduzir) a moral do jogador.
- **Valorização e exposição** — bons desempenhos e visibilidade internacional podem aumentar o valor de mercado e a exposição do jogador.
- **Retorno lesionado** — o jogador pode voltar da convocação com uma lesão (ver Seção 6).

Esses efeitos alimentam diretamente os sistemas de jogador (fadiga, moral, valor). Ver [`./02-sistema-de-jogadores.md`](./02-sistema-de-jogadores.md). O encaixe das datas oficiais no fluxo da temporada é tratado em [`./06-temporada-e-competicoes.md`](./06-temporada-e-competicoes.md).

> **Pendência:** Especificar os valores/curvas de fadiga acumulada por minutos e por viagem, e o tempo de recuperação padrão no retorno.

---

## 3. Autoridade da convocação e recomendação médica

Como princípio de mundo, o **clube normalmente não pode impedir uma convocação oficial** de um jogador. A convocação da seleção tem autoridade sobre a disponibilidade do jogador dentro das datas oficiais.

A única exceção é a **recomendação médica reconhecida pelas regras**: se houver uma condição médica formalmente reconhecida pelo regulamento (por exemplo, lesão em recuperação), o jogador pode ser dispensado da convocação segundo os critérios daquele mundo/competição.

O clube, portanto, precisa **planejar elenco e rotação** contando com a ausência de jogadores em datas oficiais, em vez de tentar bloqueá-las.

> **Pendência:** Definir o processo de "recomendação médica reconhecida" — quem avalia, quais condições qualificam e como o sistema arbitra disputas entre clube e seleção.

---

## 4. Controle das seleções: IA e expansão para usuários

Inicialmente, **todas as seleções são controladas pela inteligência do jogo (IA)**. As convocações, escalações e decisões táticas das seleções são geridas automaticamente, garantindo que o calendário internacional funcione desde o início sem necessidade de gestores humanos.

Como **expansão futura**, está previsto que **usuários de reputação elevada** possam disputar cargos de seleção, assumindo a gestão de uma seleção nacional. Isso conecta a evolução do jogador/gestor no mundo com o acesso a esse tipo de cargo.

A integração desse recurso com múltiplos usuários e a estrutura de mundos é tratada em [`../02-tecnico/03-multiplayer-e-mundos.md`](../02-tecnico/03-multiplayer-e-mundos.md).

> **Pendência:** Definir o limiar e os critérios de reputação para disputar cargos de seleção, o modelo de disputa/nomeação e a transição de controle da IA para o usuário (e de volta).

---

## 5. Conflito de datas e prioridade por regulamento

As **datas oficiais de seleção possuem prioridade definida pelo regulamento**. Quando há conflito entre compromissos do clube e da seleção, o regulamento estabelece qual compromisso prevalece.

Consequências para o clube:

- Precisa **planejar elenco e rotação** antecipando ausências nas datas oficiais.
- Deve considerar o **retorno do jogador**, que leva em conta viagem, clima, minutos jogados e recuperação — o jogador nem sempre volta pronto para atuar imediatamente.

A definição concreta das janelas do calendário internacional e sua interação com as competições de clubes está em [`./06-temporada-e-competicoes.md`](./06-temporada-e-competicoes.md).

> **Pendência:** Especificar a tabela de prioridades por tipo de competição (datas FIFA-equivalentes, torneios continentais, amistosos) e o tratamento de sobreposições de calendário.

---

## 6. Lesão em convocação e compensação parcial

Uma **lesão ocorrida durante a convocação afeta o clube normalmente** — o jogador retorna lesionado e fica indisponível conforme a gravidade, impactando o planejamento do clube da mesma forma que uma lesão comum.

Pode existir uma **compensação parcial** ao clube pela lesão sofrida na seleção, **conforme a competição e a regra do mundo**. Ou seja, a compensação não é universal nem total: depende do regulamento da competição em que a lesão ocorreu e das configurações do mundo.

Os efeitos de lesão sobre o jogador (recuperação, condição física, valor) seguem o sistema descrito em [`./02-sistema-de-jogadores.md`](./02-sistema-de-jogadores.md).

> **Pendência:** Definir o modelo econômico da compensação parcial (base de cálculo, teto, quem paga) e por quais competições ela se aplica.

---

## 7. Seleções de base e competições internacionais (expansão)

**Seleções de base, torneios continentais e competições internacionais** são **expansões previstas** para o Grinta.

O princípio de projeto é que a **estrutura funcional do jogo permita a inclusão desses elementos sem alterar os fundamentos existentes** — os sistemas de calendário, desgaste, inscrição e economia devem acomodar essas novas competições sem redesenho. Isso exige que a arquitetura de seleções e calendário seja concebida desde já como extensível.

> **Pendência:** Detalhar o escopo das seleções de base (faixas etárias, elegibilidade) e das competições continentais (formato, inscrição, economia) quando essas expansões forem priorizadas.

---

### Ligações

- Calendário e temporada: [`./06-temporada-e-competicoes.md`](./06-temporada-e-competicoes.md)
- Efeitos em jogadores (fadiga, moral, valor, lesão): [`./02-sistema-de-jogadores.md`](./02-sistema-de-jogadores.md)
- Multiplayer e mundos: [`../02-tecnico/03-multiplayer-e-mundos.md`](../02-tecnico/03-multiplayer-e-mundos.md)
