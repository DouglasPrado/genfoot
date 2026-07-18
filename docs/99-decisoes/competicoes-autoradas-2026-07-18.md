# Competições autoradas no admin — R-202..R-207 · RATIFICADAS em 2026-07-18

Hoje a liga é **cravada na gênese**: `world-genesis-generator` cria a "initial-league" (16 clubes, 30 rodadas, 240 fixtures) e a materializa junto com o mundo. A spec §2 (`docs/01-game-design/06-temporada-e-competicoes.md`) já modela campeonatos como entidades independentes com `ChampionshipRules`, `QualificationRule`, desempates e prêmios (R-59/R-61/R-62/R-63) — mas nada disso é **configurável**: o mundo sempre nasce com a mesma liga fixa.

A decisão do produto: **competição é autorada no admin, configurada antes de iniciar, e congelada ao iniciar.** Ninguém — nem admin, nem automação — altera a config depois. Isso é a materialização administrável do que a spec já desenhou, com a trava de imutabilidade da R-52 ("entrada em temporada nunca reescreve a tabela") estendida a toda a configuração.

## R-202 — Competição é um agregado autorado, com ciclo de vida e config imutável ao iniciar

`Competition` deixa de ser efeito da gênese e vira **agregado autorado** (root por R-183: contenção — a config, os participantes, o calendário e a tabela vivem sob a competição). Ciclo de vida:

```
RASCUNHO ──lock──▶ AGENDADA ──início──▶ EM_ANDAMENTO ──homologação──▶ ENCERRADA
(config editável)  (config CONGELADA,   (rodadas jogam,               (campeão, prêmios,
                    sorteio + datas       tabela evolui)                acesso/rebaixamento)
                    materializados)
```

- Em **RASCUNHO**, o admin edita tudo: formato, participantes/divisões, regras (`ChampionshipRules` da spec §2), janela (início/fim), prêmios, qualificação.
- O `lock` valida a config **completa** (nº de participantes coerente com o formato, datas na ordem certa, prêmios somando, etc.), materializa o **sorteio** e a **data de cada jogo**, e transiciona para AGENDADA.
- De AGENDADA em diante, **todo command que muda a config falha** com `COMPETITION_LOCKED`. A config é imutável para todos (R-52). Correção pós-homologação só pelo rito da spec §14.2 (nova versão preservando a anterior) — fora do escopo desta primeira passada.

`version` por linha (R-175); optimistic concurrency nos commands de edição.

## R-203 — O mundo nasce SEM competição; a gênese cria só o pool de clubes

A liga hardcoded da gênese **morre**. `world-genesis-generator` para de criar `initial-league`/fixtures; a gênese materializa apenas clubes, jogadores, elenco, base, comissão, torcida e economia. O mundo novo **não tem competição** até o admin criar e iniciar uma — o mobile mostra estado vazio honesto ("nenhuma competição neste mundo ainda").

Como a divisão tem 20 clubes (R-204) e o número de divisões é decidido no admin **depois** da gênese, a criação do mundo recebe um parâmetro **`clubCount`** (múltiplo de 20, padrão 20). A gênese materializa esse pool; o admin agrupa os clubes em divisões ao configurar a liga. `GameWorld` deixa de embutir `rounds`/`generatedClubCount` literais (R-182) e passa a guardar `clubCount` como dado do mundo.

## R-204 — Liga tem divisões de 20; acesso/rebaixamento é 4 sobem / 4 descem, em cascata

- Cada divisão de uma liga tem **20 clubes** (turno e returno ⇒ 38 rodadas, 380 jogos por divisão).
- No fim de temporada homologado, entre divisões adjacentes: os **4 últimos** de uma divisão descem e os **4 primeiros** da divisão imediatamente abaixo sobem.
- A **divisão do topo não é promovida** (não há divisão acima: só rebaixa 4). A **divisão do fundo não é rebaixada** (não há divisão abaixo: só recebe 4).
- Os slots são `ChampionshipRules.promotionSlots`/`relegationSlots` (spec §2); 4/4 é o padrão, calibrável por competição. O teto por divisão (R-62) e os limites de inscrição (R-63) continuam valendo.

## R-205 — A premiação entra no razão (C9) em camadas, e é configurada antes de iniciar

Premiação é dinheiro, e dinheiro nasce do razão dobrado (R-178/R-191). A config de prêmios é imutável ao iniciar (R-202) e, na homologação, vira lançamentos de **faucet do sistema** (`SYS_PRIZE_FAUCET`) — o "organizador" paga, oferta monetária cresce por FAUCET, INV Σdébito=Σcrédito preservada. Três camadas para clubes + prêmios individuais para jogadores:

- **Posição final** — tabela por colocação (1º, 2º, …), como `prizeRules` da spec §2.
- **Cota de participação** — valor fixo por entrar na competição.
- **Bônus por vitória/rodada** — por resultado (aproxima receita de TV/bilheteria; casa com o C9).
- **Prêmios individuais** — artilheiro/melhor (objetivos e subjetivos, R-61), creditados ao **clube** do jogador premiado (o clube não distribui salário-extra nesta passada).

Os efeitos de reputação/mercado dos prêmios seguem R-59/R-61; esta decisão cobre só o **fluxo financeiro** no razão.

## R-206 — Copa em dois formatos: mata-mata direto e grupos + mata-mata

Além da liga, a config permite:

- **`COPA_MATA_MATA`** (`format: knockout`) — chaveamento direto; clubes semeados por reputação (cabeças de chave), sorteio determinístico por seed. Suporta jogo único ou ida/volta (`legs`).
- **`COPA_GRUPOS_MATA_MATA`** (`format: groups_knockout`) — grupos sorteados em potes por reputação, jogos de grupo (turno único ou ida/volta), classificados avançam ao mata-mata.

Sorteio, potes e datas dos jogos são materializados no `lock` (R-202), determinísticos por `(seed, competitionId)` — replay reproduz o mesmo chaveamento.

## R-207 — Qualificação entre competições é declarada na config e imutável

A ligação entre competições é a `QualificationRule` da spec §2 (`sourceCompetitionId`, `criteria: top_positions | champion | cup_winner`, `slots`). Ela é parte da config **imutável** (R-202): decidida antes de iniciar, aplicada na homologação (top-N da origem → vagas no destino). Não pode ser alterada depois que qualquer das competições envolvidas inicia.

---

## Consequências aceitas / pendências

- **A gênese muda de contrato** (R-203): testes de gênese que contam 16 clubes / 240 fixtures / competição materializada precisam ser reescritos para o novo mundo (pool de clubes, zero competição).
- **O mobile ganha estado vazio** de competição enquanto o admin não iniciar uma; o Home e a tela Matches deixam de assumir "existe liga".
- **Primeira passada financeira**: prêmios entram por faucet (como R-199), sem parcelamento/retção/compensação da spec §14.4 — isso fica para depois.
- **Homologação** desta passada aplica desempates e acesso/rebaixamento e paga prêmios; o rito de correção pós-homologação (spec §14.2, versão preservando a anterior) fica para depois.
- **Datas FIFA, adiamentos e prioridade entre competições** (spec §4.4/§4.5) ficam para depois; o sorteio distribui jogos evitando muitos mandos seguidos, sem tratar colisão entre competições.
