# Registro de Decisões (ADR Log)

> **Status:** Rascunho consolidado · **Fontes:** chats/decisao-escopo-do-jogo.md, chats/arquitetura-jogo.md, chats/documento-definitivo-escopo.md (§24–25), chats/escopo-definitivo-simulador.md (§27) · **Revisão:** 2026-07-11

Este é o log central de decisões do **Grinta**. Ele preserva a numeração original das decisões tomadas nos chats de brainstorming (série de escopo `18xx–19xx` e série de arquitetura `19.x`) para garantir rastreabilidade ponta a ponta. Cada tema aponta, via link relativo, para o documento oficial onde foi detalhado. O registro não introduz decisões novas: onde um bloco ainda está aberto, isso é marcado explicitamente como pendência.

---

## 0. Decisões fundacionais (série 1–3)

As três primeiras decisões da árvore, que definem a natureza do jogo. Foram tomadas como "uma pergunta por vez" no início do processo.

| ID | Decisão | Escolha | Documento |
|----|---------|---------|-----------|
| 1 | Escopo real do jogo | **C** — gestor online **completo**: gestão do clube, economia, elenco, staff, mercado, campeonatos, evolução, IA e **simulação robusta** de partidas, todos com profundidade parecida e influenciando-se | [Visão e pitch](../00-produto/01-visao-e-pitch.md), [GDD overview](../01-game-design/00-gdd-overview.md) |
| 2 | Ritmo do mundo online | **B** — **ligas/salas independentes**, cada uma com seu próprio calendário, temporada, economia e histórico (uma liga pode estar na temp. 3, outra na 20); com lógica persistente | [Multiplayer e mundos](../02-tecnico/03-multiplayer-e-mundos.md) |
| 3 | Entrada de novos usuários | Recomendação **C** (liga nova / em andamento / temática-especial) — **resposta não fechada na fonte** | [Anti-abuso e onboarding §2.9](../01-game-design/09-anti-abuso-e-onboarding.md) |

> **Nota sobre a numeração:** os IDs saltam de 3 para 1801. As decisões intermediárias (~4–1800) foram tomadas ao longo dos chats temáticos (motor de partida, economia, jogadores, IA, campeonatos, staff, etc.) **sem numeração explícita** — o conteúdo delas está distribuído pelos documentos de game design e técnicos correspondentes, não neste registro numérico.

> **Pendência:** a Decisão 3 está com recomendação C, mas sem fechamento explícito na fonte. Ver [`../01-game-design/09-anti-abuso-e-onboarding.md`](../01-game-design/09-anti-abuso-e-onboarding.md) §2.9.

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

> **Nota:** O detalhamento operacional de cada pendência acima — espelhando a Seção 25 do documento definitivo de escopo e a Seção 27 do escopo definitivo do simulador — está consolidado na [seção 4](#4-decisões-pendentes-ambiguidades-e-pontos-a-fechar). Os recursos deliberadamente adiados estão na [seção 5](#5-fora-de-escopo-inicial).

---

## 4. Decisões pendentes, ambiguidades e pontos a fechar

Esta seção consolida os temas que ainda **não receberam decisão operacional final** ou que dependem de confirmação para evitar contradição futura. Ela espelha a Seção 25 de [`chats/documento-definitivo-escopo.md`](../../chats/documento-definitivo-escopo.md) e a Seção 27 de [`chats/escopo-definitivo-simulador.md`](../../chats/escopo-definitivo-simulador.md). Nenhuma regra nova é introduzida aqui — apenas o que as fontes deixam explicitamente em aberto.

### 4.1 Pendências de escopo (def-escopo Seção 25)

| Tema | O que já está aprovado | O que falta fechar |
|------|------------------------|--------------------|
| **4.1.1 Onboarding e entrada tardia** (25.1) | Filosofia de entrada | apresentação/comparação de clubes disponíveis; critérios exatos de risco e compensação de clube forte; objetivos iniciais de quem entra no meio da temporada; proteção de adaptação sem vantagem competitiva; tratamento de entrada em temporadas muito avançadas; duração e limites da pré-temporada ativa; tutorial sistêmico e sequência obrigatória de primeiras decisões |
| **4.1.2 Aporte inicial × caixa e dívidas herdados** (25.2) | Aporte inicial fixo e igual; clube assumido preserva sua realidade | como o aporte interage com o caixa já existente do clube assumido; dívidas e obrigações herdadas; orçamento de transferência; clube criado do zero; clubes disponíveis com patrimônio muito diferente |
| **4.1.3 Relatórios e explicabilidade** (25.3) | Tipos e princípios de relatório | frequência de cada relatório; níveis de detalhe por qualidade da comissão; informações sempre visíveis; formato das incertezas; retenção e comparação histórica; diferença exata entre relatório comum e recurso pago |
| **4.1.4 Operação administrativa** (25.4) | Painel, auditoria, verificações de saúde e correções são obrigatórios | procedimentos de atendimento e recurso; prazos de revisão; níveis finais de permissão; política de manutenção de mundo; comunicação ao usuário após correções; critérios de **arquivamento de mundo inativo** |
| **4.1.5 Monetização operacional** (25.5) | Proibição de pay-to-win fechada | catálogo exato de cosméticos; natureza dos espaços adicionais; limites de conveniência; conteúdo/preço/distribuição do passe cosmético; **se relatórios ou estatísticas pagos podem existir** sem fornecer informação competitiva adicional |
| **4.1.6 Recordes e memória** (25.6) | Existência de record book, linha do tempo, ídolos e marcos | catálogo final de recordes; critérios de desempate; separação por competição/temporada/mundo; regras de correção após punição ou anulação; cerimônias, homenagens e recursos de consulta histórica |
| **4.1.7 Valores numéricos de balanceamento** (25.7) | Conceito das regras fechado | números finais dependem de testes: tamanho de elencos; capacidade por categoria de base; frequência de prodígios; probabilidades de eventos/lesões; pesos de atributos; intervalos de calendário; valores de manutenção/melhorias; limites financeiros; faixas de risco antiabuso; duração de contratos por idade; limites de estrangeiros e inscrição |
| **4.1.8 Catálogo inicial de competições e geografia** (25.8) | Estrutura de liga, divisões, copa, regionais, base e expansão | quantidade inicial de divisões por mundo; número/formato dos regionais; mapa de regiões e distâncias; calendário internacional inicial; regras definitivas de estrangeiros; critérios de entrada em competições continentais |
| **4.1.9 Recursos aprovados para expansão futura** (25.9) | Previstos, não detalhados no núcleo | competições continentais/internacionais; seleções de base; gestão de seleções por usuários; gramado sintético/híbrido; naming rights; mudança de cidade; camisa aposentada; parcerias oficiais entre clubes; relações individuais profundas entre jogadores; protocolo especial de concussão; eventos e exploração comercial detalhada do estádio |

> **Pendência:** todos os itens de 4.1.1 a 4.1.9 seguem abertos na fonte (def-escopo §25). São parâmetros e regras operacionais a fechar — nenhum altera os princípios já aprovados.

> **Nota (25.7):** os valores numéricos de balanceamento **não** representam novas decisões de escopo; são parâmetros de calibração que não podem alterar os princípios aprovados.

#### 4.1.10 Pontos resolvidos que não devem ser reabertos (25.10)

A fonte marca explicitamente os seguintes pontos como **já resolvidos** — registrados aqui para que não sejam reabertos como contradição:

- O usuário **não é demitido**; a diretoria aplica restrições e planos de recuperação.
- Clubes começam equilibrados no nascimento do mundo, mas podem tornar-se muito diferentes historicamente.
- Assumir um clube forte é permitido, desde que todo o contexto e os passivos permaneçam.
- Potencial é dinâmico, mas não ilimitado.
- Proteção de jovem reduz risco de saída, mas não torna o jogador impossível de perder.
- A presença online oferece decisão, não bônus oculto.
- A inteligência pode errar, mas não deve destruir um clube sem lógica.
- O mundo continua após a temporada; apenas as competições são renovadas.

### 4.2 Pendências do simulador (def-simulador Seção 27)

| Tema | Situação na fonte |
|------|-------------------|
| **4.2.1 Nome definitivo do jogo** (27.1) | O nome comercial ainda **não** foi formalmente encerrado. "Grinta" recebeu avaliação positiva, mas **sem confirmação final** acompanhada de verificação jurídica, disponibilidade de marca e domínio |
| **4.2.2 Título formal do papel do usuário** (27.2) | Função definida (controla a gestão do clube, não é demitido, pode sofrer restrições da diretoria); pendente o **nome apresentado na interface** — treinador, manager, gestor, dirigente ou título próprio do jogo |
| **4.2.3 Seleções e competições entre seleções** (27.3) | Convocações reconhecidas como eventos externos que afetam disponibilidade, fadiga, reputação e lesões; falta fechar escopo de seleções, competições internacionais, elegibilidade e controle dessas equipes |
| **4.2.4 Escopo social entre usuários** (27.4) | Necessidades de canais, privacidade, moderação, denúncias e identificação de mensagens automáticas estabelecidas; pendentes formatos de amizade, grupos, federações de usuários, negociação direta por conversa e recursos sociais públicos |
| **4.2.5 Monetização comercial do produto** (27.5) | Economia fictícia do clube separada de dinheiro real; **modelo comercial externo** (assinatura, itens cosméticos, planos ou outras receitas da plataforma) não encerrado |
| **4.2.6 Propriedade intelectual e conteúdo licenciado** (27.6) | Mundo planejado com clubes, jogadores e competições próprios; uso futuro de nomes, escudos, atletas ou campeonatos reais depende de decisão de produto e licenciamento |
| **4.2.7 Direção artística, áudio e apresentação visual** (27.7) | Experiência funcional mobile-first definida; faltam identidade visual, estilo gráfico, animações, narração, áudio de partidas e nível de representação visual do estádio e dos jogadores |
| **4.2.8 Ritmo numérico final do mundo** (27.8) | Tempo oficial, persistência e prazos definidos; valores exatos de duração de dia, semana, temporada, partidas e janelas a calibrar em testes de equilíbrio |
| **4.2.9 Quantidades iniciais de conteúdo** (27.9) | Modelo completo de clubes, jogadores, funcionários, competições e divisões definido; quantidades iniciais por mundo a calcular por capacidade, ritmo e testes econômicos |

> **Pendência:** o nome **Grinta** é usado em toda a documentação como nome de trabalho, mas ainda **não está juridicamente confirmado** (def-simulador §27.1). O **título do papel do usuário** na interface também segue em aberto (§27.2).

#### 4.2.10 Contradições consolidadas (27.10)

A fonte declara que **não há contradição funcional insolúvel** entre as decisões aprovadas. Os aparentes conflitos foram consolidados em **sete resoluções**, registradas para não serem reabertas:

1. O usuário controla o clube, mas **não possui poder institucional absoluto**.
2. O usuário **nunca é demitido**, mas pode perder autonomia e operar sob intervenção.
3. Clubes novos recebem condições viáveis, mas **não são equiparados artificialmente** a potências históricas.
4. Funcionários melhores oferecem decisões melhores, mas **não alteram as regras fundamentais** do jogo.
5. A inteligência do jogo pode agir durante a ausência, mas **grandes decisões dependem de autoridade prévia**.
6. A história pode ser corrigida, mas **a versão anterior nunca é apagada**.
7. O resultado em campo pode ser celebrado imediatamente, mas **o registro oficial depende de homologação**.

---

## 5. Fora de escopo inicial

Consolidando a Seção 24 de [`chats/documento-definitivo-escopo.md`](../../chats/documento-definitivo-escopo.md), os itens abaixo **não pertencem ao núcleo inicial** ou permanecem deliberadamente em nível simplificado. São recursos adiados, não descartados — vários reaparecem como expansão futura em [4.1.9](#41-pendências-de-escopo-def-escopo-seção-25):

- **Doping** — não faz parte do núcleo do jogo.
- **Cartões para banco e comissão técnica** — não recebem simulação profunda no núcleo inicial.
- **Recusa explícita de um jogador em entrar em campo** — fora do núcleo inicial.
- **Relações individuais profundas** de amizade e rivalidade entre todos os jogadores — adiadas.
- **Vida doméstica de jovens** (escola, rotina doméstica e vida íntima) — não é microgerenciada.
- **Protocolo especial de concussão** — pode ser suportado futuramente, sem ser requisito inicial.
- **Seleções de base, competições continentais e gestão de seleções por usuários** — expansões.
- **Mudança de cidade, camisa aposentada, naming rights e exploração comercial detalhada do estádio** — expansões.
- **IA generativa** — limitada à redação de narrativas baseadas em fatos já definidos; **nunca participa do resultado competitivo**.
