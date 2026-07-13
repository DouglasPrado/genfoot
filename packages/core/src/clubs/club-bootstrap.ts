import type { GameWorldSnapshot } from "../world/world-types.js";
import type { WorldGenesisSnapshot } from "../genesis/genesis-types.js";
import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import {
  ClubDepartmentKind,
  ClubStatus,
  StadiumLicenseStatus,
  type ClubDepartmentSnapshot,
  type WorldClubPortfolioSnapshot,
} from "./club-types.js";

const departmentKinds = Object.values(ClubDepartmentKind);

export function buildClubPortfolioFromGenesis(
  world: GameWorldSnapshot,
  genesis: WorldGenesisSnapshot,
): WorldClubPortfolioSnapshot {
  const timestampMilliseconds = Date.parse(`${world.startDate}T00:00:00.000Z`);
  return {
    schemaVersion: 1,
    gameWorldId: world.id,
    rulesetVersion: world.rulesetVersion,
    clubs: genesis.clubs.map((generated, index) => {
      const identity = {
        id: deterministicUuidV7<"ClubIdentityPeriod">({
          worldSeed: world.seed,
          context: `club:${generated.id}:identity:1`,
          timestampMilliseconds,
        }),
        name: generated.name,
        shortCode: generated.shortCode,
        effectiveFrom: world.startDate,
        effectiveThrough: null,
        rulesetVersion: world.rulesetVersion,
      } as const;
      return {
        id: generated.id,
        gameWorldId: world.id,
        identity,
        identityHistory: [identity],
        regionId: `BR-R${String(index + 1).padStart(2, "0")}`,
        reputationBand: 1,
        status: ClubStatus.ACTIVE,
        departments: departmentKinds.map((kind): ClubDepartmentSnapshot => ({
          kind,
          level: 1,
          targetLevel: 1,
          capacity: 10,
          condition: 100,
          maintenanceDueOn: null,
          version: 1,
        })),
        stadium: {
          id: deterministicUuidV7<"Stadium">({
            worldSeed: world.seed,
            context: `club:${generated.id}:stadium`,
            timestampMilliseconds,
          }),
          name: `Estádio ${generated.name}`,
          tenure: "OWNED",
          capacity: 10_000,
          pitchQuality: 60,
          condition: 100,
          licenseStatus: StadiumLicenseStatus.LICENSED,
          maintenanceDueOn: null,
          version: 1,
        },
        ticketPolicies: [],
        commercialAgreements: [],
        boardDecisions: [],
        version: 1,
      };
    }),
    squads: genesis.squads.map((generated) => ({
      id: generated.id,
      gameWorldId: world.id,
      clubId: generated.clubId,
      capacity: 23,
      memberships: generated.playerIds.map((playerId, index) => ({
        playerId,
        slot: `S${String(index + 1).padStart(2, "0")}`,
        category: "SENIOR" as const,
        effectiveFrom: world.startDate,
      })),
      version: 1,
    })),
    projects: [],
    commandReceipts: [],
    events: [],
    processedMaintenanceDayKeys: [],
    revision: 1,
  };
}
