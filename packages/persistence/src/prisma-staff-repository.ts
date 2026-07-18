import type { StaffMemberSeed, StaffRepository } from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Adapter de C8 — a comissão técnica na gênese.
 *
 * Cria, por membro, três linhas: a `Person` (staff é gente), o `StaffMember`
 * (cargo, qualidade, atributos) e o `StaffContract` que o liga ao clube. Rodam
 * na transação atômica da gênese (`TransactionClient`). Idempotente por
 * `staffId`: reexecutar a gênese pula quem já existe (o clube pode já ter
 * mexido na comissão — a gênese não desfaz).
 */
export class PrismaStaffRepository implements StaffRepository {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async seedStaff(
    gameWorldId: GameWorldId,
    seeds: readonly StaffMemberSeed[],
  ): Promise<void> {
    for (const seed of seeds) {
      const existing = await this.client.staffMember.findUnique({
        where: { gameWorldId_id: { gameWorldId, id: seed.staffId } },
        select: { id: true },
      });
      if (existing !== null) continue;

      await this.client.person.create({
        data: {
          id: seed.personId,
          gameWorldId,
          firstName: seed.firstName,
          lastName: seed.lastName,
          nationality: "BR",
          birthDate: new Date(`${seed.birthDate}T00:00:00.000Z`),
          ageVirtual: seed.ageVirtual,
          version: 1,
        },
      });
      await this.client.staffMember.create({
        data: {
          id: seed.staffId,
          gameWorldId,
          personId: seed.personId,
          role: seed.role,
          qualityTier: seed.qualityTier,
          abilityScore: seed.abilityScore,
          potentialScore: seed.potentialScore,
          tacticalKnowledge: seed.attributes.tacticalKnowledge,
          youthDevelopment: seed.attributes.youthDevelopment,
          medicalKnowledge: seed.attributes.medicalKnowledge,
          negotiation: seed.attributes.negotiation,
          communication: seed.attributes.communication,
          discipline: seed.attributes.discipline,
          dataAnalysis: seed.attributes.dataAnalysis,
          version: 1,
        },
      });
      await this.client.staffContract.create({
        data: {
          id: seed.contractId,
          gameWorldId,
          staffId: seed.staffId,
          clubId: seed.clubId,
          currencyId: seed.currencyId,
          status: "ACTIVE",
          startSeason: seed.startSeason,
          endSeason: seed.endSeason,
          salaryPerSeasonMinor: seed.salaryPerSeasonMinor,
          version: 1,
        },
      });
    }
  }
}
