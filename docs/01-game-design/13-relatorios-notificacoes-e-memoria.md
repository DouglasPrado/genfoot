# Relatórios, Notificações e Memória do Mundo

> **Status:** Rascunho consolidado · **Fontes:** chats/documento-definitivo-escopo.md (Seção 20) · **Revisão:** 2026-07-10

## Resumo

Este documento consolida, pela primeira vez em forma oficial, a camada de **informação** do **Grinta** — o manager de futebol online: como o jogo comunica o que acontece, como pede decisões sem travar o mundo, como explica consequências sem entregar fórmulas, quais relatórios existem e como o mundo guarda memória do que foi vivido.

O princípio que rege tudo é a **interface em camadas**: o usuário recebe primeiro aquilo que exige uma decisão, e só então pode aprofundar-se em relatórios, histórico e estatísticas. O jogo não esconde consequências relevantes nem inunda o gestor com eventos que não geram ação possível. Notificações são priorizadas por urgência em quatro níveis; decisões que não podem ser perdidas ficam reunidas em uma **caixa de decisões** com prazo, impacto, recomendação e uma **ação padrão que nunca paralisa o mundo**.

A informação é sempre acompanhada de **explicabilidade funcional**: o Grinta diz por que algo aconteceu (uma proposta rejeitada, um jovem estagnado, uma torcida revoltada) sem revelar fórmulas, atributos ocultos ou dados privados de adversários. Sobre essa base assenta o **catálogo de relatórios** (partida, elenco, base, financeiro, mercado, profissionais e fim de temporada) e a **memória persistente do mundo**: a história do mundo (record book), a linha do tempo de cada clube e de cada jogador, e os rankings de reputação.

Este documento reproduz fielmente o conteúdo da Seção 20 da fonte. As decisões que a fonte deixava abertas foram fechadas nesta passada de resolução — como estrutura/extração no próprio corpo ou como recomendação a ratificar (Série R), conforme o mapa em [§7](#7-pendências-consolidadas).

## Sumário

1. [Interface em camadas](#1-interface-em-camadas)
2. [Notificações priorizadas](#2-notificações-priorizadas)
3. [Caixa de decisões](#3-caixa-de-decisões)
4. [Explicabilidade](#4-explicabilidade)
   - [4.1 Plano de recuperação (entidade)](#41-plano-de-recuperação-entidade)
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

O **formato das incertezas** segue uma regra fixa: quando o clube não sabe algo com precisão, a explicação apresenta **faixa qualitativa + indicador de confiança**, nunca um número de falsa precisão — reutilizando o mesmo mecanismo de bandas do `ScoutReport` ([R-04](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11)). A largura da faixa **estreita conforme a qualidade da comissão** (ver [R-76](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11)): uma comissão fraca devolve "provavelmente entre X e Y, confiança baixa"; uma comissão forte devolve faixas estreitas e confiança alta. A incerteza é sempre **comunicada, jamais escondida atrás de um valor fingidamente exato**.

### 4.1 Plano de recuperação (entidade)

Quando o clube entra em crise, a diretoria não demite o usuário: ela abre um **plano de recuperação** — a entidade que dá forma à intervenção citada na explicabilidade acima ("por que o clube entrou em recuperação") e detalhada em [`01-mundo-persistente-e-clubes` §1.3](./01-mundo-persistente-e-clubes.md) e na crise econômica de [`03-economia`](./03-economia.md).

**Estrutura da entidade (`RecoveryPlan`):**

- `gatilho` — o que a abriu (dívida, sequência esportiva ruim, rebaixamento, folha estourada);
- `metas` — objetivos corretivos verificáveis (reduzir a folha a X, sair da zona, quitar uma parcela);
- `restricoes` — limites impostos enquanto durar (congelamento de contratações, obrigação de vender, teto de folha);
- `prazo` — janela para cumprir as metas;
- `acompanhamento` — status de cada meta e a autonomia devolvida conforme o cumprimento;
- `desfecho` — encerrada com sucesso (autonomia restaurada, ver [`01-mundo` §1.3](./01-mundo-persistente-e-clubes.md)) ou agravada (restrições mais severas).

O plano é fonte de primeira ordem para as outras camadas deste documento: cada meta e restrição vira **item da caixa de decisões** (§3) com prazo e ação padrão; sua abertura e desfecho geram **notificação** (§2) e **deixam memória** na linha do tempo do clube (§6.2). A modelagem dos núcleos que operam o plano (Gestão e diretoria) está em [`04-estrutura-do-clube-e-staff` §5](./04-estrutura-do-clube-e-staff.md).

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

**Gatilhos e linha-base (estrutura).** Cada relatório tem um gatilho definido: os de **partida** são gerados a cada jogo (prévia antes, acompanhamento durante, análise depois); **elenco, base, financeiro, mercado e profissionais** são atualizados no tique semanal do mundo e ficam consultáveis a qualquer momento como snapshot; o **fim de temporada** é gerado uma vez por temporada. Independentemente da qualidade da comissão, uma **linha-base é sempre visível** — resultado, saldo, contratos vencendo, lesões e próximos compromissos —, pois informação que exige decisão nunca depende de comissão boa (coerente com a interface em camadas, §1).

> **Recomendação (a ratificar — [R-76](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11)):** escalonar **detalhe, frequência e retenção** pela qualidade da comissão (escala de núcleo **1–5**, ver [`04-estrutura` R-10/R-12](./04-estrutura-do-clube-e-staff.md)): nível 1 → só resultado + resumo de uma linha; nível 3 → as quatro dimensões (resultado/desempenho/execução/contexto) resumidas; nível 5 → abertura completa das quatro dimensões + tendências + projeções + bandas de incerteza estreitas. **Retenção:** detalhe completo das últimas **3 temporadas**, sintetizado além disso; record book e linhas do tempo (§6) são permanentes. Racional: a comissão vira o eixo único de profundidade (sem duplicar sistemas), a linha-base garante que decidir nunca dependa de comissão, e a retenção limita custo sem perder a memória histórica.

> **Recomendação (a ratificar — [R-75](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11)):** **não** existir relatório ou estatística pago. Todos os relatórios são gratuitos e a **qualidade da comissão (conquistada no jogo)** é o único diferenciador de profundidade e precisão. O ponto sensível de [`14-monetizacao`](./14-monetizacao.md) (pendência de "relatórios premium") deve ser fechado na **mesma direção — não-pago**: qualquer formatação exclusiva paga tangencia a linha de "vantagem de scouting/informação" e contradiz tanto a interface em camadas (§1 — o que exige decisão sempre aparece de graça) quanto a regra de no-pay-to-win. A monetização fica restrita a cosméticos, slots e conveniências que **não tocam informação**. Racional: elimina o risco competitivo na raiz e resolve o conflito potencial entre este documento e [`14-monetizacao`](./14-monetizacao.md) sem deixar zona cinzenta.

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

**Regras operacionais da memória (estrutura).** O **catálogo de recordes** é exatamente o enumerado no record book (§6.1) — campeões, acessos/quedas, maiores vendas, artilheiros, assistências, goleiros, público, sequências, revelações, ídolos, crises, punições, rivalidades e partidas marcantes —, tratado como catálogo canônico. Os recordes são mantidos em **três escopos separados**: por **competição**, por **temporada** e **all-time do mundo**, cada um com sua própria tabela. **Desempate** de um recorde: prevalece a marca alcançada primeiro (mais antiga); persistindo o empate, a obtida em menos partidas; por fim, exibe-se como **empate compartilhado**. **Correção após punição ou anulação:** o registro oficial segue a **homologação** (resolução consolidada nº 7 do [registro de decisões](../99-decisoes/registro-de-decisoes.md)) — um resultado punido ou anulado é corrigido no recorde oficial, mas a **versão anterior nunca é apagada** (resolução nº 6; apoia-se no event sourcing de [`../02-tecnico/01-arquitetura-de-dados.md`](../02-tecnico/01-arquitetura-de-dados.md)). **Cerimônias, homenagens e consulta histórica** são camadas narrativas e de UI sobre esses dados — hall da fama, número aposentado (liga-se a [`11-torcida` §21](./11-torcida-imprensa-e-narrativa.md)) e consulta via linhas do tempo (§6.2–6.3) —, sem conferir qualquer bônus mecânico.

---

## 7. Pendências consolidadas

Os itens que a fonte (Seção 25 do documento definitivo) deixava abertos foram resolvidos nesta passada — parte como **estrutura/extração** direto no corpo, parte como **recomendação a ratificar** (Série R). Nenhum permanece como pendência aberta:

| Tema | Resolução |
| --- | --- |
| Frequência de cada relatório | Estrutura, [§5.7](#57-relatório-de-fim-de-temporada) (gatilhos por tipo) |
| Níveis de detalhe por qualidade da comissão | [R-76](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11) |
| Quais informações são sempre visíveis | Estrutura, [§5.7](#57-relatório-de-fim-de-temporada) (linha-base sempre visível) |
| Formato das incertezas | Estrutura, [§4](#4-explicabilidade) (faixa qualitativa + confiança, bandas do `ScoutReport`) |
| Retenção e comparação histórica | [R-76](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11) (detalhe pleno nas últimas 3 temporadas) |
| Relatórios/estatísticas pagos | [R-75](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11) — **não-pago**; fecha o conflito com [`14-monetizacao`](./14-monetizacao.md) |
| Catálogo de recordes, desempate, escopos, correção, cerimônias | Estrutura, [§6.4](#64-rankings-e-reputações) |

> **Nota:** [R-75](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11) e [R-76](../99-decisoes/registro-de-decisoes.md#6-série-r--resolução-de-pendências-2026-07-11) são **recomendações a ratificar** — direção de trabalho até o martelo do dono do produto. As demais linhas foram fechadas por reconciliação/extração e não dependem de ratificação.

---

## 8. Ligações com outros documentos

- **Telas e experiência (UX / ciclo do gestor):** [`./10-experiencia-e-telas.md`](./10-experiencia-e-telas.md) — onde as camadas de informação, notificações e caixa de decisões aparecem para o usuário.
- **Notificações de partida em tempo real:** [`../02-tecnico/08-frontend-cliente-e-tempo-real.md`](../02-tecnico/08-frontend-cliente-e-tempo-real.md) — entrega em tempo real dos eventos de jogo e alertas críticos.
- **Event sourcing e histórico:** [`../02-tecnico/01-arquitetura-de-dados.md`](../02-tecnico/01-arquitetura-de-dados.md) — persistência imutável que sustenta a memória do mundo, o record book e as linhas do tempo.
