import {
  deterministicUuidV7,
  timestampOf,
} from "../foundation/deterministic-uuid.js";
import { SeededRandom } from "../foundation/seeded-random.js";
import { generateSquadAttributes } from "../genesis/player-generation.js";
import type { PlayerAttributes } from "../players/player-attributes.js";
import type { PlayerAggregateSnapshot } from "../players/player-repository.js";

/**
 * A safra anual de captação (R-218, `M-YOUTH-INTAKE`).
 *
 * Irmã de `deriveClubYouth` (base da gênese), mas para o funil de captação: um
 * lote de candidatos SOLTOS — sem clube nem squad. O vínculo vem do contrato de
 * formação, que é outro passo (C6/C9, bloqueado). Determinística por
 * `(worldSeed, seasonId, índice)`: a mesma temporada dá a mesma safra (R-182).
 *
 * A qualidade da safra é uma calibração minha (candidata a VAL-001): a maioria
 * modesta, poucas joias (§3.7 "chance de joias"). O doc (§2:133) diz que a
 * estrutura do clube influencia a média — mas níveis de estrutura não existem
 * (R-197), então a safra de captação é do MUNDO, não de um clube, e a qualidade
 * é uniforme por ora. Provisório declarado.
 *
 * Fronteira (§3:199): a geração INDIVIDUAL do atleta é do doc de jogadores; a
 * estrutura de SAFRA (isto) é do doc de base — que a R-218 abre na prática.
 */
export const CROP_SIZE = 12;

/** Idade dos candidatos: jovens em início de formação. */
const MIN_AGE = 16;
const MAX_AGE = 19;

/**
 * Faixa de potencial da safra. Larga de propósito: a base inferior é o candidato
 * modesto que enche o lote; o topo é a joia rara. Calibração minha (VAL-001).
 */
const MIN_POTENTIAL = 55;
const MAX_POTENTIAL = 88;
/** Rebaixa os atributos ao nível cru de um jovem (mesmo fator da base). */
const YOUTH_ATTRIBUTE_FACTOR = 0.55;

const FIRST_NAMES = [
  "Kauã", "Enzo", "Davi", "Gabriel", "Lucas", "Matheus", "Pedro", "João",
  "Guilherme", "Rafael", "Vinícius", "Bernardo", "Miguel", "Arthur",
];
const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Costa", "Pereira", "Gomes",
  "Ribeiro", "Martins", "Araújo", "Correia", "Cardoso", "Dias", "Freitas",
];

export interface YouthClass {
  readonly seasonId: string;
  readonly candidates: readonly PlayerAggregateSnapshot[];
}

/**
 * Puxa o potencial para BAIXO: elevar ao quadrado enviesa a distribuição para o
 * modesto e deixa a joia (topo da faixa) rara — o §3.7. `r` em [0,1).
 */
function skewedPotential(r: number): number {
  const biased = r * r;
  return Math.round(MIN_POTENTIAL + biased * (MAX_POTENTIAL - MIN_POTENTIAL));
}

function youthful(attributes: PlayerAttributes): PlayerAttributes {
  const lowered: Record<string, number | null> = {};
  for (const [code, value] of Object.entries(attributes)) {
    lowered[code] =
      value === null ? null : Math.max(1, Math.round(value * YOUTH_ATTRIBUTE_FACTOR));
  }
  return lowered as PlayerAttributes;
}

export function generateYouthClass(input: {
  readonly worldSeed: string;
  readonly gameWorldId: string;
  readonly seasonId: string;
  readonly worldStartDate: string;
  readonly size?: number;
}): YouthClass {
  const worldId = input.gameWorldId as never;
  const size = input.size ?? CROP_SIZE;
  const startYear = Number(input.worldStartDate.slice(0, 4));
  // Reaproveita a máquina de atributos do elenco; o índice do "clube" aqui é a
  // temporada (via hash), para a safra não colidir com a gênese.
  const roster = generateSquadAttributes({
    worldSeed: `${input.worldSeed}:intake:${input.seasonId}`,
    clubIndex: 0,
  }).slice(0, size);

  const candidates: PlayerAggregateSnapshot[] = roster.map((generated, index) => {
    const random = new SeededRandom({
      worldSeed: input.worldSeed,
      context: `intake:${input.seasonId}:${index}`,
    });
    const uuid = (kind: string): string =>
      deterministicUuidV7({
        worldSeed: input.worldSeed,
        context: `${input.gameWorldId}:intake:${input.seasonId}:${index}:${kind}`,
        timestampMilliseconds: timestampOf(input.worldStartDate) + index,
      });
    const playerId = uuid("player");
    const personId = uuid("person");
    const age = random.nextInt(MIN_AGE, MAX_AGE + 1);
    const potentialAbility = skewedPotential(random.nextFloat());

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
        generationSource: "SCOUT_FOUND",
        generatedAtSeasonNumber: 1,
        attributes: youthful(generated.attributes),
        currentAbility: 0, // derivada na gravação (R-09)
        baselineAbility: 0,
        lastAgedSeasonId: null,
        potentialAbility,
        dynamicState: {
          morale: 50, confidence: 50, happiness: 50, fatigue: 0, matchSharpness: 40,
        },
        youthProspect: true,
        lastProcessedOn: input.worldStartDate,
        version: 1,
      },
    } satisfies PlayerAggregateSnapshot;
  });

  return { seasonId: input.seasonId, candidates };
}
