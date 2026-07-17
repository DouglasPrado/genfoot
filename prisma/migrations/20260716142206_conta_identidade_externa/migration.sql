-- AlterTable
ALTER TABLE "UserAccount" ADD COLUMN     "externalSubject" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_externalSubject_key" ON "UserAccount"("externalSubject");
