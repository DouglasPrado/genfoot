import { SquadCategory, type SquadSnapshot } from "../clubs/club-types.js";
import {
  deterministicUuidV7,
  timestampOf,
} from "../foundation/deterministic-uuid.js";
import { SeededRandom } from "../foundation/seeded-random.js";
import { generateSquadAttributes } from "../genesis/player-generation.js";
import type { PlayerAttributes } from "../players/player-attributes.js";
import type { PlayerAggregateSnapshot } from "../players/player-repository.js";

/**
 * C8 — categoria de base (youth). VERTICAL A: a gênese materializa uma base
 * (YOUTH_ACADEMY) por clube: jovens de 16–19 anos, habilidade BAIXA e potencial
 * ALTO — matéria-prima para o clube formar, não para jogar já.
 *
 * Reaproveita a máquina de atributos do elenco adulto e a REBAIXA (fator youth):
 * o mesmo perfil, num corpo ainda cru. `youthProspect = true` os marca; a nota
 * atual sai baixa (derivada dos atributos rebaixados na gravação, R-09) e o
 * potencial, alto.
 *
 * O que isto ainda NÃO é: a promoção base→profissional, o desenvolvimento por
 * treino (multiplicador da comissão, §4), as categorias U15/U17/U20 separadas, o
 * scouting da base. Aqui a base existe e é um elenco de jovens; a formação vem depois.
 */

const YOUTH_SQUAD_SIZE = 12;
/** Rebaixa os atributos adultos ao nível de base (corpo/experiência crus). */
const YOUTH_ATTRIBUTE_FACTOR = 0.55;

const FIRST_NAMES = [
  "Kauã", "Enzo", "Davi", "Gabriel", "Lucas", "Matheus", "Pedro", "João",
  "Guilherme", "Rafael", "Vinícius", "Bernardo", "Miguel", "Arthur",
];
const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Costa", "Pereira", "Gomes",
  "Ribeiro", "Martins", "Araújo", "Correia", "Cardoso", "Dias", "Freitas",
];

export interface ClubYouth {
  readonly players: readonly PlayerAggregateSnapshot[];
  readonly squad: SquadSnapshot;
}

export function deriveClubYouth(input: {
  readonly worldSeed: string;
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly clubName: string;
  readonly clubIndex: number;
  readonly worldStartDate: string;
}): ClubYouth {
  const worldId = input.gameWorldId as never;
  const startYear = Number(input.worldStartDate.slice(0, 4));
  const roster = generateSquadAttributes({
    worldSeed: input.worldSeed,
    clubIndex: input.clubIndex,
  }).slice(0, YOUTH_SQUAD_SIZE);

  const players: PlayerAggregateSnapshot[] = roster.map((generated, index) => {
    const random = new SeededRandom({
      worldSeed: input.worldSeed,
      context: `youth:${input.clubIndex}:${index}`,
    });
    const uuid = (kind: string): string =>
      deterministicUuidV7({
        worldSeed: input.worldSeed,
        context: `${input.gameWorldId}:youth:${input.clubIndex}:${index}:${kind}`,
        timestampMilliseconds: timestampOf(input.worldStartDate) + index,
      });
    const playerId = uuid("player");
    const personId = uuid("person");
    const age = random.nextInt(16, 20);
    const potentialAbility = random.nextInt(58, 82);

    return {
      person: {
        id: personId as never,
        gameWorldId: worldId,
        firstName: FIRST_NAMES[random.nextInt(0, FIRST_NAMES.length)]!,
        lastName: LAST_NAMES[random.nextInt(0, LAST_NAMES.length)]!,
        birthDate: `${startYear - age}-01-01`,
        nationality: "BR",
        version: 1,
      },
      player: {
        id: playerId as never,
        gameWorldId: worldId,
        personId: personId as never,
        primaryPosition: generated.position,
        dominantFoot: "RIGHT",
        careerStatus: "ACTIVE",
        availability: "AVAILABLE",
        generationSource: "YOUTH_ACADEMY",
        generatedAtSeasonNumber: 1,
        attributes: youthful(generated.attributes),
        // Derivada na gravação (R-09) dos atributos rebaixados.
        currentAbility: 0,
        baselineAbility: 0,
        potentialAbility,
        dynamicState: {
          morale: 50,
          confidence: 50,
          happiness: 50,
          fatigue: 0,
          matchSharpness: 40,
        },
        youthProspect: true,
        lastProcessedOn: input.worldStartDate,
        version: 1,
      },
    } satisfies PlayerAggregateSnapshot;
  });

  const squad: SquadSnapshot = {
    id: deterministicUuidV7({
      worldSeed: input.worldSeed,
      context: `${input.gameWorldId}:youth-squad:${input.clubIndex}`,
      timestampMilliseconds: timestampOf(input.worldStartDate),
    }) as never,
    gameWorldId: worldId,
    clubId: input.clubId as never,
    name: `Base ${input.clubName}`.trim(),
    category: SquadCategory.YOUTH_ACADEMY,
    seasonNumber: 1,
    version: 1,
    memberships: players.map((aggregate, index) => ({
      playerId: aggregate.player.id,
      shirtNumber: index + 1,
      role: null,
      effectiveFrom: input.worldStartDate,
    })),
  };

  return { players, squad };
}

/** Rebaixa cada atributo ao nível de base; goleiragem `null` fora do gol fica null. */
function youthful(attributes: PlayerAttributes): PlayerAttributes {
  const lowered: Record<string, number | null> = {};
  for (const [code, value] of Object.entries(attributes)) {
    lowered[code] =
      value === null
        ? null
        : Math.max(1, Math.round(value * YOUTH_ATTRIBUTE_FACTOR));
  }
  return lowered as PlayerAttributes;
}
