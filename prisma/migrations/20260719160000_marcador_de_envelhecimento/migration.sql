-- R-217: idempotência da virada de envelhecimento.
--
-- A virada declina atributos e aposenta UMA VEZ por temporada (INV-29). Sem um
-- marcador, reprocessar a virada (retry, double-click, replay) declinava de novo
-- o jogador que sobreviveu — provado por HTTP: strength 63 → 61 em duas chamadas.
-- Esta coluna registra a última temporada envelhecida; a aplicação pula quem já
-- foi processado nela.
ALTER TABLE "Player" ADD COLUMN "lastAgedSeasonId" UUID;
