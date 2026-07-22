-- CreateTable
CREATE TABLE "IndividualTrainingPlan" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "targetKind" TEXT NOT NULL,
    "targetAttributeCode" TEXT,
    "targetPosition" TEXT,
    "intensity" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "IndividualTrainingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IndividualTrainingPlan_gameWorldId_playerId_key" ON "IndividualTrainingPlan"("gameWorldId", "playerId");

-- CreateIndex
CREATE INDEX "IndividualTrainingPlan_gameWorldId_clubId_idx" ON "IndividualTrainingPlan"("gameWorldId", "clubId");

-- CreateIndex
CREATE INDEX "IndividualTrainingPlan_gameWorldId_idx" ON "IndividualTrainingPlan"("gameWorldId");
