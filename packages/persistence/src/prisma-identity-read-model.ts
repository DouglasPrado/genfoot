import type {
  IdentityReadModel,
  IdentitySummaryView,
  IdentityWorldView,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Read model de C1 (R-175). Fora do `UnitOfWork` de propósito: leitura não abre
 * transação — não há nada a manter atômico, e o lock do `GameWorld` que o
 * append segura não deve ser disputado por uma tela.
 *
 * O `include` do participante é o join que traduz `worldParticipantId` (a FK
 * que a escrita guarda) em `accountId` (o que o cliente conhece).
 */
export class PrismaIdentityReadModel implements IdentityReadModel {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async worldView(gameWorldId: string): Promise<IdentityWorldView> {
    const participants = await this.client.worldParticipant.findMany({
      where: { gameWorldId },
      orderBy: { joinedOn: "asc" },
    });

    const [reservations, controls] = await Promise.all([
      this.client.clubEntryReservation.findMany({
        where: { gameWorldId },
        include: { worldParticipant: { select: { userId: true } } },
        orderBy: { heldOn: "asc" },
      }),
      this.client.clubControl.findMany({
        where: { gameWorldId },
        include: { worldParticipant: { select: { userId: true } } },
        orderBy: { startsOn: "asc" },
      }),
    ]);

    return {
      participations: participants.map((row) => ({
        accountId: row.userId,
        status: row.status,
      })),
      reservations: reservations.map((row) => ({
        id: row.id,
        accountId: row.worldParticipant.userId,
        clubId: row.clubId,
        status: row.status,
      })),
      controls: controls.map((row) => ({
        id: row.id,
        accountId: row.worldParticipant.userId,
        clubId: row.clubId,
        status: row.status,
      })),
      // Cooldown é atributo da participação, não agregado (context map:67 lista
      // seis roots em C1 e ele não está lá). A view o reapresenta como lista
      // porque é a forma que o app consome.
      cooldowns: participants
        .filter((row) => row.cooldownUntilOn !== null)
        .map((row) => ({
          accountId: row.userId,
          untilOn: row.cooldownUntilOn!.toISOString().slice(0, 10),
        })),
    };
  }

  public async summary(gameWorldId: string): Promise<IdentitySummaryView> {
    const [participationCount, heldReservationCount, activeControlCount] =
      await Promise.all([
        this.client.worldParticipant.count({ where: { gameWorldId } }),
        this.client.clubEntryReservation.count({
          where: { gameWorldId, status: "HELD" },
        }),
        this.client.clubControl.count({ where: { gameWorldId, status: "ACTIVE" } }),
      ]);
    return { participationCount, heldReservationCount, activeControlCount };
  }
}
