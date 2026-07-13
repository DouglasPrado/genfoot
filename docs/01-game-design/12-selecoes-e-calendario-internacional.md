# Seleções e Calendário Internacional

> **Status:** CANÔNICO · **Fontes:** chats/documento-definitivo-escopo.md (Seção 15), R-150 · **Revisão:** 2026-07-13

## Resumo

Este documento define como as **seleções nacionais** e o **calendário internacional** operam no **Grinta**. A nacionalidade do jogador influencia elegibilidade para seleção, adaptação cultural, limites de estrangeiros nos elencos, conexão com a torcida e mercado — mas **não define a qualidade** do jogador. As convocações são tratadas como parte integrada do calendário: quando convocado, o jogador se ausenta do clube, viaja, pode acumular fadiga, ganhar (ou perder) moral, valorizar-se e ganhar exposição, ou retornar lesionado.

Como regra de mundo, o **clube não pode impedir uma convocação oficial**, salvo recomendação médica reconhecida pelo regulamento. As seleções são controladas por IA quando não houver gestor humano; gestores com reputação suficiente podem assumir o cargo. O produto completo inclui seleções principal, sub-20 e sub-17, calendário e competições internacionais, conforme R-150.

## Sumário

1. [Nacionalidade e limites de estrangeiros](#1-nacionalidade-e-limites-de-estrangeiros)
2. [Convocações integradas ao calendário](#2-convocações-integradas-ao-calendário)
3. [Autoridade da convocação e recomendação médica](#3-autoridade-da-convocação-e-recomendação-médica)
4. [Controle das seleções: IA e usuários](#4-controle-das-seleções-ia-e-usuários)
5. [Conflito de datas e prioridade por regulamento](#5-conflito-de-datas-e-prioridade-por-regulamento)
6. [Lesão em convocação e compensação parcial](#6-lesão-em-convocação-e-compensação-parcial)
7. [Seleções de base e competições internacionais](#7-seleções-de-base-e-competições-internacionais)

---

## 1. Nacionalidade e limites de estrangeiros

A **nacionalidade** é um atributo de identidade do jogador que influencia diversos sistemas do Grinta, mas **não determina sua qualidade técnica**. Ela impacta:

- **Elegibilidade para seleção** — define por qual seleção nacional o jogador pode ser convocado.
- **Adaptação e cultura** — afeta a integração do jogador em clubes e mundos de cultura diferente da sua origem.
- **Limites de estrangeiros** — regula quantos jogadores de fora podem compor um elenco, conforme as regras do mundo/competição.
- **Conexão com a torcida** — jogadores locais tendem a ter vínculo distinto com a base de torcedores.
- **Mercado** — influencia percepção de valor, interesse e movimentação de transferências.

A **estrutura de dados de nacionalidade** (especificada aqui) adota um modelo simples e extensível:

```
PlayerNationality {
  primaryNationality         // nacionalidade esportiva principal — elegibilidade default de seleção; conta para foreignPlayerLimit
  secondaryNationality?      // 0 ou 1 nacionalidade adicional (dupla nacionalidade ou naturalização)
  eligibility: "primary" | "secondary" | "locked_to_primary" | "locked_to_secondary"  // por qual seleção o jogador está apto/comprometido; os estados locked_* deixam explícito a QUAL nacionalidade ele ficou amarrado
}
```

Regra de elegibilidade: um jogador com `secondaryNationality` pode ser convocado por **qualquer uma** das duas seleções enquanto `eligibility` não estiver travada (`locked_to_primary` ou `locked_to_secondary`); ao atuar em **jogo oficial** (não amistoso) por uma seleção, `eligibility` passa a `locked_to_primary` ou `locked_to_secondary` conforme a nacionalidade escolhida (modelo de "amarração"), deixando explícito por qual das duas o jogador ficou comprometido. Para **limites de estrangeiros**, o jogador conta como **local** quando `primaryNationality` **ou** `secondaryNationality` corresponde à nacionalidade do mundo/competição; caso contrário conta como estrangeiro. **Naturalização** = mudança de `primaryNationality`/`secondaryNationality` disparada pela regra de tempo de permanência do mundo. Efeitos de adaptação e valorização em [`./02-sistema-de-jogadores.md`](./02-sistema-de-jogadores.md).

> **Decisão ratificada — R-63:** as **regras numéricas dos limites de estrangeiros** por mundo e competição são o mesmo valor de balanceamento de **R-63**, definido em [`./06-temporada-e-competicoes.md`](./06-temporada-e-competicoes.md) §15.2 (proposta: 5 estrangeiros por partida na elite, mais restritivo nas divisões inferiores). Calibração final em [`../02-tecnico/05-catalogo-de-regras-e-formulas.md`](../02-tecnico/05-catalogo-de-regras-e-formulas.md).

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

> **Decisão ratificada — R-64:** modelar a fadiga de convocação como `fadigaConvocação = Σ(minutosJogados · k_min) + nTrechos · k_viagem + horasDeFuso · k_fuso`, somada à fadiga do sistema de jogador (reaproveitando a mecânica `penal_F2` de R-16 no [catálogo de regras](../02-tecnico/05-catalogo-de-regras-e-formulas.md)). Proposta de 1ª passada: `k_min = 0,25` ponto/min (90 min ≈ +22), `k_viagem = 8` pontos por trecho longo, `k_fuso = 1,5` ponto por hora de diferença; **tempo de recuperação padrão** no retorno = 2–4 dias virtuais para zerar o excedente, escalado pela idade do jogador e pela equipe médica **do clube** (não da seleção). Racional: reusa a mecânica de fadiga já existente em vez de criar um segundo modelo; os coeficientes são de balanceamento e ficam para o catálogo de regras.

---

## 3. Autoridade da convocação e recomendação médica

Como princípio de mundo, o **clube normalmente não pode impedir uma convocação oficial** de um jogador. A convocação da seleção tem autoridade sobre a disponibilidade do jogador dentro das datas oficiais.

A única exceção é a **recomendação médica reconhecida pelas regras**: se houver uma condição médica formalmente reconhecida pelo regulamento (por exemplo, lesão em recuperação), o jogador pode ser dispensado da convocação segundo os critérios daquele mundo/competição.

O clube, portanto, precisa **planejar elenco e rotação** contando com a ausência de jogadores em datas oficiais, em vez de tentar bloqueá-las.

> **Decisão ratificada — R-67:** modelar a **dispensa por recomendação médica** como estado do jogador, não como negociação livre. Proposta: o jogador só é elegível a dispensa se tiver um `InjuryRecord` ativo (ou condição de recuperação) **reconhecido pelo sistema de lesões** ([`./02-sistema-de-jogadores.md`](./02-sistema-de-jogadores.md)) na abertura da janela; a arbitragem é **automática por regra** — a IA da seleção consulta o estado clínico, sem disputa manual clube×seleção no núcleo (o clube não pode "alegar" lesão sem registro). Condições que qualificam: lesão em recuperação, carga de jogos acima de um teto de proteção, e restrições médicas de longo prazo. Racional: mantém o princípio de que a convocação tem autoridade (§3), fecha a brecha de dispensa arbitrária e reusa o sistema de lesões existente; o teto de carga é valor de balanceamento a calibrar no [catálogo de regras](../02-tecnico/05-catalogo-de-regras-e-formulas.md).

---

## 4. Controle das seleções: IA e usuários

Inicialmente, **todas as seleções são controladas pela inteligência do jogo (IA)**. As convocações, escalações e decisões táticas das seleções são geridas automaticamente, garantindo que o calendário internacional funcione desde o início sem necessidade de gestores humanos.

**Usuários com reputação elevada** podem disputar cargos de seleção e assumir uma seleção nacional. Isso conecta a evolução do gestor no mundo ao acesso ao cargo, sem retirar a gestão do clube.

A integração desse recurso com múltiplos usuários e a estrutura de mundos é tratada em [`../02-tecnico/03-multiplayer-e-mundos.md`](../02-tecnico/03-multiplayer-e-mundos.md).

> **Decisões ratificadas — R-65/R-150:** elegibilidade a cargo de seleção a partir de `reputação ≥ 85`, com nomeação por federação (IA), preferência ponderada por nacionalidade e histórico de títulos. A IA cede o cargo no início de um ciclo e o retoma por inatividade ou perda de elegibilidade. O cargo não exige abandonar o clube; conflito de agenda usa prioridade internacional e delegação explícita.

---

## 5. Conflito de datas e prioridade por regulamento

As **datas oficiais de seleção possuem prioridade definida pelo regulamento**. Quando há conflito entre compromissos do clube e da seleção, o regulamento estabelece qual compromisso prevalece.

Consequências para o clube:

- Precisa **planejar elenco e rotação** antecipando ausências nas datas oficiais.
- Deve considerar o **retorno do jogador**, que leva em conta viagem, clima, minutos jogados e recuperação — o jogador nem sempre volta pronto para atuar imediatamente.

A definição concreta das janelas do calendário internacional e sua interação com as competições de clubes está em [`./06-temporada-e-competicoes.md`](./06-temporada-e-competicoes.md).

A **tabela de prioridade por tipo de compromisso** (estrutura, especificada aqui) é aplicada pelo calendário quando dois compromissos colidem — vence o de maior prioridade, e o de menor é remarcado ou libera o jogador:

| Prioridade | Tipo de compromisso | Efeito no conflito |
| --- | --- | --- |
| 1 (máxima) | Data oficial obrigatória de seleção (equivalente-FIFA) e competição internacional oficial | Prevalece; clube libera o jogador |
| 2 | Competição continental de clubes | Cede à seleção oficial; prevalece sobre liga/copa nacional |
| 3 | Liga e copa nacional | Cede aos níveis acima; remarcada se coincidir com data oficial |
| 4 | Estadual / regional | Cede aos níveis acima |
| 5 (mínima) | Amistosos (clube ou seleção) | Sempre cede; não obriga liberação |

Tratamento de sobreposição: em empate de prioridade, prevalece o compromisso **oficial agendado primeiro**; amistosos de seleção **não** obrigam liberação (só datas oficiais têm autoridade, §3). A ordenação concreta por competição é atributo do regulamento de cada uma (`ChampionshipRules`, ver [`./06-temporada-e-competicoes.md`](./06-temporada-e-competicoes.md) §2).

---

## 6. Lesão em convocação e compensação parcial

Uma **lesão ocorrida durante a convocação afeta o clube normalmente** — o jogador retorna lesionado e fica indisponível conforme a gravidade, impactando o planejamento do clube da mesma forma que uma lesão comum.

Pode existir uma **compensação parcial** ao clube pela lesão sofrida na seleção, **conforme a competição e a regra do mundo**. Ou seja, a compensação não é universal nem total: depende do regulamento da competição em que a lesão ocorreu e das configurações do mundo.

Os efeitos de lesão sobre o jogador (recuperação, condição física, valor) seguem o sistema descrito em [`./02-sistema-de-jogadores.md`](./02-sistema-de-jogadores.md).

> **Decisão ratificada — R-66:** modelar a **compensação parcial por lesão em convocação** como pagamento condicional da federação/organizadora ao clube. Proposta de 1ª passada: base de cálculo = **fração do salário do jogador durante a indisponibilidade** (`0,5 · salárioDiário · diasParado`), com **teto** por lesão (~2 meses de salário) e franquia mínima de dias (lesões muito curtas não geram compensação); **quem paga** = a organizadora da competição em que a lesão ocorreu, apenas para **competições oficiais** (datas oficiais e torneios continentais/mundiais de seleção) — amistosos não geram compensação. Racional: liga a compensação ao custo real que o clube absorve, com teto para não desestabilizar as finanças do mundo; base, fração e teto são valor de balanceamento a calibrar no [catálogo de regras](../02-tecnico/05-catalogo-de-regras-e-formulas.md).

---

## 7. Seleções de base e competições internacionais

> **Decisão ratificada — R-150:** o produto completo inclui seleções **principal, sub-20 e sub-17**, torneios continentais e competições internacionais de seleção. Todas reutilizam o kernel de partida, rulesets versionados, calendário, inscrições, disciplina, finanças e histórico já definidos para clubes, acrescentando a elegibilidade por nacionalidade e faixa etária. `ageLimit` pertence ao regulamento da edição; convocações e compromissos internacionais participam do mesmo calendário autoritativo do mundo.

---

### Ligações

- Calendário e temporada: [`./06-temporada-e-competicoes.md`](./06-temporada-e-competicoes.md)
- Efeitos em jogadores (fadiga, moral, valor, lesão): [`./02-sistema-de-jogadores.md`](./02-sistema-de-jogadores.md)
- Multiplayer e mundos: [`../02-tecnico/03-multiplayer-e-mundos.md`](../02-tecnico/03-multiplayer-e-mundos.md)
