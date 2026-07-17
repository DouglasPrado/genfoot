-- Deletar um mundo apaga o mundo INTEIRO.
--
-- As 14 FKs que apontam para `GameWorld` eram `RESTRICT`: o mundo não podia ser
-- deletado enquanto tivesse qualquer filho, ou seja, nunca. Apagar à mão, tabela
-- por tabela, na ordem certa, seria uma lista que quebra silenciosamente toda
-- vez que um contexto voltar e trouxer tabela nova.
--
-- CASCADE é a verdade física: o mundo é a raiz de tudo (R-182). Um `Club` sem
-- `GameWorld` não é um clube órfão — é lixo. O que pende do mundo morre com ele,
-- e o banco garante isso sem ninguém lembrar.
--
-- `UserSession` fica em SET NULL, e é a exceção que importa: a sessão é da CONTA
-- (global, R-172), não do mundo. Apagar um mundo não pode deslogar ninguém — só
-- desfaz o vínculo da sessão com aquele mundo.
--
-- `ON UPDATE CASCADE` mantido: o id do mundo nunca muda, mas mudar a regra de
-- update junto seria alterar coisa que ninguém pediu.

ALTER TABLE "Club" DROP CONSTRAINT "Club_gameWorldId_fkey";
ALTER TABLE "Club" ADD CONSTRAINT "Club_gameWorldId_fkey"
  FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Competition" DROP CONSTRAINT "Competition_gameWorldId_fkey";
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_gameWorldId_fkey"
  FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EconomySnapshot" DROP CONSTRAINT "EconomySnapshot_gameWorldId_fkey";
ALTER TABLE "EconomySnapshot" ADD CONSTRAINT "EconomySnapshot_gameWorldId_fkey"
  FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GameAuditLog" DROP CONSTRAINT "GameAuditLog_gameWorldId_fkey";
ALTER TABLE "GameAuditLog" ADD CONSTRAINT "GameAuditLog_gameWorldId_fkey"
  FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GameEconomyConfig" DROP CONSTRAINT "GameEconomyConfig_gameWorldId_fkey";
ALTER TABLE "GameEconomyConfig" ADD CONSTRAINT "GameEconomyConfig_gameWorldId_fkey"
  FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GameRuleConfig" DROP CONSTRAINT "GameRuleConfig_gameWorldId_fkey";
ALTER TABLE "GameRuleConfig" ADD CONSTRAINT "GameRuleConfig_gameWorldId_fkey"
  FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Narrative" DROP CONSTRAINT "Narrative_gameWorldId_fkey";
ALTER TABLE "Narrative" ADD CONSTRAINT "Narrative_gameWorldId_fkey"
  FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" DROP CONSTRAINT "Notification_gameWorldId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_gameWorldId_fkey"
  FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Person" DROP CONSTRAINT "Person_gameWorldId_fkey";
ALTER TABLE "Person" ADD CONSTRAINT "Person_gameWorldId_fkey"
  FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Player" DROP CONSTRAINT "Player_gameWorldId_fkey";
ALTER TABLE "Player" ADD CONSTRAINT "Player_gameWorldId_fkey"
  FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Season" DROP CONSTRAINT "Season_gameWorldId_fkey";
ALTER TABLE "Season" ADD CONSTRAINT "Season_gameWorldId_fkey"
  FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffMember" DROP CONSTRAINT "StaffMember_gameWorldId_fkey";
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_gameWorldId_fkey"
  FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorldParticipant" DROP CONSTRAINT "WorldParticipant_gameWorldId_fkey";
ALTER TABLE "WorldParticipant" ADD CONSTRAINT "WorldParticipant_gameWorldId_fkey"
  FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- `DomainEventLog` e `IdempotencyKey` guardam `gameWorldId` SEM FK declarada
-- (`schema.prisma`: campo solto, sem `@relation`). O CASCADE não os alcança, e a
-- deleção tem de apagá-los explicitamente — está no adapter, e é por isso que
-- ele não é só um `delete` de uma linha.
