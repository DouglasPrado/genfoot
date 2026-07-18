import type { StaffReadModel, StaffView } from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";

import type { PrismaClient } from "./prisma-connection.js";

/**
 * Read model de C8 — a comissão técnica de um clube (M-25).
 *
 * O vínculo staff↔clube é o `StaffContract` ativo. Junta contrato → membro →
 * pessoa para montar o card (nome, cargo, qualidade, habilidade).
 */
export class PrismaStaffReadModel implements StaffReadModel {
  public constructor(private readonly client: PrismaClient) {}

  public async staffForClub(
    gameWorldId: GameWorldId,
    clubId: string,
  ): Promise<StaffView> {
    const contracts = await this.client.staffContract.findMany({
      where: { gameWorldId, clubId, status: "ACTIVE" },
      select: {
        staff: {
          select: {
            id: true,
            role: true,
            qualityTier: true,
            abilityScore: true,
            person: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    return {
      members: contracts.map(({ staff }) => ({
        staffId: staff.id,
        name: `${staff.person.firstName} ${staff.person.lastName}`.trim(),
        role: staff.role,
        qualityTier: staff.qualityTier,
        abilityScore: staff.abilityScore,
      })),
    };
  }
}
