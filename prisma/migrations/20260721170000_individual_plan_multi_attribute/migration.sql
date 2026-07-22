-- AlterTable: o alvo ATRIBUTO passa a mirar até 5 habilidades (ganho dividido).
-- Preserva os planos existentes: o código único vira um array de um elemento.
ALTER TABLE "IndividualTrainingPlan" ADD COLUMN "targetAttributeCodes" TEXT[] NOT NULL DEFAULT '{}';

UPDATE "IndividualTrainingPlan"
SET "targetAttributeCodes" = ARRAY["targetAttributeCode"]
WHERE "targetAttributeCode" IS NOT NULL;

ALTER TABLE "IndividualTrainingPlan" DROP COLUMN "targetAttributeCode";
