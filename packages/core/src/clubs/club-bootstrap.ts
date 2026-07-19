import type { GameWorldSnapshot } from "../world/world-types.js";
import type { WorldGenesisSnapshot } from "../genesis/genesis-types.js";
import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import {
  ClubDepartmentKind,
  ClubStatus,
  StadiumLicenseStatus,
  type ClubDepartmentSnapshot,
  type ClubSnapshot,
} from "./club-types.js";
import { generateClubVisualIdentity } from "./visual-identity-generator.js";

const departmentKinds = Object.values(ClubDepartmentKind);

/**
 * Os clubes iniciais do mundo, a partir da gênese.
 *
 * Devolve CLUBES, não um portfólio: o `WorldClubPortfolioSnapshot` que isto
 * montava embrulhava os 16 clubes numa revisão só (R-175) e morreu junto com o
 * resto da arquitetura morta. Elencos e projetos voltam quando uma vertical
 * viva os exigir.
 *
 * Puro: nada de `Date.now()`/`Math.random()`. Os ids saem do seed do mundo, e é
 * isso que faz o replay ser possível (R-182).
 */
export function buildClubsFromGenesis(
  world: GameWorldSnapshot,
  genesis: WorldGenesisSnapshot,
): readonly ClubSnapshot[] {
  const timestampMilliseconds = Date.parse(`${world.startDate}T00:00:00.000Z`);
  return genesis.clubs.map((generated, index) => {
    // A identidade é um PERÍODO com vigência, não coluna: o rebranding (BC-003)
    // abre um novo em vez de sobrescrever, e o histórico sobrevive.
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
      // O clube nasce COM cara (R-211). Antes nascia sem: `crestTemplateId` e
      // cores ficavam nulos até o jogador personalizar, e a lista de escolher
      // clube mostrava 20 caixas cinzas idênticas — nada para escolher olhando.
      // Determinística por `(seed, índice)`: o replay reproduz o mesmo escudo.
      visualIdentity: generateClubVisualIdentity(world.seed, index),
    } as const;
    return {
      id: generated.id,
      gameWorldId: world.id,
      identity,
      identityHistory: [identity],
      regionId: `BR-R${String(index + 1).padStart(2, "0")}`,
      reputationBand: 1,
      status: ClubStatus.ACTIVE,
      departments: departmentKinds.map(
        (kind): ClubDepartmentSnapshot => ({
          kind,
          level: 1,
          targetLevel: 1,
          capacity: 10,
          condition: 100,
          maintenanceDueOn: null,
        }),
      ),
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
  });
}
