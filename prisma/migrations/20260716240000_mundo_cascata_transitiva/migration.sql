-- O mundo é a raiz de TUDO — transitivamente.
--
-- A migration anterior (`mundo_cascata`) pôs CASCADE nas 14 FKs que apontam
-- direto para `GameWorld`. Não bastou, e o teste por HTTP mostrou por quê:
-- apagar o mundo cascateava até o `Club` e parava ali, porque os filhos DO CLUBE
-- (`ClubControl`, `ClubIdentityPeriod`, `Stadium`, `ClubDepartment`…) tinham FK
-- RESTRICT. `Foreign key constraint violated on: ClubControl_gameWorldId_clubId_fkey`.
--
-- A regra que faltava enunciar: **toda FK que aponta para uma tabela
-- world-scoped é CASCADE**. Se a linha referida morre com o mundo, quem depende
-- dela morre junto — um `ClubControl` sem `Club` não é órfão, é lixo. As 54
-- tabelas com `gameWorldId` formam uma árvore cuja raiz é o mundo, e a árvore
-- inteira tem de cair de uma vez.
--
-- Estas 66 linhas foram GERADAS a partir do catálogo do Postgres
-- (`pg_get_constraintdef`), não escritas de memória: uma lista à mão erraria por
-- omissão, e o erro só apareceria no dia em que alguém apagasse um mundo.
--
-- FKs para tabelas GLOBAIS ficam de fora, e é a distinção que importa:
-- `UserAccount` é global (R-172) e não morre com mundo nenhum.
ALTER TABLE "AutomationRule" DROP CONSTRAINT "AutomationRule_gameWorldId_clubId_fkey";
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardDecision" DROP CONSTRAINT "BoardDecision_gameWorldId_clubId_fkey";
ALTER TABLE "BoardDecision" ADD CONSTRAINT "BoardDecision_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubAIProfile" DROP CONSTRAINT "ClubAIProfile_clubId_fkey";
ALTER TABLE "ClubAIProfile" ADD CONSTRAINT "ClubAIProfile_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubControl" DROP CONSTRAINT "ClubControl_gameWorldId_worldParticipantId_fkey";
ALTER TABLE "ClubControl" ADD CONSTRAINT "ClubControl_gameWorldId_worldParticipantId_fkey" FOREIGN KEY ("gameWorldId", "worldParticipantId") REFERENCES "WorldParticipant"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubControl" DROP CONSTRAINT "ClubControl_gameWorldId_clubId_fkey";
ALTER TABLE "ClubControl" ADD CONSTRAINT "ClubControl_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubDepartment" DROP CONSTRAINT "ClubDepartment_gameWorldId_clubId_fkey";
ALTER TABLE "ClubDepartment" ADD CONSTRAINT "ClubDepartment_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubEntryReservation" DROP CONSTRAINT "ClubEntryReservation_gameWorldId_clubId_fkey";
ALTER TABLE "ClubEntryReservation" ADD CONSTRAINT "ClubEntryReservation_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubEntryReservation" DROP CONSTRAINT "ClubEntryReservation_gameWorldId_worldParticipantId_fkey";
ALTER TABLE "ClubEntryReservation" ADD CONSTRAINT "ClubEntryReservation_gameWorldId_worldParticipantId_fkey" FOREIGN KEY ("gameWorldId", "worldParticipantId") REFERENCES "WorldParticipant"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubFinanceSnapshot" DROP CONSTRAINT "ClubFinanceSnapshot_gameWorldId_clubId_fkey";
ALTER TABLE "ClubFinanceSnapshot" ADD CONSTRAINT "ClubFinanceSnapshot_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubIdentityPeriod" DROP CONSTRAINT "ClubIdentityPeriod_gameWorldId_clubId_fkey";
ALTER TABLE "ClubIdentityPeriod" ADD CONSTRAINT "ClubIdentityPeriod_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubSeasonStats" DROP CONSTRAINT "ClubSeasonStats_clubId_fkey";
ALTER TABLE "ClubSeasonStats" ADD CONSTRAINT "ClubSeasonStats_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialAgreement" DROP CONSTRAINT "CommercialAgreement_gameWorldId_clubId_fkey";
ALTER TABLE "CommercialAgreement" ADD CONSTRAINT "CommercialAgreement_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompetitionSeason" DROP CONSTRAINT "CompetitionSeason_competitionId_fkey";
ALTER TABLE "CompetitionSeason" ADD CONSTRAINT "CompetitionSeason_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialAccount" DROP CONSTRAINT "FinancialAccount_parentAccountId_fkey";
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "FinancialAccount"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialAccount" DROP CONSTRAINT "FinancialAccount_gameWorldId_clubId_fkey";
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" DROP CONSTRAINT "FinancialTransaction_gameWorldId_clubId_fkey";
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JournalLine" DROP CONSTRAINT "JournalLine_journalEntryId_fkey";
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JournalLine" DROP CONSTRAINT "JournalLine_financialAccountId_fkey";
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Match" DROP CONSTRAINT "Match_awayClubId_fkey";
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayClubId_fkey" FOREIGN KEY ("awayClubId") REFERENCES "Club"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Match" DROP CONSTRAINT "Match_homeClubId_fkey";
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeClubId_fkey" FOREIGN KEY ("homeClubId") REFERENCES "Club"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchCommandLog" DROP CONSTRAINT "MatchCommandLog_simulationId_fkey";
ALTER TABLE "MatchCommandLog" ADD CONSTRAINT "MatchCommandLog_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "MatchSimulation"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchDecisionPoint" DROP CONSTRAINT "MatchDecisionPoint_matchId_fkey";
ALTER TABLE "MatchDecisionPoint" ADD CONSTRAINT "MatchDecisionPoint_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchEvent" DROP CONSTRAINT "MatchEvent_matchId_fkey";
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchEvent" DROP CONSTRAINT "MatchEvent_playerId_fkey";
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchEvent" DROP CONSTRAINT "MatchEvent_relatedPlayerId_fkey";
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_relatedPlayerId_fkey" FOREIGN KEY ("relatedPlayerId") REFERENCES "Player"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchLineup" DROP CONSTRAINT "MatchLineup_matchId_fkey";
ALTER TABLE "MatchLineup" ADD CONSTRAINT "MatchLineup_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchLineupPlayer" DROP CONSTRAINT "MatchLineupPlayer_playerId_fkey";
ALTER TABLE "MatchLineupPlayer" ADD CONSTRAINT "MatchLineupPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchSimulation" DROP CONSTRAINT "MatchSimulation_matchId_fkey";
ALTER TABLE "MatchSimulation" ADD CONSTRAINT "MatchSimulation_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchSimulationTick" DROP CONSTRAINT "MatchSimulationTick_simulationId_fkey";
ALTER TABLE "MatchSimulationTick" ADD CONSTRAINT "MatchSimulationTick_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "MatchSimulation"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchTeamState" DROP CONSTRAINT "MatchTeamState_matchId_fkey";
ALTER TABLE "MatchTeamState" ADD CONSTRAINT "MatchTeamState_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_sellingClubId_fkey";
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_sellingClubId_fkey" FOREIGN KEY ("sellingClubId") REFERENCES "Club"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_buyingClubId_fkey";
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_buyingClubId_fkey" FOREIGN KEY ("buyingClubId") REFERENCES "Club"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_listingId_fkey";
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "TransferListing"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_gameWorldId_playerId_fkey";
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_gameWorldId_playerId_fkey" FOREIGN KEY ("gameWorldId", "playerId") REFERENCES "Player"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Player" DROP CONSTRAINT "Player_gameWorldId_clubId_fkey";
ALTER TABLE "Player" ADD CONSTRAINT "Player_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Player" DROP CONSTRAINT "Player_gameWorldId_personId_fkey";
ALTER TABLE "Player" ADD CONSTRAINT "Player_gameWorldId_personId_fkey" FOREIGN KEY ("gameWorldId", "personId") REFERENCES "Person"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerAttributes" DROP CONSTRAINT "PlayerAttributes_playerId_fkey";
ALTER TABLE "PlayerAttributes" ADD CONSTRAINT "PlayerAttributes_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerBackground" DROP CONSTRAINT "PlayerBackground_playerId_fkey";
ALTER TABLE "PlayerBackground" ADD CONSTRAINT "PlayerBackground_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerCompetitionDiscipline" DROP CONSTRAINT "PlayerCompetitionDiscipline_gameWorldId_playerId_fkey";
ALTER TABLE "PlayerCompetitionDiscipline" ADD CONSTRAINT "PlayerCompetitionDiscipline_gameWorldId_playerId_fkey" FOREIGN KEY ("gameWorldId", "playerId") REFERENCES "Player"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerContract" DROP CONSTRAINT "PlayerContract_gameWorldId_playerId_fkey";
ALTER TABLE "PlayerContract" ADD CONSTRAINT "PlayerContract_gameWorldId_playerId_fkey" FOREIGN KEY ("gameWorldId", "playerId") REFERENCES "Player"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerContract" DROP CONSTRAINT "PlayerContract_gameWorldId_clubId_fkey";
ALTER TABLE "PlayerContract" ADD CONSTRAINT "PlayerContract_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerDevelopment" DROP CONSTRAINT "PlayerDevelopment_playerId_fkey";
ALTER TABLE "PlayerDevelopment" ADD CONSTRAINT "PlayerDevelopment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerDevelopmentAccrual" DROP CONSTRAINT "PlayerDevelopmentAccrual_playerId_fkey";
ALTER TABLE "PlayerDevelopmentAccrual" ADD CONSTRAINT "PlayerDevelopmentAccrual_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerInjury" DROP CONSTRAINT "PlayerInjury_gameWorldId_playerId_fkey";
ALTER TABLE "PlayerInjury" ADD CONSTRAINT "PlayerInjury_gameWorldId_playerId_fkey" FOREIGN KEY ("gameWorldId", "playerId") REFERENCES "Player"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerMatchStats" DROP CONSTRAINT "PlayerMatchStats_playerId_fkey";
ALTER TABLE "PlayerMatchStats" ADD CONSTRAINT "PlayerMatchStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerMatchStats" DROP CONSTRAINT "PlayerMatchStats_matchId_fkey";
ALTER TABLE "PlayerMatchStats" ADD CONSTRAINT "PlayerMatchStats_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerPersonality" DROP CONSTRAINT "PlayerPersonality_playerId_fkey";
ALTER TABLE "PlayerPersonality" ADD CONSTRAINT "PlayerPersonality_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerRegistration" DROP CONSTRAINT "PlayerRegistration_registrationId_fkey";
ALTER TABLE "PlayerRegistration" ADD CONSTRAINT "PlayerRegistration_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "CompetitionRegistration"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerSeasonStats" DROP CONSTRAINT "PlayerSeasonStats_playerId_fkey";
ALTER TABLE "PlayerSeasonStats" ADD CONSTRAINT "PlayerSeasonStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerSuspension" DROP CONSTRAINT "PlayerSuspension_gameWorldId_playerId_fkey";
ALTER TABLE "PlayerSuspension" ADD CONSTRAINT "PlayerSuspension_gameWorldId_playerId_fkey" FOREIGN KEY ("gameWorldId", "playerId") REFERENCES "Player"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SagaStep" DROP CONSTRAINT "SagaStep_sagaInstanceId_fkey";
ALTER TABLE "SagaStep" ADD CONSTRAINT "SagaStep_sagaInstanceId_fkey" FOREIGN KEY ("sagaInstanceId") REFERENCES "SagaInstance"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoutReport" DROP CONSTRAINT "ScoutReport_gameWorldId_playerId_fkey";
ALTER TABLE "ScoutReport" ADD CONSTRAINT "ScoutReport_gameWorldId_playerId_fkey" FOREIGN KEY ("gameWorldId", "playerId") REFERENCES "Player"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoutReport" DROP CONSTRAINT "ScoutReport_gameWorldId_clubId_fkey";
ALTER TABLE "ScoutReport" ADD CONSTRAINT "ScoutReport_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Squad" DROP CONSTRAINT "Squad_gameWorldId_clubId_fkey";
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SquadMembership" DROP CONSTRAINT "SquadMembership_playerId_fkey";
ALTER TABLE "SquadMembership" ADD CONSTRAINT "SquadMembership_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SquadMembership" DROP CONSTRAINT "SquadMembership_squadId_fkey";
ALTER TABLE "SquadMembership" ADD CONSTRAINT "SquadMembership_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Stadium" DROP CONSTRAINT "Stadium_gameWorldId_clubId_fkey";
ALTER TABLE "Stadium" ADD CONSTRAINT "Stadium_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffContract" DROP CONSTRAINT "StaffContract_clubId_fkey";
ALTER TABLE "StaffContract" ADD CONSTRAINT "StaffContract_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffContract" DROP CONSTRAINT "StaffContract_gameWorldId_staffId_fkey";
ALTER TABLE "StaffContract" ADD CONSTRAINT "StaffContract_gameWorldId_staffId_fkey" FOREIGN KEY ("gameWorldId", "staffId") REFERENCES "StaffMember"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffMember" DROP CONSTRAINT "StaffMember_gameWorldId_personId_fkey";
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_gameWorldId_personId_fkey" FOREIGN KEY ("gameWorldId", "personId") REFERENCES "Person"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketPricePolicy" DROP CONSTRAINT "TicketPricePolicy_gameWorldId_clubId_fkey";
ALTER TABLE "TicketPricePolicy" ADD CONSTRAINT "TicketPricePolicy_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingPlan" DROP CONSTRAINT "TrainingPlan_gameWorldId_clubId_fkey";
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingPlayerEntry" DROP CONSTRAINT "TrainingPlayerEntry_playerId_fkey";
ALTER TABLE "TrainingPlayerEntry" ADD CONSTRAINT "TrainingPlayerEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingPlayerEntry" DROP CONSTRAINT "TrainingPlayerEntry_trainingPlanId_fkey";
ALTER TABLE "TrainingPlayerEntry" ADD CONSTRAINT "TrainingPlayerEntry_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransferListing" DROP CONSTRAINT "TransferListing_gameWorldId_playerId_fkey";
ALTER TABLE "TransferListing" ADD CONSTRAINT "TransferListing_gameWorldId_playerId_fkey" FOREIGN KEY ("gameWorldId", "playerId") REFERENCES "Player"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransferListing" DROP CONSTRAINT "TransferListing_gameWorldId_clubId_fkey";
ALTER TABLE "TransferListing" ADD CONSTRAINT "TransferListing_gameWorldId_clubId_fkey" FOREIGN KEY ("gameWorldId", "clubId") REFERENCES "Club"("gameWorldId", id) ON DELETE CASCADE ON UPDATE CASCADE;
