-- `@@unique([actorId, idempotencyKey])` com `actorId` NULLABLE não protege
-- comando de sistema: no Postgres, `NULL != NULL`, então duas linhas
-- (NULL, 'chave') passariam as duas — e o scheduler executaria o mesmo comando
-- de novo em silêncio.
--
-- `NULLS NOT DISTINCT` (PG 15+) faz o índice tratar NULL como valor. O Prisma
-- não expressa, então vai como SQL cru — mais um caso do gate DB-01..DB-16.
DROP INDEX IF EXISTS "IdempotencyKey_actorId_idempotencyKey_key";

CREATE UNIQUE INDEX "IdempotencyKey_actorId_idempotencyKey_key"
  ON "IdempotencyKey" ("actorId", "idempotencyKey")
  NULLS NOT DISTINCT;
