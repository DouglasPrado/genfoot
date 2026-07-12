# Documentação do Grinta

> **Status:** Rascunho consolidado · **Revisão:** 2026-07-10

**Grinta** é um manager de futebol online no espírito dos clássicos do gênero (Brasfoot, Elifoot), mas com uma camada muito mais profunda de simulação: cada jogador é **único** (origem, personalidade, história de vida, evolução) e cada clube é comandado por uma pessoa real, dentro de um **mundo persistente** e economicamente balanceado que segue evoluindo temporada após temporada.

Esta documentação foi consolidada a partir das conversas de brainstorming em [`../chats/`](../chats/) — que permanecem como arquivo-fonte. Onde os chats deixaram lacunas explícitas, os documentos as marcam com `> **Pendência:**` em vez de inventar conteúdo.

> **Nota sobre o nome:** o diretório do repositório é `genfoot`, um codinome antigo. O nome oficial do produto é **Grinta** (ainda sujeito a verificação de marca — ver [Identidade e Nome](00-produto/02-identidade-e-nome.md)).

## Como navegar

A documentação está organizada em áreas, do "porquê" ao "como":

| Área | O que contém |
| --- | --- |
| [`00-produto/`](#00--produto) | Visão, pitch, identidade de marca e a referência histórica que originou o design. |
| [`01-game-design/`](#01--game-design-gdd) | O GDD — o design de cada sistema do jogo (o "o quê" e o "porquê"). |
| [`02-tecnico/`](#02--técnico) | Arquitetura, modelo de dados, regras executáveis, plataforma e roadmap (o "como"). |
| [`03-guia-do-jogador/`](#03--guia-do-jogador) | O guia oficial voltado a quem joga. |
| [`04-ui-ux/`](#04--uiux) | Interface: telas e fluxos do app do jogador (Expo) e do admin (Next.js). |
| [`99-decisoes/`](#99--decisões) | O registro central de decisões (ADR log), preservando a numeração original. |

**Ponto de entrada recomendado:** comece pela [Visão de Produto](00-produto/01-visao-e-pitch.md) e depois pelo [GDD Overview](01-game-design/00-gdd-overview.md), que resume todos os sistemas e aponta para o detalhe de cada um.

---

### 00 · Produto

- [01 · Visão de Produto e Pitch](00-produto/01-visao-e-pitch.md) — posicionamento, pitches, pilares, público-alvo.
- [02 · Identidade e Nome](00-produto/02-identidade-e-nome.md) — decisão pelo nome **Grinta**, histórico de naming e pendências de marca.
- [03 · Referência: Brasfoot](00-produto/03-referencia-brasfoot.md) — como o clássico funcionava e o que Grinta herda/aprofunda (documento de contexto).

### 01 · Game Design (GDD)

- [00 · GDD Overview](01-game-design/00-gdd-overview.md) — documento raiz; mapa de todos os sistemas.
- [01 · Mundo Persistente e Clubes](01-game-design/01-mundo-persistente-e-clubes.md)
- [02 · Sistema de Jogadores](01-game-design/02-sistema-de-jogadores.md) — geração, atributos, evolução, memória (+ backlog de gaps).
- [03 · Economia](01-game-design/03-economia.md) — economia do clube e economia global balanceada.
- [04 · Estrutura do Clube e Staff](01-game-design/04-estrutura-do-clube-e-staff.md)
- [05 · Motor de Simulação de Partida](01-game-design/05-motor-de-partida.md)
- [06 · Temporada e Competições](01-game-design/06-temporada-e-competicoes.md)
- [07 · Inteligência Artificial](01-game-design/07-inteligencia-artificial.md) — Decision Engine e hierarquia de IAs.
- [08 · Estádio, Região e Clima](01-game-design/08-estadio-regiao-e-clima.md)
- [09 · Anti-abuso e Onboarding](01-game-design/09-anti-abuso-e-onboarding.md)
- [10 · Experiência do Usuário e Telas](01-game-design/10-experiencia-e-telas.md) — ciclo do dia a dia, central/agenda, automações, telas de indicadores.
- [11 · Torcida, Imprensa e Narrativa](01-game-design/11-torcida-imprensa-e-narrativa.md) — torcida segmentada, satisfação, imprensa, reputação do gestor/clube.
- [12 · Seleções e Calendário Internacional](01-game-design/12-selecoes-e-calendario-internacional.md)
- [13 · Relatórios, Notificações e Memória](01-game-design/13-relatorios-notificacoes-e-memoria.md) — caixa de decisões, record book, linhas do tempo.
- [14 · Monetização](01-game-design/14-monetizacao.md) — catálogos permitido/proibido, justiça competitiva.
- [15 · Fluxos Completos do Jogo](01-game-design/15-fluxos-completos.md) — golden paths ponta a ponta.
- [16 · Glossário Conceitual de Entidades](01-game-design/16-glossario-de-entidades.md) — ~75 objetos funcionais do jogo, em linguagem de produto.

### 02 · Técnico

- [00 · Arquitetura Geral](02-tecnico/00-arquitetura-geral.md) — stack e topologia (monólito modular + workers).
- [01 · Arquitetura de Dados e Transações (ADRs)](02-tecnico/01-arquitetura-de-dados.md)
- [02 · Modelo de Dados](02-tecnico/02-modelo-de-dados.md) — **schema Prisma canônico** (fonte da verdade).
- [03 · Multiplayer e Mundos](02-tecnico/03-multiplayer-e-mundos.md) — mundos, divisões, rodadas assíncronas.
- [04 · Plataforma, Segurança e Operações](02-tecnico/04-plataforma-seguranca-operacoes.md)
- [05 · Catálogo de Regras e Fórmulas](02-tecnico/05-catalogo-de-regras-e-formulas.md) — IDs estáveis, máquinas de estado, invariantes.
- [06 · Roadmap de Implementação](02-tecnico/06-roadmap-de-implementacao.md)
- [07 · Arquitetura do Core (ECS)](02-tecnico/07-arquitetura-do-core-ecs.md) — modelo Entity–Component–Effect–Event do motor de ecossistema.
- [08 · Frontend, Cliente e Tempo Real](02-tecnico/08-frontend-cliente-e-tempo-real.md) — dois clientes (app Expo + admin Next.js), contratos de API e realtime-gateway.
- [09 · Operação e Administração do Mundo](02-tecnico/09-operacao-e-admin-do-mundo.md) — painel admin, health checks de balanceamento, permissões.
- [10 · Catálogo de Commands](02-tecnico/10-catalogo-de-commands.md) — nomes canônicos das ações que os clientes enviam à API.

### 03 · Guia do Jogador

- [Guia Oficial do Jogador](03-guia-do-jogador/README.md) — estrutura de 42 capítulos + spec do site de docs.

### 04 · UI/UX

- [Interface do Grinta](04-ui-ux/README.md) — índice da área; telas e fluxos dos dois clientes: **app do jogador (Expo/React Native)** e **admin (Next.js)**.
- [00 · Visão Geral e Design System](04-ui-ux/00-visao-geral-e-design-system.md) — princípios, decisão de stack, tokens, componentes, estados, template de tela.
- [01 · Navegação e Arquitetura de Informação](04-ui-ux/01-navegacao-e-arquitetura-de-informacao.md) — tab bar, stacks, deep links e o **sitemap completo** (114 telas mobile + 24 admin).
- [02 · Mobile — Fluxos](04-ui-ux/02-mobile-fluxos.md) — os 16 golden paths + plataforma + micro-fluxos (MF-00…MF-25).
- **Mobile — Telas** (docs 03–12): [Onboarding](04-ui-ux/03-mobile-telas-onboarding-e-conta.md) · [Central/Home](04-ui-ux/04-mobile-telas-central-home-decisoes.md) · [Elenco/Jogador/Medicina](04-ui-ux/05-mobile-telas-elenco-jogador-treino-medicina.md) · [Tática/Partida](04-ui-ux/06-mobile-telas-tatica-escalacao-partida.md) · [Mercado/Contratos](04-ui-ux/07-mobile-telas-mercado-transferencias-contratos.md) · [Base](04-ui-ux/08-mobile-telas-base-e-formacao.md) · [Finanças/Estrutura/Estádio](04-ui-ux/09-mobile-telas-financas-estrutura-estadio.md) · [Competições/Calendário/Seleções](04-ui-ux/10-mobile-telas-competicoes-calendario-selecoes.md) · [Comunicação/Torcida/Moral](04-ui-ux/11-mobile-telas-comunicacao-torcida-moral.md) · [Perfil/Config/Loja](04-ui-ux/12-mobile-telas-perfil-config-loja.md) · [Complementos social/mundo](04-ui-ux/13-mobile-complementos-social-mundo-e-adendos.md).
- **Admin (Next.js):** [20 · Fluxos](04-ui-ux/20-admin-fluxos.md) (AF-00…AF-10) · [21 · Telas](04-ui-ux/21-admin-telas.md) (painel do mundo, moderação, correções, W.O./sanções, filas, audit log, balanceamento) · [22 · Complementos de plataforma](04-ui-ux/22-admin-complementos-plataforma.md) (feature flags, kill switches, DLQ, deploy, backups).

### 99 · Decisões

- [Registro de Decisões (ADR Log)](99-decisoes/registro-de-decisoes.md) — série 18xx–19xx e 19.x.

---

## Rastreabilidade — de qual chat cada documento derivou

| Chat de origem (`chats/`) | Documento(s) consolidado(s) |
| --- | --- |
| `pitch-elevator.md` | [00-produto/01-visao-e-pitch](00-produto/01-visao-e-pitch.md) |
| `nome-do-jogo.md`, `descobrindo-nome.md` | [00-produto/02-identidade-e-nome](00-produto/02-identidade-e-nome.md) |
| `funcionamento-brasfoot.md` | [00-produto/03-referencia-brasfoot](00-produto/03-referencia-brasfoot.md); [02-tecnico/00-arquitetura-geral](02-tecnico/00-arquitetura-geral.md) |
| `organizacao-de-pensamentos.md` | [01-game-design/00-gdd-overview](01-game-design/00-gdd-overview.md); [01-mundo-persistente-e-clubes](01-game-design/01-mundo-persistente-e-clubes.md) |
| `lista-envolvidos-jogo.md` | [01-game-design/02-sistema-de-jogadores](01-game-design/02-sistema-de-jogadores.md) (design de jogadores); [02-tecnico/07-arquitetura-do-core-ecs](02-tecnico/07-arquitetura-do-core-ecs.md) (arquitetura de core — 2ª metade) |
| `economics-initial.md` | [01-game-design/03-economia](01-game-design/03-economia.md); [10-experiencia-e-telas](01-game-design/10-experiencia-e-telas.md) (telas de indicadores) |
| `planejamento-agrupado-do-jogo.md` | [03-economia](01-game-design/03-economia.md); [04-estrutura-do-clube-e-staff](01-game-design/04-estrutura-do-clube-e-staff.md); [01-mundo-persistente](01-game-design/01-mundo-persistente-e-clubes.md); [06-temporada](01-game-design/06-temporada-e-competicoes.md); [09-anti-abuso](01-game-design/09-anti-abuso-e-onboarding.md); [03-multiplayer](02-tecnico/03-multiplayer-e-mundos.md) (entrada de novos clubes) |
| `simulacao-partida.md` | [01-game-design/05-motor-de-partida](01-game-design/05-motor-de-partida.md); [02-tecnico/05-catalogo-de-regras-e-formulas](02-tecnico/05-catalogo-de-regras-e-formulas.md) (fórmulas F1–F21); [08-frontend-cliente-e-tempo-real](02-tecnico/08-frontend-cliente-e-tempo-real.md) (UX de partida) |
| `campeonatos-fim-de-temporadas.md` | [01-game-design/06-temporada-e-competicoes](01-game-design/06-temporada-e-competicoes.md); [02-tecnico/03-multiplayer-e-mundos](02-tecnico/03-multiplayer-e-mundos.md); [10-experiencia-e-telas](01-game-design/10-experiencia-e-telas.md) (dia a dia/telas) |
| `como-podemos-desenvolver-jogo.md` | [01-game-design/07-inteligencia-artificial](01-game-design/07-inteligencia-artificial.md) |
| `decisao-escopo-do-jogo.md` | [01-game-design/08-estadio-regiao-e-clima](01-game-design/08-estadio-regiao-e-clima.md); [09-anti-abuso-e-onboarding](01-game-design/09-anti-abuso-e-onboarding.md); [99-decisoes](99-decisoes/registro-de-decisoes.md) |
| `arquitetura-jogo.md` | [02-tecnico/01-arquitetura-de-dados](02-tecnico/01-arquitetura-de-dados.md); [99-decisoes](99-decisoes/registro-de-decisoes.md) |
| `entidades-do-banco-de-dados-inicial.md` | [02-tecnico/02-modelo-de-dados](02-tecnico/02-modelo-de-dados.md) |
| `ux-do-jogo.md` | [02-tecnico/04-plataforma-seguranca-operacoes](02-tecnico/04-plataforma-seguranca-operacoes.md) (admin/segurança/ops); [02-tecnico/08-frontend-cliente-e-tempo-real](02-tecnico/08-frontend-cliente-e-tempo-real.md) (frontend/PWA/API/tempo real) |
| `como-construir-jogo-regras.md` | [02-tecnico/05-catalogo-de-regras-e-formulas](02-tecnico/05-catalogo-de-regras-e-formulas.md); [06-roadmap-de-implementacao](02-tecnico/06-roadmap-de-implementacao.md) |
| `guia-jogador-initial.md` | [03-guia-do-jogador/README](03-guia-do-jogador/README.md) |
| `documento-definitivo-escopo.md` (.docx) | consolidação funcional autoritativa → alimentou [11-torcida-imprensa](01-game-design/11-torcida-imprensa-e-narrativa.md), [12-selecoes](01-game-design/12-selecoes-e-calendario-internacional.md), [13-relatorios](01-game-design/13-relatorios-notificacoes-e-memoria.md), [14-monetizacao](01-game-design/14-monetizacao.md), [15-fluxos](01-game-design/15-fluxos-completos.md), [02-tecnico/09-operacao](02-tecnico/09-operacao-e-admin-do-mundo.md) e o [registro de decisões](99-decisoes/registro-de-decisoes.md) |
| `escopo-definitivo-simulador.md` (.docx) | consolidação funcional complementar → enriqueceu economia (comercial/contábil/scouting), jogadores (elenco social/medicina), temporada (homologação), experiência (central/agenda/automações), motor e regras transversais |
| `escopo-definitivo-estrutural-operacional.md` (.docx) | consolidação técnica → integridade numérica e governança de dados em [01-arquitetura-de-dados](02-tecnico/01-arquitetura-de-dados.md) e [00-arquitetura-geral](02-tecnico/00-arquitetura-geral.md) |

> **Nota:** dois chats têm nomes que não refletem o conteúdo — `ux-do-jogo.md` é, na verdade, arquitetura técnica (backend/plataforma/segurança **e** frontend/cliente/tempo real, dividido entre os docs [04](02-tecnico/04-plataforma-seguranca-operacoes.md) e [08](02-tecnico/08-frontend-cliente-e-tempo-real.md)), e `lista-envolvidos-jogo.md` é o design do sistema de jogadores (não uma lista de pessoas). O desenho **tela a tela** dos dois clientes (app do jogador em Expo, admin em Next.js) vive na área [`04-ui-ux/`](04-ui-ux/), em construção.

## Convenções

- **Nome do jogo:** sempre **Grinta** no corpo; "Brasfoot" aparece apenas como referência histórica.
- **Cabeçalho padrão:** cada documento abre com **Status**, **Fontes** e **Revisão**, seguido de resumo e sumário.
- **Pendências:** lacunas conhecidas e decisões em aberto são marcadas com `> **Pendência:**`. Na consolidação de 2026-07-11 elas foram resolvidas ou convertidas em **Recomendação (a ratificar)** — ver Série R.
- **Rastreabilidade:** os IDs de decisão originais (ex.: `Decisão 1801`, `19.7`) e de regra (`ECO-001`, `PLY-001`) são preservados.
- **Âncoras de link:** a convenção canônica é **slugging GitHub-native** — âncoras **mantêm os acentos** do cabeçalho (ex.: `#4-calendário-da-temporada` para "Calendário da temporada"). A maioria dos links segue isso e resolve no GitHub. Uma varredura de integridade (2026-07-11) confirmou **0 âncoras quebradas** em 846 links internos. Ao criar links novos, preserve os acentos do cabeçalho.
- **Decisões da consolidação:** decisões e valores propostos durante a resolução de pendências vivem na **Série R** do [registro de decisões](99-decisoes/registro-de-decisoes.md) — `R-01` ratificada; `R-02`+ a ratificar. Rastreador: [`BACKLOG-PENDENCIAS.md`](BACKLOG-PENDENCIAS.md).
