-- Divisões de um mesmo campeonato (R-204): coluna de agrupamento + índice.
-- As divisões compartilham `championshipId` e diferem pelo `tier`; é o que liga
-- a pirâmide para o acesso/rebaixamento na virada de temporada.
ALTER TABLE "Competition" ADD COLUMN "championshipId" UUID;
CREATE INDEX "Competition_gameWorldId_championshipId_idx"
  ON "Competition" ("gameWorldId", "championshipId");
