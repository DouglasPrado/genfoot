-- CreateTable
CREATE TABLE "Mentorship" (
    "id" UUID NOT NULL,
    "gameWorldId" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "menteeId" UUID NOT NULL,
    "mentorId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Mentorship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mentorship_gameWorldId_menteeId_key" ON "Mentorship"("gameWorldId", "menteeId");

-- CreateIndex
CREATE INDEX "Mentorship_gameWorldId_clubId_idx" ON "Mentorship"("gameWorldId", "clubId");

-- CreateIndex
CREATE INDEX "Mentorship_gameWorldId_idx" ON "Mentorship"("gameWorldId");
