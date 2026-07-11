# Relatórios, Notificações e Memória do Mundo

> **Status:** Rascunho consolidado · **Fontes:** chats/documento-definitivo-escopo.md (Seção 20) · **Revisão:** 2026-07-10

## Resumo

Este documento consolida, pela primeira vez em forma oficial, a camada de **informação** do **Grinta** — o manager de futebol online: como o jogo comunica o que acontece, como pede decisões sem travar o mundo, como explica consequências sem entregar fórmulas, quais relatórios existem e como o mundo guarda memória do que foi vivido.

O princípio que rege tudo é a **interface em camadas**: o usuário recebe primeiro aquilo que exige uma decisão, e só então pode aprofundar-se em relatórios, histórico e estatísticas. O jogo não esconde consequências relevantes nem inunda o gestor com eventos que não geram ação possível. Notificações são priorizadas por urgência em quatro níveis; decisões que não podem ser perdidas ficam reunidas em uma **caixa de decisões** com prazo, impacto, recomendação e uma **ação padrão que nunca paralisa o mundo**.

A informação é sempre acompanhada de **explicabilidade funcional**: o Grinta diz por que algo aconteceu (uma proposta rejeitada, um jovem estagnado, uma torcida revoltada) sem revelar fórmulas, atributos ocultos ou dados privados de adversários. Sobre essa base assenta o **catálogo de relatórios** (partida, elenco, base, financeiro, mercado, profissionais e fim de temporada) e a **memória persistente do mundo**: a história do mundo (record book), a linha do tempo de cada clube e de cada jogador, e os rankings de reputação.

Este documento reproduz fielmente o conteúdo da Seção 20 da fonte, marcando explicitamente as decisões ainda abertas com `> **Pendência:**`.

## Sumário

1. [Interface em camadas](#1-interface-em-camadas)
2. [Notificações priorizadas](#2-notificações-priorizadas)
3. [Caixa de decisões](#3-caixa-de-decisões)
4. [Explicabilidade](#4-explicabilidade)
5. [Catálogo de relatórios](#5-catálogo-de-relatórios)
   - [5.1 Relatórios de partida](#51-relatórios-de-partida)
   - [5.2 Relatórios de elenco](#52-relatórios-de-elenco)
   - [5.3 Relatórios da base](#53-relatórios-da-base)
   - [5.4 Relatórios financeiros](#54-relatórios-financeiros)
   - [5.5 Relatórios de mercado](#55-relatórios-de-mercado)
   - [5.6 Relatórios de profissionais](#56-relatórios-de-profissionais)
   - [5.7 Relatório de fim de temporada](#57-relatório-de-fim-de-temporada)
6. [Memória do mundo](#6-memória-do-mundo)
   - [6.1 História do mundo (record book)](#61-história-do-mundo-record-book)
   - [6.2 Linha do tempo do clube](#62-linha-do-tempo-do-clube)
   - [6.3 Linha do tempo do jogador](#63-linha-do-tempo-do-jogador)
   - [6.4 Rankings e reputações](#64-rankings-e-reputações)
7. [Pendências consolidadas](#7-pendências-consolidadas)
8. [Ligações com outros documentos](#8-ligações-com-outros-documentos)

---

## 1. Interface em camadas

A informação no Grinta é apresentada em **camadas**. O usuário recebe primeiro aquilo que exige decisão e, a partir daí, pode aprofundar-se em relatórios, histórico e estatísticas conforme seu interesse.

Duas regras delimitam essa apresentação:

- O jogo **não deve esconder consequências relevantes**. Se algo importante muda no clube ou no mundo, o gestor precisa poder saber por quê.
- O jogo **não deve inundar o usuário** com eventos sem ação possível. Ruído sem consequência é tratado como memória e narrativa, não como notificação que interrompe.

A camada mais alta é sempre a que pede decisão; abaixo dela ficam os relatórios sintéticos; na base ficam o histórico completo e as estatísticas. O gestor desce as camadas por vontade própria, não por obrigação.

Essa lógica de camadas conecta-se diretamente ao desenho das telas e do ciclo do gestor descrito em [`./10-experiencia-e-telas.md`](./10-experiencia-e-telas.md).

---

## 2. Notificações priorizadas

Notificações são priorizadas por **urgência e ação** em quatro níveis:

| Nível | Definição | Papel |
| --- | --- | --- |
| **Crítica** | Exige decisão ou indica risco imediato | Interrompe e cobra ação |
| **Importante** | Afeta o planejamento próximo | Sinaliza para atenção em breve |
| **Informativa** | Registra um acontecimento | Mantém o gestor a par |
| **Narrativa** | Apresenta repercussão sem exigir ação | Dá vida ao mundo |

**Exemplos de notificação crítica:**

- contrato vencendo;
- falta de escalação;
- lesão;
- bloqueio financeiro;
- jovem em risco de saída;
- partida prestes a começar.

Os níveis inferiores (importante, informativa e narrativa) descem em intensidade: a **importante** afeta o planejamento próximo mas não é emergência; a **informativa** apenas registra um acontecimento; a **narrativa** apresenta a repercussão de algo (a reação da imprensa, da torcida, dos rivais) sem que exista qualquer ação a tomar.

> A entrega em tempo real das notificações ligadas à partida (início iminente, eventos ao vivo) é responsabilidade do frontend e do canal de tempo real descritos em [`../02-tecnico/08-frontend-cliente-e-tempo-real.md`](../02-tecnico/08-frontend-cliente-e-tempo-real.md).

---

## 3. Caixa de decisões

Decisões que **não devem ser perdidas** ficam reunidas em uma **caixa própria** — a caixa de decisões. Cada item da caixa carrega quatro elementos:

1. **Prazo** — até quando a decisão pode ser tomada.
2. **Impacto** — o que está em jogo se decidir de uma forma ou de outra.
3. **Recomendação** — a sugestão do jogo / da comissão para aquele caso.
4. **Ação padrão** — a regra que se aplica caso o gestor não responda.

O ponto central do desenho: **a ausência de resposta nunca paralisa o mundo**. Se o prazo expira sem decisão do usuário, o jogo aplica a **ação padrão previamente definida** e o mundo segue processando normalmente. A caixa existe justamente para que a inércia do gestor tenha um comportamento previsível e seguro, em vez de travar o clube ou a competição.

Esse comportamento é o que permite ao mundo persistente continuar rodando em horários fixos mesmo quando o gestor está ausente, coerente com o ciclo descrito em [`./10-experiencia-e-telas.md`](./10-experiencia-e-telas.md).

---

## 4. Explicabilidade

Consequências importantes precisam de **explicação funcional**. Quando algo relevante acontece, o Grinta informa **por que** aconteceu. São exemplos exigidos:

1. **por que uma proposta foi rejeitada;**
2. **por que um jovem estagnou;**
3. **por que o risco de lesão aumentou;**
4. **por que a torcida reagiu;**
5. **por que a inteligência vendeu um jogador;**
6. **por que o clube entrou em recuperação;**
7. **quais fatores decidiram uma partida.**

O limite é claro: **a explicação não revela fórmulas, atributos ocultos nem dados privados de adversários.** Ela descreve os fatores em termos funcionais e compreensíveis — o suficiente para o gestor aprender e decidir melhor — sem transformar o jogo em uma planilha exposta nem quebrar a igualdade competitiva entregando informação secreta sobre os outros clubes.

> **Pendência:** o **formato das incertezas** — como a explicação comunica aquilo que o clube não sabe com precisão — ainda precisa ser definido operacionalmente (ver §7).

---

## 5. Catálogo de relatórios

Os relatórios são a camada intermediária da interface: sintetizam o estado do clube e do mundo em blocos temáticos. A **qualidade da comissão técnica** influencia a profundidade e a precisão de vários deles.

### 5.1 Relatórios de partida

A partida produz três momentos de informação:

- **prévia** (antes);
- **acompanhamento** (durante);
- **análise posterior** (depois).

A profundidade varia conforme a qualidade da comissão. O relatório **separa quatro dimensões** que não devem ser confundidas: **resultado**, **desempenho**, **execução** e **contexto** — uma equipe pode jogar bem e perder, ou vencer jogando mal.

### 5.2 Relatórios de elenco

O relatório de elenco apresenta:

- profundidade por posição e função;
- idade;
- liderança;
- condição física;
- moral;
- contratos;
- lacunas;
- excesso;
- jogadores em risco;
- jovens próximos do profissional.

### 5.3 Relatórios da base

A base recebe avaliação de:

- capacidade;
- desenvolvimento;
- planos;
- prontidão;
- risco de saída;
- contratos;
- empréstimos;
- reputação formadora.

### 5.4 Relatórios financeiros

O clube precisa visualizar:

- saldo;
- receitas;
- despesas;
- folha;
- dívida;
- parcelas;
- obrigações futuras;
- risco;
- orçamento;
- projeção.

### 5.5 Relatórios de mercado

O relatório de mercado apresenta:

- necessidades;
- oportunidades;
- contratos vencendo;
- jogadores observados;
- disponibilidade;
- concorrência;
- risco financeiro da negociação.

### 5.6 Relatórios de profissionais

Os profissionais informam:

- eficiência dos núcleos;
- sobrecarga;
- adaptação;
- conflitos;
- qualidade das recomendações;
- necessidades de contratação.

### 5.7 Relatório de fim de temporada

O fechamento anual reúne, em um único documento:

- desempenho por competição;
- objetivos;
- finanças;
- evolução do elenco;
- base;
- mercado;
- torcida;
- reputação;
- recordes;
- riscos e prioridades do próximo ciclo.

> **Pendência:** faltam definir as **regras operacionais** dos relatórios — **frequência de cada relatório**, níveis de detalhe por qualidade da comissão, quais informações são sempre visíveis, formato das incertezas, e retenção/comparação histórica (ver §7).

> **Pendência:** ainda é preciso decidir **se relatórios ou estatísticas pagos podem existir** sem fornecer informação competitiva adicional. Qualquer informação estratégica exclusiva entraria em conflito com a regra de igualdade competitiva (proibição de pay-to-win), então a possibilidade de relatórios avançados pagos precisa ser validada com cuidado (ver §7).

---

## 6. Memória do mundo

Tudo que for importante deve **deixar memória**. A memória do mundo é persistente e sustenta a identidade dos clubes, dos jogadores e do próprio mundo ao longo das temporadas.

> A persistência dessa memória — como esses registros são armazenados de forma imutável e reconstruível ao longo do tempo — apoia-se no modelo de event sourcing e histórico descrito em [`../02-tecnico/01-arquitetura-de-dados.md`](../02-tecnico/01-arquitetura-de-dados.md).

### 6.1 História do mundo (record book)

A história do mundo — o **record book** — registra:

- campeões;
- acessos e rebaixamentos;
- maiores vendas;
- artilheiros;
- assistências;
- goleiros;
- recordes de público;
- sequências;
- jovens revelados;
- ídolos;
- crises;
- punições;
- rivalidades;
- partidas marcantes.

### 6.2 Linha do tempo do clube

Cada clube possui uma **linha do tempo** com:

- temporadas;
- dirigentes;
- usuários;
- títulos;
- obras;
- contratações;
- vendas;
- ídolos;
- goleadas;
- acessos;
- quedas;
- eventos de identidade.

### 6.3 Linha do tempo do jogador

Cada jogador mantém uma **linha do tempo** própria com:

- clubes;
- contratos;
- estatísticas;
- empréstimos;
- convocações;
- lesões;
- marcos;
- títulos;
- transferências;
- transição para profissional após a aposentadoria.

### 6.4 Rankings e reputações

Rankings de **clubes** e de **gestores** são atualizados conforme desempenho, contexto, estrutura, finanças, base e história.

Princípio essencial: **o ranking representa reputação e trajetória, não um bônus oculto de força.** Estar bem ranqueado descreve o que o clube ou o gestor conquistou; não confere vantagem mecânica escondida sobre os demais.

> **Pendência:** o catálogo final de recordes, os critérios de desempate, a separação por competição/temporada/mundo, as regras de correção após punição ou anulação, e as cerimônias/homenagens/recursos de consulta histórica ainda estão abertos (ver §7).

---

## 7. Pendências consolidadas

Itens desta seção que permanecem abertos na fonte (Seção 25 do documento definitivo):

> **Pendência (relatórios e explicabilidade):**
> - frequência de cada relatório;
> - níveis de detalhe por qualidade da comissão;
> - quais informações são sempre visíveis;
> - formato das incertezas;
> - retenção e comparação histórica;
> - diferença exata entre relatório comum e qualquer recurso pago.

> **Pendência (relatórios pagos):**
> - se relatórios ou estatísticas pagos podem existir sem fornecer informação competitiva adicional. Qualquer informação estratégica exclusiva conflita com a regra de igualdade competitiva e precisa de validação cuidadosa.

> **Pendência (recordes e memória):**
> - catálogo final de recordes;
> - critérios de desempate;
> - separação por competição, temporada e mundo;
> - regras de correção após punição ou anulação;
> - cerimônias, homenagens e recursos de consulta histórica.

---

## 8. Ligações com outros documentos

- **Telas e experiência (UX / ciclo do gestor):** [`./10-experiencia-e-telas.md`](./10-experiencia-e-telas.md) — onde as camadas de informação, notificações e caixa de decisões aparecem para o usuário.
- **Notificações de partida em tempo real:** [`../02-tecnico/08-frontend-cliente-e-tempo-real.md`](../02-tecnico/08-frontend-cliente-e-tempo-real.md) — entrega em tempo real dos eventos de jogo e alertas críticos.
- **Event sourcing e histórico:** [`../02-tecnico/01-arquitetura-de-dados.md`](../02-tecnico/01-arquitetura-de-dados.md) — persistência imutável que sustenta a memória do mundo, o record book e as linhas do tempo.
