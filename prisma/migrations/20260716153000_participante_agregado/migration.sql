
-- CreateEnum
CREATE TYPE "WorldParticipantStatus" AS ENUM ('ACTIVE', 'ENDED');

-- AlterTable
ALTER TABLE "WorldParticipant" DROP COLUMN "joinedAt",
DROP COLUMN "leftAt",
ADD COLUMN     "joinedOn" DATE NOT NULL,
ADD COLUMN     "leftOn" DATE,
DROP COLUMN "status",
ADD COLUMN     "status" "WorldParticipantStatus" NOT NULL DEFAULT 'ACTIVE';

