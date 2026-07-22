-- CreateTable
CREATE TABLE "GroupTrainingSession" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "formation" TEXT NOT NULL,
    "participantIds" UUID[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "GroupTrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupTrainingSession_gameWorldId_clubId_active_idx" ON "GroupTrainingSession"("gameWorldId", "clubId", "active");
