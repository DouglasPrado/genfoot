# Roadmap de Implementação

> **Status:** Rascunho consolidado · **Fontes:** chats/como-construir-jogo-regras.md · **Revisão:** 2026-07-10

Este documento define a ordem de construção do **Grinta**, um manager de futebol online no estilo Brasfoot. O princípio central é que o **primeiro produto técnico não é a interface nem o banco de dados**, e sim um **simulador completo do universo executado por linha de comando (headless)**, capaz de criar clubes, jogadores e campeonatos e simular temporadas inteiras. A UI, a API e a persistência definitiva chegam apenas depois que o mundo já roda e fecha corretamente no terminal.

Documentos relacionados:

- Arquitetura e stack: [`./00-arquitetura-geral.md`](./00-arquitetura-geral.md)
- Modelo de dados: [`./02-modelo-de-dados.md`](./02-modelo-de-dados.md)
- Regras e fórmulas: [`./05-catalogo-de-regras-e-formulas.md`](./05-catalogo-de-regras-e-formulas.md)

## Sumário

1. [Princípio orientador](#1-princípio-orientador)
2. [Antes de codar: os 5 documentos oficiais](#2-antes-de-codar-os-5-documentos-oficiais)
3. [Fundações transversais: determinismo e event sourcing](#3-fundações-transversais-determinismo-e-event-sourcing)
4. [Ordem de implementação em blocos](#4-ordem-de-implementação-em-blocos)
5. [Os 13 entregáveis de consolidação](#5-os-13-entregáveis-de-consolidação)
6. [Sequência prática das primeiras entregas](#6-sequência-prática-das-primeiras-entregas)
7. [Primeiro marco técnico e critérios de conclusão](#7-primeiro-marco-técnico-e-critérios-de-conclusão)
8. [Testes obrigatórios desde o início](#8-testes-obrigatórios-desde-o-início)

---

## 1. Princípio orientador

O melhor começo **não** é pela interface nem diretamente pelo Prisma. O primeiro produto técnico deve ser um **simulador completo do universo do jogo executado sem tela (headless)**, capaz de:

- criar clubes, jogadores e campeonatos;
- simular temporadas inteiras;
- produzir relatórios consistentes de estado e equilíbrio.

Esse simulador de linha de comando é o **principal instrumento de desenvolvimento e balanceamento** do Grinta. A interface (`web`), a API e a persistência definitiva no banco só entram depois que o mundo já roda e fecha corretamente no terminal.

O simulador deve conseguir responder perguntas como:

- Quantos jogadores existem e qual é a distribuição de idade?
- Quanto dinheiro existe no universo? Qual foi a inflação?
- Quais clubes cresceram? Quantos jogadores foram gerados e quantos aposentaram?
- Qual é o equilíbrio entre receitas e despesas?
- Existem clubes sem elenco suficiente? Existem jogadores sem destino válido?

Exemplo de interface de comandos do simulador:

```bash
pnpm simulator world:create --clubs 100 --seed grinta-001
pnpm simulator world:inspect
pnpm simulator season:start
pnpm simulator day:simulate --days 1
pnpm simulator season:simulate
pnpm simulator world:simulate --seasons 20
pnpm simulator report:balance
```

> A stack, a organização em monólito modular (`apps/` + `packages/`) e a separação `domain` sem dependência de Prisma/Redis/HTTP estão detalhadas em [`./00-arquitetura-geral.md`](./00-arquitetura-geral.md).

---

## 2. Antes de codar: os 5 documentos oficiais

As decisões já tomadas precisam sair do formato de conversa e virar **fonte oficial do sistema**. Antes de escrever código, produza cinco documentos centrais. A especificação executável dessas regras e fórmulas vive em [`./05-catalogo-de-regras-e-formulas.md`](./05-catalogo-de-regras-e-formulas.md).

| # | Documento | Conteúdo |
|---|-----------|----------|
| 1 | **Catálogo de Regras** | Cada regra com identificador estável (ex.: `ECO-001`, `PLY-001`, `MAT-001`, `USR-001`). |
| 2 | **Catálogo de Fórmulas** | Fórmulas versionadas e parametrizadas, separadas das regras. |
| 3 | **Máquinas de Estado** | Ciclos de vida de partida e temporada. |
| 4 | **Eventos de Domínio** | Fatos imutáveis emitidos pelo domínio. |
| 5 | **Invariantes** | Condições que nunca podem ser violadas. |

### 2.1 Catálogo de Regras

Cada regra recebe um identificador estável. Exemplos:

- `ECO-001` — Todos os clubes iniciam com o mesmo valor-base em caixa.
- `ECO-002` — A oferta monetária depende da quantidade de clubes ativos.
- `PLY-001` — Cada jogador é único.
- `PLY-002` — A geração de jogadores considera o equilíbrio etário do universo.
- `MAT-001` — Partidas online permitem intervenções táticas em tempo real.
- `USR-001` — O usuário não pode ser demitido.

Cada regra deve conter a seguinte estrutura:

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

### 2.2 Catálogo de Fórmulas

Separado das regras, permite balancear o jogo sem reescrever o domínio:

```ts
interface GameFormula {
  id: string;
  version: number;
  parameters: Record<string, number>;
  calculate(input: unknown): unknown;
}
```

Fórmulas previstas: evolução técnica; fadiga; risco de lesão; geração de jogadores; inflação; preço de mercado; receita de clubes; impacto da comissão técnica; crescimento estrutural; probabilidade de eventos; desempenho em partidas.

### 2.3 Máquinas de Estado

**Partida:**

```
SCHEDULED → PRE_MATCH → LIVE → PAUSED_FOR_DECISION → LIVE → FINISHED → PROCESSED
```

**Temporada:**

```
PLANNING → REGISTRATION → IN_PROGRESS → FINALIZING → OFF_SEASON → COMPLETED
```

### 2.4 Eventos de Domínio

Exemplos: `WorldCreated`, `SeasonStarted`, `PlayerGenerated`, `PlayerRetired`, `MatchScheduled`, `MatchStarted`, `GoalScored`, `TacticalInstructionIssued`, `PlayerInjured`, `TransferCompleted`, `ClubStructureUpgraded`, `SeasonCompleted`.

### 2.5 Invariantes

Condições que nunca podem ser violadas:

- Um jogador só pode possuir um contrato ativo.
- Uma partida finalizada não pode voltar ao estado `LIVE`.
- A classificação deve corresponder aos resultados processados.
- O dinheiro transferido deve sair de uma entidade e entrar em outra.
- Nenhum jogador aposentado pode ser escalado.
- O número de jogadores deve permanecer dentro da faixa de equilíbrio do universo.

---

## 3. Fundações transversais: determinismo e event sourcing

Duas fundações valem para **todo** o código, desde o dia 1.

### 3.1 Determinismo desde o primeiro dia

Todas as decisões aleatórias devem usar uma **semente (seed) controlada**. Nunca use `Math.random()` diretamente.

```ts
const random = new SeededRandom({
  worldSeed: world.seed,
  context: `match:${match.id}:minute:${minute}`,
});
```

Com determinismo, a mesma entrada produz o mesmo resultado, o que permite: reproduzir bugs, repetir partidas em testes, auditar resultados, comparar versões do motor, evitar divergência entre servidores e investigar suspeitas de manipulação.

O universo é a entidade raiz. Como economia, jogadores, temporadas e clubes são compartilhados, **quase todas as tabelas devem carregar `worldId`**, permitindo múltiplos servidores, mundos com quantidades diferentes de clubes, regras versionadas, ambientes de teste, simulação paralela e reinício de universo sem afetar outros jogos.

```ts
interface GameWorld {
  id: string;
  name: string;
  seed: string;
  currentDate: Date;
  currentSeason: number;
  status: WorldStatus;
  rulesetVersion: string;
  economyStateId: string;
}
```

### 3.2 Estado atual + histórico de eventos (híbrido)

Não é necessário event sourcing puro. Recomenda-se um modelo **híbrido**:

- **Tabelas de estado:** `players`, `clubs`, `contracts`, `matches`, `standings`, `club_finances`, `competitions`.
- **Registro imutável de eventos:** `game_events`.

```ts
interface GameEventRecord {
  id: string;
  worldId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  gameDate: Date;
  sequence: number;
  payload: unknown;
  rulesetVersion: string;
  createdAt: Date;
}
```

O log de eventos é essencial para notificações, narrativa do jogo, histórico de atletas, partidas ao vivo, auditoria financeira, estatísticas, replay e processamento assíncrono.

> O detalhamento das tabelas de estado, do `game_events` e do esquema Prisma está em [`./02-modelo-de-dados.md`](./02-modelo-de-dados.md).

---

## 4. Ordem de implementação em blocos

A construção do núcleo segue uma ordem estrita. Cada bloco depende dos anteriores. Os blocos 1 a 5 formam o núcleo mínimo para simular uma temporada headless; os blocos seguintes (economia, mercado, IA, entrada de usuários, API/UI) vêm depois e estão listados como continuação.

### Bloco 1 — Fundação do universo

Implementar: `GameWorld`; calendário; relógio do jogo; temporadas; configuração do mundo; semente aleatória; versionamento de regras; fila de eventos futuros; executor de dias.

**Resultado esperado:** o mundo executa tudo que estiver programado para o período.

```ts
await world.advanceDays(7);
```

### Bloco 2 — Pessoas e jogadores

Implementar: pessoa; identidade; nacionalidade; idade; personalidade; história de vida; atributos físicos, técnicos e mentais; potencial; desenvolvimento; fadiga; moral; lesões; aposentadoria; geração de novos jogadores.

A história de vida fornece **predisposições, não resultados fixos**:

```
história pessoal + genética + nacionalidade + ambiente
  + personalidade + treinamento + experiências
= estado atual do jogador
```

### Bloco 3 — Clubes e estruturas

Implementar: clube; elenco; comissão técnica; departamento médico; diretoria; comunicação; categorias de base; infraestrutura; torcida; reputação; finanças.

O nível do clube deve ser uma **consequência calculada**, não um campo manual `clubLevel`:

```
estrutura + elenco + desempenho + reputação + finanças + torcida + gestão
```

### Bloco 4 — Competições

Implementar: competição; edição; fases; grupos; rodadas; partidas; critérios de desempate; classificação; promoção; rebaixamento; premiação; calendário.

O formato deve ser **configurável por dados**:

```ts
interface CompetitionFormat {
  participantCount: number;
  phases: CompetitionPhaseDefinition[];
  tieBreakers: TieBreaker[];
  promotionRules: MovementRule[];
  relegationRules: MovementRule[];
}
```

### Bloco 5 — Motor de partidas

Começar pela **simulação integral, sem intervenção humana**.

Entrada e saída:

```ts
interface MatchSimulationInput {
  home: TeamSnapshot;
  away: TeamSnapshot;
  homeTactics: Tactics;
  awayTactics: Tactics;
  context: MatchContext;
  seed: string;
}

interface MatchSimulationResult {
  score: Score;
  events: MatchEvent[];
  playerPerformances: PlayerPerformance[];
  physicalConsequences: PhysicalImpact[];
  tacticalReport: TacticalReport;
}
```

A partida é simulada em intervalos pequenos:

```
estado da partida → intenção tática → disputa territorial
  → criação de oportunidade → execução técnica → reação defensiva
  → resultado → atualização física e mental
```

Somente depois adicionar: comandos táticos; substituições; marcação; recuo; pressão; mudança de esquema; pontos de decisão; sugestões da comissão; controle pela IA quando o usuário estiver offline.

### Continuação após o núcleo (blocos 6 a 10)

Estes blocos estendem o mundo já funcional. Não fazem parte do núcleo mínimo headless, mas seguem a mesma ordem de dependência.

| Bloco | Tema | Escopo resumido |
|-------|------|-----------------|
| 6 | **Economia** | Sistema fechado e mensurável; `EconomyEngine` monitora dinheiro total, média por clube, concentração, inflação, salários, preços, falências e jogadores disponíveis. |
| 7 | **Mercado e contratos** | Apenas depois da economia: contratos, salários, duração, bônus, renovação, transferências, empréstimos, jogadores livres, negociação, interesse, concorrência, diretoria e agentes. |
| 8 | **IA dos clubes** | Dividida em Strategic AI, Squad AI, Match AI e Narrative AI. Cada decisão retorna justificativas (`AIDecision<T>` com `reasons`, `alternatives`, `confidence`). |
| 9 | **Entrada tardia de usuários** | Simular 10/20/30 temporadas e então dar a um novo usuário um clube pequeno com oportunidades reais de crescimento, sem criar um clube artificialmente forte. |
| 10 | **API e interface** | Somente quando o mundo já funcionar por linha de comando: autenticação, painel do clube, elenco, calendário, classificação, finanças, mercado, infraestrutura, notificações, central da partida, comandos em tempo real. |

> **Pendência:** os detalhes internos dos blocos 6 a 10 (fórmulas econômicas, regras de mercado, arquitetura da IA e escopo da API/UI) devem ser consolidados em documentos próprios conforme forem especificados.

---

## 5. Os 13 entregáveis de consolidação

Antes de escrever o primeiro código de produção, o próximo trabalho concreto é criar o **Blueprint de Implementação do Core**, contendo os 13 entregáveis abaixo. Esta é a saída da Entrega 1 (especificação técnica).

| # | Entregável | Descrição |
|---|------------|-----------|
| 1 | **Lista consolidada de módulos** | Todos os módulos do `domain` (world, calendar, competitions, clubs, players, staff, facilities, contracts, transfers, finances, matches, tactics, supporters, media, events). |
| 2 | **Dependências entre módulos** | Grafo de dependências entre os módulos, garantindo direção correta e ausência de ciclos. |
| 3 | **Agregados e entidades** | Definição das raízes de agregado e das entidades que cada uma contém. |
| 4 | **Value Objects** | IDs tipados, dinheiro, percentuais, probabilidades, datas do jogo, etc. |
| 5 | **Enums definitivos** | Status de mundo, estados de partida e temporada, tipos de evento, posições, etc. |
| 6 | **Eventos de domínio** | Catálogo definitivo (ver seção 2.4). |
| 7 | **Comandos** | Comandos que disparam mudanças de estado (ex.: `UpgradeStructure`, `TransferPlayer`). |
| 8 | **Máquinas de estado** | Ciclos de vida de partida e temporada (ver seção 2.3). |
| 9 | **Fórmulas configuráveis** | Catálogo versionado e parametrizado (ver seção 2.2). |
| 10 | **Invariantes** | Condições inquebráveis (ver seção 2.5). |
| 11 | **Estrutura Prisma** | Esquema de persistência — fechado **por último**, quando o comportamento já estiver validado. |
| 12 | **Ordem de implementação** | A sequência de blocos e entregas (seções 4 e 6). |
| 13 | **Cenários de teste** | Testes unitários, de propriedade, de invariantes e de longo prazo (seção 8). |

Depois do Blueprint, o **primeiro código a ser escrito é o Domain Kernel e o World Engine**. Essa ordem preserva as regras definidas e evita que o jogo seja construído ao redor da interface ou das limitações iniciais do banco.

---

## 6. Sequência prática das primeiras entregas

| Entrega | Nome | Conteúdo |
|---------|------|----------|
| 1 | **Especificação técnica** | Catálogo definitivo de regras; fórmulas; enums; estados; eventos; invariantes; dependências entre módulos (os 13 entregáveis). |
| 2 | **Domain Kernel** | IDs tipados; datas do jogo; dinheiro; percentuais; probabilidades; gerador determinístico; eventos; erros de domínio; resultados de operações. |
| 3 | **World Engine** | Universo; calendário; avanço de tempo; agenda de eventos; temporadas; executor diário. |
| 4 | **Geradores** | Clubes; pessoas; jogadores; funcionários; estruturas; equilíbrio populacional e econômico. |
| 5 | **Competições** | Formatos; calendário; rodadas; classificação; encerramento. |
| 6 | **Partida automática** | Escalação; táticas; eventos; resultado; consequências. |
| 7 | **Simulação de longo prazo** | 20 ou 30 temporadas; relatórios; diagnóstico de equilíbrio; identificação de ciclos econômicos ruins. |
| 8 | **Prisma e persistência definitiva** | Com o comportamento validado, as entidades Prisma são fechadas com menos risco de retrabalho. |

---

## 7. Primeiro marco técnico e critérios de conclusão

O primeiro marco **não** deve ser "usuário consegue fazer login". Deve ser:

> Criar um universo, gerar clubes e jogadores equilibrados, organizar uma competição, simular uma temporada completa e produzir um relatório consistente.

**Critérios de conclusão:**

- mesma semente gera o mesmo universo;
- classificação fecha corretamente;
- calendário não possui conflitos inválidos;
- clubes possuem elencos válidos;
- jogadores envelhecem, aposentam e novos jogadores são gerados;
- atributos evoluem;
- finanças fecham (nenhum dinheiro aparece sem origem);
- nenhum jogador aparece sem evento de geração;
- a temporada seguinte pode começar;
- 20 temporadas podem ser simuladas sem corrupção do estado.

---

## 8. Testes obrigatórios desde o início

Além de testes unitários, use **testes de propriedade e de invariantes** desde o começo.

**Invariante de economia** — não cria dinheiro durante uma transferência:

```ts
describe("economy invariant", () => {
  it("não cria dinheiro durante uma transferência", async () => {
    const before = totalMoney(world);
    await transferService.execute(command);
    const after = totalMoney(world);
    expect(after).toEqual(before);
  });
});
```

**Determinismo de partidas** — mesma semente, mesmo resultado:

```ts
it("produz o mesmo resultado com a mesma semente", () => {
  expect(simulate(input)).toEqual(simulate(input));
});
```

**Consistência de temporada** — todos os clubes jogam o número correto de partidas (valida tabela e calendário).

**Testes longos:** executar 100 mundos × 30 temporadas × diferentes quantidades de clubes. Esses testes revelam problemas que não aparecem em uma temporada isolada.
