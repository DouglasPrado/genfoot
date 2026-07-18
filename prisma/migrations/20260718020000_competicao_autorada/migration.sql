-- Competição autorada no admin (C7, R-202..R-207).
-- O ciclo de vida do agregado autorado e a janela como DATA (R-177).

-- CreateEnum
CREATE TYPE "CompetitionLifecycle" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'FINISHED');

-- AlterTable: a edição ganha o ciclo autoral e a janela vira data (não relógio).
ALTER TABLE "CompetitionSeason"
  ADD COLUMN "lifecycle" "CompetitionLifecycle" NOT NULL DEFAULT 'DRAFT';

ALTER TABLE "CompetitionSeason"
  ALTER COLUMN "startsAt" DROP NOT NULL,
  ALTER COLUMN "startsAt" SET DATA TYPE DATE,
  ALTER COLUMN "endsAt" SET DATA TYPE DATE;
