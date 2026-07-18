import { isPresent, type ClubAttendanceRepository } from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Adapter de atendimento do clube (X-001). Resolve "há um humano presente
 * cuidando deste clube?" pelo join canônico: ClubControl ativo (R-180) →
 * WorldParticipant → a sessão do usuário. Sem controle ativo, o clube é da IA.
 */
export class PrismaClubAttendanceRepository
  implements ClubAttendanceRepository
{
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async isClubAttended(
    gameWorldId: string,
    clubId: string,
    nowIso: string,
  ): Promise<boolean> {
    const control = await this.client.clubControl.findFirst({
      where: { gameWorldId, clubId, status: "ACTIVE" },
      select: { worldParticipantId: true },
    });
    // Sem controle ativo = IA por ausência (R-180): não atendido.
    if (control === null) return false;

    const participant = await this.client.worldParticipant.findFirst({
      where: { gameWorldId, id: control.worldParticipantId },
      select: { userId: true },
    });
    if (participant === null) return false;

    const session = await this.client.userSession.findFirst({
      where: { gameWorldId, userId: participant.userId },
      orderBy: { lastSeenAt: "desc" },
      select: { isOnline: true, lastSeenAt: true },
    });
    if (session === null || !session.isOnline) return false;

    return isPresent(session.lastSeenAt.toISOString(), nowIso);
  }
}
