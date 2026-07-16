
-- CreateEnum
CREATE TYPE "ClubEntryReservationStatus" AS ENUM ('HELD', 'CONFIRMED', 'EXPIRED', 'RELEASED');

-- CreateTable
CREATE TABLE "ClubEntryReservation" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "worldParticipantId" UUID NOT NULL,
    "status" "ClubEntryReservationStatus" NOT NULL DEFAULT 'HELD',
    "heldOn" DATE NOT NULL,
    "expiresOn" DATE NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ClubEntryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubEntryReservation_gameWorldId_clubId_idx" ON "ClubEntryReservation"("gameWorldId", "clubId");

-- CreateIndex
CREATE INDEX "ClubEntryReservation_gameWorldId_worldParticipantId_idx" ON "ClubEntryReservation"("gameWorldId", "worldParticipantId");

-- CreateIndex
CREATE INDEX "ClubEntryReservation_status_expiresOn_idx" ON "ClubEntryReservation"("status", "expiresOn");

-- CreateIndex
CREATE UNIQUE INDEX "ClubEntryReservation_gameWorldId_id_key" ON "ClubEntryReservation"("gameWorldId", "id");

-- AddForeignKey
ALTER TABLE "ClubEntryReservation" ADD CONSTRAINT "ClubEntryReservation_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEntryReservation" ADD CONSTRAINT "ClubEntryReservation_gameWorldId_worldParticipantId_fkey" FOREIGN KEY ("gameWorldId", "worldParticipantId") REFERENCES "WorldParticipant"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- "1 reserva HELD por clube": era `world-identity.ts:577`, um `.some()` sobre o
-- array de reservas do mundo inteiro carregado em memória.
--
-- Parcial (`WHERE status = 'HELD'`), e o Prisma não expressa índice parcial.
-- Sem o WHERE, um clube nunca poderia ser reservado duas vezes na história —
-- nem depois de a primeira reserva expirar ou ser liberada.
CREATE UNIQUE INDEX "ClubEntryReservation_uma_retida_por_clube"
  ON "ClubEntryReservation" ("gameWorldId", "clubId")
  WHERE "status" = 'HELD';
