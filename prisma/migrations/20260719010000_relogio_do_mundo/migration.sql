-- Relógio do mundo (MUNDO-V1): o mundo anda sozinho. Quanto tempo real vale um
-- dia lógico, se o relógio está rodando, e quando o próximo dia dispara.
-- Agendamento (infra), não simulação (R-177: o tempo do mundo segue sendo a data).
ALTER TABLE "GameWorld" ADD COLUMN "realSecondsPerDay" INTEGER;
ALTER TABLE "GameWorld" ADD COLUMN "clockRunning" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GameWorld" ADD COLUMN "nextTickAt" TIMESTAMP(3);
