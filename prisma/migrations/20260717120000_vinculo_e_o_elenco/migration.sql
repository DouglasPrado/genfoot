-- R-189 — a gênese não assina contrato; o vínculo dela é o elenco.
--
-- `Player.clubId` dizia o mesmo fato que `PlayerContract.clubId`, e o canon já
-- tinha escolhido quem manda: "`PlayerContract` = fonte autoritativa do vínculo
-- jogador↔clube (Q5)" (`docs/02-tecnico/02-modelo-de-dados.md:57`). Dois lugares
-- para o mesmo fato divergem, e o código passa a escolher em qual acreditar — é
-- a duplicata que a R-180 já matou em `Club.controlType` × `ClubControl`.
--
-- Por que o contrato NÃO nasce junto, apesar de a R-57 pedir "contratos curtos"
-- no elenco inicial: contrato tem `salaryPerSeasonMinor`, e salário é dinheiro.
-- O GDD §1 (`01-mundo-persistente-e-clubes.md:257`) proíbe gerar dinheiro fora
-- da economia fechada — "nada é gerado de forma isolada... salários e preços são
-- calculados considerando o equilíbrio de todo o universo". E não há fórmula de
-- salário inicial em lugar nenhum do corpus. C9 vem antes.
--
-- Até lá quem liga jogador a clube é `Squad`/`SquadMembership`: o contrato diz
-- de quem o jogador é, o elenco diz por quem ele joga. São fatos diferentes.
--
-- Consequência aceita: "jogador livre" não é pergunta respondível enquanto não
-- houver contrato. Sem eles, todos são livres e ninguém é.
--
-- `lastProcessedOn` NASCE: o agregado tinha o estado (`Player.processUntil`) e o
-- físico não tinha onde guardá-lo — o adapter descobriu ao tentar reidratar. Sem
-- ele o decaimento diário reprocessa desde sempre a cada carga. É data de MUNDO
-- (R-177): `DATE`, sem default, porque um `now()` inventaria a data e mataria o
-- replay. Sem default e NOT NULL só passa em tabela vazia, e ela está: C4 nunca
-- teve adapter.
--
-- E o dinheiro do jogador vira NULO. `currencyId`/`marketValueMinor`/
-- `wageExpectationMinor` eram NOT NULL, o que tornava impossível materializar um
-- jogador sem inventar valor — a regra acima proíbe inventar, e o NOT NULL
-- obrigava. Um dos dois tinha de ceder, e não é a regra.
--
-- `0` não seria "barato", seria MENTIRA: diria que o jogador não vale nada.
-- Nulo diz a verdade — ainda não se sabe. É o mesmo argumento do grid de goleiro
-- em quem não é goleiro (R-188): nulo é "não se aplica ainda", zero é afirmação
-- falsa. Quando C9 existir, eles se preenchem e voltam a ser NOT NULL.

-- DropForeignKey
ALTER TABLE "Player" DROP CONSTRAINT "Player_gameWorldId_clubId_fkey";

-- DropIndex
DROP INDEX "Player_gameWorldId_clubId_idx";

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "clubId",
ADD COLUMN     "lastProcessedOn" DATE NOT NULL,
ALTER COLUMN "currencyId" DROP NOT NULL,
ALTER COLUMN "marketValueMinor" DROP NOT NULL,
ALTER COLUMN "wageExpectationMinor" DROP NOT NULL;

