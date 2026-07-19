import type {
  ClubAIProfileRepository,
  ClubAIProfileSnapshot,
  OfflinePlan,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Adapter do perfil de IA do clube (X-001).
 *
 * O `ClubAIProfile` físico guarda traços comportamentais em colunas e o PLANO
 * offline em `strategyJson` (level + limites + políticas) — o modelo não tem
 * colunas para o plano, e o JSON é o lar natural dele. `offlineDecisionLevel`
 * espelha a coluna homônima para futuras queries. Upsert por `clubId` (unique).
 */
export class PrismaClubAIProfileRepository implements ClubAIProfileRepository {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async findByClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<ClubAIProfileSnapshot | null> {
    const row = await this.client.clubAIProfile.findUnique({
      where: { clubId },
      select: { clubId: true, offlineDecisionLevel: true, strategyJson: true },
    });
    if (row === null || row.strategyJson === null) return null;
    return {
      gameWorldId,
      clubId: row.clubId,
      plan: row.strategyJson as unknown as OfflinePlan,
    };
  }

  public async saveProfile(snapshot: ClubAIProfileSnapshot): Promise<void> {
    const strategyJson = snapshot.plan as unknown as Prisma.InputJsonValue;
    await this.client.clubAIProfile.upsert({
      where: { clubId: snapshot.clubId },
      create: {
        clubId: snapshot.clubId,
        offlineDecisionLevel: snapshot.plan.offlineDecisionLevel,
        strategyJson,
      },
      update: {
        offlineDecisionLevel: snapshot.plan.offlineDecisionLevel,
        strategyJson,
      },
    });
  }
}
