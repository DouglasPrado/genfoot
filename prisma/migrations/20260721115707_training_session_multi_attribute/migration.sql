-- Treino de até 5 habilidades (decisão do dono): a sessão passa a mirar uma
-- LISTA de atributos, e o ganho é dividido entre eles. Preserva os dados: o
-- atributo único vira um array de 1 elemento (nenhuma sessão perde o foco).
ALTER TABLE "TrainingSession" ADD COLUMN "attributeCodes" TEXT[];
UPDATE "TrainingSession" SET "attributeCodes" = ARRAY["attributeCode"] WHERE "attributeCode" IS NOT NULL;
ALTER TABLE "TrainingSession" DROP COLUMN "attributeCode";
