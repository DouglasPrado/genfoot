# Frontend, Cliente e Tempo Real

> **Status:** Rascunho consolidado · **Fontes:** chats/ux-do-jogo.md, decisão de stack de interface 2026-07-11 (ver [`../04-ui-ux/`](../04-ui-ux/)) · **Revisão:** 2026-07-11

Este documento consolida as decisões de **frontend**, **clientes**, **estratégia mobile**, **API** e **tempo real** do **Grinta** (manager de futebol online, jogadores únicos, mundo persistente) que até então estavam registradas apenas no chat de UX e não haviam sido documentadas oficialmente.

A partir de **2026-07-11** o Grinta tem **dois clientes**: o **app do jogador** (mobile, Android+iOS, em **Expo / React Native**) e o **admin do mundo** (web, em **Next.js**). O princípio que atravessa todas as seções vale para **ambos** e é único: **o servidor é autoritativo e o cliente é não-autoritativo**. Cada cliente renderiza, navega, sincroniza e oferece experiência offline limitada, mas nunca executa regras oficiais do jogo. A camada de tempo real acelera a percepção do estado, porém a API oficial permanece a única fonte de verdade. Justamente por isso a arquitetura de backend nunca dependeu de recursos exclusivos da web — a decisão de mobile nativo abaixo apenas exerce essa garantia já prevista. O **desenho de telas e fluxos** de ambos os clientes vive na área [`../04-ui-ux/`](../04-ui-ux/); aqui ficam os **contratos** que essas telas consomem.

## Sumário

- [Stack de frontend](#stack-de-frontend)
- [Gestão de estado no cliente](#gestao-de-estado-no-cliente)
- [Estratégia mobile e clientes](#estrategia-mobile-e-clientes)
- [API e contratos](#api-e-contratos)
- [Tempo real (realtime-gateway)](#tempo-real-realtime-gateway)
- [Recuperação, idempotência e cenários de falha](#recuperacao-idempotencia-e-cenarios-de-falha)
- [Tela de partida ao vivo](#tela-de-partida-ao-vivo)
- [Critérios de aceite](#criterios-de-aceite)
- [Pendências consolidadas](#pendencias-consolidadas)
- [Documentos relacionados](#documentos-relacionados)

---

## Stack de frontend

O Grinta tem **dois clientes**, cada um responsável por interface, navegação, renderização, cache local, sincronização, experiência offline limitada, comunicação com a API e comunicação WebSocket. Nenhum deles simula partidas, valida negociações, calcula finanças oficiais, resolve prazos, gera resultados ou aplica regras competitivas — tudo isso é responsabilidade do backend.

| Cliente | Stack | Papel |
| --- | --- | --- |
| **App do jogador** (mobile, Android+iOS) | **Expo / React Native** (TypeScript) | Cliente principal do jogador: elenco, escalação, partida, mercado, competições |
| **Admin do mundo** (web) | **Next.js** (App Router) + **React** | Painel de operação do mundo (RBAC, correções, moderação, equilíbrio) |

As demais camadas são **compartilhadas** entre os dois clientes:

| Camada | Tecnologia | Papel |
| --- | --- | --- |
| Estado do servidor | **TanStack Query** | Cache e sincronização de dados vindos da API |
| Estado de interface | **Zustand** | Apenas estado local de UI |
| Tempo real | **Socket.IO Client** | Conexão WebSocket com o `realtime-gateway` |
| Cache offline | **IndexedDB** (admin web) / **Expo SQLite · MMKV · AsyncStorage** (app mobile) | Persistência para leitura offline limitada |

O repositório é um monorepo (**pnpm** + **Turborepo** + **TypeScript**), com o app mobile em `/apps/mobile` (Expo), o admin em `/apps/admin` (Next.js) e pacotes compartilhados em `/packages` (incluindo `/packages/contracts` e o design system). O detalhe do desenho de telas de cada cliente está na área [`../04-ui-ux/`](../04-ui-ux/).

> **Regra fechada:** **nenhum** dos clientes importa domínio de servidor ou acessa o banco diretamente. Ambos consomem exclusivamente a **API oficial `/api/v1`** e o **WebSocket** — os contratos deste documento (command/query/evento, versionamento, idempotência) valem igualmente para o app mobile e para o admin.

---

## Gestão de estado no cliente

O estado no cliente é separado em três categorias, cada uma com um responsável distinto:

- **Estado do servidor** — gerenciado pelo **TanStack Query**. São os dados oficiais consultados na API (clube, elenco, mercado, tabela, etc.). O cliente os trata como *cache* do estado oficial, sujeito a revalidação.
- **Estado de interface** — gerenciado localmente ou por **Zustand**. É estado efêmero de UI: navegação, modais, seleções, preferências transitórias de tela.
- **Estado offline** — persistido em **IndexedDB** (admin web) ou **Expo SQLite/MMKV/AsyncStorage** (app mobile). Suporta a leitura offline limitada de cada cliente.

> **Regra fechada:** dados oficiais do clube **não** serão mantidos como fonte definitiva em stores globais do cliente. O cliente é **não-autoritativo**: o servidor é autoritativo e o cliente não executa regras oficiais.

Consequência prática dessa regra: mesmo que a interface mostre um valor desatualizado (por exemplo, um saldo antigo), a decisão final é sempre do servidor. Um command é validado contra o saldo oficial e **pode ser rejeitado**, independentemente do que o cliente exibia. A interface é uma projeção conveniente, nunca a verdade.

---

## Estratégia mobile e clientes

O **mobile é tratado como prioridade de interface** (mobile-first) e o **cliente principal do jogador é um app nativo em Expo / React Native** (Android+iOS). O **admin do mundo** é uma aplicação web em Next.js. O desenho das telas de cada um está em [`../04-ui-ux/`](../04-ui-ux/).

### Decisão de mobile nativo (2026-07-11)

> **Decisão (2026-07-11):** o app do jogador é um **aplicativo nativo em Expo / React Native**, distribuído na **App Store (iOS)** e **Google Play (Android)** via **EAS Build/Submit**, com atualização OTA via **EAS Update**. Esta decisão **resolve** a antiga pendência da "tecnologia do app nativo futuro".

**Evolução registrada.** A primeira formulação deste documento previa que a versão inicial do mobile seria uma **PWA (aplicação web progressiva)** sobre o app web responsivo, deixando o app nativo como pendência sem stack definida. Com a decisão de 2026-07-11, **o mobile deixa de ser PWA e passa a ser um app nativo Expo**; a PWA **não** é mais o caminho do cliente do jogador. Essa mudança não altera nenhum contrato de backend: a decisão apenas exerce a garantia (registrada logo abaixo) de que a arquitetura não depende de recursos exclusivos da web. A web permanece na stack apenas para o **admin** (Next.js).

O app nativo cobre, por meios nativos, as mesmas capacidades que se esperava da PWA:

- **Instalação** e presença na tela inicial (loja + ícone próprio).
- **Tela inicial** (splash) nativa.
- **Cache do shell** e da navegação.
- **Leitura offline limitada** (apoiada em Expo SQLite/MMKV/AsyncStorage).
- **Push nativo** (APNs/FCM via Expo Notifications), espelhando as notificações estratégicas.
- **Atualização controlada** (releases nas lojas + OTA via EAS Update).

### Reuso integral da API e dos contratos

Tanto o app mobile quanto o admin **utilizam a mesma API e os mesmos contratos** do Grinta.

> **Regra fechada:** a arquitetura de backend **não depende de recursos exclusivos da web**. Foi essa garantia que já previa o cliente nativo — por isso o app Expo reaproveita **integralmente** commands, respostas, eventos e contratos definidos aqui, sem qualquer mudança de backend.

---

## API e contratos

O padrão principal de comunicação é:

- **REST** para comandos (commands) e consultas (queries).
- **WebSocket** para atualizações em tempo real.

> GraphQL **não** será necessário na arquitetura inicial.

### Rotas

As rotas são versionadas sob o prefixo `/api/v1/...`:

```
/api/v1/worlds
/api/v1/clubs
/api/v1/players
/api/v1/matches
/api/v1/transfers
/api/v1/contracts
/api/v1/notifications
```

### Versionamento da API

Mudanças na API são classificadas em quatro categorias:

| Categoria | Significado |
| --- | --- |
| `ADDITIVE` | Adiciona campos/recursos sem quebrar clientes existentes |
| `COMPATIBLE` | Alteração compatível com clientes atuais |
| `DEPRECATED` | Recurso marcado para remoção futura |
| `BREAKING` | Alteração incompatível |

Mudanças incompatíveis (`BREAKING`) exigem **nova versão** da API. Um aplicativo antigo que use contrato incompatível terá seus **commands críticos bloqueados**, com exigência de atualização.

### Contrato de command (HTTP)

Este documento define o **envelope** genérico do command; os **nomes** dos commands (`commandType`) e sua intenção vivem no [Catálogo de Commands](./10-catalogo-de-commands.md). Todo command enviado à API oficial carrega:

| Campo | Descrição |
| --- | --- |
| `commandId` | Identificador único do command |
| `idempotencyKey` | Chave de idempotência (reenvio seguro) |
| `expectedVersion` | Versão esperada do agregado (controle de concorrência) |
| `gameWorldId` | Mundo alvo do command |
| `clubId` | Clube alvo |
| `payload` | Dados específicos do command |
| `clientTimestamp` | Momento registrado pelo cliente |
| `clientVersion` | Versão do cliente que emitiu o command |

### Resposta de command

| Campo | Descrição |
| --- | --- |
| `commandId` | Eco do identificador do command |
| `status` | Estado resultante (ver abaixo) |
| `entityId` | Entidade afetada |
| `newVersion` | Nova versão do agregado após aplicação |
| `result` | Resultado da operação |
| `generatedTaskIds` | Tarefas assíncronas geradas |
| `generatedEventIds` | Eventos gerados |
| `warnings` | Avisos não bloqueantes |

### Estados de command

| Estado | Significado |
| --- | --- |
| `ACCEPTED` | Command aceito para processamento |
| `COMPLETED` | Command concluído com sucesso |
| `REJECTED` | Command recusado por regra de negócio |
| `CONFLICT` | Conflito de versão/concorrência |
| `PENDING` | Em processamento |
| `FAILED` | Falha na execução |

### Erro padronizado

| Campo | Descrição |
| --- | --- |
| `errorCode` | Código estável, independente do texto traduzido |
| `message` | Mensagem legível |
| `details` | Detalhes adicionais |
| `fieldErrors` | Erros por campo (validação) |
| `currentVersion` | Versão atual do agregado (útil em conflitos) |
| `correlationId` | Identificador de correlação para rastreio |
| `retryable` | Indica se a operação pode ser reexecutada |

Os **códigos de erro são estáveis e independentes do texto traduzido**. Exemplos:

```
TRANSFER_BUDGET_UNAVAILABLE
PLAYER_ALREADY_REGISTERED
MATCH_COMMAND_WINDOW_CLOSED
CONTRACT_VERSION_CONFLICT
WORLD_READ_ONLY
```

### Paginação e filtros

- **Paginação** por **cursor** é a forma preferencial (`cursor`, `limit`, `nextCursor`, `hasMore`). Paginação por offset fica restrita a consultas pequenas ou administrativas.
- **Filtros** devem ser validados, ter limites, usar índices, evitar consultas arbitrárias e respeitar o mundo (`gameWorldId`).

---

## Tempo real (realtime-gateway)

O tempo real é servido por um **processo dedicado**, o `realtime-gateway`, separado do processo `api`. Ele é responsável por:

- Conexões WebSocket.
- Salas por usuário, por clube, por mundo e por partida.
- Presença.
- Entrega de eventos em tempo real.
- Recuperação de sequência.

> **Regra fechada:** o gateway **não é fonte de verdade**. O **WebSocket não substitui a API oficial** — ele acelera a entrega de estado, mas a verdade permanece no PostgreSQL, acessado via API.

### Autenticação e autorização do WebSocket

O handshake do WebSocket **não** reutiliza credenciais longas. A conexão é aberta com um **token efêmero / credencial de curta duração**, específica para o tempo real, derivada da sessão HTTP já autenticada (ver o modelo de autenticação e autorização do jogador em [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) §3). Segredos e tokens longos **nunca** são expostos no canal WebSocket nem em armazenamentos de interface.

- **Handshake com credencial curta.** O cliente obtém um token efêmero e o apresenta na abertura da conexão; o `realtime-gateway` **valida a credencial antes de admitir o socket**.
- **Autorização no gateway.** A validação ocorre no gateway (nunca no cliente), combinando usuário, sessão, mundo, clube e visibilidade aplicável. Autenticar **não** implica autorizar: cada **assinatura** de sala (usuário/clube/mundo/partida) é autorizada **separadamente**.
- **Vínculo à sessão HTTP autenticada.** A sessão do socket é vinculada à sessão HTTP autenticada; se essa sessão for revogada ou expirar, o socket perde autorização.
- **Reconexão revalida.** Toda reconexão exige **nova validação** da credencial, além da recuperação de sequência (ver [Recuperação, idempotência e cenários de falha](#recuperacao-idempotencia-e-cenarios-de-falha)).

> **Recomendação (a ratificar — R-95):** credencial efêmera de sessão — proposta: access token JWT curto (~15 min) + refresh token rotativo (endpoint `/auth/refresh`), reautorização do WebSocket por assinatura do token, revogação por lista de sessões no servidor (logout/expiração fecham o socket).

### Usos do WebSocket

O WebSocket é utilizado para: partidas, presença, notificações, atualizações de negociação, mudança de tabela, eventos do mundo e estado de jobs relevantes.

Os pontos de decisão em tempo real durante uma partida (comandos ao vivo, janelas de substituição, etc.) são resolvidos pelo motor de partida — ver [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md).

### Contrato de evento WebSocket

Contrato mínimo de cada evento:

| Campo | Descrição |
| --- | --- |
| `eventId` | Identificador único do evento |
| `eventType` | Tipo do evento |
| `schemaVersion` | Versão do schema do evento |
| `gameWorldId` | Mundo de origem |
| `subjectType` | Tipo da entidade sujeito |
| `subjectId` | Identificador do sujeito |
| `sequence` | Número de sequência no stream |
| `occurredAt` | Momento de ocorrência |
| `payload` | Dados do evento |

O gateway pode transportar quatro categorias de evento — **oficial**, **de projeção**, **de presença** e **transitório de interface** — e a categoria deve ser **explícita**.

### Sequência em tempo real

Cada stream relevante possui sua própria sequência, permitindo detectar e recuperar eventos perdidos:

```
userSequence
clubSequence
matchSequence
worldSequence
```

### Escalabilidade

Com mais de uma réplica do gateway, é utilizado o **Redis Adapter** do Socket.IO. O Redis, nesse contexto, serve apenas para roteamento, presença, pub/sub transitório e coordenação **não autoritativa** — nunca como fonte definitiva. Ver [`./00-arquitetura-geral.md`](./00-arquitetura-geral.md) e [`./01-arquitetura-de-dados.md`](./01-arquitetura-de-dados.md).

---

## Recuperação, idempotência e cenários de falha

### Recuperação após desconexão

Quando a conexão em tempo real cai, ela é **recuperável**. O cliente envia sua última sequência conhecida:

```
lastKnownSequence
```

E o servidor pode responder com:

- **Eventos perdidos** (entrega dos eventos posteriores à sequência informada).
- **Snapshot atualizado** (quando reconstruir pela sequência não é viável).
- **Indicação de ressincronização completa**.

Se um evento WebSocket é perdido, a API oficial permanece correta e a ressincronização restaura a interface. Se duas réplicas do gateway recebem a mesma atualização, o `eventId` e a `sequence` evitam duplicidade visual.

### Idempotência de command

Quando o cliente **reenvia** um command (por reconexão, timeout ou repetição), a idempotência garante que o efeito não seja duplicado:

- O **`commandId` repetido retorna o resultado anterior**, sem reexecutar o efeito.
- A **`idempotencyKey`** mantém uma única execução lógica para o mesmo command.

### Cenários de falha relevantes ao cliente

| Cenário | Comportamento |
| --- | --- |
| O WebSocket desconecta | O cliente recupera eventos pela sequência ou solicita snapshot |
| Um evento WebSocket é perdido | A API oficial continua correta; a ressincronização restaura a interface |
| Duas réplicas do gateway recebem a mesma atualização | `eventId` e `sequence` evitam duplicidade visual |
| O frontend mostra saldo antigo | O command é validado pelo saldo oficial e pode ser rejeitado |
| Dois commands chegam com a mesma versão | O primeiro válido atualiza o agregado; o segundo recebe conflito |
| O cliente envia command repetido | O `commandId` retorna o resultado anterior |
| A partida termina enquanto o usuário está desconectado | O motor continua e o usuário recebe o estado oficial ao retornar |
| O usuário altera o relógio do celular | Nenhum prazo oficial é alterado (o relógio do mundo é do servidor) |
| O aplicativo antigo usa contrato incompatível | Commands críticos são bloqueados, com exigência de atualização |

---

## Tela de partida ao vivo

A partida ao vivo é a tela mais densa do jogo. Ela consome o *feed* de eventos do [realtime-gateway](#tempo-real-realtime-gateway) e apresenta o estado da partida sem que o cliente execute qualquer regra (o motor roda no servidor).

### Layout

| Região | Conteúdo |
| --- | --- |
| **Topo** | Placar, minuto, competição |
| **Centro** | Linha do tempo ou **campo tático simplificado** (sem 3D) |
| **Lateral** | Momentum, posse, pressão, alertas ativos |
| **Inferior** | **Ações rápidas** |
| **Modal** | Pontos de decisão importantes (aparecem no momento certo) |

Informações principais exibidas: placar, minuto, eventos recentes, momentum, **fadiga por setor**, alertas ativos, **sugestões da comissão técnica**, ações rápidas e substituições disponíveis.

Cada evento e decisão importante é **explicável** — a interface mostra o *porquê*, não só o *quê* (ex.: "sofreu gol após sequência de ataques pela esquerda, onde o lateral estava cansado e sem cobertura"), reaproveitável no pós-jogo. A hierarquia de peso dos eventos (0 interno → 5 decisivo) governa o que aparece na linha do tempo e nos alertas.

### Ações rápidas com submenus

A região inferior traz **botões rápidos**, pensados para mobile: `Recuar`, `Pressionar`, `Atacar`, `Controlar`, `Substituir`, `Marcar forte`, `Contra-atacar`, `Poupar`. Cada botão **abre um submenu** em vez de aplicar um efeito único:

- **Pressionar →** pressão leve · pressão alta · pressão máxima · pressionar a saída do adversário.
- **Substituir →** sugestões **contextuais** montadas a partir do estado da partida, por exemplo: "Substituir camisa 8, cansado", "Substituir lateral esquerdo, nota baixa", "Colocar atacante para buscar gol".

Cada opção vira um *command* enviado à API oficial (o cliente não aplica o efeito localmente — ver [Tela de partida ao vivo](#tela-de-partida-ao-vivo) e o motor em [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md)).

### Código de cores e anatomia das notificações

As notificações seguem uma **categoria de cor** consistente, espelhando o `type` do ponto de decisão no motor:

| Cor | Categoria |
| --- | --- |
| **Vermelho** | Emergência |
| **Amarelo** | Risco |
| **Azul** | Oportunidade |
| **Cinza** | Narrativa / informação |

Mesmo que as cores não sejam adotadas desde o primeiro momento, a categoria orienta conceitualmente a hierarquia visual. Além disso, **toda notificação precisa responder a cinco perguntas**:

1. O que está acontecendo?
2. Por que importa?
3. Quais opções tenho?
4. Qual o risco de cada uma?
5. Até quando posso agir?

### Live Match Feed (tipos de mensagem)

O front **não precisa receber o estado inteiro a cada atualização**: ele consome um *feed* de eventos do stream `matchSequence` (ver [Tempo real](#tempo-real-realtime-gateway)). Os tipos de mensagem são:

| Tipo | Significado |
| --- | --- |
| `MATCH_TICK` | Avanço do relógio/estado incremental da partida |
| `MATCH_EVENT` | Evento visível (gol, cartão, chance, lesão…) |
| `DECISION_POINT_CREATED` | Surgiu um ponto de decisão |
| `DECISION_POINT_RESOLVED` | Ponto de decisão resolvido (pelo usuário ou pela IA) |
| `TACTIC_CHANGED` | Mudança tática aplicada |
| `SUBSTITUTION_MADE` | Substituição realizada |
| `MOMENTUM_CHANGED` | Alteração de momentum |
| `MATCH_FINISHED` | Partida encerrada |

Exemplo de payload:

```json
{
  "type": "DECISION_POINT_CREATED",
  "matchId": "match_123",
  "minute": 67,
  "title": "Seu lado esquerdo está vulnerável",
  "severity": 82
}
```

### Feedback pós-ação em tempo real

Depois de uma ação, a tela **mede e mostra o efeito**, ensinando o usuário e tornando a partida estratégica. Exemplos:

- "Você recuou a linha defensiva aos 68'. Desde então: o adversário teve menos bolas nas costas, mas aumentou os cruzamentos; sua posse caiu de 51% para 43%."
- "Você concentrou os ataques pelo lado direito. Resultado: 3 jogadas criadas, 1 chance clara, o lateral adversário recebeu amarelo."

### Modo compacto e modo detalhado

Para evitar que a profundidade vire barreira, a tela oferece dois modos:

- **Compacto** — para quem só quer acompanhar: placar, eventos e decisões importantes.
- **Detalhado** — para o usuário avançado: zonas, momentum, xG, fadiga, padrões e *trade-offs*.

> A lógica de simulação, os pontos de decisão e o papel da comissão como filtro de qualidade estão em [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md). Esta seção cobre apenas a **apresentação** no cliente.

> **Nota:** nas fontes deste documento esta era a única tela com especificação de layout. O **desenho tela a tela** do restante do jogo (elenco, mercado, finanças, competições, etc.), tanto no app do jogador quanto no admin, é agora responsabilidade da área [`../04-ui-ux/`](../04-ui-ux/) — este documento mantém apenas os contratos que essas telas consomem.

---

## Critérios de aceite

Relativos a frontend, cliente e tempo real, o bloco é considerado correto quando:

- O **app do jogador** for um app nativo em **Expo / React Native** (Android+iOS) e o **admin** for **Next.js** (decisão 2026-07-11).
- Cada cliente **separar estado local e estado do servidor**.
- O app do jogador for **mobile-first**.
- O **app nativo** (e qualquer outro cliente) reutilizar **integralmente** a API e os contratos.
- **Commands** utilizarem a **API oficial**.
- **WebSocket** for utilizado para eventos em tempo real.
- **WebSocket não** ser fonte de verdade.
- Eventos WebSocket possuírem **sequência**.
- **Reconexões** recuperarem eventos perdidos.
- A **API** ser versionada.
- Commands possuírem **`commandId`**.
- Commands possuírem **`idempotencyKey`**.
- Commands críticos possuírem **`expectedVersion`**.
- Erros possuírem **códigos estáveis**.
- Paginação por **cursor** ser suportada.
- Filtros serem **limitados e indexados**.

---

## Pendências consolidadas

> **Resolvido (2026-07-11):** a tecnologia do app nativo do jogador — antes em aberto — foi decidida como **Expo / React Native** (Android+iOS), com o **admin** em Next.js. Ver [Estratégia mobile e clientes](#estrategia-mobile-e-clientes) e o desenho de telas em [`../04-ui-ux/`](../04-ui-ux/). Não há pendências abertas de stack de cliente.

---

## Documentos relacionados

- **UI/UX — desenho de telas e fluxos dos dois clientes** (app mobile e admin): [`../04-ui-ux/`](../04-ui-ux/) e a decisão de stack em [`../04-ui-ux/00-visao-geral-e-design-system.md`](../04-ui-ux/00-visao-geral-e-design-system.md)
- Arquitetura geral (processos, topologia, monorepo): [`./00-arquitetura-geral.md`](./00-arquitetura-geral.md)
- Arquitetura de dados, transações e outbox: [`./01-arquitetura-de-dados.md`](./01-arquitetura-de-dados.md)
- Plataforma, segurança e operações: [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md)
- Motor de partida (pontos de decisão em tempo real): [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md)
