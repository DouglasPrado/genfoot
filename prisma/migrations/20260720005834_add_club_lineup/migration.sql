-- DropForeignKey
ALTER TABLE "FinancialAccount" DROP CONSTRAINT "FinancialAccount_gameWorldId_clubId_fkey";

-- DropForeignKey
ALTER TABLE "FinancialAccount" DROP CONSTRAINT "FinancialAccount_parentAccountId_fkey";

-- DropForeignKey
ALTER TABLE "MatchEvent" DROP CONSTRAINT "MatchEvent_playerId_fkey";

-- DropForeignKey
ALTER TABLE "MatchEvent" DROP CONSTRAINT "MatchEvent_relatedPlayerId_fkey";

-- DropForeignKey
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_listingId_fkey";

-- DropForeignKey
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_sellingClubId_fkey";

-- DropForeignKey
ALTER TABLE "Player" DROP CONSTRAINT "Player_gameWorldId_personId_fkey";

-- DropForeignKey
ALTER TABLE "PlayerContract" DROP CONSTRAINT "PlayerContract_gameWorldId_clubId_fkey";

-- DropForeignKey
ALTER TABLE "PlayerInjury" DROP CONSTRAINT "PlayerInjury_gameWorldId_playerId_fkey";

-- DropForeignKey
ALTER TABLE "ScoutReport" DROP CONSTRAINT "ScoutReport_gameWorldId_playerId_fkey";

-- DropForeignKey
ALTER TABLE "StaffMember" DROP CONSTRAINT "StaffMember_gameWorldId_personId_fkey";

-- DropForeignKey
ALTER TABLE "TransferListing" DROP CONSTRAINT "TransferListing_gameWorldId_playerId_fkey";

-- CreateTable
CREATE TABLE "ClubLineup" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "formation" TEXT NOT NULL,
    "benchPlayerIds" UUID[],
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ClubLineup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubLineupStarter" (
    "id" UUID NOT NULL,
    "lineupId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "slotPosition" "PlayerPosition" NOT NULL,
    "fillQuality" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ClubLineupStarter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubLineup_gameWorldId_clubId_idx" ON "ClubLineup"("gameWorldId", "clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubLineup_gameWorldId_clubId_key" ON "ClubLineup"("gameWorldId", "clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubLineup_gameWorldId_id_key" ON "ClubLineup"("gameWorldId", "id");

-- CreateIndex
CREATE INDEX "ClubLineupStarter_lineupId_idx" ON "ClubLineupStarter"("lineupId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubLineupStarter_lineupId_slotIndex_key" ON "ClubLineupStarter"("lineupId", "slotIndex");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_gameWorldId_personId_fkey" FOREIGN KEY ("gameWorldId", "personId") REFERENCES "Person"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerContract" ADD CONSTRAINT "PlayerContract_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerInjury" ADD CONSTRAINT "PlayerInjury_gameWorldId_playerId_fkey" FOREIGN KEY ("gameWorldId", "playerId") REFERENCES "Player"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_gameWorldId_personId_fkey" FOREIGN KEY ("gameWorldId", "personId") REFERENCES "Person"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubLineup" ADD CONSTRAINT "ClubLineup_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubLineupStarter" ADD CONSTRAINT "ClubLineupStarter_lineupId_fkey" FOREIGN KEY ("lineupId") REFERENCES "ClubLineup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutReport" ADD CONSTRAINT "ScoutReport_gameWorldId_playerId_fkey" FOREIGN KEY ("gameWorldId", "playerId") REFERENCES "Player"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferListing" ADD CONSTRAINT "TransferListing_gameWorldId_playerId_fkey" FOREIGN KEY ("gameWorldId", "playerId") REFERENCES "Player"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "TransferListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_sellingClubId_fkey" FOREIGN KEY ("sellingClubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_relatedPlayerId_fkey" FOREIGN KEY ("relatedPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
