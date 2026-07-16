-- R-175: o departamento é FILHO do Club, não root — `version` some (quem
-- versiona é o clube). O enum cai de 10 para os 6 do domínio: STADIUM virou
-- entidade, INFRASTRUCTURE colide com InfrastructureProject, BOARD é
-- governança, FINANCE é do C9, e COMMUNICATION/DATA_ANALYSIS não têm comando.
--
-- Seguro apagar: por R-173 o Postgres nunca foi materializado; estas linhas são
-- resíduo de fixture.
DELETE FROM "ClubDepartment";


-- AlterEnum
BEGIN;
CREATE TYPE "DepartmentType_new" AS ENUM ('FOOTBALL', 'TRAINING', 'MEDICAL', 'SCOUTING', 'YOUTH', 'COMMERCIAL');
ALTER TABLE "ClubDepartment" ALTER COLUMN "type" TYPE "DepartmentType_new" USING ("type"::text::"DepartmentType_new");
ALTER TYPE "DepartmentType" RENAME TO "DepartmentType_old";
ALTER TYPE "DepartmentType_new" RENAME TO "DepartmentType";
DROP TYPE "public"."DepartmentType_old";
COMMIT;

-- AlterTable
ALTER TABLE "ClubDepartment" DROP COLUMN "qualityScore",
DROP COLUMN "version",
ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "condition" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "maintenanceDueOn" DATE,
ADD COLUMN     "targetLevel" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "currencyId" DROP NOT NULL,
ALTER COLUMN "maintenanceCostPerSeasonMinor" DROP NOT NULL,
ALTER COLUMN "upgradeCostMinor" DROP NOT NULL;

