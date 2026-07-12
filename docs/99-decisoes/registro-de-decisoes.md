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

> **Resolvido (Série R — R-55):** Decisão 3 fechada como **C** (liga nova / em andamento / temática), com regras mínimas das ligas temáticas. Detalhe em [`../01-game-design/09-anti-abuso-e-onboarding.md`](../01-game-design/09-anti-abuso-e-onboarding.md) §2.9.

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

> **Endereçado (Série R — R-50..R-57):** o bloco de Onboarding e entrada tardia foi consolidado como recomendações a ratificar (critérios de clube disponível, entrada em temporada em andamento, anti-captura, Programa de Clube Novo, arquivamento de mundo, elenco/caixa inicial). Ratificação pendente.

---

## 2. Decisões de Arquitetura (série 19.x)

Detalhado em [`../02-tecnico/01-arquitetura-de-dados.md`](../02-tecnico/01-arquitetura-de-dados.md).

| ID | Decisão | Documento |
|----|---------|-----------|
| 19.7 | Schemas PostgreSQL separados por domínio e capacidade técnica, nomes físicos em `snake_case`, ownership único por tabela e mapeamento explícito no Prisma | [Arquitetura de dados](../02-tecnico/01-arquitetura-de-dados.md) |
| 19.8 | Foreign keys e relações entre domínios: relações oficiais no mesmo banco usam FKs fortes, com escopo composto por `world_id`, `ON DELETE RESTRICT` por padrão, e referências lógicas apenas quando projeções, histórico ou separação física justificarem | [Arquitetura de dados](../02-tecnico/01-arquitetura-de-dados.md) |
| 19.9 | Índices, paginação e particionamento: índices orientados por access patterns, paginação por cursor e particionamento somente quando volume, retenção ou manutenção comprovarem a necessidade | [Arquitetura de dados](../02-tecnico/01-arquitetura-de-dados.md) |
| 19.10 | Transações, concorrência e locks: estratégia híbrida — `READ COMMITTED` como padrão, optimistic concurrency nos agregados, row/advisory locks em seções críticas, `SERIALIZABLE` seletivo, `SKIP LOCKED` para claims e Process Managers para operações longas | [Arquitetura de dados](../02-tecnico/01-arquitetura-de-dados.md) |

> **Nota sobre a numeração (19.1–19.6):** a série de arquitetura foi consolidada nas fontes já a partir de **19.7** (as decisões 19.1–19.6 correspondem à discussão introdutória de arquitetura — stack, topologia monólito-modular, bounded contexts, event sourcing híbrido, determinismo por seed — que foi absorvida diretamente em [`../02-tecnico/00-arquitetura-geral.md`](../02-tecnico/00-arquitetura-geral.md) sem numeração ADR própria). A stack em aberto dessa faixa foi fechada na Série R (**R-77..R-82**). Não há decisão 19.1–19.6 perdida: o conteúdo está no doc de arquitetura geral.

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

> **Endereçado (Série R — R-50..R-57):** onboarding e entrada tardia especificados como recomendações a ratificar.
>
> **Endereçado (Série R — R-75/R-76):** relatórios (não-pagos, detalhe por comissão) e explicabilidade especificados; detalhe em [`../01-game-design/13-relatorios-notificacoes-e-memoria.md`](../01-game-design/13-relatorios-notificacoes-e-memoria.md).
>
> **Endereçado (Série R — R-86/R-87):** admin e operação do mundo especificados (painel de saúde, governança de correções, 6 níveis de papéis); detalhe em [`../02-tecnico/09-operacao-e-admin-do-mundo.md`](../02-tecnico/09-operacao-e-admin-do-mundo.md) e [`../04-ui-ux/21-admin-telas.md`](../04-ui-ux/21-admin-telas.md).
>
> **Endereçado (Série R — R-75):** monetização sem pay-to-win consolidada (relatórios não-pagos; catálogo cosmético); detalhe em [`../01-game-design/14-monetizacao.md`](../01-game-design/14-monetizacao.md).
>
> **Endereçado (Série R — R-76):** recordes, histórico e memória do mundo especificados (record book/timelines permanentes); detalhe em [`../01-game-design/13-relatorios-notificacoes-e-memoria.md`](../01-game-design/13-relatorios-notificacoes-e-memoria.md).

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

> **Endereçado (Série R):** os parâmetros operacionais de 4.1.1–4.1.9 foram convertidos em recomendações a ratificar (economia R-41..R-49, onboarding R-50..R-57, temporada R-58..R-63, torcida R-68..R-74, plataforma R-77..R-88). A **calibração final** sai do lote de simulação (R-34/R-88). Nenhum altera os princípios já aprovados.

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

> **Ação externa pendente / Resolvido:** o nome **Grinta** segue como nome de trabalho até **verificação jurídica de marca** (ação de mundo real, não de spec — ver [`../00-produto/02-identidade-e-nome.md`](../00-produto/02-identidade-e-nome.md)). O **papel do usuário** foi ratificado como **Gestor+Técnico** ([R-01](#61-r-01--papel-do-usuário)); o rótulo exato na interface é detalhe de UI a definir no design.

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

---

## 6. Série R — Resolução de pendências (2026-07-11)

Esta série registra as decisões e recomendações produzidas na **passada de resolução das 243 pendências** da documentação (rastreada em [`../BACKLOG-PENDENCIAS.md`](../BACKLOG-PENDENCIAS.md)). Diferente das séries `18xx–19xx`/`19.x` — que apenas **preservam** decisões já tomadas nas fontes —, a Série R **introduz** decisões novas, tomadas na consolidação. Por isso, cada entrada carrega um **estado explícito**:

- **RATIFICADA** — decidida pelo dono do produto (Douglas) nesta consolidação.
- **RECOMENDADA (a ratificar)** — proposta minha, com racional e valor sugerido, aguardando martelo do dono. Enquanto não ratificada, é a direção de trabalho, não a verdade final.

Protocolo desta passada (autonomia escolhida: *"só reconciliação; resto vira recomendação"*):
- **Reconciliação, consistência, extração e conteúdo** → resolvidos direto na fonte (removem o marcador `> **Pendência:**`).
- **Decisão de produto/design** e **valor de balanceamento** → o marcador `> **Pendência:**` é reescrito como `> **Recomendação (a ratificar — [R-##](#6-série-r--resolução-de-pendências-2026-07-11)):**` com valor proposto; a decisão entra aqui como RECOMENDADA.

### R-01 — Papel do usuário: **Gestor + Técnico** · RATIFICADA

O usuário é **gestor do clube e também comanda a parte técnica** (tática, escalação, decisões ao vivo), no espírito Brasfoot/FM. A comissão técnica **assessora** (qualidade da comissão = qualidade das sugestões); a **IA cobre o período offline** com limites de autoridade. Não há técnico-NPC contratável que retire do usuário o comando tático.
- **Racional:** reconcilia com o corpus dominante — [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md) §"Usuário online vira técnico ativo" e todos os fluxos de UI ([`../04-ui-ux/02-mobile-fluxos.md`](../04-ui-ux/02-mobile-fluxos.md) MF-07) que já assumem o usuário definindo `M-LINEUP`/`M-TACTICS`/`M-GAMEPLAN`.
- **Fecha:** a pendência "Papel do usuário" de [`05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md) §17.
- **Consequência:** `CoachTrust` (confiança do elenco no técnico) refere-se ao usuário-como-técnico.

### Sistema de jogadores (R-02..R-09) · RECOMENDADAS (a ratificar)

Fonte: reconciliação de [`../01-game-design/02-sistema-de-jogadores.md`](../01-game-design/02-sistema-de-jogadores.md). Escala canônica de atributos fixada em **0–100** (reconciliação: única faixa usada no corpus).

- **R-02 — Compatibilidade jogador-clube** (`playerCompatibility`, multiplicador 0–1: estilo .25 / função .20 / personalidade .15 / metodologia .15 / pressão .10 / relação c/ técnico .10 / cultura .05) entrando em `developmentGain`.
- **R-03 — Clima de vestiário** (`LockerRoomClimate` 0–100 = .30 moral + .20 CoachTrust + .15 liderança + .15 satisfação contratual + .10 minutos + .10 estabilidade − penalidades até −40).
- **R-04 — Bandas de incerteza do `ScoutReport`** (olheiro ruim ±10/conf≤40; bom ±3/conf≥80; estreitamento ~30%/ciclo).
- **R-05 — Retorno de empréstimo** (`LoanSpell`: score = minutos% × qualidadeFormação; melhor≥.60 / igual .30–.60 / pior <.30).
- **R-06 — `CareerEvent` + decaimento** (meias-vidas: curto ~3d, médio ~3sem, longo ~1 temporada, histórico não decai).
- **R-07 — Química/entrosamento** (`PlayerChemistry`: aresta até ±8 setorial, cresce ~2/temporada juntos).
- **R-08 — Empresário** (`Agent`: gatilho quando `aggressiveness + commissionDrive − boardRelationship > 120`; `influenceOverPlayer` 0–100).
- **R-09 — Pesos de `overall` por posição** (média ponderada do grid canônico por posição).

### Estrutura do clube e staff (R-10..R-14) · RECOMENDADAS (a ratificar)

Fonte: reconciliação de [`../01-game-design/04-estrutura-do-clube-e-staff.md`](../01-game-design/04-estrutura-do-clube-e-staff.md). Modelo unificado numa só decisão (R-10).

- **R-10 — Modelo canônico único de estrutura:** escala única **1–5**; **6 núcleos** = camada oficial de modelagem, áreas = subdivisões; infra física (estádio/CT/academia) **fora da escala de nível** (granular + projetos de 9 etapas); funcionários modelados individualmente, "multiplicador" = eficiência emergente. Novo núcleo *Mental e disciplinar*.
- **R-11 — Fórmula única de nível geral:** externa **60/20/10/10** (estrutura interna / desempenho / finanças / reputação-torcida); pesos internos entre núcleos **22/18/12/18/18/12**.
- **R-12 — Curva de aproveitamento por nível de núcleo:** 1→40%, 2→55%, 3→70%, 4→85%, 5→95%.
- **R-13 — Capacidade operacional do CT por nível 1–5** (campos/sessões/categorias; conflito de agenda por prioridade do usuário, sem bloquear).
- **R-14 — Teto de contratação por nível geral:** 1→E/D, 2→D/C, 3→C/B, 4→B/A, 5→A/S.

### Motor de partida — fórmulas F1–F21 (R-15..R-24) · RECOMENDADAS (a ratificar)

Fonte: [`../02-tecnico/05-catalogo-de-regras-e-formulas.md`](../02-tecnico/05-catalogo-de-regras-e-formulas.md) §2.4. Coeficientes de **1ª passada**; calibração final via lote de ~10.000 partidas.

- **R-15** escala/clamp do atributo efetivo (F1) · **R-16** fadiga→penalidade `pMax·(f/100)^2.5` + riskMult (F2) · **R-17** pesos de moral + momentum `ρ=0.9` (F3,F14) · **R-18** tático→`TeamTacticalState` + deltas de ação (F4,F20) · **R-19** normalizações somatório→prob/taxa: duelo, softmax, Poisson, tiers (F5–F9) · **R-20** qualidade de finalização + **chance de gol F11** `p=pMin+(pMax−pMin)·σ(k·(raw−50))`, `k=0.042, pMin=0.005, pMax=0.98` (reproduz o exemplo 33→≈33%) · **R-21** faltas/cartões + matriz de lesão (F12,F13) · **R-22** nota/decisionScore/offline/leitura da comissão (F16–F19) · **R-23** pesos do `staffLevel` (F21) · **R-24** versionamento `GameFormula.version`↔`rulesetVersion`.

### Contratos de command (R-25..R-29) · RECOMENDADAS (a ratificar)

Fonte: [`../02-tecnico/10-catalogo-de-commands.md`](../02-tecnico/10-catalogo-de-commands.md). Limites de antiabuso/balanceamento.

- **R-25** TTL da reserva de vaga (`ReserveClubSlot`, ~30 min + 1 renovação).
- **R-26** faixa plausível de oferta ([40%,250%] do valor de mercado) + cooldown de `LeaveClub`.
- **R-27** limites de preço de ingresso ([25%,400%] do preço de referência).
- **R-28** janela de renovação antecipada + teto de missões de scouting simultâneas.
- **R-29** janela ao vivo: máx. substituições (5), duração da janela de `DECISION_POINT`, rate-limit de `IssueMatchCommand`.

### Schema de dados (R-30..R-31) · RECOMENDADAS (a ratificar)

Fonte: [`../02-tecnico/02-modelo-de-dados.md`](../02-tecnico/02-modelo-de-dados.md).

- **R-30 — Versão de ruleset:** `GameWorldRuleSetVersion.publishedFormulaVersion Int` espelhando `GameFormula.version` (rastreabilidade fórmula↔ruleset sem join).
- **R-31 — Quiet hours:** model `NotificationQuietHoursWindow` (janelas 0–N por perfil, relógio real do dispositivo, `CRITICAL` fura o silêncio).

### Motor de partida — design (R-32..R-34) · RECOMENDADAS (a ratificar)

Fonte: [`../01-game-design/05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md).

- **R-32 — Ações de "cera":** sem comando dedicado; gestão de tempo emerge da postura de fim de jogo + timing de substituições (um botão dedicado viraria tática dominante).
- **R-33 — Curva de adaptação a mudanças táticas:** 0–2 min desorganização / 3–6 encaixe / 7+ efeito completo; encurta com inteligência tática, entrosamento e comunicação da comissão.
- **R-34 — Suíte de calibração:** ~10.000 partidas/cenário com critérios de aceite (distribuição de placar realista, consistência entre ligas, ausência de bola de neve). Fonte de calibração de F1–F21.

### Economia — coeficientes e alvos (R-41..R-49) · RECOMENDADAS (a ratificar)

Fonte: [`../01-game-design/03-economia.md`](../01-game-design/03-economia.md). Calibração final via lote de simulações econômicas.

- **R-41** fórmulas conceituais §5 (valor de mercado `C·(overall/100)^3.5·fatorIdade`, público, receita, patrocínio) · **R-42** `financialHealth` (pesos 0.22/0.20/0.18/0.12/0.10/0.08/0.05/0.05, histerese ±3) · **R-43** **caixa inicial `500000000` (R$ 5.000.000, amountMinor)** + elenco 1.500 pts / 23 jog / média ≈65 + identidade 100 pts · **R-44** pirâmide de geração 25/25/30/15/5, posição, qualidade 60/25/10/4/1 · **R-45** estágios de crise ↔ faixas de `financialHealth` · **R-46** índices de inflação por categoria (bandas) · **R-47** custo de scouting × precisão · **R-48** limiares do exame médico · **R-49** "fórmula do universo" = vetor de indicadores com alvo+banda.

### Onboarding, mundo e anti-abuso (R-50..R-57) · RECOMENDADAS (a ratificar)

Fonte: [`../01-game-design/09-anti-abuso-e-onboarding.md`](../01-game-design/09-anti-abuso-e-onboarding.md), [`../01-game-design/01-mundo-persistente-e-clubes.md`](../01-game-design/01-mundo-persistente-e-clubes.md).

- **R-50** critérios de "clube disponível" p/ assumir (IA ≥1 temporada, não preparado por conta relacionada, estado consistente) · **R-51** caixa inicial **fixo e idêntico** — *valor unificado em **R-43** (R$ 5.000.000); a antiga referência de R$ 1.000.000 fica superada* · **R-52** entrada em temporada em andamento nunca reescreve a tabela · **R-53** anti-captura de clubes fortes (cooldown ~1 temporada, reserva TTL, auditoria) · **R-54** Programa de Clube Novo (3 temporadas, decaimento linear) · **R-55 — Decisão 3 = C** (liga nova / em andamento / temática) + regras mínimas das temáticas · **R-56** arquivamento de mundo (≥2 temporadas ociosas, aviso 30 dias, read-only reversível) · **R-57** elenco inicial 23 jogadores / 25–32 anos / 1.500 pts.

### Temporada, competições e seleções (R-58..R-67) · RECOMENDADAS (a ratificar)

Fonte: [`../01-game-design/06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md), [`../01-game-design/12-selecoes-e-calendario-internacional.md`](../01-game-design/12-selecoes-e-calendario-internacional.md).

- **R-58** duração das fases da temporada · **R-59** `reputationWeight`/`financialWeight` por campeonato · **R-60** fórmula pós-temporada `Δ=[−4,+4]` · **R-61** prêmios objetivos vs `AwardScore` · **R-62** tetos por divisão · **R-63** limites de inscrição (squad 26, estrangeiros 5, cota 2 formados) · **R-64** curva de fadiga de convocação · **R-65** limiar de reputação p/ cargos de seleção (≥85) · **R-66** compensação por lesão em convocação · **R-67** dispensa por recomendação médica como estado.

### Torcida, imprensa e relatórios (R-68..R-76) · RECOMENDADAS (a ratificar)

Fonte: [`../01-game-design/11-torcida-imprensa-e-narrativa.md`](../01-game-design/11-torcida-imprensa-e-narrativa.md), [`../01-game-design/13-relatorios-notificacoes-e-memoria.md`](../01-game-design/13-relatorios-notificacoes-e-memoria.md).

- **R-68** composição de segmentos de torcida (share × vocalidade) · **R-69** satisfação: faixas + velocidade assimétrica · **R-70** rivalidade: escala 0–100 + decay exponencial · **R-71** 8 posturas de comunicação (deltas + decaimento por repetição) · **R-72** rótulos de reputação (12 clube + 10 gestor, histerese) · **R-73** crescimento/esfriamento da torcida (±20%/temporada) · **R-74** rebranding (cooldown + custo + penalidade tradicionalista) · **R-75 — relatórios NÃO-PAGOS** (qualidade da comissão é o único diferenciador; fecha o conflito com monetização) · **R-76** detalhe/frequência/retenção de relatórios por comissão 1–5.

### Plataforma, arquitetura e operação (R-77..R-88) · RECOMENDADAS (a ratificar)

Fonte: [`../02-tecnico/`](../02-tecnico/). Resolve **P0.2** (paradigma do core) e **P0.4** (stack).

- **R-77 — Framework de API = NestJS + TypeScript** (Fastify como adapter HTTP; AdonisJS descartado).
- **R-78 — Broker = Redis + BullMQ na fundação** → RabbitMQ/NATS na evolução; Outbox/Inbox independente do broker.
- **R-79 — Busca = PostgreSQL FTS + trigram** no início → Meilisearch/OpenSearch na evolução.
- **R-80 — Paradigma do core = ECS (Entity–Component–Effect–Event) como runtime + Prisma/Postgres como persistência** (event sourcing híbrido; core headless não depende de Prisma).
- **R-81** gramática de `TargetSelector`/`Condition`/`Multiplier` + ordem determinística de efeitos (`set→add/subtract→multiply`, desempate por `effectId`).
- **R-82** escalas internas base 10000 (percentuais em pontos-base; mudança só com versionamento).
- **R-83** interação divisões×ligas (liga por nível estrutural = moldura; Séries por resultado dentro dela; histerese na troca).
- **R-84** dimensionamento de mundo (nova Série a ~60% de vagas humanas + fila ≥20; conversão bot→humano; penalidade leve por não escalar, nunca no placar).
- **R-85** identidade externa OIDC (Google/Apple; conta é fonte de verdade) + parâmetros de drenagem (drain 30s, partida 10min, tarefa 60s).
- **R-86** painel de saúde do mundo (11 cards, drill-down) + governança de verificações (ajuste só sobre geração/regras futuras, via versão de ruleset).
- **R-87** comunicação pós-correção (in-app antes→depois quando afeta estado percebido) + 6 níveis de papéis cumulativos com segregação de funções.
- **R-88** metodologia dos testes de equilíbrio (≥1.000 mundos × ≥10 temporadas, seeds fixas, bandas de aceitação + gate de promoção).

> **Reconciliação de caixa inicial:** R-43 é a fonte única do valor (**R$ 5.000.000 = `500000000` amountMinor**). R-51 e as referências textuais a "R$ 1.000.000" em `01-mundo` e `09-anti-abuso` ficam superadas — alinhamento textual pendente (ver BACKLOG P1).

### Pendências finais diversas (R-89..R-96) · RECOMENDADAS (a ratificar)

Fonte: resolução das pendências pequenas restantes (estádio, experiência, monetização, fluxos, frontend, UI).

- **R-89** setores-padrão do estádio + preço por setor (multiplicadores 1ª passada) · **R-90** valores numéricos de estádio/região (capacidade por divisão, deterioração, manutenção, mando, elasticidade preço×ocupação) · **R-91** granularidade de exibição dos indicadores (rótulo+barra por padrão; número exato só quando a comissão revela) · **R-92** catálogo de cosméticos de lançamento (puramente estético) · **R-93** conteúdo do passe de temporada cosmético · **R-94** apêndice de fluxos de exceção (follow-up de conteúdo) · **R-95** credencial efêmera de sessão (JWT ~15 min + refresh rotativo `/auth/refresh` + revogação por lista de sessões) · **R-96** árvore de diálogo do `M-CONVO` (deltas de moral/relação modulados por perfil mental 0–100 e `CoachTrust`).

- **R-97** site do guia do jogador (subdomínio `docs.`, rotas `/guia/<parte>/<capitulo>`, PDF versionado).

### Design system e conteúdo (R-98..R-100) · RECOMENDADAS (a ratificar)

Fonte: [`../04-ui-ux/00-visao-geral-e-design-system.md`](../04-ui-ux/00-visao-geral-e-design-system.md), [`../04-ui-ux/14-wireframes-telas-densas.md`](../04-ui-ux/14-wireframes-telas-densas.md), [`../03-guia-do-jogador/`](../03-guia-do-jogador/).

- **R-98** valores concretos dos design tokens (cor hex light/dark com contraste AA, tipografia Inter, espaço 4-pt, raio, elevação, toque ≥44pt) — a ajustar à identidade de marca final.
- **R-99** specs de API dos 10 componentes-chave (Button, Card, Header, TabBar, Input, Badge, Sheet, ListRow, StatTile, Toast) + wireframes das 6 telas densas (M-HOME, M-LIVE, M-SEASON-CLOSE, M-STRUCTURE, M-SQUAD, M-NEGOTIATION).
- **R-100** construir o site do guia (template Astro navegável, §5 do guia) e encaixar os 42 capítulos já redigidos — tarefa de engenharia/build.

> **Estado da Série R:** R-01 RATIFICADA; R-02..R-100 RECOMENDADAS (a ratificar). São a fila de decisões/valores que aguardam o martelo do dono do produto — nenhuma foi carimbada como canônica em silêncio. São a fila de decisões/valores que aguardam o martelo do dono do produto. Nenhuma foi carimbada como canônica em silêncio. Entradas R-97+ seriam acrescentadas se novas `[DECISÃO]`/`[TUNING]` surgirem.
