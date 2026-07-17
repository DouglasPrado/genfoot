-- C3 (R-175): o clube deixa de ser um item dentro do blob do portfólio.
--
-- `name`/`shortName`/`slug` saem do Club: a identidade é um PERÍODO com vigência
-- (BC-003). Guardá-los na linha do clube fazia cada rebranding sobrescrever o
-- anterior — e o histórico é o que a feature existe para manter.
--
-- Apagar é seguro AQUI: por R-173 o Postgres nunca foi materializado, então as
-- linhas de `Club` são resíduo de fixture. Não há clube de produção. Quando
-- houver, uma migration como esta exige backfill dos períodos de identidade a
-- partir do nome atual — não este DELETE.
DELETE FROM "Club";


-- CreateEnum
CREATE TYPE "StadiumTenure" AS ENUM ('OWNED', 'LEASED');

-- CreateEnum
CREATE TYPE "StadiumLicenseStatus" AS ENUM ('PENDING', 'LICENSED', 'SUSPENDED');

-- AlterEnum
BEGIN;
CREATE TYPE "ClubStatus_new" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISSOLVED');
ALTER TABLE "public"."Club" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Club" ALTER COLUMN "status" TYPE "ClubStatus_new" USING ("status"::text::"ClubStatus_new");
ALTER TYPE "ClubStatus" RENAME TO "ClubStatus_old";
ALTER TYPE "ClubStatus_new" RENAME TO "ClubStatus";
DROP TYPE "public"."ClubStatus_old";
ALTER TABLE "Club" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropIndex
DROP INDEX "Club_gameWorldId_slug_key";

-- AlterTable
ALTER TABLE "Club" DROP COLUMN "city",
DROP COLUMN "country",
DROP COLUMN "level",
DROP COLUMN "name",
DROP COLUMN "reputation",
DROP COLUMN "shortName",
DROP COLUMN "slug",
ADD COLUMN     "regionId" TEXT NOT NULL,
ADD COLUMN     "reputationBand" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "currencyId" DROP NOT NULL,
ALTER COLUMN "cashMinor" DROP NOT NULL,
ALTER COLUMN "wageBudgetMinor" DROP NOT NULL,
ALTER COLUMN "transferBudgetMinor" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ClubIdentityPeriod" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveThrough" DATE,
    "rulesetVersion" TEXT NOT NULL,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "tertiaryColor" TEXT,
    "homeKitTemplateId" TEXT,
    "awayKitTemplateId" TEXT,
    "crestTemplateId" TEXT,

    CONSTRAINT "ClubIdentityPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stadium" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tenure" "StadiumTenure" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "pitchQuality" INTEGER NOT NULL,
    "condition" INTEGER NOT NULL,
    "licenseStatus" "StadiumLicenseStatus" NOT NULL DEFAULT 'PENDING',
    "maintenanceDueOn" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Stadium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketPricePolicy" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "priceMinor" BIGINT NOT NULL,
    "currencyId" UUID,
    "effectiveOn" DATE NOT NULL,
    "rulesetVersion" TEXT NOT NULL,

    CONSTRAINT "TicketPricePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialAgreement" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "asset" TEXT NOT NULL,
    "exclusive" BOOLEAN NOT NULL DEFAULT false,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "externalAgreementRef" TEXT NOT NULL,
    "rulesetVersion" TEXT NOT NULL,

    CONSTRAINT "CommercialAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardDecision" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "decisionType" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveThrough" DATE,
    "recordedAt" DATE NOT NULL,
    "rulesetVersion" TEXT NOT NULL,

    CONSTRAINT "BoardDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubIdentityPeriod_gameWorldId_clubId_idx" ON "ClubIdentityPeriod"("gameWorldId", "clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubIdentityPeriod_gameWorldId_id_key" ON "ClubIdentityPeriod"("gameWorldId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Stadium_gameWorldId_id_key" ON "Stadium"("gameWorldId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Stadium_gameWorldId_clubId_key" ON "Stadium"("gameWorldId", "clubId");

-- CreateIndex
CREATE INDEX "TicketPricePolicy_gameWorldId_clubId_effectiveOn_idx" ON "TicketPricePolicy"("gameWorldId", "clubId", "effectiveOn");

-- CreateIndex
CREATE UNIQUE INDEX "TicketPricePolicy_gameWorldId_id_key" ON "TicketPricePolicy"("gameWorldId", "id");

-- CreateIndex
CREATE INDEX "CommercialAgreement_gameWorldId_clubId_idx" ON "CommercialAgreement"("gameWorldId", "clubId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialAgreement_gameWorldId_id_key" ON "CommercialAgreement"("gameWorldId", "id");

-- CreateIndex
CREATE INDEX "BoardDecision_gameWorldId_clubId_idx" ON "BoardDecision"("gameWorldId", "clubId");

-- CreateIndex
CREATE UNIQUE INDEX "BoardDecision_gameWorldId_id_key" ON "BoardDecision"("gameWorldId", "id");

-- AddForeignKey
ALTER TABLE "ClubIdentityPeriod" ADD CONSTRAINT "ClubIdentityPeriod_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stadium" ADD CONSTRAINT "Stadium_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPricePolicy" ADD CONSTRAINT "TicketPricePolicy_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialAgreement" ADD CONSTRAINT "CommercialAgreement_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardDecision" ADD CONSTRAINT "BoardDecision_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;



-- "Nome único por mundo" (context map:153). PARCIAL sobre o período VIGENTE:
-- dois clubes não podem se chamar igual HOJE, mas um nome abandonado num
-- rebranding volta ao pool. Um unique total proibiria reusar o próprio nome
-- antigo. O Prisma não expressa índice parcial — vai como SQL cru.
CREATE UNIQUE INDEX "ClubIdentityPeriod_nome_unico_vigente"
  ON "ClubIdentityPeriod" ("gameWorldId", "name")
  WHERE "effectiveThrough" IS NULL;

-- 1 período vigente por clube: o clube tem UM nome hoje.
CREATE UNIQUE INDEX "ClubIdentityPeriod_um_vigente_por_clube"
  ON "ClubIdentityPeriod" ("gameWorldId", "clubId")
  WHERE "effectiveThrough" IS NULL;
