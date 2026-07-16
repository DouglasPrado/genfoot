-- R-182: `seed`, `startDate` e `rulesetVersion` passam a ter coluna. Sem seed
-- gravado, o mundo não é reproduzível a partir do banco — e replay é invariante
-- canônica (context map:149).
--
-- As três são NOT NULL e não têm valor recuperável para as linhas existentes: o
-- seed de um mundo já criado vive no blob JSON, e migration não lê JSON.
--
-- Apagar é seguro AQUI e só aqui: por R-173 o Postgres nunca foi materializado,
-- então as únicas linhas de `GameWorld` são resíduo de fixture de teste. Não há
-- mundo de produção neste banco. Quando houver, uma migration como esta exige
-- backfill — não este DELETE.
DELETE FROM "GameWorld";

-- AlterTable
ALTER TABLE "GameWorld" ADD COLUMN     "rulesetVersion" TEXT NOT NULL,
ADD COLUMN     "seed" TEXT NOT NULL,
ADD COLUMN     "startDate" DATE NOT NULL,
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "currentDate" SET DATA TYPE DATE,
ALTER COLUMN "maxClubs" DROP NOT NULL,
ALTER COLUMN "initialClubCashMinor" DROP NOT NULL,
ALTER COLUMN "currencyId" DROP NOT NULL;
