-- R-188 — o grid de atributos passa a ser o do GDD §2. O schema copiou o
-- Football Manager.
--
-- As colunas que caem são os nomes do FM: `technique`, `flair`, `teamwork`,
-- `workRate` — e `aggression`, que o GDD classifica como TRAÇO ("temperamento"),
-- não atributo: traço tem intensidade e visibilidade, e não sobe com treino.
--
-- As que nascem são as que faltavam da lista canônica: bola parada, visão de
-- jogo, explosão, recuperação física, disciplina, regularidade, resiliência e 3
-- atributos de goleiro (jogo aéreo, defesa de pênalti, comando de área).
--
-- `passing` vira `shortPassing` + `longPassing`: o GDD separa passe curto de
-- lançamento, e o schema tinha um só.
--
-- `Player.consistency` sai do root: é a "regularidade" da §2 — atributo mental.
--
-- Por que o GDD ganha do schema: a §2 se declara **fonte única** da lista
-- (`02-sistema-de-jogadores.md:107`), e a R-09 manda o `overall` ser "média
-- ponderada do **grid canônico** por posição". Com o grid do FM, R-09 não tem
-- sobre o que operar e o treino (§6) não tem eixo.
--
-- `ADD COLUMN ... NOT NULL` sem default só passa em tabela vazia, e ela está:
-- C4 nunca teve adapter, então `PlayerAttributes` nunca recebeu linha. Não há
-- dado a preservar (R-173), e um mundo se regenera do seed (R-182).
--
-- O `id` cai junto: `PlayerAttributes` é filho 1:1 de `Player`, não root — a
-- régua de R-183/R-187 (contenção + `version`). A chave é o jogador.

-- DropIndex
DROP INDEX "PlayerAttributes_playerId_key";

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "consistency";

-- AlterTable
ALTER TABLE "PlayerAttributes" DROP CONSTRAINT "PlayerAttributes_pkey",
DROP COLUMN "aggression",
DROP COLUMN "flair",
DROP COLUMN "id",
DROP COLUMN "passing",
DROP COLUMN "teamwork",
DROP COLUMN "technique",
DROP COLUMN "workRate",
ADD COLUMN     "consistency" INTEGER NOT NULL,
ADD COLUMN     "discipline" INTEGER NOT NULL,
ADD COLUMN     "explosiveness" INTEGER NOT NULL,
ADD COLUMN     "goalkeeperAerial" INTEGER,
ADD COLUMN     "goalkeeperCommand" INTEGER,
ADD COLUMN     "goalkeeperPenalty" INTEGER,
ADD COLUMN     "longPassing" INTEGER NOT NULL,
ADD COLUMN     "recovery" INTEGER NOT NULL,
ADD COLUMN     "resilience" INTEGER NOT NULL,
ADD COLUMN     "setPieces" INTEGER NOT NULL,
ADD COLUMN     "shortPassing" INTEGER NOT NULL,
ADD COLUMN     "vision" INTEGER NOT NULL,
ADD CONSTRAINT "PlayerAttributes_pkey" PRIMARY KEY ("playerId");
