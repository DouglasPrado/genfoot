# Experiência do Usuário e Telas

> **Status:** CANÔNICO · **Fontes:** chats/campeonatos-fim-de-temporadas.md, chats/economics-initial.md, chats/escopo-definitivo-simulador.md · **Revisão:** 2026-07-11

## Resumo

Este documento consolida, pela primeira vez em forma oficial, a experiência de tela do jogador do **Grinta** — o manager de futebol online. Até agora essa experiência foi discutida nos chats mas nunca virou documento; aqui ela é reunida em alta fidelidade.

A premissa central é que o jogador humano **não precisa jogar partidas manualmente — ele gerencia**. O jogo roda em tempo acelerado, com rodadas simuladas em horários fixos, e o usuário atua nos intervalos entre as rodadas: escalando, ajustando tática, treinando, negociando, conversando com atletas e acompanhando a evolução do seu clube. O objetivo é dar **vida ao mundo sem exigir tempo real** do jogador.

O documento cobre: o ciclo do dia a dia do gestor (com os blocos narrativos "antes da rodada" e "depois da rodada"), a tela inicial (painel do clube), as ações disponíveis, as notificações, a **Central** orientada por decisões (com agenda unificada, dependências, lembretes e o retorno proporcional após ausência), as **automações do usuário** e as três telas de indicadores (financeira, mercado e jogador), reproduzindo todos os campos exatos das fontes.

## Sumário

1. [Ciclo do dia a dia do gestor](#1-ciclo-do-dia-a-dia-do-gestor)
2. [Tela inicial (painel do clube)](#2-tela-inicial-painel-do-clube)
3. [Ações disponíveis ao jogador](#3-ações-disponíveis-ao-jogador)
4. [Notificações](#4-notificações)
5. [Central, agenda e decisões](#5-central-agenda-e-decisões)
   - [5.1 Central orientada por decisões](#51-central-orientada-por-decisões)
   - [5.2 Notificação vs tarefa](#52-notificação-vs-tarefa)
   - [5.3 Prioridade, urgência e importância](#53-prioridade-urgência-e-importância)
   - [5.4 Agenda unificada](#54-agenda-unificada)
   - [5.5 Dependências e bloqueios](#55-dependências-e-bloqueios)
   - [5.6 Lembretes](#56-lembretes)
   - [5.7 Retorno após ausência](#57-retorno-após-ausência)
   - [5.8 Prazos perdidos](#58-prazos-perdidos)
6. [Automações do usuário](#6-automações-do-usuário)
   - [6.1 Anatomia de uma automação](#61-anatomia-de-uma-automação)
   - [6.2 Níveis de automação](#62-níveis-de-automação)
   - [6.3 Ações de alto risco](#63-ações-de-alto-risco)
   - [6.4 Validação no momento da execução](#64-validação-no-momento-da-execução)
   - [6.5 Conflitos e precedência](#65-conflitos-e-precedência)
   - [6.6 Idempotência e proteção contra repetição](#66-idempotência-e-proteção-contra-repetição)
   - [6.7 Histórico de execução](#67-histórico-de-execução)
   - [6.8 Desativação na troca de controlador](#68-desativação-na-troca-de-controlador)
7. [Telas de indicadores](#7-telas-de-indicadores)
   - [7.1 Tela financeira do clube](#71-tela-financeira-do-clube)
   - [7.2 Tela de mercado](#72-tela-de-mercado)
   - [7.3 Tela do jogador](#73-tela-do-jogador)
8. [Partida ao vivo](#8-partida-ao-vivo)
9. [Desenho tela-a-tela](#9-desenho-tela-a-tela)

---

## 1. Ciclo do dia a dia do gestor

O jogador humano não precisa ficar jogando partida manualmente. Ele gerencia.

### Atividades

- Escalar time
- Definir tática
- Treinar jogadores
- Negociar transferências
- Renovar contratos
- Conversar com jogador
- Responder imprensa
- Gerenciar moral
- Acompanhar olheiros
- Gerenciar base
- Ver jogos e resultados
- Planejar próxima rodada

### Antes da rodada

Exemplo de contexto narrativo apresentado ao gestor antes de uma rodada:

- Você enfrenta o líder amanhã às 20h.
- Seu atacante está cansado.
- Seu meia pediu mais minutos.
- A torcida cobra vitória.
- O rival vem de 5 jogos sem perder.

### Depois da rodada

Exemplo de contexto narrativo apresentado ao gestor após uma rodada:

- Você venceu por 2x1.
- O jovem atacante marcou o primeiro gol como profissional.
- Seu volante levou terceiro amarelo.
- A torcida aumentou a confiança no projeto.

> Isso dá vida sem exigir tempo real.

---

## 2. Tela inicial (painel do clube)

A tela inicial apresenta ao gestor, em um único painel, a situação atual do clube e o próximo compromisso. Exemplo de conteúdo:

| Campo | Exemplo |
|---|---|
| Seu clube | Monte Alto FC |
| Próximo jogo | amanhã 20h |
| Adversário | União Paulista |
| Competição | Liga Nacional B |
| Status | 7º colocado |
| Objetivo | terminar no top 6 |
| Moral do elenco | boa |
| Pressão da torcida | média |
| Caixa | R$ 1.200.000 |

> Os valores acima são exemplos ilustrativos da fonte. O painel deve exibir os campos: **clube**, **próximo jogo**, **adversário**, **competição**, **status (posição)**, **objetivo**, **moral do elenco**, **pressão da torcida** e **caixa**.

---

## 3. Ações disponíveis ao jogador

A partir da tela inicial, o gestor tem acesso às seguintes ações:

- Escalar time
- Ajustar tática
- Ver adversário
- Treinar elenco
- Negociar jogadores
- Conversar com atletas
- Ver notícias
- Ver tabela
- Ver calendário

---

## 4. Notificações

O sistema avisa o usuário sobre acontecimentos relevantes do seu clube e do mundo. Exemplos de notificações:

- Seu jogo contra União Paulista será simulado hoje às 20h.
- Seu atacante titular sentiu dores no treino.
- Um clube fez proposta pelo seu lateral.
- A diretoria está satisfeita com a campanha.
- Seu jovem meia foi convocado para a seleção sub-20.

---

## 5. Central, agenda e decisões

A **Central** é a área principal de trabalho do gestor. Diferente da lista de Notificações (Seção 4), que registra acontecimentos, a Central é **orientada por decisões**: reúne o que exige ação, o que tem prazo e o que aguarda terceiros, sempre ligado ao módulo de origem responsável pelo assunto. É a resposta à premissa de que o usuário não deve navegar por dezenas de telas apenas para descobrir o que exige atenção.

> A **caixa de decisões** — o mecanismo que garante que nenhuma decisão importante se perca e que define a **ação padrão** aplicada quando um prazo expira sem resposta — está especificada em [`./13-relatorios-notificacoes-e-memoria.md`](./13-relatorios-notificacoes-e-memoria.md) (§3). Este documento **não duplica** esse desenho; foca a Central, a agenda e as automações como experiência de tela. Os quatro níveis de prioridade das notificações (crítica, importante, informativa, narrativa) também estão nesse documento (§2).

### 5.1 Central orientada por decisões

A Central não se organiza por "mensagens não lidas", e sim por decisões e riscos. Ela apresenta os seguintes blocos:

| Bloco | Conteúdo |
|---|---|
| Ações críticas | Decisões que exigem resposta imediata |
| Prazos de hoje | Itens que vencem no dia |
| Pendências da semana | Decisões com prazo próximo |
| Processos aguardando terceiros | O que depende de resposta de outro clube, exame, aprovação, etc. |
| Decisões delegadas | O que foi entregue a funcionários ou automações |
| Mudanças materiais | Alterações relevantes na situação do clube |
| Resultados recentes | Desfechos de partidas e processos |

### 5.2 Notificação vs tarefa

A Central distingue dois conceitos que a interface não pode confundir:

- **Notificação** — informa. É um aviso sobre um acontecimento.
- **Tarefa** — representa uma obrigação ou decisão. Tem estado próprio e precisa ser concluída.

**Marcar uma notificação como lida não conclui a tarefa correspondente.** Uma mesma tarefa pode produzir várias atualizações ao longo do tempo, todas agrupadas em um **único assunto**:

- Negociação aberta.
- Contraproposta.
- Mudança de prazo.
- Recomendação do funcionário.
- Aviso de expiração.

### 5.3 Prioridade, urgência e importância

A Central **separa urgência de importância**: uma decisão estratégica pode ser importante e ainda distante; uma ação rotineira pode se tornar urgente por ter prazo de minutos. As duas dimensões não se confundem na ordenação dos itens.

A prioridade de cada item resulta da combinação de **nove fatores**:

| # | Fator | O que pondera |
|---|---|---|
| 1 | Prazo | Quanto tempo resta até o vencimento |
| 2 | Gravidade | Magnitude do que está em jogo |
| 3 | Reversibilidade | Se a decisão pode ser desfeita depois |
| 4 | Impacto esportivo | Efeito sobre o desempenho em campo |
| 5 | Impacto financeiro | Efeito sobre caixa, orçamento e compromissos |
| 6 | Probabilidade | Chance de o cenário relevante se concretizar |
| 7 | Confiança da informação | O quanto os dados que embasam a decisão são certos |
| 8 | Dependências | Se a decisão depende de ou bloqueia outras |
| 9 | Autoridade exigida | Nível de aprovação necessário (usuário, diretoria, etc.) |

### 5.4 Agenda unificada

Todo item com **data ou prazo** aparece na **Agenda**, incluindo:

- Partidas.
- Treinos.
- Reuniões.
- Vencimentos.
- Inscrições.
- Contratos.
- Obras.
- Avaliações médicas.
- Amistosos.
- Eventos comerciais.

A Agenda **abre o mesmo objeto** exibido na Central e no módulo de origem — um item único, com várias portas de entrada, e não cópias divergentes.

### 5.5 Dependências e bloqueios

Uma tarefa pode estar **bloqueada** enquanto aguarda:

- Relatório.
- Exame.
- Aprovação.
- Resposta de outro clube.
- Pagamento.
- Licença.
- Decisão disciplinar.

Quando um item está bloqueado, o gestor deve sempre saber **por que não pode avançar** e **quem possui a próxima responsabilidade**.

### 5.6 Lembretes

O usuário poderá criar lembretes de cinco tipos:

- **Em data específica.**
- **Antes de um prazo.**
- **Antes de uma partida.**
- **Condicional** — quando uma condição ocorrer.
- **Recorrente** — de forma repetida.

Regra transversal: o sistema **não permite adiar silenciosamente** uma decisão para depois de seu prazo oficial. Um lembrete organiza a atenção, mas não move o prazo real.

### 5.7 Retorno após ausência

O resumo apresentado ao voltar é **proporcional ao tempo ausente** — quanto mais longa a ausência, mais alto o nível de agregação:

| Duração | O resumo prioriza |
|---|---|
| **Ausência breve** | Mudanças materiais · Próximo prazo · Resultado recente |
| **Ausência de vários dias** | Partidas · Mercado · Elenco · Finanças · Decisões automáticas · Pendências |
| **Ausência longa** | Evolução do mundo · Situação do clube · Temporadas concluídas · Acessos ou rebaixamentos · Mudanças de elenco · Obras · Finanças · Ações urgentes |

### 5.8 Prazos perdidos

Quando um prazo expira durante a ausência, o resumo de retorno deverá informar:

1. **O que expirou.**
2. **Qual política foi aplicada** (a ação padrão da caixa de decisões — ver `./13-relatorios-notificacoes-e-memoria.md` §3).
3. **Qual consequência ocorreu.**
4. **Se ainda existe alguma forma de correção.**

> **Resolvido (2026-07-11):** o desenho tela-a-tela da Central, da Agenda e dos lembretes foi especificado na área de UI/UX — ver [`../04-ui-ux/04-mobile-telas-central-home-decisoes.md`](../04-ui-ux/04-mobile-telas-central-home-decisoes.md) (telas `M-DECISIONS`, `M-DECISION-DETAIL`) e [`../04-ui-ux/10-mobile-telas-competicoes-calendario-selecoes.md`](../04-ui-ux/10-mobile-telas-competicoes-calendario-selecoes.md) (`M-CALENDAR`).

---

## 6. Automações do usuário

As **automações** permitem ao usuário codificar decisões rotineiras para que o clube continue operando de forma previsível, inclusive durante ausências. A delegação de tarefas a **funcionários** (preparar, recomendar, monitorar, executar dentro de limites) é tratada em [`./04-estrutura-do-clube-e-staff.md`](./04-estrutura-do-clube-e-staff.md); aqui o foco é a automação como **configuração do próprio usuário**.

### 6.1 Anatomia de uma automação

Toda automação possui **sete elementos** obrigatórios:

| Elemento | Papel |
|---|---|
| Gatilho | O evento que dispara a regra |
| Condições | Os critérios que precisam ser verdadeiros para a ação ocorrer |
| Ação | O que será feito |
| Limites | Os tetos e restrições dentro dos quais a ação é permitida |
| Prazo de validade | Até quando a automação vale |
| Política de falha | O que fazer se a execução não for possível |
| Responsável | Quem responde pela automação |

### 6.2 Níveis de automação

A autonomia concedida a uma automação é uma escala crescente. Do menos ao mais autônomo:

1. **Apenas avisar.**
2. **Recomendar.**
3. **Preparar rascunho.**
4. **Executar ação de baixo risco.**
5. **Executar dentro de limites.**
6. **Delegar uma área operacional.**

### 6.3 Ações de alto risco

Determinadas ações **continuam sempre manuais** ou exigem **aprovação reforçada** — nunca são totalmente automatizadas:

- Venda de jogador-chave.
- Compra de alto valor.
- Financiamento.
- Grande obra.
- Rescisão cara.
- Contrato comercial estratégico.
- Mudança de identidade.
- Transferência de controle.

### 6.4 Validação no momento da execução

A regra é **reavaliada quando dispara**, e não quando foi criada. Uma automação pode falhar na hora porque:

- O orçamento mudou.
- A autonomia foi reduzida.
- O jogador saiu.
- O prazo terminou.
- O regulamento mudou.
- O funcionário ficou indisponível.

Quando a validação falha, aplica-se a **política de falha** definida na anatomia da regra (6.1).

### 6.5 Conflitos e precedência

Quando duas regras ordenam ações **incompatíveis**, a precedência segue esta ordem:

1. **Regras obrigatórias prevalecem.**
2. **Políticas institucionais limitam regras pessoais.**
3. **Regras específicas** podem prevalecer sobre regras gerais.
4. **Ações irreversíveis ambíguas são bloqueadas** para decisão manual.

### 6.6 Idempotência e proteção contra repetição

Uma automação **nunca** poderá:

- Executar a mesma ação duas vezes.
- Criar ciclo infinito.
- Gastar acima do limite.
- Gerar lote descontrolado.
- Ampliar sua própria autoridade.

### 6.7 Histórico de execução

Toda execução fica **auditável**. O usuário poderá revisar, para cada disparo:

- Regra utilizada.
- Versão.
- Gatilho.
- Condições.
- Ações.
- Custos.
- Falhas.
- Responsáveis.
- Aprovações.

### 6.8 Desativação na troca de controlador

Na troca de controlador, as **automações pessoais** do controlador anterior são **desativadas** — não são herdadas ativamente. As **regras e políticas institucionais** do clube continuam válidas, coerente com a continuidade de controle descrita em [`./01-mundo-persistente-e-clubes.md`](./01-mundo-persistente-e-clubes.md).

> **Resolvido (2026-07-11):** o construtor de automações foi desenhado tela-a-tela em [`../04-ui-ux/04-mobile-telas-central-home-decisoes.md`](../04-ui-ux/04-mobile-telas-central-home-decisoes.md) (telas `M-AUTOMATIONS` e `M-AUTOMATION-EDIT`).

---

## 7. Telas de indicadores

O jogador do game não precisa ver todas as fórmulas. Ele precisa ver sinais claros. As três telas abaixo traduzem o modelo econômico interno em indicadores legíveis.

### 7.1 Tela financeira do clube

Indicadores exibidos na tela financeira do clube:

| Indicador |
|---|
| Caixa atual |
| Receita mensal |
| Despesa mensal |
| Resultado mensal |
| Folha salarial |
| Orçamento de transferências |
| Dívida |
| Saúde financeira |
| Pressão da diretoria |
| Meta financeira |

### 7.2 Tela de mercado

Indicadores exibidos na tela de mercado:

| Indicador |
|---|
| Valor estimado |
| Salário pedido |
| Interesse de clubes |
| Risco de saída |
| Tempo de contrato |
| Influência do empresário |
| Probabilidade de renovação |

### 7.3 Tela do jogador

Indicadores exibidos na tela do jogador:

| Indicador |
|---|
| Satisfação financeira |
| Ambição |
| Lealdade |
| Pressão familiar |
| Influência do empresário |
| Desejo de sair |
| Valor de imagem |

---

## 8. Partida ao vivo

A tela de partida ao vivo (acompanhamento em tempo real da simulação da partida) já está especificada em outro documento. Ver:

- `../02-tecnico/08-frontend-cliente-e-tempo-real.md`

Este documento não duplica esse desenho — apenas o referencia.

---

## 9. Desenho tela-a-tela

> **Resolvido (2026-07-11):** o desenho tela-a-tela completo da experiência foi especificado na área [`../04-ui-ux/`](../04-ui-ux/) — 97 telas do app do jogador (Expo) nos docs `03`–`12` e 15 telas do admin (Next.js) no doc `21`. Isso cobre o que antes estava listado como pendência aqui: mercado/negociação, treino, base, tática, escalação, conversas/imprensa, tabela/calendário, central de notícias, Central/Agenda/lembretes e o construtor de automações.

> **Decisão ratificada — R-91:** granularidade de exibição dos indicadores (Seção 7) — proposta: rótulo qualitativo + barra visual por padrão, com valor numérico exato só quando a qualidade da comissão o revela (coerente com "informação incompleta nunca vira zero"). Layout em [`../04-ui-ux/`](../04-ui-ux/).
