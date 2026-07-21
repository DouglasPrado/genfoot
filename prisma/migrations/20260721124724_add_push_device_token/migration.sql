-- CreateTable
CREATE TABLE "PushDeviceToken" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "expoPushToken" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'ios',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushDeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushDeviceToken_expoPushToken_key" ON "PushDeviceToken"("expoPushToken");

-- CreateIndex
CREATE INDEX "PushDeviceToken_accountId_idx" ON "PushDeviceToken"("accountId");

-- AddForeignKey
ALTER TABLE "PushDeviceToken" ADD CONSTRAINT "PushDeviceToken_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
