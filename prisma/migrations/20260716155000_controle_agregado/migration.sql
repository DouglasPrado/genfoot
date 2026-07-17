
-- CreateEnum
CREATE TYPE "ClubControlStatus" AS ENUM ('ACTIVE', 'ENDED');

-- DropForeignKey
ALTER TABLE "ClubControl" DROP CONSTRAINT "ClubControl_worldParticipantId_fkey";

-- DropIndex
DROP INDEX "ClubControl_worldParticipantId_idx";

-- AlterTable
ALTER TABLE "Club" DROP COLUMN "controlType";

-- AlterTable
ALTER TABLE "ClubControl" DROP COLUMN "controlType",
DROP COLUMN "endsAtWorldTick",
DROP COLUMN "isActive",
DROP COLUMN "startsAtWorldTick",
ADD COLUMN     "endedOn" DATE,
ADD COLUMN     "endedReason" TEXT,
ADD COLUMN     "startsOn" DATE NOT NULL,
ADD COLUMN     "status" "ClubControlStatus" NOT NULL DEFAULT 'ACTIVE';

-- DropEnum
DROP TYPE "ClubControlType";

-- CreateIndex
CREATE INDEX "ClubControl_gameWorldId_worldParticipantId_idx" ON "ClubControl"("gameWorldId", "worldParticipantId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubControl_gameWorldId_id_key" ON "ClubControl"("gameWorldId", "id");

-- AddForeignKey
ALTER TABLE "ClubControl" ADD CONSTRAINT "ClubControl_gameWorldId_worldParticipantId_fkey" FOREIGN KEY ("gameWorldId", "worldParticipantId") REFERENCES "WorldParticipant"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- "1 controle ativo por clube": a invariante que `world-identity.ts:545`
-- sustentava varrendo um array em memória, e que agora é do banco.
--
-- Índice único PARCIAL: o Prisma não o expressa (só `@@unique` total), então
-- vai como SQL cru. Sem o `WHERE`, um clube não poderia ter dois controles nem
-- ao longo do tempo — e trocar de gestor ficaria impossível.
CREATE UNIQUE INDEX "ClubControl_um_ativo_por_clube"
  ON "ClubControl" ("gameWorldId", "clubId")
  WHERE "status" = 'ACTIVE';
