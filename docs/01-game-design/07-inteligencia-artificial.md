# Inteligência Artificial (Decision Engine)

> **Status:** Rascunho consolidado · **Fontes:** chats/como-podemos-desenvolver-jogo.md · **Revisão:** 2026-07-10

A IA do **Grinta** não é "uma IA só", mas um ecossistema de agentes e sistemas de decisão em camadas, todos compartilhando o mesmo núcleo lógico. Cada parte do jogo (mundo, clube, diretoria, comissão, técnico adversário, partida ao vivo, mercado, jogadores, imprensa) tem inteligência própria, mas todas reduzem suas escolhas a um padrão comum: **Contexto + Perfil + Score + Probabilidade + Consequência**.

O coração é matemático, sistêmico, determinístico e balanceável. A camada narrativa (e a IA generativa) entram depois, apenas para dar vida — nunca para decidir o jogo.

## Sumário

- [1. Princípios](#1-principios)
- [2. Hierarquia de IAs por camada](#2-hierarquia-de-ias-por-camada)
- [3. Módulos de IA](#3-modulos-de-ia)
- [4. Padrão núcleo de decisão (Decision Engine)](#4-padrao-nucleo-de-decisao-decision-engine)
- [5. Os 4 tipos de IA combinados](#5-os-4-tipos-de-ia-combinados)
- [6. Sistema de personalidade da IA](#6-sistema-de-personalidade-da-ia)
- [7. IA online vs offline](#7-ia-online-vs-offline)
- [8. Anti-padrões e diretrizes de balanceamento](#8-anti-padroes-e-diretrizes-de-balanceamento)
- [9. Ordem de desenvolvimento da IA](#9-ordem-de-desenvolvimento-da-ia)

---

## 1. Princípios

A IA do Grinta deve:

- entender contexto;
- agir conforme perfil;
- **errar conforme nível** (técnico ruim erra mais, técnico bom erra menos);
- gerar consequências com trade-offs reais;
- criar histórias;
- manter o mundo equilibrado;
- ajudar o usuário **sem jogar por ele**;
- comandar clubes offline de forma coerente;
- fazer cada clube, técnico e jogador parecer único.

O modelo técnico base é **Rule-based AI + Scoring System + Utility AI + arquitetura orientada a eventos**. Não se começa por machine learning, redes neurais ou IA generativa decidindo partidas/mercado — isso seria difícil de balancear, caro, imprevisível e quase impossível de depurar. A IA generativa entra apenas na narrativa (ver seção 5).

> **Escala canônica:** todo atributo, traço e score de jogador usa **0–100**, declarado como escala canônica em [`./02-sistema-de-jogadores.md`](./02-sistema-de-jogadores.md) §2 (é a faixa já dominante nos exemplos deste documento). Módulos que usam outra faixa por conveniência (ex.: energia/fadiga em %) convertem a partir de 0–100, nunca redefinem a escala. Os pesos e modificadores internos de score (§4.4) são um balanceamento à parte, ainda em aberto.

---

## 2. Hierarquia de IAs por camada

As camadas vão do mais amplo (mundo) ao mais granular (minuto a minuto na partida).

### 2.1. IA central do mundo

Controla o comportamento geral do universo do jogo. Não decide cada detalhe, mas mantém o mundo coerente e "saudável". É a camada "Deus do jogo": age como **consequência do mundo**, não como algo artificial.

Responsabilidades:

- crescimento dos clubes e nível médio dos campeonatos;
- equilíbrio econômico, inflação/deflação de mercado;
- geração de jogadores e surgimento de talentos;
- aposentadorias;
- queda e ascensão de clubes;
- movimentação de técnicos;
- comportamento de torcida, mídia e patrocinadores.

Exemplos de auto-regulação:

- Se há jogadores demais, reduz a geração de jovens.
- Se há pouco dinheiro circulando, melhora premiações e patrocínios.
- Se clubes grandes acumulam poder demais, cria equilíbrio natural: salários altos, pressão, assédio europeu, lesões, crise interna, torcida exigente.

> Ligação: as regras de inflação, premiações, salários e travas econômicas vivem em [`./03-economia.md`](./03-economia.md).

### 2.2. IA dos clubes

Cada clube tem IA própria **baseada em perfil**. Um clube não "compra o melhor jogador disponível": ele tem identidade e pesos internos.

Perfis de exemplo: clube formador, vendedor, agressivo no mercado, conservador, endividado, organizado, bagunçado, com torcida impaciente, que prioriza veteranos, que aposta em jovens, rico mas mal gerido, pequeno em crescimento.

Os pesos internos moldam o comportamento:

| Peso interno | Clube A (formador) | Clube B (grande/imediatista) |
|---|---|---|
| Prioriza jovens | 80 | 35 |
| Prioriza resultados imediatos | 40 | 90 |
| Tolera dívida | 20 | 70 |
| Investe em base / medalhões | 90 (base) | 80 (medalhões) |
| Pressão da torcida | 30 | 95 |
| Ambição | 60 | 90 |

### 2.3. IA da diretoria

Sub-IA do clube. Decide: contratar/demitir técnico, aprovar orçamento, vender jogador, renovar contratos, investir em estrutura, segurar ou aceitar proposta, definir metas da temporada.

A diretoria tem **nível**, que evita uma IA "burra ou genérica":

| Diretoria nível 1 | Diretoria nível 5 |
|---|---|
| Contratos ruins | Negocia melhor |
| Vende jogadores barato | Protege patrimônio |
| Demora para renovar | Identifica oportunidades |
| Contrata por impulso | Planeja elenco |
| Sofre mais com pressão da torcida | Segura crise com mais inteligência |

Perfil administrativo (tipo ilustrativo):

```ts
type BoardProfile = {
  patience: number;
  ambition: number;
  financialRisk: number;
  professionalism: number;
  pressureSensitivity: number;
};
```

### 2.4. IA da comissão técnica

Influencia o jogo em duas frentes.

**Fora de campo** — afeta desenvolvimento dos jogadores, recuperação física, risco de lesão, moral, evolução tática, adaptação e leitura de elenco.

| Preparador físico nível baixo | Preparador físico nível alto |
|---|---|
| Jogadores cansam mais | Controla carga |
| Mais lesões | Reduz risco de lesão |
| Menor recuperação entre jogos | Melhora resistência; sugere substituições melhores |

**Dentro da partida** — gera sugestões ao usuário, cuja precisão escala com o nível:

- **Nível 1:** "Seu time está sofrendo pressão pelo lado direito."
- **Nível 3:** "O lateral direito está cansado e o ponta adversário está vencendo duelos. Recuar o volante pode reduzir o risco."
- **Nível 5:** "O adversário mudou para 4-2-3-1 e está atacando entre seu zagueiro esquerdo e lateral. Sugestão: fechar linha com o volante, marcar forte o meia central e explorar contra-ataque nas costas do lateral direito."

Isso dá valor real a contratar funcionários melhores.

### 2.5. IA do técnico adversário

Toma decisões em jogos offline ou contra clubes sem usuário ativo. Considera: placar, minuto, mando de campo, importância da partida, moral, cansaço, cartões, lesões, qualidade do banco, estilo do técnico, força do adversário e contexto da temporada.

Aos 70 min, perdendo de 1x0:

- **Técnico ofensivo:** aumenta pressão, coloca atacante, muda para 4-3-3, marca saída de bola.
- **Técnico conservador:** equilibra antes, troca meia cansado, só arrisca após 80 min.
- **Técnico jovem/inexperiente:** pode substituir errado, demora a reagir, muda demais e desorganiza.

O **nível do técnico importa muito** aqui. Estilo modelado como (tipo ilustrativo):

```ts
type ManagerStyle = {
  mentality: 'DEFENSIVE' | 'BALANCED' | 'OFFENSIVE';
  pressing: 'LOW' | 'MEDIUM' | 'HIGH';
  possession: 'DIRECT' | 'BALANCED' | 'POSSESSION';
  riskTolerance: number;
  substitutionTiming: 'EARLY' | 'NORMAL' | 'LATE';
};
```

### 2.6. IA da partida ao vivo (loop de 9 passos)

A simulação roda por ciclos (ticks). Cada tick representa um minuto (ou fatia menor, ex.: 15 s simulados). A cada minuto simulado, o motor executa os **9 passos**:

1. **Energia** — atualiza a energia/fadiga dos jogadores.
2. **Domínio territorial** — calcula domínio de campo.
3. **Posse** — calcula posse provável.
4. **Duelos** — resolve duelos individuais.
5. **Chances** — calcula criação de chances.
6. **Risco defensivo** — calcula vulnerabilidade defensiva.
7. **Eventos especiais** — gera eventos possíveis.
8. **Moral/pressão** — atualiza moral e pressão das equipes.
9. **Decisão de relevância** — decide se algo relevante aconteceu (e se um ponto de decisão deve abrir).

Para jogos **online**, o motor pode pausar em **pontos de decisão**, que surgem quando o motor detecta mudança real na dinâmica — nunca de forma aleatória. Para jogos **offline**, o `ManagerAI` decide no lugar do usuário.

Exemplo de ponto de decisão (minuto 23, time perdendo o meio-campo): recuar o meia central · marcar forte o camisa 10 · adiantar a linha defensiva · manter estratégia.

> Ligação: o loop de simulação, os ticks, o seeded random e o resolvedor de eventos são detalhados em [`./05-motor-de-partida.md`](./05-motor-de-partida.md). Esta seção descreve apenas o papel da IA dentro dele.

---

## 3. Módulos de IA

Cada módulo decide **uma coisa pequena**, mas todos usam os mesmos conceitos de score, contexto, perfil e consequência.

### 3.1. Leitura tática (motor de leitura)

A IA precisa entender o que acontece. Calcula indicadores como: `dominio_meio_campo`, `pressao_adversaria`, `risco_lado_direito`, `risco_lado_esquerdo`, `eficiencia_ofensiva`, `cansaco_medio`, `vulnerabilidade_defensiva`, `criacao_de_chances`, `perigo_bola_parada`, `controle_emocional`.

Exemplo: lateral direito com velocidade 52, energia 41%, cartão amarelo, enfrentando ponta de velocidade 84 → `risco_lado_direito = muito alto` → gera recomendação de substituir, recuar o ponta ou deslocar volante para cobertura. Essa leitura é o coração da IA durante a partida.

### 3.2. Substituições

Não substitui apenas por cansaço. Avalia: energia, desempenho, nota, função tática, cartão, risco de lesão, encaixe contra o adversário, banco disponível, momento do jogo, placar, moral, importância do jogador e risco de desorganização.

- Jogador A (energia 38%, amarelo, perdendo duelos, substituto com bom físico) → **sugere substituir**.
- Jogador B (energia 42%, craque, ainda cria chances, substituto fraco) → **sugere manter mais alguns minutos**.

### 3.3. Mercado

Controla: propostas, interesse de clubes, disputa por jogadores, renovações, valorização, salários, multas, empresários e vontade do jogador. Cada jogador tem **valor percebido**, não só valor fixo.

| Jogador | Valor real | Valor percebido | Motivo |
|---|---|---|---|
| Jovem artilheiro | R$ 5 mi | R$ 8 mi | jovem, artilheiro, convocado, contrato longo, clube não precisa vender |
| Veterano em queda | R$ 10 mi | R$ 6 mi | idade alta, salário pesado, contrato perto do fim, lesões recentes, moral baixa |

> Ligação: as regras econômicas do mercado (travas, inflação, salários, orçamento) estão em [`./03-economia.md`](./03-economia.md).

### 3.4. Jogadores (comportamento)

Cada jogador tem uma IA simples de comportamento movida pela fatia comportamental da **lista canônica de atributos, estados e traços** definida em [`./02-sistema-de-jogadores.md`](./02-sistema-de-jogadores.md) §2 (escala 0–100) — esta seção **não mantém lista própria**. Pesam aqui: os **traços de personalidade** (ambição, lealdade, profissionalismo, temperamento, ganância, ego, adaptabilidade), os **atributos mentais** de mesmo nome que evoluem com treino (disciplina, liderança, resiliência) e o **estado** de pressão. A distinção importa: traços têm intensidade e visibilidade e enviesam o comportamento; atributos mentais são notas que sobem com treino; estados são temporários.

Afeta decisões: aceitar renovação, pedir aumento, forçar saída, reclamar no banco, render mais em jogo grande, cair sob pressão, liderar elenco, causar crise, voltar melhor após lesão.

- **Muito ambicioso:** quer clube maior, aceita proposta internacional, fica insatisfeito se o clube não cresce.
- **Leal:** aceita renovar, vira ídolo, segura crise, pode recusar proposta maior.

### 3.5. Imprensa e torcida

Reagem ao contexto. 3 derrotas seguidas → torcida pressiona, moral cai, diretoria cobra, imprensa questiona o técnico. Vitória sobre rival → moral sobe, jogador decisivo ganha fama, torcida perdoa fase ruim, patrocinador valoriza exposição.

O nível da equipe de comunicação modula o impacto:

| Comunicação nível 1 | Comunicação nível 5 |
|---|---|
| Crises crescem rápido | Controla a narrativa |
| Rumores desestabilizam | Reduz impacto de derrotas |
| Insatisfeito vaza para a imprensa | Protege jogadores jovens; melhora imagem |

### 3.6. Geração de jogadores

Baseada em **biografia + contexto + potencial**. O jogador nasce com história, não só atributos.

| Origem | Impactos positivos | Impactos negativos |
|---|---|---|
| Infância difícil, futebol de rua, pouca estrutura | garra, resistência mental, força, agressividade | técnica refinada inicial, disciplina tática |
| Escolinha desde cedo, boa estrutura, formação técnica | técnica, passe, visão de jogo, disciplina | força, intensidade, fome competitiva |

Depois, o clube molda o jogador: técnico em clube com comissão ruim pode estagnar; bruto em clube com boa base pode evoluir muito.

### 3.7. Recomendações ao usuário

A IA ajuda o usuário a entender o clube (fora do jogo). A precisão depende do nível dos funcionários (comissão ruim = análise superficial; boa = análise precisa). Exemplos:

- "Seu elenco tem muitos jogadores acima de 31 anos. Em duas temporadas, o custo salarial pode subir e o desempenho físico cair."
- "Seu time tem boa defesa, mas cria poucas chances. Um meia com visão de jogo teria impacto maior que outro atacante."
- "Seu preparador físico é fraco para o nível atual do clube. O risco de lesões aumentou 18% nos últimos dois meses."

### 3.8. IA narrativa

Transforma eventos brutos em histórias — dá alma ao jogo. O evento já foi decidido pelo motor; a narrativa só o veste.

| Evento bruto | Narrativa |
|---|---|
| Jovem fez 2 gols contra o rival | "A torcida começa a ver João Mendes como uma das maiores promessas do clube. A diretoria já teme assédio de clubes maiores." |
| Atacante 7 jogos sem marcar | "A fase ruim do centroavante incomoda a torcida. Internamente, a comissão avalia se ele precisa de descanso ou apoio psicológico." |

### 3.9. Espaço de decisão por área (enums)

Cada área define explicitamente o **conjunto de decisões possíveis** — o vocabulário fechado que o Decision Engine pode comparar. Isso mantém a IA previsível e auditável: nenhum módulo inventa ações fora do seu domínio.

**Partida** — Utility AI + regras táticas + eventos probabilísticos:

```ts
type TacticalDecisionType =
  | 'CHANGE_FORMATION'
  | 'SUBSTITUTE_PLAYER'
  | 'PRESS_HIGH'
  | 'DROP_BACK'
  | 'MARK_KEY_PLAYER'
  | 'EXPLOIT_FLANK'
  | 'KEEP_STRATEGY';
```

**Mercado** — Scoring AI + regras econômicas + perfil do clube:

```ts
type TransferDecisionType =
  | 'BUY_PLAYER'
  | 'SELL_PLAYER'
  | 'LOAN_PLAYER'
  | 'RENEW_CONTRACT'
  | 'REJECT_OFFER'
  | 'MAKE_COUNTER_OFFER';
```

**Torcida e mídia** — Event-based AI + narrativa (pressão, cobrança, crise, idolatria, reputação, moral do elenco):

```ts
type FanReactionEvent =
  | 'BIG_WIN'
  | 'DERBY_LOSS'
  | 'BAD_SEQUENCE'
  | 'YOUNG_PLAYER_BREAKOUT'
  | 'STAR_PLAYER_SOLD'
  | 'MANAGER_FIRED';
```

**Desenvolvimento de jogador** — Progression Engine + potencial + personalidade + treino + contexto. Aqui o "espaço de decisão" é, na verdade, o **contexto de entrada** que alimenta a evolução (técnica, física, queda por idade, impacto de treino, lesões, moral, minutos, qualidade da comissão):

```ts
type PlayerDevelopmentContext = {
  player: Player;
  trainingFocus: TrainingFocus;
  staffQuality: StaffQuality;
  clubStructure: ClubStructure;
  minutesPlayed: number;
  morale: number;
  injuryHistory: Injury[];
};
```

**Narrativa** — único módulo que pode usar LLM/IA generativa, e só para texto. O evento já foi decidido pelo motor; a narrativa apenas o veste, com um `tone` que controla a voz do texto gerado:

```ts
type NarrativeInput = {
  eventType: string;
  clubName: string;
  playerName?: string;
  context: Record<string, unknown>;
  tone: 'neutral' | 'press' | 'fan' | 'dramatic';
};
```

Saída de exemplo (`tone: 'press'`): *"A torcida começa a pressionar a diretoria após a terceira derrota seguida, principalmente pela falta de reação tática no segundo tempo."* — mas o evento em si (a derrota, a pressão) já veio do motor; a IA generativa só escreve bonito.

---

## 4. Padrão núcleo de decisão (Decision Engine)

Toda decisão importante da IA segue o mesmo contrato:

**Contexto + Perfil + Score + Probabilidade + Consequência**

O `DecisionEngine` recebe um ator e uma lista de opções e devolve a melhor — **sem saber** se é uma substituição, contratação ou investimento. Ele só compara opções, o que permite reaproveitar a lógica em todas as áreas.

Fluxo, em ordem:

1. **Contexto** — o estado relevante (placar, minuto, energia, finanças, mundo…).
2. **Perfil** — traços do ator (inteligência, tolerância a risco, ambição, resistência à pressão) que enviesam a decisão e definem a **margem de erro**.
3. **Score** — soma de `baseScore` + modificadores por opção.
4. **Probabilidade** — chance estimada de cada consequência ocorrer.
5. **Consequência** — efeitos aplicados ao mundo (com trade-off).

O núcleo (`/core`) não conhece futebol. Quem conhece são os módulos (`/ai/match`, `/ai/market`, `/ai/player`, `/ai/club`…).

### 4.1. Exemplo numérico — substituição

Contexto: minuto 75, time perdendo, atacante cansado. Perfil: técnico ofensivo, pressão alta, torcida exigente.

| Opção | Score |
|---|---|
| Substituir atacante | 82 |
| Mudar esquema | 74 |
| Manter | 31 |

- **Probabilidade:** chance de gol +12%; risco de contra-ataque +8%.
- **Consequência:** o time ataca mais, mas fica mais exposto.

### 4.2. Motor (ilustrativo)

A margem de erro cai conforme a inteligência do ator sobe — é isso que faz o técnico ruim errar mais.

```ts
export type DecisionActor = {
  id: string;
  type: 'CLUB' | 'MANAGER' | 'PLAYER' | 'BOARD';
  intelligence: number;
  riskTolerance: number;
  ambition: number;
  pressureResistance: number;
};

export type DecisionOption<TAction = string> = {
  action: TAction;
  baseScore: number;
  modifiers: { label: string; value: number; reason: string }[];
  consequences: { target: string; attribute: string; value: number }[];
};

export class DecisionEngine {
  choose<TAction>(actor: DecisionActor, options: DecisionOption<TAction>[]) {
    const scored = options.map(option => {
      const modifierScore = option.modifiers.reduce((s, m) => s + m.value, 0);
      const errorMargin = this.getErrorMargin(actor.intelligence);
      const finalScore =
        option.baseScore + modifierScore + this.randomBetween(-errorMargin, errorMargin);
      return {
        action: option.action,
        finalScore,
        confidence: Math.min(100, Math.max(0, finalScore)),
        reasons: option.modifiers.map(m => m.reason),
        consequences: option.consequences,
      };
    });
    return scored.sort((a, b) => b.finalScore - a.finalScore)[0];
  }

  private getErrorMargin(intelligence: number) {
    return Math.max(2, 30 - intelligence * 0.3);
  }
  private randomBetween(min: number, max: number) {
    return Math.random() * (max - min) + min; // usar seeded random na simulação
  }
}
```

### 4.3. Variação por perfil (evitar robotização)

A IA escolhe a melhor opção, mas com pequena variação para não ficar robótica:

- **Clube muito organizado:** escolhe entre os 3 melhores scores.
- **Clube bagunçado:** pode escolher entre os 10 primeiros, com mais chance de erro.
- **Diretoria ruim:** supervaloriza fama e ignora risco.
- **Diretoria boa:** valoriza potencial, contrato e encaixe.

### 4.4. Exemplos de score por domínio

Compra de jogador:

```
score_compra =
  necessidade_posicao * 30
+ potencial          * 20
+ custo_beneficio    * 20
+ idade_adequada     * 10
+ encaixe_tatico     * 15
+ personalidade      * 5
- risco_lesao        * 15
- salario_pesado     * 20
```

Decisão tática na partida:

```
score =
  matchPressure     * 20
+ playerFatigueRisk * 15
+ opponentWeakness  * 25
+ tacticalFit       * 20
- disruptionRisk    * 10
```

> **Nota (Série R — R-22):** os pesos de cada modificador do Decision Engine foram propostos como recomendação a ratificar junto ao [catálogo de fórmulas](../02-tecnico/05-catalogo-de-regras-e-formulas.md); calibração final no lote de simulação.

### 4.5. Log de decisão (auditabilidade)

Toda decisão importante deve ser registrada (`ai_decision_logs`): ator, tipo de decisão, snapshot de contexto e opções, opção escolhida, score final e razões. Sem log, é impossível saber por que a IA vendeu um jogador, mudou o esquema ou demitiu um técnico.

### 4.6. Exemplos reais de decisão (contratação e partida)

O mesmo núcleo resolve domínios diferentes apenas comparando opções e scores.

**Contratação.** Contexto: clube precisa de lateral direito, orçamento baixo, diretoria conservadora, olheiro encontrou um jovem.

| Opção | Score |
|---|---|
| Fazer proposta baixa | 76 |
| Buscar empréstimo | 71 |
| Monitorar | 64 |
| Comprar agora | 58 |
| Desistir | 30 |

- **Decisão:** fazer proposta baixa.
- **Consequência:** menor chance de aceite; risco de outro clube entrar na disputa; economia preservada (coerente com a diretoria conservadora).

**Durante a partida.** Contexto: minuto 72, perdendo 1x0, adversário cansado, atacante no banco, técnico ofensivo.

| Opção | Score |
|---|---|
| Colocar atacante | 84 |
| Pressionar alto | 78 |
| Trocar volante | 51 |
| Manter | 22 |
| Recuar | 8 |

- **Decisão:** colocar atacante + aumentar pressão (uma decisão pode combinar ações).
- **Consequência:** mais chance de gol, mais risco defensivo, mais desgaste.

### 4.7. Estrutura técnica da IA

Na implementação, a IA é separada em três componentes:

- **`DECISION_POLICY`** — decide *o que* fazer diante de um contexto (a política de decisão).
- **`EVALUATION_MODEL`** — avalia e pontua opções e estados.
- **`ACTION_SELECTOR`** — escolhe a ação final entre as opções pontuadas.

Duas garantias acompanham essa estrutura:

- **IA sem conhecimento indevido:** a IA recebe apenas estado permitido, conhecimento do próprio clube, relatórios, políticas, reputação e informações públicas — nunca dados secretos de adversários (ver justiça competitiva no [motor de partida](./05-motor-de-partida.md)).
- **Determinismo:** decisões podem usar **aleatoriedade controlada por seed** quando necessário, e a seed é **registrada em decisões críticas simuladas** para reprodutibilidade e auditoria.

> A implementação técnica dessa separação (contratos, workers, event bus) vive em [`../02-tecnico/00-arquitetura-geral.md`](../02-tecnico/00-arquitetura-geral.md).

### 4.8. Exemplo aplicado — `SubstitutionAI`

Este é o único exemplo de um **módulo de IA concreto** montando opções e delegando ao `DecisionEngine`. Ele mostra o padrão completo em ação: `baseScore` fixo por ação, modificadores condicionais ao contexto (com `label`, `value` e `reason`) e consequências com trade-off explícito. O módulo não decide nada sozinho — apenas descreve as opções e chama `decisionEngine.choose(...)`.

```ts
type SubstitutionAction =
  | 'SUBSTITUTE_TIRED_PLAYER'
  | 'SUBSTITUTE_BOOKED_PLAYER'
  | 'ADD_ATTACKER'
  | 'ADD_DEFENDER'
  | 'KEEP_TEAM';

export class SubstitutionAI {
  constructor(private decisionEngine: DecisionEngine) {}

  decide(context: MatchContext): DecisionResult<SubstitutionAction> {
    const options: DecisionOption<SubstitutionAction>[] = [
      {
        action: 'SUBSTITUTE_TIRED_PLAYER',
        baseScore: 40,
        modifiers: [
          {
            label: 'fatigue',
            value: context.mostTiredPlayer.energy < 40 ? 30 : 0,
            reason: 'Jogador com energia baixa.',
          },
          {
            label: 'injury_risk',
            value: context.mostTiredPlayer.injuryRisk > 70 ? 20 : 0,
            reason: 'Risco elevado de lesão.',
          },
        ],
        consequences: [
          { target: 'team', attribute: 'physical_stability', value: 10 },
        ],
      },
      {
        action: 'ADD_ATTACKER',
        baseScore: 30,
        modifiers: [
          {
            label: 'losing_game',
            value: context.scoreDiff < 0 && context.minute > 65 ? 35 : 0,
            reason: 'Time está perdendo no fim do jogo.',
          },
        ],
        consequences: [
          { target: 'team', attribute: 'attack_pressure', value: 15 },
          { target: 'team', attribute: 'defensive_risk', value: 12 },
        ],
      },
      {
        action: 'KEEP_TEAM',
        baseScore: 20,
        modifiers: [
          {
            label: 'stable_match',
            value: context.teamMomentum > 60 ? 20 : 0,
            reason: 'O time está em bom momento na partida.',
          },
        ],
        consequences: [],
      },
    ];

    return this.decisionEngine.choose(context.manager, options);
  }
}
```

Repare que `ADD_ATTACKER` carrega duas consequências opostas (`attack_pressure +15` e `defensive_risk +12`): é o trade-off do §4.6 codificado. É previsível, controlável e balanceável — mexer no `baseScore` ou no `value` de um modificador ajusta o comportamento sem reescrever a lógica de decisão.

---

## 5. Os 4 tipos de IA combinados

| Tipo | O que faz | Onde é usada |
|---|---|---|
| **Matemática** | Calcula scores, probabilidades, risco e impacto | partida, mercado, evolução, finanças, desenvolvimento |
| **Comportamental** | Define personalidade e estilo | jogadores, técnicos, diretorias, torcida, clubes |
| **Estratégica** | Decisões de médio/longo prazo | montagem de elenco, contratação, investimento, planejamento da temporada |
| **Narrativa** | Transforma números em histórias | notícias, torcida, moral, rivalidade, crise, bastidores |

As quatro juntas criam a sensação de um mundo vivo. Apenas a IA narrativa pode usar **LLM/IA generativa**, e somente para texto (notícias, resumos, comentários de torcida, explicação de sugestões, biografias, entrevistas, narrativas de crise). **Nunca** para resultado de partida, cálculo de gol, contratação, evolução, economia, campeonato ou balanceamento — essas partes precisam ser matemáticas, auditáveis e justas.

---

## 6. Sistema de personalidade da IA

Cada agente tem traços. Isso deixa o jogo narrativo sem escrever história manualmente.

| Agente | Traços possíveis |
|---|---|
| **Técnico** | ofensivo, defensivo, reativo, controlador, motivador, disciplinador, formador, teimoso, adaptável |
| **Diretoria** | paciente, impulsiva, ambiciosa, econômica, gastadora, política, profissional, amadora |
| **Clube** | tradicional, popular, formador, comprador, vendedor, regional, emergente, instável |
| **Jogador** | líder, problemático, profissional, mercenário, leal, ambicioso, frágil emocionalmente, decisivo |

---

## 7. IA online vs offline

Distinção essencial de comportamento.

### Usuário online — IA assistiva e responsiva

Lê o jogo, cria alertas, sugere ações, mostra riscos, permite alteração tática, dá feedback e muda a dinâmica em tempo real. Exemplo de alerta + ações:

> "O adversário está pressionando alto. Seu zagueiro com baixa saída de bola já errou 3 passes. Risco de gol aumentou."
>
> Ações: recuar volante para saída · usar ligação direta · trocar zagueiro · manter estratégia.

### Usuário offline — IA assume o comando

Sem microgerenciamento perfeito. Age conforme: qualidade do técnico, nível da comissão, plano pré-jogo definido pelo usuário, estilo do clube e situação da partida.

| Offline + técnico nível alto | Offline + técnico nível baixo |
|---|---|
| Faz substituições boas | Demora a reagir |
| Reage ao adversário | Substitui mal |
| Preserva jogadores | Insiste em jogador cansado |
| Muda o esquema se necessário | Pode perder o controle emocional do jogo |

Isso valoriza a montagem da comissão técnica.

### Exemplo de fluxo completo (partida)

Minuto 62, vencendo 1x0, lateral esquerdo cansado, adversário colocou ponta rápido, time recuado demais, torcida pressionando, volante amarelado. A IA calcula: `risco_lado_esquerdo = alto`, `risco_empate = médio/alto`, `chance_contra_ataque = média`, `fadiga_defensiva = alta`. A comissão nível 4 sugere deslocar o volante para cobertura. O usuário aceita, e o motor altera a dinâmica **com trade-off**: reduz risco do lado esquerdo, reduz criação ofensiva pelo meio, aumenta segurança defensiva, diminui contra-ataque central, aumenta o desgaste do volante. **Uma boa IA muda a dinâmica, mas cobra um preço.**

---

## 8. Anti-padrões e diretrizes de balanceamento

Pontos que exigem cuidado, apresentados como diretrizes.

| Anti-padrão | Por que é ruim | Diretriz de balanceamento |
|---|---|---|
| **IA perfeita demais** | Sempre a melhor decisão deixa o jogo injusto e sem personalidade | IA erra conforme o nível; perfil influencia; pressão emocional reduz qualidade; clubes ruins fazem escolhas ruins |
| **IA aleatória demais** | O usuário sente que não tem controle | Aleatoriedade pequena; decisões sempre baseadas em contexto; todo evento tem causa |
| **Excesso de notificações** | Avisar tudo cansa | Notificar só mudanças relevantes; usar níveis de importância; comissão melhor filtra melhor |
| **Jogadores sem personalidade** | Perde profundidade | Cada jogador tem perfil mental, histórico, ambição, moral, relação com o clube e momento de carreira |
| **Mercado quebrado** | Compras/vendas ruins desbalanceiam o mundo | Travas econômicas, inflação controlada, salários proporcionais, limite de elenco, orçamento realista, clubes com estratégia (ver [`./03-economia.md`](./03-economia.md)) |
| **Clubes antigos fortes demais** | Usuários entrando na temporada 20 encontram clubes gigantes | Novos usuários entram em clubes pequenos com oportunidades; patrocinadores regionais, investidores, talentos locais, divisões equilibradas, mecânicas de ascensão; clubes grandes sofrem custos, pressão e ciclos de queda |

---

## 9. Ordem de desenvolvimento da IA

Ordem lógica recomendada. O coração precisa ser matemático e sistêmico; a narrativa vem depois para dar vida. Começar pela narrativa deixa o jogo bonito, mas mal-funcionante.

1. **Core de decisão** (Decision Engine, score, probabilidade, eventos).
2. **Perfis** de clubes, técnicos, diretorias e jogadores.
3. **IA da partida.**
4. **IA de substituições e tática.**
5. **IA de mercado.**
6. **IA de desenvolvimento de jogadores.**
7. **IA de mundo/economia.**
8. **IA de torcida/imprensa.**
9. **IA narrativa.**
10. **Sistema de recomendações ao usuário.**

> Complementos técnicos (seeded random para reprodutibilidade, event bus, workers, stack) pertencem aos documentos de arquitetura e ao [`./05-motor-de-partida.md`](./05-motor-de-partida.md).
