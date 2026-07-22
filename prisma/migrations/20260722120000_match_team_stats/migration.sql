-- Estatísticas de time da partida (C5).
--
-- O kernel já calculava finalizações e posse (`MatchKernelOutput.homeShots`,
-- `awayShots`, `homePossession`), mas `saveResults` não tinha onde gravá-las e o
-- dado morria no objeto. Sem estas colunas, `M-POSTMATCH` só podia mostrar o
-- placar — e o relato da partida ficava mais pobre do que o motor já sabia.
--
-- Nulo = partida ainda não jogada. Não há default 0: zero finalização é um fato
-- do jogo, e afirmá-lo antes da bola rolar seria inventar.
ALTER TABLE "Match" ADD COLUMN "homeShots" INTEGER;
ALTER TABLE "Match" ADD COLUMN "awayShots" INTEGER;
ALTER TABLE "Match" ADD COLUMN "homePossession" INTEGER;
