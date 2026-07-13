# Guia Oficial do Jogador — Grinta

> **Status:** CANÔNICO · **Fontes:** chats/guia-jogador-initial.md · **Revisão:** 2026-07-10

O **Guia Oficial do Jogador** é a documentação voltada a quem joga **Grinta** — um manager de futebol online com jogadores únicos e mundo persistente, na tradição de simuladores como o Brasfoot, porém em um mundo que nunca reinicia. Este README define o propósito, a estrutura completa dos 42 capítulos, os padrões de conteúdo, a especificação técnica do site de documentação e o mapeamento com os documentos de game design.

O conteúdo dos 42 capítulos **foi redigido** (2026-07-11), puxando das decisões já fechadas nos documentos de game design em [`../01-game-design/`](../01-game-design/). Este documento é o índice/esqueleto oficial; o texto de cada Parte vive em seu próprio arquivo (ver [§7](#7-capítulos-redigidos)).

---

## Sumário

- [1. Propósito do guia](#1-propósito-do-guia)
- [2. Regras já fixadas (fundamentos)](#2-regras-já-fixadas-fundamentos)
- [3. Estrutura completa — 42 capítulos em 10 Partes](#3-estrutura-completa--42-capítulos-em-10-partes)
- [4. Blocos padronizados e camadas de conteúdo](#4-blocos-padronizados-e-camadas-de-conteúdo)
- [5. Especificação técnica do site de documentação](#5-especificação-técnica-do-site-de-documentação)
- [6. Mapeamento Partes do guia → docs de game design](#6-mapeamento-partes-do-guia--docs-de-game-design)
- [7. Capítulos redigidos](#7-capítulos-redigidos)

---

## 1. Propósito do guia

O guia é a **documentação oficial voltada ao jogador**. Ele explica **o que o jogador pode fazer** e **a relação de causa e efeito** de cada decisão, sem expor os detalhes internos do motor.

O guia **deve** explicar:

- o que o jogador pode fazer;
- como cada sistema funciona;
- quais consequências cada decisão pode gerar;
- como o clube evolui;
- como partidas, temporadas e competições funcionam;
- quais regras são fixas;
- quais elementos dependem da qualidade do clube, dos funcionários, dos jogadores ou do contexto do mundo.

O guia **não deve** expor fórmulas internas, probabilidades exatas, enums, estruturas de banco ou qualquer detalhe que permita explorar o motor. Esses conteúdos permanecem nos documentos técnicos ([`../02-tecnico/`](../02-tecnico/)) e de game design ([`../01-game-design/`](../01-game-design/)).

> **REGRA:** O jogador precisa conhecer a regra e sua relação de causa e efeito — nunca os números exatos por trás dela. Quando o cálculo deve permanecer oculto, use o bloco `COMO O JOGO AVALIA`.

---

## 2. Regras já fixadas (fundamentos)

Estas regras estão fechadas e devem aparecer explicitamente no guia, sem reinterpretação:

- **Mundo persistente que não reinicia.** O jogo continua evoluindo mesmo com o usuário offline. Novos clubes são acomodados em um mundo que pode já estar em temporadas avançadas, preservando as conquistas dos clubes antigos e oferecendo caminhos reais de crescimento aos novos participantes.
- **O usuário não pode ser demitido do próprio clube.**
- **Todos os clubes nascem pequenos e equilibrados.** As diferenças iniciais criam identidade, não vantagem definitiva.
- **As partidas continuam quando o usuário está offline.** A IA do clube assume as decisões essenciais, respeitando as configurações, preferências e o planejamento deixados pelo usuário.
- **A qualidade do staff afeta a qualidade da INFORMAÇÃO mostrada ao usuário.** Uma comissão técnica superior detecta problemas antes, apresenta recomendações melhores, identifica riscos com mais precisão e interpreta melhor adversário e elenco. Staff inferior entrega informação mais incompleta ou imprecisa.
- **Economia dinâmica.** Preços, salários, quantidade de jogadores e circulação de dinheiro se ajustam conforme o número de clubes, usuários, dinheiro existente, jogadores ativos, aposentadorias e demanda. Isso evita mercado vazio ou inflação destrutiva.
- **Ciclo principal do jogo:**

  `Analisar → Planejar → Preparar → Competir → Reagir → Avaliar → Investir → Evoluir`

  O usuário acompanha o clube continuamente, em vez de apenas montar a escalação e aguardar o resultado.

---

## 3. Estrutura completa — 42 capítulos em 10 Partes

### Parte I — Começando a jogar

1. **Visão geral do jogo** — simulador de gestão em mundo persistente; clube com história própria; jogadores únicos; disputa contra clubes de outros usuários e da IA; o mundo continua offline; o usuário não pode ser demitido.
2. **Objetivo do jogador** — montar e desenvolver elenco, criar identidade esportiva, melhorar estrutura, contratar/desenvolver funcionários, administrar contratos e finanças, formar jogadores, disputar competições, lidar com torcida/imprensa/atletas/diretoria; levar um clube pequeno a potência.
3. **Criação do clube** — o que o usuário escolhe, o que o sistema gera, estrutura inicial, elenco inicial, caixa inicial, condições de nascimento. *Regra: todos os clubes nascem pequenos e equilibrados.*
4. **Primeiros passos** — conhecer o elenco, analisar posições e características, conhecer a comissão técnica, verificar contratos, escolher formação inicial, definir prioridades de treinamento, observar finanças, preparar a primeira competição.

### Parte II — O mundo do jogo

5. **Mundo persistente** — passagem do tempo, calendário, rodadas, temporadas, envelhecimento, aposentadorias, movimentações da IA, entrada de novos usuários, transformação econômica, crescimento e declínio de clubes. *Regra central: o mundo não é reiniciado.*
6. **Tempo e calendário** — duração da temporada e das rodadas, horários das partidas, períodos de inscrição, janelas de transferência, pré-temporada, intervalos, fim de temporada, renovação anual dos sistemas.
7. **Clubes controlados pela IA** — contratam, vendem, treinam, disputam, modificam elencos, evoluem estrutura, enfrentam dificuldades financeiras e tomam decisões esportivas, respeitando os recursos de cada clube.

### Parte III — Gestão do clube

8. **Nível e evolução do clube** — estrutura, qualidade dos departamentos, elenco, capacidade financeira, resultados, desenvolvimento institucional, reputação. O tempo ajuda, mas não garante sucesso.
9. **Estrutura do clube** — departamento médico, preparação física, treinamento, análise de desempenho, olheiros, categorias de base, comunicação, jurídico, diretoria, gestão financeira, instalações. O nível de cada área modifica o funcionamento do clube.
10. **Funcionários e comissão técnica** — cargos, especialidades, níveis de qualidade, experiência, salário, contrato, impacto por departamento, compatibilidade, evolução, desligamento. *A qualidade do staff também altera a qualidade da informação entregue ao usuário.*
11. **Finanças** — receitas, despesas, salários, contratações, vendas, manutenção, premiações, investimentos, riscos de comprometer o caixa. *Economia dinâmica.*

### Parte IV — Jogadores de futebol

12. **Identidade de cada jogador** — idade, nacionalidade, posição, características físicas/técnicas/mentais, personalidade, história de vida, experiências, clubes anteriores, treinamentos, lesões, desempenho, ambiente. Atributos parecidos podem reagir de formas diferentes.
13. **Geração de jogadores** — surgem conforme as necessidades do mundo; a existência precisa ser coerente com o mundo, não com uma busca do usuário.
14. **História de vida** — cria tendências iniciais que interagem com personalidade, treinamento e carreira; não é fórmula rígida.
15. **Desenvolvimento do atleta** — idade, potencial, minutos, treinadores, estrutura, intensidade, posição, função, companheiros, lesões, estado físico/emocional, sequência de jogos. Há limites individuais.
16. **Estado físico e lesões** — condição, cansaço, desgaste, risco, gravidade, recuperação, retorno gradual, reincidência, impacto do médico e da preparação física.
17. **Moral, satisfação e comportamento** — reações a tempo de jogo, posição, resultados, promessas, contratos, ambiente, relacionamento, propostas, críticas, pressão e disciplina; modulados por personalidade e comunicação.

### Parte V — Elenco e mercado

18. **Formação do elenco** — titulares, reservas, jovens, lesionados, suspensos, fora dos planos, equilíbrio de posições, liderança, idade média, custo salarial, profundidade. Os melhores individualmente não garantem a melhor equipe.
19. **Contratos** — duração, salário, bônus, renovação, encerramento, interesse do jogador, poder de negociação, influência do clube, papel da diretoria, contratos próximos do fim.
20. **Mercado de transferências** — procurar, receber indicações, observar, propor, negociar, vender, emprestar, liberar, disputar contratações. A avaliação depende dos olheiros; informação incompleta faz parte da decisão.
21. **Jogadores livres** — como um jogador fica sem clube, término de contratos, liberação, aposentadoria, negociação, interesse, concorrência, impacto do tempo sem atuar.

### Parte VI — Tática e partidas

22. **Preparação da partida** — analisar adversário, formação provável, estilo, jogadores importantes, condição física, desfalques, momento, recomendações. A precisão depende do staff.
23. **Formação e funções** — esquemas, posição nominal, função, comportamento com/sem bola, compatibilidade, adaptação, improvisação, equilíbrio de setores. A formação é só o ponto de partida.
24. **Motor de partida** — simulação contínua da interação entre jogadores, estratégia, formação, funções, condição física/emocional, entrosamento, qualidade coletiva, decisões e eventos. O resultado não é só a soma das forças.
25. **Acompanhamento ao vivo** — online, o usuário faz substituições, muda esquema/funções, ajusta pressão/intensidade/marcação, recua ou avança, reage a lesões/expulsões, protege ou busca resultado. Mudanças precisam de tempo para assimilação.
26. **Pontos de decisão** — momentos relevantes que surgem conforme a partida; qualidade das opções e recomendações depende da comissão técnica.
27. **Partida com o usuário offline** — a IA assume decisões essenciais (lesão, jogador sem condição, expulsão, formação inválida, desgaste), respeitando configurações e planejamento do usuário.
28. **Eventos da partida** — gols, finalizações, faltas, cartões, expulsões, lesões, pênaltis, impedimentos, substituições, acréscimos, mudanças de domínio, torcida, pressão. Explicar fatores de risco sem revelar probabilidades.

### Parte VII — Competições e temporadas

29. **Competições** — tipos de campeonato, divisões, grupos, pontos corridos, mata-mata, classificação, desempate, acesso, rebaixamento, premiações, inscrição, calendário.
30. **Temporada** — ciclo completo do mundo: competições, transferências, evolução, mudanças financeiras, acontecimentos internos, reputação, desenvolvimento estrutural, envelhecimento, aposentadorias.
31. **Fim da temporada** — encerramento de competições, premiações, acessos/rebaixamentos, reputação, renovações, aposentadorias, geração de novos jogadores, calendário seguinte, transição.

### Parte VIII — Relações e ambiente do clube

32. **Torcida** — reage a resultados, expectativas, identidade, desempenho, contratações, vendas, gestão, história e rivalidades. A expectativa cresce com o clube.
33. **Comunicação e imprensa** — administrar crises, críticas, expectativas, narrativas, insatisfação, declarações, repercussão, imagem de jogadores/treinador/gestão. Boa comunicação reduz danos, não elimina problemas.
34. **Eventos externos** — convocações, problemas pessoais, eventos familiares, conflitos, reconhecimento, propostas externas, disciplina, mudanças de comportamento, acontecimentos nacionais/internacionais. Coerentes com cada personagem.

### Parte IX — Plano de jogo

35. **Ciclo principal** — `Analisar → Planejar → Preparar → Competir → Reagir → Avaliar → Investir → Evoluir`.
36. **Curto prazo** — próxima partida, escalação, treinamento, recuperação, moral, suspensões, decisões urgentes, caixa.
37. **Médio prazo** — sequência de jogos, objetivos da temporada, contratos, transferências, desenvolvimento do elenco, evolução dos departamentos, equilíbrio financeiro.
38. **Longo prazo** — identidade, estilo, reputação, infraestrutura, base, capacidade econômica, histórico, legado, competitividade entre gerações.
39. **Caminhos estratégicos** — formação, compra e venda, estabilidade, estrutura, desempenho imediato, futebol ofensivo, defesa/eficiência, experientes, jovens, construção gradual, expansão agressiva. Cada caminho tem vantagens, custos e riscos.

### Parte X — Referência

40. **Regras gerais** — limite de jogadores, inscrições, suspensões, contratos, transferências, horários, inatividade, abandono, comportamento antidesportivo, múltiplas contas, interações entre usuários.
41. **Glossário** — atributo, potencial, função, entrosamento, moral, reputação, condição física, nível do clube, ponto de decisão, mundo persistente, temporada, comissão técnica, estrutura, jogador livre.
42. **Perguntas frequentes** — Posso ser demitido? O que acontece se eu não entrar? Minha partida continua offline? Posso mudar a tática durante o jogo? Por que um jogador não quer assinar? Como um atleta evolui? Como surgem novos jogadores? O mundo reinicia? Um clube novo alcança clubes antigos? Como a qualidade dos funcionários afeta minhas decisões? Por que dois jogadores parecidos se comportam diferente?

---

## 4. Blocos padronizados e camadas de conteúdo

### 4.1 Blocos padronizados

Cada capítulo usa quatro blocos visuais consistentes:

| Bloco | Uso |
|---|---|
| **`REGRA`** | Comportamento obrigatório do sistema. Ex.: "A partida continuará mesmo quando o usuário estiver offline." |
| **`ATENÇÃO`** | Riscos. Ex.: "Escalar repetidamente um atleta desgastado aumenta o risco de lesão." |
| **`EXEMPLO`** | Situação demonstrativa. Ex.: "Um clube com comunicação de nível elevado pode reduzir os efeitos de uma crise, mas não apaga a insatisfação." |
| **`COMO O JOGO AVALIA`** | Informação oculta. Sinaliza que o cálculo considera fatores internos cujos valores exatos não são exibidos, para preservar a incerteza e a tomada de decisão. |

### 4.2 Camadas de conteúdo

Cada capítulo pode oferecer três níveis de leitura:

- **Resumo** — poucos parágrafos, para quem quer só entender o sistema.
- **Regras completas** — todas as condições, efeitos e exceções.
- **Estratégia** — orientação prática, sem revelar cálculos internos.

> **EXEMPLO (condição física):**
> **Resumo** — O cansaço reduz o rendimento e pode aumentar o risco de lesão.
> **Regras completas** — A condição varia conforme minutos, intensidade, idade, recuperação, estrutura e histórico físico.
> **Estratégia** — Não avalie apenas o valor geral: um reserva descansado pode render mais que um titular muito desgastado.

### 4.3 Organização do material em quatro níveis

Além das camadas por capítulo, o material como um todo se organiza em quatro níveis de consulta, para não transformar o manual em um texto impossível de navegar:

- **Primeiros passos** — tutorial inicial e regras essenciais.
- **Manual completo** — todas as mecânicas explicadas.
- **Referência rápida** — tabelas, limites, calendários e critérios.
- **Dicas estratégicas** — orientações de gestão sem revelar fórmulas internas.

---

## 5. Especificação técnica do site de documentação

O guia é distribuído como **site estático** gerado a partir de uma única fonte de conteúdo, servindo simultaneamente como site público, guia integrado ao jogo, pacote offline, PWA e PDF.

### 5.1 Stack

`Astro + Markdown/MDX + Pagefind (busca) + PWA + CSS de impressão/PDF + build estático`

- **Astro** gera páginas HTML estáticas (preferível a Next.js: não precisa de servidor Node).
- **Markdown/MDX** para o conteúdo.
- **Pagefind** gera o índice de busca no build, sem servidor (alternativas consideradas: MiniSearch, Fuse.js).
- **PWA** instalável para consulta offline.
- **CSS de impressão** oculta navegação/busca e ajusta o artigo para gerar PDF.

### 5.2 Layout de 3 colunas

```
┌──────────────────────────────────────────────────────────┐
│ Grinta — Guia Oficial                     Busca   Versão  │
├───────────────────┬───────────────────────────┬──────────┤
│ Menu de capítulos │ Conteúdo da regra         │ Nesta    │
│                   │  Título / Explicação      │ página   │
│ • Começando       │  Exemplos / Alertas       │ • Item 1 │
│ • Clube           │  Regras relacionadas      │ • Item 2 │
│ • Jogadores …     │                           │ • Item 3 │
└───────────────────┴───────────────────────────┴──────────┘
```

**Versão mobile:** menu lateral vira menu recolhível; índice da página aparece abaixo do título; conteúdo ocupa toda a largura; botões de capítulo anterior/próximo ficam no rodapé.

### 5.3 Página inicial

Não abre com parede de texto. Apresenta: botão **Começar pelo básico**, botão **Explorar todas as regras**, campo de busca, principais áreas (Clube, Jogadores, Partidas, Competições), novidades da versão, atalhos para dúvidas frequentes e progresso de leitura opcional.

### 5.4 Versionamento por página

O guia exibe a versão do jogo e a data de atualização. Cada página registra `introducedIn`, `updatedIn` e `status`, permitindo histórico ("Alterado na versão X.Y.Z: ...").

### 5.5 Modelo de dados dos capítulos

```ts
type GuidePage = {
  title: string;
  description: string;
  category: GuideCategory;
  order: number;
  keywords: string[];
  relatedPages?: string[];
  introducedIn?: string;
  updatedIn?: string;
  status: "active" | "deprecated" | "draft";
};

type GuideCategory =
  | "getting-started"
  | "world"
  | "club"
  | "players"
  | "transfers"
  | "matches"
  | "competitions"
  | "relationships"
  | "strategy"
  | "reference";
```

### 5.6 Anatomia de uma página de regra

Cada página de regra segue um corpo padronizado, gerado a partir de um arquivo Markdown/MDX com frontmatter (ver [§5.5](#55-modelo-de-dados-dos-capítulos)). A estrutura recomendada do texto é:

- **Título** e definição curta do conceito.
- **O que afeta / condições** — lista dos fatores que influenciam a regra.
- **Consequências** — efeitos e desdobramentos.
- **Como administrar** — orientação prática (sem revelar cálculos).
- **Regras relacionadas** — links para páginas conexas (`relatedPages`).

Os blocos padronizados ([§4.1](#41-blocos-padronizados)) são inseridos no meio do texto conforme a necessidade.

### 5.7 Busca

A busca é essencial porque o manual é grande. O jogador deve conseguir pesquisar por termos e frases naturais, como: "jogador cansado", "contrato acabando", "como vender jogador", "usuário offline", "critério de desempate", "risco de lesão". O índice é gerado no build pelo Pagefind ([§5.1](#51-stack)), sem servidor.

### 5.8 Estrutura do projeto

Uma única base de projeto Astro alimenta todos os formatos de saída:

```
grinta-guide/
├── public/            (images, icons, favicon, manifest.webmanifest)
├── src/
│   ├── components/    Header · Sidebar · Search · RuleBox ·
│   │                  WarningBox · ExampleBox · PageNavigation
│   ├── content/guide/ getting-started · club · players · transfers ·
│   │                  matches · competitions · rules …
│   ├── layouts/       GuideLayout.astro
│   ├── pages/         index.astro
│   └── styles/        global.css · print.css
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

O build estático gera um diretório `dist/` com uma pasta por capítulo (cada uma com seu `index.html`), além de `assets/` e `manifest.webmanifest`, pronto para abrir localmente, hospedar ou compactar em `.zip`.

### 5.9 Identidade visual

O guia não deve parecer documentação técnica. A aparência pode remeter a **prancheta de treinador**, **relatório de comissão técnica**, **central administrativa do clube** ou **caderno de regulamento esportivo**. Elementos possíveis: fundo neutro; cartões que lembram fichas de jogadores; pequenos diagramas de campo; ícones de tática, finanças, treino e competição; indicadores de dificuldade; e navegação baseada nos departamentos do clube. Evitar exagero em animações — o objetivo principal é leitura e consulta rápida.

### 5.10 Distribuição

Uma única base gera seis formatos de distribuição: site público (ex.: `guia.grinta...`), guia contextual dentro do jogo (links diretos para regras específicas, em modal/painel/aba/WebView), pacote offline em `.zip`, PWA instalável, PDF via CSS de impressão e **arquivo dentro da instalação do jogo**.

Neste sexto formato, o build do guia **acompanha o executável do jogo** e viaja junto na instalação:

```
game/
├── executable
├── assets/
└── guide/
    └── index.html
```

Isso garante que o jogador tenha o guia **disponível offline, sem depender de internet nem de instalar o PWA**, abrindo direto o `guide/index.html` embarcado. Ele é distinto do pacote `.zip` (que precisa ser baixado e descompactado à parte) e do guia contextual (que exibe regras específicas dentro da interface do jogo): aqui, o manual completo já vem embutido na própria instalação.

> **Decisão ratificada — R-97:** site do guia em subdomínio `docs.<domínio-oficial>` (domínio a definir na verificação de marca — ver [identidade](../00-produto/02-identidade-e-nome.md)); rotas contextuais espelhando a hierarquia de capítulos (`/guia/<parte>/<capitulo>`), com deep-link a partir do app; PDF gerado por versão de conteúdo, nomeado `grinta-guia-v<major.minor>.pdf`, regenerado a cada release do guia.

---

## 6. Mapeamento Partes do guia → docs de game design

A redação de cada Parte deve puxar dos documentos de game design correspondentes em [`../01-game-design/`](../01-game-design/):

| Parte do guia | Capítulos | Documentos de game design |
|---|---|---|
| **I — Começando a jogar** | 1–4 | [`00-gdd-overview.md`](../01-game-design/00-gdd-overview.md); [`01-mundo-persistente-e-clubes.md`](../01-game-design/01-mundo-persistente-e-clubes.md); [`09-anti-abuso-e-onboarding.md`](../01-game-design/09-anti-abuso-e-onboarding.md); [`10-experiencia-e-telas.md`](../01-game-design/10-experiencia-e-telas.md) |
| **II — O mundo do jogo** | 5–7 | [`01-mundo-persistente-e-clubes.md`](../01-game-design/01-mundo-persistente-e-clubes.md); [`06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md); [`07-inteligencia-artificial.md`](../01-game-design/07-inteligencia-artificial.md); [`12-selecoes-e-calendario-internacional.md`](../01-game-design/12-selecoes-e-calendario-internacional.md) |
| **III — Gestão do clube** | 8–11 | [`04-estrutura-do-clube-e-staff.md`](../01-game-design/04-estrutura-do-clube-e-staff.md); [`03-economia.md`](../01-game-design/03-economia.md) (fonte canônica do Cap. 11 — Finanças); [`01-mundo-persistente-e-clubes.md`](../01-game-design/01-mundo-persistente-e-clubes.md) |
| **IV — Jogadores de futebol** | 12–17 | [`02-sistema-de-jogadores.md`](../01-game-design/02-sistema-de-jogadores.md); [`04-estrutura-do-clube-e-staff.md`](../01-game-design/04-estrutura-do-clube-e-staff.md) |
| **V — Elenco e mercado** | 18–21 | [`02-sistema-de-jogadores.md`](../01-game-design/02-sistema-de-jogadores.md); [`03-economia.md`](../01-game-design/03-economia.md) (mercado, oferta/demanda e temperatura); [`04-estrutura-do-clube-e-staff.md`](../01-game-design/04-estrutura-do-clube-e-staff.md) |
| **VI — Tática e partidas** | 22–28 | [`05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md) (fonte canônica do Cap. 24 — Motor de partida); [`07-inteligencia-artificial.md`](../01-game-design/07-inteligencia-artificial.md); [`02-sistema-de-jogadores.md`](../01-game-design/02-sistema-de-jogadores.md); [`08-estadio-regiao-e-clima.md`](../01-game-design/08-estadio-regiao-e-clima.md) |
| **VII — Competições e temporadas** | 29–31 | [`06-temporada-e-competicoes.md`](../01-game-design/06-temporada-e-competicoes.md); [`12-selecoes-e-calendario-internacional.md`](../01-game-design/12-selecoes-e-calendario-internacional.md) |
| **VIII — Relações e ambiente** | 32–34 | [`11-torcida-imprensa-e-narrativa.md`](../01-game-design/11-torcida-imprensa-e-narrativa.md) (fonte canônica dos Caps. 32–33); [`04-estrutura-do-clube-e-staff.md`](../01-game-design/04-estrutura-do-clube-e-staff.md); [`12-selecoes-e-calendario-internacional.md`](../01-game-design/12-selecoes-e-calendario-internacional.md) (convocações — Cap. 34); [`08-estadio-regiao-e-clima.md`](../01-game-design/08-estadio-regiao-e-clima.md); [`07-inteligencia-artificial.md`](../01-game-design/07-inteligencia-artificial.md) |
| **IX — Plano de jogo** | 35–39 | [`00-gdd-overview.md`](../01-game-design/00-gdd-overview.md); [`10-experiencia-e-telas.md`](../01-game-design/10-experiencia-e-telas.md) (ciclo do gestor e automações); [`15-fluxos-completos.md`](../01-game-design/15-fluxos-completos.md) (e transversal a todos os demais) |
| **X — Referência** | 40–42 | Todos os documentos de game design (consolidação), com destaque para [`09-anti-abuso-e-onboarding.md`](../01-game-design/09-anti-abuso-e-onboarding.md) (Cap. 40 — Regras gerais), [`13-relatorios-notificacoes-e-memoria.md`](../01-game-design/13-relatorios-notificacoes-e-memoria.md) (Cap. 41 — Glossário e referência) e [`14-monetizacao.md`](../01-game-design/14-monetizacao.md) (justiça competitiva) |

> **Nota:** a série `01-game-design/` vai de `00` a `16` sem lacunas. As fontes canônicas de finanças/economia (Cap. 11) e do motor de partida (Cap. 24) são [`03-economia.md`](../01-game-design/03-economia.md) e [`05-motor-de-partida.md`](../01-game-design/05-motor-de-partida.md), já referenciadas na tabela acima.

---

## 7. Capítulos redigidos

O conteúdo dos **42 capítulos foi redigido** (2026-07-11), puxando das decisões fechadas nos documentos de game design (§6) e seguindo os blocos padronizados (§4: `REGRA`/`ATENÇÃO`/`EXEMPLO`/`COMO O JOGO AVALIA`) e as camadas Resumo/Regras completas/Estratégia. Nenhum capítulo expõe fórmulas internas, números exatos ou probabilidades. Cada Parte vive em seu próprio arquivo:

| Parte | Capítulos | Arquivo |
|---|---|---|
| I — Começando a jogar | 1–4 | [parte-01-comecando-a-jogar.md](parte-01-comecando-a-jogar.md) |
| II — O mundo do jogo | 5–7 | [parte-02-o-mundo-do-jogo.md](parte-02-o-mundo-do-jogo.md) |
| III — Gestão do clube | 8–11 | [parte-03-gestao-do-clube.md](parte-03-gestao-do-clube.md) |
| IV — Jogadores de futebol | 12–17 | [parte-04-jogadores.md](parte-04-jogadores.md) |
| V — Elenco e mercado | 18–21 | [parte-05-elenco-e-mercado.md](parte-05-elenco-e-mercado.md) |
| VI — Tática e partidas | 22–28 | [parte-06-tatica-e-partidas.md](parte-06-tatica-e-partidas.md) |
| VII — Competições e temporadas | 29–31 | [parte-07-competicoes-e-temporadas.md](parte-07-competicoes-e-temporadas.md) |
| VIII — Relações e ambiente do clube | 32–34 | [parte-08-relacoes-e-ambiente.md](parte-08-relacoes-e-ambiente.md) |
| IX — Plano de jogo | 35–39 | [parte-09-plano-de-jogo.md](parte-09-plano-de-jogo.md) |
| X — Referência | 40–42 | [parte-10-referencia.md](parte-10-referencia.md) |

> **Decisão ratificada — R-100:** construir o **site do guia** — template Astro navegável (menu, busca, página inicial, página de regra, versão mobile e impressão/PDF, §5) e encaixar estes capítulos como conteúdo. É tarefa de engenharia (build) a partir da spec do §5 e de [R-97](../99-decisoes/registro-de-decisoes.md); o conteúdo dos capítulos já está redigido acima.
