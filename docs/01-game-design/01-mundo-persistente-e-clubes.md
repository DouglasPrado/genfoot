# Mundo Persistente e Clubes

> **Status:** Rascunho consolidado · **Fontes:** chats/organizacao-de-pensamentos.md, chats/planejamento-agrupado-do-jogo.md · **Revisão:** 2026-07-10

## Resumo

O **Grinta** é um manager de futebol online com **mundo persistente**: um universo único que não reinicia, no qual os clubes continuam existindo temporada após temporada e novos usuários entram ao longo do tempo. A entidade central do jogo é o **clube**, que o usuário gerencia como uma instituição esportiva em crescimento. O princípio fundador é a **justiça inicial**: todo clube nasce pequeno, com o mesmo caixa inicial e elenco equilibrado; o tamanho de um clube é consequência da gestão ao longo das temporadas, não de vantagem de largada. Esse desenho reduz o *pay-to-win* e sustenta a economia global balanceada detalhada em [`./03-economia.md`](./03-economia.md).

## Sumário

1. [Mundo persistente](#1-mundo-persistente)
2. [O clube como entidade principal](#2-o-clube-como-entidade-principal)
3. [Todos os clubes nascem pequenos e equilibrados](#3-todos-os-clubes-nascem-pequenos-e-equilibrados)
4. [Crescimento por mérito](#4-crescimento-por-mérito)
5. [Conexão com a economia global balanceada](#5-conexão-com-a-economia-global-balanceada)
6. [Referências](#6-referências)

---

## 1. Mundo persistente

O mundo do Grinta **não para e não reinicia**. Mesmo quando usuários saem, os clubes continuam existindo, as temporadas seguem acontecendo e a economia permanece viva.

### 1.1 O mundo continua

Quando o usuário está offline, o clube segue participando do universo, com decisões automatizadas:

- A IA administra o básico (comissão, decisões essenciais).
- O clube segue disputando o campeonato.
- Jogadores treinam e evoluem.
- Partidas acontecem normalmente.
- O mercado continua ativo.
- Eventos podem ocorrer.

As **decisões estratégicas profundas**, porém, devem depender do usuário — a IA cobre a operação, não a estratégia de longo prazo.

### 1.2 Usuários entrando ao longo do tempo

O universo é contínuo: um usuário pode entrar na temporada 1 ou na temporada 20. Como clubes antigos crescem muito, o mundo precisa oferecer **caminho real de evolução** a quem chega tarde, sem apagar o mérito dos clubes veteranos. Os mecanismos que garantem isso (divisões por nível, ligas de acesso, reputação por faixa — local, regional, nacional, continental, mundial — e programa de desenvolvimento inicial) são tratados em [`../02-tecnico/03-multiplayer-e-mundos.md`](../02-tecnico/03-multiplayer-e-mundos.md).

Em linha geral:

- Clubes novos entram em **divisões inferiores / ligas de desenvolvimento** compatíveis com seu nível, competindo contra clubes parecidos.
- Existe o **mundo persistente principal** e pode haver mundos sazonais / ligas de novatos para quem prefere começar junto de todos.
- O clube novo cresce **subindo divisões**, sentindo progressão constante ao longo das temporadas.

### 1.3 O usuário nunca é demitido

O usuário é o **gestor permanente da sua instituição**: o vínculo com o clube é persistente e não é encerrado por resultados ruins. Diferente de managers em que o técnico é dispensado, aqui o usuário mantém o comando do clube ao longo de todo o mundo persistente. A pressão da diretoria e da torcida existe como mecânica de consequência (cobrança, moral, narrativas), mas não resulta em perda do clube.

> **Pendência:** As fontes não descrevem explicitamente a regra "usuário nunca é demitido" nem os efeitos concretos da pressão de diretoria/torcida sobre a permanência. Confirmar o modelo exato (o usuário é dono/presidente vitalício do clube? há alguma consequência de cobrança além de moral e narrativa?).

### 1.4 Histórico do mundo

O jogo guarda o histórico que dá identidade e apego ao universo:

- Temporadas e campeões
- Artilheiros e recordes
- Maiores transferências
- Ídolos dos clubes e jogadores lendários
- Rebaixamentos e títulos
- Rivalidades e crises
- Evolução financeira

---

## 2. O clube como entidade principal

Cada **clube** é a entidade principal do jogo — a unidade que o usuário gerencia. Um clube possui os seguintes atributos:

| Atributo | Descrição |
| --- | --- |
| **Nome** | Identificação do clube. |
| **Escudo** | Identidade visual. |
| **País/região** | Localização no mundo do jogo. |
| **Caixa** | Recursos financeiros disponíveis. |
| **Elenco** | Conjunto de jogadores do clube. |
| **Comissão técnica** | Equipe que influencia decisões e qualidade das sugestões ao usuário. |
| **Diretoria** | Órgão de gestão institucional (nível afeta contratos e contratações). |
| **Estrutura física** | Instalações e departamentos por nível. |
| **Torcida** | Base de torcedores; influencia pressão, moral e receita. |
| **Reputação** | Prestígio do clube (evolui por faixas: local → mundial). |
| **Histórico** | Registro de temporadas, títulos e trajetória. |
| **Divisão / campeonato atual** | Camada competitiva em que o clube disputa. |
| **Estilo de jogo** | Perfil tático da equipe. |
| **Cultura interna** | Identidade e traços institucionais do clube. |
| **Nível institucional** | Nível geral do clube, resultado da soma de estrutura, staff, reputação, finanças e desempenho. |

> **Nota:** Os detalhes de **estrutura física, departamentos e staff** (centro de treinamento, departamento médico, base, olheiros, comunicação, comercial, e seus níveis) são tratados em [`./04-estrutura-do-clube-e-staff.md`](./04-estrutura-do-clube-e-staff.md).

O **nível institucional** é um ponto-chave: o clube não fica grande só por títulos ou dinheiro, mas por **construir uma organização melhor**. Dois clubes com o mesmo caixa podem evoluir de formas bem diferentes conforme investem em estrutura e funcionários.

---

## 3. Todos os clubes nascem pequenos e equilibrados

O princípio fundador do Grinta: **nenhum clube nasce grande**. Todos os clubes gerados começam como clubes pequenos, o que significa:

- Baixa reputação
- Estrutura simples e estádio pequeno
- Torcida pequena
- **Caixa inicial fixo** (idêntico para todos)
- Elenco equilibrado, com pouca diferença de qualidade
- Mesma capacidade inicial de crescimento

### 3.1 Caixa inicial fixo e idêntico

Todo clube novo entra no mundo com o **mesmo caixa inicial**, garantindo que ninguém comece com vantagem financeira.

- Valor de referência citado nas fontes: **R$ 1.000.000**.
- O importante é a **regra**, não o número exato: o caixa inicial é igual para todos.

> **Pendência:** As fontes oscilam entre "caixa inicial fixo idêntico para todos" e "pequenas variações de caixa para gerar identidade" (ex.: um clube com caixa um pouco maior porém estrutura menor). Definir se o caixa é estritamente idêntico ou admite micro-variações compensadas por outros atributos. O valor de R$ 1.000.000 é referência, não fechado.

### 3.2 Diferenças de identidade, não de poder

Os clubes começam equilibrados em **força total**, mas não idênticos. Pequenas variações de perfil geram identidade sem quebrar a justiça:

- Clube A: melhor base, pior estádio.
- Clube B: melhor torcida, pior estrutura de treino.
- Clube C: melhor defesa inicial, ataque fraco.
- Clube D: mais disciplinado, menos criativo.
- Clube E: elenco mais físico, menos técnico.

A força total do elenco é balanceada por um **teto comum de pontos** distribuído de formas diferentes entre os setores — por exemplo, todos os clubes partem da mesma soma de força total (ex.: 1.500 pontos), variando apenas como esses pontos se dividem entre defesa, meio, ataque e goleiros. O mesmo vale para a identidade institucional: cada clube pode receber um total fixo de pontos (ex.: 100) repartido entre base, torcida, estrutura, elenco, finanças e disciplina, de modo que a soma seja idêntica e só o perfil mude. O elenco inicial típico é veterano e equilibrado: por volta de 23 jogadores em faixa etária mais alta, qualidade média parecida, potencial limitado e contratos curtos — reforçando que o valor vem da gestão, não da largada.

Essas variações podem se organizar em **perfis iniciais nomeados**, todos balanceados na força total, diferindo apenas em estilo:

- **Clube Formador** — melhor base, elenco inicial um pouco menos técnico.
- **Clube Operário** — mais físico e garra, menos técnica.
- **Clube Organizado** — disciplina e finanças, menos criatividade.
- **Clube Popular** — torcida inicial levemente maior, estrutura menor.
- **Clube Técnico** — melhor passe e controle de bola, menos força física.
- **Clube Defensivo** — zaga e marcação melhores, ataque mais fraco.

Os caminhos de crescimento associados a cada perfil (formador, comprador, competitivo, popular) são detalhados em [`./04-estrutura-do-clube-e-staff.md`](./04-estrutura-do-clube-e-staff.md).

> **Pendência:** Números do elenco inicial (quantidade exata de jogadores, faixa etária, teto de força total) aparecem como exemplos nas fontes e precisam ser fechados em documento próprio de elenco/jogadores.

---

## 4. Crescimento por mérito

O tamanho do clube é **consequência da gestão ao longo das temporadas**, não de vantagem inicial. O crescimento acontece por:

- **Desempenho esportivo** — boas campanhas, títulos, promoções de divisão.
- **Formação de jogadores** — desenvolvimento da base e venda de atletas.
- **Gestão financeira** — controle salarial, bilheteria, patrocínios, uso inteligente do caixa.
- **Evolução estrutural** — investimento em estrutura física e funcionários, que elevam o nível institucional.
- **Reputação e torcida** — crescimento por faixas (local → regional → nacional → continental → mundial).

O clube não nasce grande — ele **fica grande**, atravessando estágios ao longo do tempo:

**pequeno → emergente → médio → forte → grande → dominante (gigante).**

A subida é deliberadamente **lenta e difícil**: um clube não deve virar gigante em duas temporadas. O "tamanho real" de um clube é a soma de reputação esportiva, reputação financeira, capacidade formadora, títulos, torcida e estrutura — de modo que um clube rico, mas mal administrado, não sobe de patamar automaticamente. O detalhamento das faixas e da pontuação que classifica cada estágio faz parte da economia global em [`./03-economia.md`](./03-economia.md).

### 4.1 Redução de pay-to-win

Como todos partem do mesmo ponto financeiro e estrutural, o jogo deixa de ser "clubes grandes vs. pequenos" e vira um **ecossistema equilibrado**. Isso:

- Reduz *pay-to-win*.
- Reduz vantagem inicial.
- Cria competição justa, em que o sucesso reflete mérito de gestão.

### 4.2 Mérito dos antigos × oportunidade dos novos

O tempo favorece os clubes antigos, mas o sistema cria ligas, incentivos e janelas de oportunidade para clubes novos crescerem **sem destruir o mérito dos veteranos**. Clubes antigos mantêm vantagem histórica, mas enfrentam custos altos, pressão, envelhecimento de elenco e crises.

> **Regra de ouro:** o usuário novo não recebe igualdade imediata com clubes antigos, mas recebe um **caminho justo, protegido e divertido** para crescer.

O detalhamento das divisões, mundos e proteções de entrada está em [`../02-tecnico/03-multiplayer-e-mundos.md`](../02-tecnico/03-multiplayer-e-mundos.md).

---

## 5. Conexão com a economia global balanceada

O princípio "todos nascem pequenos" só se sustenta porque o Grinta opera como uma **economia fechada, controlada e balanceada por ciclos**. Nada é gerado de forma isolada: novos clubes, jogadores, dinheiro, salários e preços são calculados considerando o equilíbrio de todo o universo.

Fatores que compõem o balanceamento global:

- Quantidade de clubes
- Quantidade de jogadores ativos e livres
- Dinheiro em circulação
- Jogadores se aposentando × jovens entrando
- Demanda por posições
- Idade média do universo

Assim, o caixa inicial fixo e o crescimento por mérito são a "porta de entrada" de um sistema maior, em que cada temporada recalcula a saúde do ecossistema — evitando inflação de mercado, excesso ou falta de jogadores, clubes ricos ou quebrados demais e desbalanceamento online.

> **Este documento apresenta apenas o resumo dessa conexão.** O detalhamento da economia global (geração de jogadores, precificação, salários, aposentadorias, inflação e ciclos) está em [`./03-economia.md`](./03-economia.md).

---

## 6. Referências

- [`./03-economia.md`](./03-economia.md) — Economia global balanceada (detalhe).
- [`./04-estrutura-do-clube-e-staff.md`](./04-estrutura-do-clube-e-staff.md) — Estrutura física, departamentos e staff.
- [`../02-tecnico/03-multiplayer-e-mundos.md`](../02-tecnico/03-multiplayer-e-mundos.md) — Multiplayer, mundos/servidores, divisões e entrada de novos usuários.
