import {
  StaffQualityTier,
  StaffRole,
  type StaffMemberSeed,
} from "@grinta/core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaStaffReadModel } from "../src/prisma-staff-read-model.js";
import { PrismaStaffRepository } from "../src/prisma-staff-repository.js";
import { CLUB_ID, WORLD_ID, seedClub, seedWorld } from "./fixtures.js";
import { connect, hasDatabase, skipReason, truncate } from "./postgres.harness.js";

const TABLES = [
  "GameWorld",
  "Club",
  "ClubIdentityPeriod",
  "Stadium",
  "StaffContract",
  "StaffMember",
  "Person",
];

const CURRENCY = "019b76da-a800-7787-9462-49c009becccc";

function staffSeed(
  suffix: string,
  role: StaffRole,
  ability: number,
): StaffMemberSeed {
  return {
    staffId: `019b76da-a800-7a0${suffix}-9462-49c009be0001`,
    personId: `019b76da-a800-7b0${suffix}-9462-49c009be0002`,
    contractId: `019b76da-a800-7c0${suffix}-9462-49c009be0003`,
    firstName: "Carlos",
    lastName: `Técnico${suffix}`,
    birthDate: "1975-01-01",
    ageVirtual: 51,
    role,
    qualityTier: StaffQualityTier.MEDIUM,
    abilityScore: ability,
    potentialScore: ability,
    attributes: {
      tacticalKnowledge: 60,
      youthDevelopment: 55,
      medicalKnowledge: 50,
      negotiation: 45,
      communication: 55,
      discipline: 60,
      dataAnalysis: 50,
    },
    clubId: CLUB_ID,
    currencyId: CURRENCY,
    salaryPerSeasonMinor: BigInt(ability) * 100_000n,
    startSeason: 1,
    endSeason: 3,
  };
}

describe.skipIf(!hasDatabase)(
  `PrismaStaffReadModel ${hasDatabase ? "" : `— PULADO: ${skipReason}`}`,
  () => {
    let client: ReturnType<typeof connect>;
    let staff: PrismaStaffRepository;
    let read: PrismaStaffReadModel;

    beforeAll(() => {
      client = connect();
      staff = new PrismaStaffRepository(client);
      read = new PrismaStaffReadModel(client);
    });

    beforeEach(async () => {
      await truncate(client, TABLES);
      await seedWorld(client);
      await seedClub(client);
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    it("lê a comissão do clube via contratos ativos, com nome e cargo", async () => {
      await staff.seedStaff(WORLD_ID as never, [
        staffSeed("1", StaffRole.HEAD_COACH, 72),
        staffSeed("2", StaffRole.SCOUT, 61),
      ]);

      const view = await read.staffForClub(WORLD_ID as never, CLUB_ID);
      expect(view.members).toHaveLength(2);
      const coach = view.members.find((m) => m.role === StaffRole.HEAD_COACH)!;
      expect(coach.name).toBe("Carlos Técnico1");
      expect(coach.abilityScore).toBe(72);
    });

    it("é idempotente por staffId — reexecutar a gênese não duplica", async () => {
      const seed = staffSeed("1", StaffRole.HEAD_COACH, 72);
      await staff.seedStaff(WORLD_ID as never, [seed]);
      await staff.seedStaff(WORLD_ID as never, [seed]);

      const view = await read.staffForClub(WORLD_ID as never, CLUB_ID);
      expect(view.members).toHaveLength(1);
    });
  },
);
