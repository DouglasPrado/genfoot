-- R-190 — a data de entrada no elenco é data de MUNDO, não instante de plataforma.
--
-- `SquadMembership.startsAt`/`endsAt` eram `timestamp` com `@default(now())`:
-- relógio de plataforma governando fato de jogo. Quando um jogador entrou no
-- elenco é regra (janela de transferência, elegibilidade), não auditoria. Vira
-- `DATE`, e o default de relógio sai — ele inventaria a data e mataria o replay
-- (R-177).
--
-- A conversão trunca a hora, que já era meia-noite em todo dado de gênese.

ALTER TABLE "SquadMembership"
  ALTER COLUMN "startsAt" TYPE DATE,
  ALTER COLUMN "startsAt" DROP DEFAULT,
  ALTER COLUMN "endsAt" TYPE DATE;
