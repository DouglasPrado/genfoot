import type { TrainingSessionSnapshot } from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * As sessões de treino ATIVAS de um clube (R-221 Fase 2a, leitura).
 *
 * Existe porque o lado de escrita (`training:start-session` /
 * `training:collect-session`) já persistia a sessão, mas NENHUMA query a
 * devolvia: a tela de treino não tinha como saber que um jogador está treinando
 * — só o caminho "iniciar" era alcançável, e o estado TREINANDO/coletar era
 * inobservável. Sem isto o cliente teria que adivinhar, e cliente não adivinha.
 *
 * Projeção fina e sem regra: o cálculo de dias decorridos é do core
 * (`sessionElapsedDays`), contra a data lógica do mundo que a tela já tem.
 */
export interface TrainingSessionsReadModel {
  activeByClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<readonly TrainingSessionSnapshot[]>;
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export class PrismaTrainingSessionsReadModel
  implements TrainingSessionsReadModel
{
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async activeByClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<readonly TrainingSessionSnapshot[]> {
    const rows = await this.client.trainingSession.findMany({
      where: { gameWorldId, clubId, active: true },
      orderBy: { startDate: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      gameWorldId: row.gameWorldId,
      clubId: row.clubId,
      playerId: row.playerId,
      attributeCode: row.attributeCode,
      startDate: isoDate(row.startDate),
      durationDays: row.durationDays,
      active: row.active,
      version: row.version,
    }));
  }
}
