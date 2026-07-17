-- O departamento não tem identidade própria: ele É o par (clube, tipo).
-- Ninguém o referencia por id — o InfrastructureProject aponta o alvo pelo
-- `kind` —, e o domínio nunca teve `ClubDepartmentId`. O uuid sintético era uma
-- chave que nada usava e que o agregado teria de inventar a cada save.
--
-- A chave natural vira a chave primária: um clube tem no máximo um departamento
-- de cada tipo deixa de ser convenção e vira constraint.

ALTER TABLE "ClubDepartment" DROP CONSTRAINT "ClubDepartment_pkey";
DROP INDEX IF EXISTS "ClubDepartment_clubId_type_key";
DROP INDEX IF EXISTS "ClubDepartment_gameWorldId_clubId_idx";
ALTER TABLE "ClubDepartment" DROP COLUMN "id";
ALTER TABLE "ClubDepartment"
  ADD CONSTRAINT "ClubDepartment_pkey" PRIMARY KEY ("gameWorldId", "clubId", "type");
