# Experiência do Usuário e Telas

> **Status:** Rascunho consolidado · **Fontes:** chats/campeonatos-fim-de-temporadas.md, chats/economics-initial.md · **Revisão:** 2026-07-10

## Resumo

Este documento consolida, pela primeira vez em forma oficial, a experiência de tela do jogador do **Grinta** — o manager de futebol online. Até agora essa experiência foi discutida nos chats mas nunca virou documento; aqui ela é reunida em alta fidelidade.

A premissa central é que o jogador humano **não precisa jogar partidas manualmente — ele gerencia**. O jogo roda em tempo acelerado, com rodadas simuladas em horários fixos, e o usuário atua nos intervalos entre as rodadas: escalando, ajustando tática, treinando, negociando, conversando com atletas e acompanhando a evolução do seu clube. O objetivo é dar **vida ao mundo sem exigir tempo real** do jogador.

O documento cobre: o ciclo do dia a dia do gestor (com os blocos narrativos "antes da rodada" e "depois da rodada"), a tela inicial (painel do clube), as ações disponíveis, as notificações e as três telas de indicadores (financeira, mercado e jogador), reproduzindo todos os campos exatos das fontes.

## Sumário

1. [Ciclo do dia a dia do gestor](#1-ciclo-do-dia-a-dia-do-gestor)
2. [Tela inicial (painel do clube)](#2-tela-inicial-painel-do-clube)
3. [Ações disponíveis ao jogador](#3-ações-disponíveis-ao-jogador)
4. [Notificações](#4-notificações)
5. [Telas de indicadores](#5-telas-de-indicadores)
   - [5.1 Tela financeira do clube](#51-tela-financeira-do-clube)
   - [5.2 Tela de mercado](#52-tela-de-mercado)
   - [5.3 Tela do jogador](#53-tela-do-jogador)
6. [Partida ao vivo](#6-partida-ao-vivo)
7. [Pendências de desenho tela-a-tela](#7-pendências-de-desenho-tela-a-tela)

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

## 5. Telas de indicadores

O jogador do game não precisa ver todas as fórmulas. Ele precisa ver sinais claros. As três telas abaixo traduzem o modelo econômico interno em indicadores legíveis.

### 5.1 Tela financeira do clube

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

### 5.2 Tela de mercado

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

### 5.3 Tela do jogador

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

## 6. Partida ao vivo

A tela de partida ao vivo (acompanhamento em tempo real da simulação da partida) já está especificada em outro documento. Ver:

- `../02-tecnico/08-frontend-cliente-e-tempo-real.md`

Este documento não duplica esse desenho — apenas o referencia.

---

## 7. Pendências de desenho tela-a-tela

> **Pendência:** O desenho tela-a-tela detalhado do restante da experiência ainda precisa ser especificado, incluindo (mas não se limitando a):
>
> - Mercado de transferências detalhado (fluxo de negociação, propostas, contra-propostas, empresários)
> - Tela e fluxo de treino do elenco
> - Categorias de base / gestão da base
> - Tela de tática detalhada
> - Tela de escalação detalhada
> - Conversas com atletas e imprensa (fluxos de interação)
> - Tabela e calendário (layout e navegação)
> - Central de notícias / eventos

> **Pendência:** Definir a granularidade de exibição de cada indicador das telas de indicadores (Seção 5) — se numérico, faixa, rótulo qualitativo (ex.: "boa", "média") ou barra visual.
