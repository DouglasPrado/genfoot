# Ciclo de vida de temporada — a Season é do mundo, não da competição (R-219)

**Data:** 2026-07-19 · **Status:** RATIFICADA · **Escopo:** ciclo de vida de temporada, virada automática, trava B-08

## Contexto — a trava B-08 e o que a investigação revelou

Três verticais desta sessão (treino, envelhecimento, captação) aplicam efeitos "na
virada de temporada", mas a virada nunca dispara sozinha — são commands manuais.
A causa é a **trava B-08**: `GameWorld.currentSeasonId` é `NULL` e a `Season` nasce
`PLANNED` sem nada a ativar.

Ao investigar, a raiz apareceu e era mais funda que "popular um campo":

- A `Season` **não é entidade do mundo** — é artefato da **competição**. Ela é
  criada por `ensureSeasonId` (`prisma-competition-aggregate-repository.ts:460`)
  quando uma competição é autorada, com FK obrigatória
  (`Competition` exige `Season`).
- O **status** da Season deriva do ciclo da competição
  (`seasonStatusFor(lifecycle)`), não de um estado próprio.
- No fluxo `create → genesis → activate → autoria`, no `world:activate` **não há
  Season ainda**.
- Pela **R-203**, o mundo nasce **sem competição** — logo, sem temporada nenhuma
  até o admin autorar uma liga.

Consequência: "ligar o ciclo que já existe" não se aplicava — o ciclo de
temporada como entidade do mundo **não existia**.

## A decisão do dono

Duas alternativas foram apresentadas: (A) Season vira entidade de primeira classe
do mundo; (B) Season segue derivada da competição. O dono escolheu **A** —
sabendo que refatora a autoria de competição (C7, R-202..R-207, recém-mergeada).

O motivo: o ciclo de vida do jogador (envelhecer, aposentar, treinar) é do
**mundo**, não de uma liga. Amarrá-lo à competição (B) deixaria um mundo sem liga
com jogadores congelados — o oposto do que a R-217 quer.

## R-219 — A Season é do mundo; nasce ACTIVE, vira sozinha no fim da janela

1. **A Season nasce com o mundo.** Na gênese/`world:activate`, a temporada 1 é
   criada `ACTIVE`, com `startsAt = startDate` e `endsAt = startDate + SEASON_DAYS`
   (`SEASON_DAYS = 365`, `game-world.ts:27`; a lógica "temporada de uma data" já
   existe em `game-world.ts:427`). `GameWorld.currentSeasonId` é populado ali.
2. **A competição ANEXA-se à temporada corrente**, não a cria. `ensureSeasonId`
   já faz `findFirst` da temporada — passa a sempre encontrar a que o mundo criou.
   O status da temporada **desacopla** do ciclo da competição: `seasonStatusFor`
   passa a valer só para a edição (`CompetitionSeason`), não para a `Season` do
   mundo.
3. **A virada é automática no `advance-day`** (passo 7, R-113): quando
   `currentDate` cruza `Season.endsAt`, dispara — aplica `ApplySeasonAccruals`
   (treino) e `ApplySeasonAging` (envelhecimento) da temporada que fecha, marca-a
   `FINISHED`, cria a próxima `ACTIVE` e atualiza `currentSeasonId`. Determinístico
   e idempotente (não vira a mesma temporada duas vezes).

## Consequências aceitas / pendências

- **Refatora a autoria de competição (C7).** A criação da Season sai do
  `ensureSeasonId` reativo e vai para a gênese; a autoria passa a anexar. Risco
  sobre código recém-mergeado — a suíte inteira de competição/golden-path tem que
  seguir verde, e a virada de LIGA (`RolloverLeague`, já no `advance-day` passo 5)
  não pode conflitar com a virada de TEMPORADA nova.
- **Destrava a B-08 parcialmente:** o auto-disparo de **treino e envelhecimento**
  passa a acontecer na virada. A **captação** NÃO entra nesta rodada (escopo do
  dono), e o contrato de formação segue bloqueado (C6/C9). A B-08 só cai do
  artefato **com prova do auto-disparo observado**.
- **Discrepância de calibração a registrar:** `SEASON_DAYS = 365` (um ano), mas
  `06-temporada §4` fala numa janela de referência de **~63 dias**. Os dois não
  batem. Uso `SEASON_DAYS` (a constante que o código já tem) e deixo a
  discrepância como nota ao dono — não é minha para resolver.
- **Idempotência da virada** segue o padrão do accrual/envelhecimento: um marcador
  por temporada evita reprocessar. `ApplySeasonAccruals` zera o buffer;
  `ApplySeasonAging` usa `lastAgedSeasonId`. A virada em si não pode recriar a
  próxima temporada se já criada.
