-- Apagar um mundo cascateia pelas competições (C7): a edição some e leva junto
-- seus participantes, estágios e inscrições. Antes, CompetitionClub sem cascade
-- bloqueava a exclusão da edição (e portanto do mundo). O SET NULL do restante
-- (Match/stats → edição) já batia com o schema; aqui só o que faltava.
--
-- Escopo cirúrgico DE PROPÓSITO: o `migrate dev` quis reconciliar drift
-- pré-existente de FKs alheias (FinancialAccount, Player, Offer, MatchEvent…) —
-- a dívida #40. Isso fica para uma reconciliação própria; esta migração só
-- destrava o teardown do mundo.

-- CompetitionClub → CompetitionSeason: CASCADE
ALTER TABLE "CompetitionClub" DROP CONSTRAINT "CompetitionClub_competitionSeasonId_fkey";
ALTER TABLE "CompetitionClub" ADD CONSTRAINT "CompetitionClub_competitionSeasonId_fkey" FOREIGN KEY ("competitionSeasonId") REFERENCES "CompetitionSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CompetitionStage → CompetitionSeason: CASCADE
ALTER TABLE "CompetitionStage" DROP CONSTRAINT "CompetitionStage_competitionSeasonId_fkey";
ALTER TABLE "CompetitionStage" ADD CONSTRAINT "CompetitionStage_competitionSeasonId_fkey" FOREIGN KEY ("competitionSeasonId") REFERENCES "CompetitionSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CompetitionRegistration → CompetitionSeason: CASCADE
ALTER TABLE "CompetitionRegistration" DROP CONSTRAINT "CompetitionRegistration_competitionSeasonId_fkey";
ALTER TABLE "CompetitionRegistration" ADD CONSTRAINT "CompetitionRegistration_competitionSeasonId_fkey" FOREIGN KEY ("competitionSeasonId") REFERENCES "CompetitionSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;
