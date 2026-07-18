import {
  deterministicUuidV7,
  timestampOf,
} from "../foundation/deterministic-uuid.js";
import { SeededRandom } from "../foundation/seeded-random.js";

import {
  StaffQualityTier,
  StaffRole,
  type StaffAttributes,
  type StaffMemberSeed,
} from "./staff-types.js";

/**
 * A comissão de largada — os cargos que todo clube tem na gênese. Um plantel
 * enxuto e essencial; os cargos opcionais (psicólogo, negociador, comunicação)
 * ficam para a contratação do jogador quando o mercado de staff existir.
 */
const COMMISSION_ROLES: readonly StaffRole[] = [
  StaffRole.HEAD_COACH,
  StaffRole.ASSISTANT_COACH,
  StaffRole.FITNESS_COACH,
  StaffRole.GOALKEEPER_COACH,
  StaffRole.SCOUT,
  StaffRole.DOCTOR,
  StaffRole.YOUTH_COORDINATOR,
];

/** O atributo que cada cargo mais usa — ganha ênfase na geração. */
const ROLE_KEY_ATTRIBUTE: Readonly<Record<StaffRole, keyof StaffAttributes>> = {
  HEAD_COACH: "tacticalKnowledge",
  ASSISTANT_COACH: "tacticalKnowledge",
  FITNESS_COACH: "medicalKnowledge",
  GOALKEEPER_COACH: "tacticalKnowledge",
  SCOUT: "dataAnalysis",
  DOCTOR: "medicalKnowledge",
  PHYSIOTHERAPIST: "medicalKnowledge",
  PSYCHOLOGIST: "communication",
  DIRECTOR: "negotiation",
  NEGOTIATOR: "negotiation",
  COMMUNICATION_MANAGER: "communication",
  YOUTH_COORDINATOR: "youthDevelopment",
};

/** Faixa de habilidade por tier (escala 0–100), âncoras da §4. */
const TIER_ABILITY: Readonly<Record<StaffQualityTier, readonly [number, number]>> = {
  VERY_LOW: [20, 39],
  LOW: [35, 54],
  MEDIUM: [50, 69],
  HIGH: [65, 84],
  ELITE: [80, 95],
};

const FIRST_NAMES = [
  "Carlos", "Roberto", "Márcio", "Paulo", "Fernando", "Luiz", "Sérgio",
  "Antônio", "Ricardo", "Eduardo", "Gilberto", "Vanderlei", "Renato", "Abel",
];
const LAST_NAMES = [
  "Ferreira", "Souza", "Oliveira", "Lima", "Carvalho", "Rocha", "Almeida",
  "Nunes", "Barbosa", "Teixeira", "Moraes", "Andrade", "Pinto", "Cabral",
];

/**
 * A comissão técnica de um clube na gênese — determinística por `(seed,
 * clubIndex)` (R-182). Tiers enviesados para baixo ("todos nascem pequenos"),
 * atributos ancorados na habilidade com ênfase no cargo, salário proporcional à
 * habilidade (obrigação registrada, R-197).
 */
export function deriveClubStaff(input: {
  readonly worldSeed: string;
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly clubIndex: number;
  readonly currencyId: string;
  readonly worldStartDate: string;
  readonly currentSeason: number;
}): readonly StaffMemberSeed[] {
  const random = new SeededRandom({
    worldSeed: input.worldSeed,
    context: `staff-commission:${input.clubIndex}`,
  });
  const startYear = Number(input.worldStartDate.slice(0, 4));

  return COMMISSION_ROLES.map((role, roleIndex) => {
    const tier = pickTier(random);
    const [min, max] = TIER_ABILITY[tier];
    const abilityScore = random.nextInt(min, max + 1);
    const potentialScore = Math.min(99, abilityScore + random.nextInt(0, 8));
    const age = random.nextInt(35, 63);
    const uuid = (kind: string): string =>
      deterministicUuidV7({
        worldSeed: input.worldSeed,
        context: `${input.gameWorldId}:staff:${input.clubIndex}:${role}:${kind}`,
        timestampMilliseconds: timestampOf(input.worldStartDate) + roleIndex,
      });

    return {
      staffId: uuid("member"),
      personId: uuid("person"),
      contractId: uuid("contract"),
      firstName: FIRST_NAMES[random.nextInt(0, FIRST_NAMES.length)]!,
      lastName: LAST_NAMES[random.nextInt(0, LAST_NAMES.length)]!,
      birthDate: `${startYear - age}-01-01`,
      ageVirtual: age,
      role,
      qualityTier: tier,
      abilityScore,
      potentialScore,
      attributes: attributesFor(role, abilityScore, random),
      clubId: input.clubId,
      currencyId: input.currencyId,
      // Salário: ~R$1.000 por ponto de habilidade por temporada. Obrigação
      // registrada, não dinheiro movido (R-197).
      salaryPerSeasonMinor: BigInt(abilityScore) * 100_000n,
      startSeason: input.currentSeason,
      endSeason: input.currentSeason + 2,
    } satisfies StaffMemberSeed;
  });
}

/** Tier enviesado para baixo: a maioria dos clubes começa modesta. */
function pickTier(random: SeededRandom): StaffQualityTier {
  const roll = random.nextFloat();
  if (roll < 0.35) return StaffQualityTier.LOW;
  if (roll < 0.7) return StaffQualityTier.MEDIUM;
  if (roll < 0.88) return StaffQualityTier.VERY_LOW;
  if (roll < 0.98) return StaffQualityTier.HIGH;
  return StaffQualityTier.ELITE;
}

function attributesFor(
  role: StaffRole,
  ability: number,
  random: SeededRandom,
): StaffAttributes {
  const jitter = (): number =>
    Math.max(1, Math.min(100, ability + random.nextInt(-12, 13)));
  const base: StaffAttributes = {
    tacticalKnowledge: jitter(),
    youthDevelopment: jitter(),
    medicalKnowledge: jitter(),
    negotiation: jitter(),
    communication: jitter(),
    discipline: jitter(),
    dataAnalysis: jitter(),
  };
  const key = ROLE_KEY_ATTRIBUTE[role];
  return { ...base, [key]: Math.max(1, Math.min(100, ability + random.nextInt(3, 13))) };
}
