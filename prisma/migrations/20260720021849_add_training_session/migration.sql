-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "attributeCode" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingSession_gameWorldId_playerId_idx" ON "TrainingSession"("gameWorldId", "playerId");

-- CreateIndex
CREATE INDEX "TrainingSession_playerId_active_idx" ON "TrainingSession"("playerId", "active");

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
