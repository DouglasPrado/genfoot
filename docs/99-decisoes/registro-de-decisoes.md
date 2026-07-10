# Registro de Decisões (ADR Log)

> **Status:** Rascunho consolidado · **Fontes:** chats/decisao-escopo-do-jogo.md, chats/arquitetura-jogo.md · **Revisão:** 2026-07-10

Este é o log central de decisões do **Grinta**. Ele preserva a numeração original das decisões tomadas nos chats de brainstorming (série de escopo `18xx–19xx` e série de arquitetura `19.x`) para garantir rastreabilidade ponta a ponta. Cada tema aponta, via link relativo, para o documento oficial onde foi detalhado. O registro não introduz decisões novas: onde um bloco ainda está aberto, isso é marcado explicitamente como pendência.

---

## 1. Decisões de Escopo (série 18xx–19xx)

As decisões de escopo estão agrupadas por faixa temática, preservando os IDs de marco (abertura e fechamento de cada bloco). Cada faixa aponta para o documento de game design correspondente.

### 1.1 Estádio, região, logística e clima (1801–1874)

Detalhado em [`../01-game-design/08-estadio-regiao-e-clima.md`](../01-game-design/08-estadio-regiao-e-clima.md).

| ID | Decisão (resumo curto) | Documento |
|----|------------------------|-----------|
| 1801 | Filosofia do estádio (marco de abertura do bloco) | [Estádio, região e clima](../01-game-design/08-estadio-regiao-e-clima.md) |
| 1802 | Estádio como entidade própria | [Estádio, região e clima](../01-game-design/08-estadio-regiao-e-clima.md) |
| 1803–1815 | Capacidade, ocupação, preço de ingresso, receita de bilheteria, custos de jogo, qualidade, manutenção, deterioração, upgrade, obras não instantâneas, expansão e tamanho ideal do estádio | [Estádio, região e clima](../01-game-design/08-estadio-regiao-e-clima.md) |
| 1816–1820 | Licenciamento, interdição, campo alternativo, aluguel e estádio próprio vs. alugado | [Estádio, região e clima](../01-game-design/08-estadio-regiao-e-clima.md) |
| 1821–1825 | Gramado: manutenção, tipo, identidade tática e dimensão do campo | [Estádio, região e clima](../01-game-design/08-estadio-regiao-e-clima.md) |
| 1826–1829 | Mando de campo (não garante vitória) e efeitos de público baixo/lotado | [Estádio, região e clima](../01-game-design/08-estadio-regiao-e-clima.md) |
| 1830–1834 | Região do clube, mercado regional, rivalidade regional e captação de jovens | [Estádio, região e clima](../01-game-design/08-estadio-regiao-e-clima.md) |
| 1835–1842 | Logística e viagem: custo, fadiga, viagens curtas/longas, sequências fora/em casa | [Estádio, região e clima](../01-game-design/08-estadio-regiao-e-clima.md) |
| 1843–1845 | Torcida visitante, campo neutro e final em campo neutro | [Estádio, região e clima](../01-game-design/08-estadio-regiao-e-clima.md) |
| 1846–1857 | Clima: tipos, extremos (chuva, calor, frio, vento), adaptação, efeito na torcida/calendário e infraestrutura que reduz impacto | [Estádio, região e clima](../01-game-design/08-estadio-regiao-e-clima.md) |
| 1858–1860 | Segurança, punições de estádio, portões fechados e punição de mando | [Estádio, região e clima](../01-game-design/08-estadio-regiao-e-clima.md) |
| 1861–1873 | Patrocinador, naming rights (futuro), eventos, record book, obras vs. torcida/dívida, custo de vida regional, adaptação de jogador, mudança de cidade, clube novo, balanceamento regional e regionalização do calendário | [Estádio, região e clima](../01-game-design/08-estadio-regiao-e-clima.md) |
| **1874** | **Estádio, região e logística fechados** (marco de fechamento do bloco) | [Estádio, região e clima](../01-game-design/08-estadio-regiao-e-clima.md) |

### 1.2 Anti-abuso global (1875–1960)

Detalhado em [`../01-game-design/09-anti-abuso-e-onboarding.md`](../01-game-design/09-anti-abuso-e-onboarding.md).

| ID | Decisão (resumo curto) | Documento |
|----|------------------------|-----------|
| 1875 | Filosofia anti-abuso: proteger o mundo sem punir o jogador honesto (marco de abertura) | [Anti-abuso e onboarding](../01-game-design/09-anti-abuso-e-onboarding.md) |
| 1876–1880 | Anti-abuso como camada central; tudo importante gera rastro; risk score global; níveis de risco; explicação limitada ao usuário | [Anti-abuso e onboarding](../01-game-design/09-anti-abuso-e-onboarding.md) |
| 1881–1884 | Multi-conta, contas relacionadas, rede compartilhada (família/escritório) e clube satélite | [Anti-abuso e onboarding](../01-game-design/09-anti-abuso-e-onboarding.md) |
| 1885–1894 | Transferências suspeitas: venda abaixo/compra acima do valor, trocas, empréstimos, cláusulas e parcelamentos abusivos, manipulação de mercado e farm/assédio de jovens | [Anti-abuso e onboarding](../01-game-design/09-anti-abuso-e-onboarding.md) |
| 1895–1900 | Manipulação esportiva, escalação suspeita, entregar jogo, W.O. intencional/acidental e escalação irregular | [Anti-abuso e onboarding](../01-game-design/09-anti-abuso-e-onboarding.md) |
| 1901–1907 | Abandono de clube (abusivo), troca de clube, assumir clube recém-abandonado, clube forte disponível, destruição de elenco e má gestão legítima vs. abuso | [Anti-abuso e onboarding](../01-game-design/09-anti-abuso-e-onboarding.md) |
| 1908–1919 | Explorações: calendário, amistosos, treino, lesões, financeira, calote, premiações, ranking, bot/script, spam de propostas e descoberta/exploração de informação oculta | [Anti-abuso e onboarding](../01-game-design/09-anti-abuso-e-onboarding.md) |
| 1920–1925 | Fundamentos técnicos: server authoritative, idempotência, locks, snapshots, reprocessamento seguro e reversão administrativa | [Anti-abuso e onboarding](../01-game-design/09-anti-abuso-e-onboarding.md) |
| 1926–1932 | Punições progressivas (esportiva, financeira, reputação, suspensão de conta) e tratamento de exploração/report de bug | [Anti-abuso e onboarding](../01-game-design/09-anti-abuso-e-onboarding.md) |
| 1933–1939 | Governança admin: audit log imutável, tools com permissões, detecção automática + revisão humana, falso positivo, recurso, quarentena e delay anti-fraude | [Anti-abuso e onboarding](../01-game-design/09-anti-abuso-e-onboarding.md) |
| 1940–1948 | Mercado usuário-usuário e IA-usuário, IA como proteção natural, interações sociais/parcerias futuras e integridade competitiva | [Anti-abuso e onboarding](../01-game-design/09-anti-abuso-e-onboarding.md) |
| 1949–1959 | Auditoria de temporada, health check, privacidade, regras versionadas, simulação de abuso, transparência, logs imutáveis, separação auditoria/narrativa e sanções públicas | [Anti-abuso e onboarding](../01-game-design/09-anti-abuso-e-onboarding.md) |
| **1960** | **Anti-abuso global fechado operacionalmente** (marco de fechamento) | [Anti-abuso e onboarding](../01-game-design/09-anti-abuso-e-onboarding.md) |

### 1.3 Onboarding e entrada tardia (1961–…)

Detalhado em [`../01-game-design/09-anti-abuso-e-onboarding.md`](../01-game-design/09-anti-abuso-e-onboarding.md).

| ID | Decisão (resumo curto) | Documento |
|----|------------------------|-----------|
| **1961** | Filosofia do onboarding: inserir o usuário no mundo sem quebrar o equilíbrio (criar/assumir clube, mostrar riscos, caixa fixo, entrada em temporada avançada, objetivos justos, pré-temporada, evitar exploração de clubes fortes e preservar a história do mundo) | [Anti-abuso e onboarding](../01-game-design/09-anti-abuso-e-onboarding.md) |

> **Pendência:** O bloco de Onboarding e entrada tardia foi apenas iniciado (Decisão 1961). As decisões subsequentes ainda não foram registradas nos chats de origem e precisam ser fechadas.

---

## 2. Decisões de Arquitetura (série 19.x)

Detalhado em [`../02-tecnico/01-arquitetura-de-dados.md`](../02-tecnico/01-arquitetura-de-dados.md).

| ID | Decisão | Documento |
|----|---------|-----------|
| 19.7 | Schemas PostgreSQL separados por domínio e capacidade técnica, nomes físicos em `snake_case`, ownership único por tabela e mapeamento explícito no Prisma | [Arquitetura de dados](../02-tecnico/01-arquitetura-de-dados.md) |
| 19.8 | Foreign keys e relações entre domínios: relações oficiais no mesmo banco usam FKs fortes, com escopo composto por `world_id`, `ON DELETE RESTRICT` por padrão, e referências lógicas apenas quando projeções, histórico ou separação física justificarem | [Arquitetura de dados](../02-tecnico/01-arquitetura-de-dados.md) |
| 19.9 | Índices, paginação e particionamento: índices orientados por access patterns, paginação por cursor e particionamento somente quando volume, retenção ou manutenção comprovarem a necessidade | [Arquitetura de dados](../02-tecnico/01-arquitetura-de-dados.md) |
| 19.10 | Transações, concorrência e locks: estratégia híbrida — `READ COMMITTED` como padrão, optimistic concurrency nos agregados, row/advisory locks em seções críticas, `SERIALIZABLE` seletivo, `SKIP LOCKED` para claims e Process Managers para operações longas | [Arquitetura de dados](../02-tecnico/01-arquitetura-de-dados.md) |

---

## 3. Status do Projeto

Panorama dos blocos de design conforme registrado no chat de escopo.

### 3.1 Blocos já fechados

| Bloco | Situação |
|-------|----------|
| Mundo persistente, clubes e entrada de usuários | Fechado |
| Temporada macro | Fechado |
| Campeonatos, calendário e fim de temporada | Fechado |
| Motor de partida completo | Fechado |
| Balanceamento do motor | Fechado |
| Execução técnica do motor | Fechado |
| Regras de borda do motor | Fechado |
| Economia | Fechado |
| Mercado e contratos | Fechado |
| Base, jovens e desenvolvimento | Fechado |
| Geração de jogadores | Fechado |
| IA dos clubes | Fechado |
| Staff e departamentos | Fechado |
| Treino | Fechado |
| Torcida, imprensa, reputação, rivalidades e narrativa | Fechado |
| Estádio, região, logística e clima | Fechado na Decisão 1874 |
| Anti-abuso global | Fechado na Decisão 1960 |

> **Nota:** Estádio, região, logística e clima constava como faltante no panorama inicial do chat, mas foi fechado ao longo das decisões 1801–1874. Anti-abuso global também foi fechado (1875–1960).

### 3.2 Blocos faltantes

| Bloco | Escopo previsto |
|-------|-----------------|
| Onboarding e entrada tardia | Criar clube, assumir clube existente, mostrar riscos, divisão de expansão, entrada em temporada avançada e proteção contra escolhas quebradas |
| Relatórios e explicabilidade | Pós-jogo, financeiro, elenco, base, mercado, comissão, risco, fim de temporada e explicação de decisões da IA |
| Admin e operação do mundo | Painel admin, health checks, jobs, filas, auditoria, correções, reprocessamento seguro e SimulationLab |
| Monetização sem pay-to-win | Cosméticos, slots, relatórios premium, passe cosmético, conveniência permitida e limites rígidos |
| Recordes, histórico e memória do mundo | Record book, linha do tempo, histórico de clubes/jogadores, ídolos, rankings e rivalidades históricas |

> **Pendência:** Onboarding e entrada tardia — bloco iniciado na Decisão 1961 (filosofia), mas ainda não fechado.
>
> **Pendência:** Relatórios e explicabilidade — bloco ainda não iniciado.
>
> **Pendência:** Admin e operação do mundo — bloco ainda não iniciado.
>
> **Pendência:** Monetização sem pay-to-win — bloco ainda não iniciado.
>
> **Pendência:** Recordes, histórico e memória do mundo — bloco ainda não iniciado.
