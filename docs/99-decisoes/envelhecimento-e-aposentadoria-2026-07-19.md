# Envelhecimento, declínio físico e aposentadoria (R-217)

**Data:** 2026-07-19 · **Status:** RATIFICADA · **Escopo:** ciclo de fim de carreira do jogador

## Contexto — o que estava especificado e não existia

O §5 (`02-sistema-de-jogadores.md:232-245`) descreve a curva por idade — auge 26-29,
"perda física gradual" 30-33, "queda física" 34+ — e o §17 (:725-760) descreve a
aposentadoria contextual, a aposentadoria médica e a pessoa persistente que vira
funcionário. `PLY-002/008/017/018` catalogam, e `R-113/114/115` (doc técnico 13) ratificam
o controlador demográfico.

No código, nada disso acontecia. Levantamento de 2026-07-19:
- A curva de idade (`AGE_BANDS`, `training/development-gain.ts`) só reduzia GANHO — nunca
  virava PERDA. Veterano estagnava, não decaía.
- `PlayerCareerStatus.RETIRED` e `PlayerRetiredEvent` existiam como **tipos**, sem nenhum
  produtor. `careerStatus` só era escrito `ACTIVE`.
- `REGEN_AFTER_RETIREMENT` definido, nunca usado. Sem controlador demográfico no mundo
  real — só na calibração offline (`calibration.ts:384-390`).

Um mundo rodava demograficamente congelado: jogadores envelheciam no número, sem perder
atributo, sem se aposentar, sem reposição.

## A decisão do dono (esta conversa)

1. **Aposentadoria por curva de idade + probabilidade** — o núcleo simples. Os fatores
   contextuais do §17 (lesão, motivação, contrato, família) entram depois como
   modificadores, não agora.
2. **Declínio físico entra junto** — o veterano perde atributo físico por uma curva de
   idade, aplicado na virada de temporada (passo 7, INV-29/R-113 — o mesmo relógio de
   progressão que o accrual de treino usa).
3. **Os números são calibração do construtor**, alinhados à forma do §5 — candidatos a
   VAL-001, não constantes do doc.

O **ritmo de reposição já é R-114** (1,25 jogador por aposentado, teto 8%/temporada) e não
é reaberto aqui — a regeneração que o consome fica para depois (ver pendências).

## R-217 — Declínio e aposentadoria por curva de idade, deterministas, na virada

### Declínio físico

Na virada de temporada, atributos **físicos** (`pace`, `acceleration`, `strength`,
`stamina`, `jumping`, `agility`, `balance`, `explosiveness`) decaem por uma curva de idade
que segue a forma do §5:

- **≤ 29:** sem perda (o auge não regride).
- **30-33:** perda gradual.
- **34+:** queda acentuada.

Aplicado via `Player.applyAttributeChange` com delta negativo — o mesmo caminho e o mesmo
clamp (±6) do accrual. O declínio tem **piso**: não afunda o atributo a zero (um veterano
perde vigor, não vira amador). Os números da curva são **calibração minha**.

O declínio e o ganho de treino convivem no mesmo passo: um jovem em treino físico ganha; um
veterano perde apesar do treino — é a idade vencendo o esforço, como o §5 descreve ("aos 33
o mesmo treino serve mais para manutenção").

### Aposentadoria

Na virada, cada jogador enfrenta uma **probabilidade de aposentadoria que cresce com a
idade**: ~0 antes de ~33, subindo até quase certa perto dos 40. O jogador que se aposenta
tem `careerStatus` → `RETIRED` e o mundo emite `PlayerRetiredEvent`.

**O sorteio é DETERMINÍSTICO** (R-182): não usa `Math.random`, e sim `SeededRandom`
chaveado por `(worldSeed, playerId, seasonId)`. A mesma virada, reprocessada, aposenta
exatamente os mesmos jogadores — replay não diverge. Dois jogadores da mesma idade podem
ter destinos diferentes (o §17 pede isso), porque a chave inclui o `playerId`.

A curva de probabilidade é **calibração minha**.

## Consequências aceitas / pendências

- **Auto-disparo continua travado (B-08):** declínio e aposentadoria aplicam na virada, mas
  a virada não é dirigida pelo relógio — é o command explícito, como o accrual. Some quando
  o ciclo de vida de temporada existir.
- **Regeneração / reposição (R-114) NÃO entra aqui.** Aposentar sem repor encolhe o elenco a
  cada temporada. A nova safra que preenche as vagas — e de onde ela vem (pool? base?
  intake?) — é decisão de produto pendente, e o vertical é grande. Registrado como trava, não
  implementado. **Enquanto não existir, um mundo que roda muitas viradas perde jogadores
  líquidos.**
- **Aposentadoria contextual e médica** (§17) ficam para depois: só a idade pesa agora.
- **Pessoa vira funcionário** (§17, PLY-018): fora de escopo.
- **Duas calibrações novas** somam às cinco do treino: a curva de declínio e a curva de
  probabilidade de aposentadoria. Todas candidatas a VAL-001, aguardando revisão do dono.
