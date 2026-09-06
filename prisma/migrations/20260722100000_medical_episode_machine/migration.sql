-- Departamento médico: `PlayerInjury` deixa de ser um registro inerte e passa a
-- carregar a máquina MED-1..MED-9 (docs/02-tecnico/14-maquinas-de-estado.md §6).

CREATE TYPE "MedicalEpisodeState" AS ENUM ('EVALUATION', 'EXAMS', 'DIAGNOSIS', 'REHAB', 'COMPETITIVE_RETURN', 'DISCHARGE', 'MEDICAL_RETIREMENT');
CREATE TYPE "InjuryTypeCode" AS ENUM ('LIGHT', 'MODERATE', 'SERIOUS', 'MUSCULAR', 'IMPACT', 'RECURRENT');
CREATE TYPE "InjuryCauseCode" AS ENUM ('MATCH', 'TRAINING', 'WEAR');
CREATE TYPE "TreatmentOptionCode" AS ENUM ('CONSERVATIVE', 'STANDARD', 'INTENSIVE', 'SURGERY');

ALTER TABLE "PlayerInjury"
  ADD COLUMN "clubId" UUID,
  ADD COLUMN "state" "MedicalEpisodeState" NOT NULL DEFAULT 'EVALUATION',
  ADD COLUMN "rehabStage" INTEGER,
  ADD COLUMN "injuryType" "InjuryTypeCode" NOT NULL DEFAULT 'LIGHT',
  ADD COLUMN "cause" "InjuryCauseCode" NOT NULL DEFAULT 'WEAR',
  ADD COLUMN "region" TEXT NOT NULL DEFAULT 'indefinida',
  ADD COLUMN "diagnosisMinimumDays" INTEGER,
  ADD COLUMN "diagnosisMaximumDays" INTEGER,
  ADD COLUMN "returnRiskScore" INTEGER,
  ADD COLUMN "diagnosisRevisions" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "treatmentOption" "TreatmentOptionCode",
  ADD COLUMN "treatmentStartedAt" TIMESTAMP(3),
  ADD COLUMN "relapseCount" INTEGER NOT NULL DEFAULT 0;

-- Linhas antigas já recuperadas nascem no terminal do episódio: elas descrevem
-- uma lesão encerrada, não um caso aberto na avaliação.
UPDATE "PlayerInjury" SET "state" = 'DISCHARGE' WHERE "recoveredAt" IS NOT NULL;

CREATE INDEX "PlayerInjury_gameWorldId_clubId_state_idx" ON "PlayerInjury"("gameWorldId", "clubId", "state");
