import { WorldDate } from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import { SeededRandom } from "../foundation/seeded-random.js";
import type { GameWorldSnapshot } from "../world/world-types.js";

import {
  SQUAD_POSITION_TEMPLATE,
  generateSquadAttributes,
} from "./player-generation.js";
import {
  DominantFoot,
  PlayerPosition,
  type ClubId,
  type CompetitionId,
  type GeneratedClub,
  type GeneratedFixture,
  type GeneratedPerson,
  type GeneratedPlayer,
  type GeneratedSquad,
  type PersonId,
  type PlayerId,
  type PlayerPosition as PlayerPositionType,
  type WorldGenesisSnapshot,
} from "./genesis-types.js";

const CLUB_NAMES = [
  "Aurora",
  "Bandeirantes",
  "Cruzeiro do Sul",
  "Estrela Real",
  "Ferroviário Central",
  "Guardiões",
  "Horizonte",
  "Independente",
  "Jardim Atlético",
  "Litorâneo",
  "Montanha",
  "Nacional da Serra",
  "Operário Unido",
  "Pioneiros",
  "Real do Vale",
  "Vanguarda",
] as const;

const FIRST_NAMES = [
  "André",
  "Bruno",
  "Caio",
  "Daniel",
  "Eduardo",
  "Felipe",
  "Gabriel",
  "Henrique",
  "Igor",
  "João",
  "Kauã",
  "Lucas",
  "Matheus",
  "Nicolas",
  "Otávio",
  "Paulo",
  "Rafael",
  "Samuel",
  "Thiago",
  "Vinícius",
] as const;

const LAST_NAMES = [
  "Almeida",
  "Barbosa",
  "Cardoso",
  "Dias",
  "Esteves",
  "Ferreira",
  "Gomes",
  "Henrique",
  "Lima",
  "Martins",
  "Mendes",
  "Nascimento",
  "Oliveira",
  "Pereira",
  "Ramos",
  "Rocha",
  "Santos",
  "Silva",
  "Souza",
  "Vieira",
] as const;

export class WorldGenesisGenerator {
  public generate(world: GameWorldSnapshot): WorldGenesisSnapshot {
    const startDate = requiredWorldDate(world.startDate);
    const baseTimestamp = Date.parse(`${world.startDate}T00:00:00.000Z`);
    const clubNames = shuffledClubNames(world.seed);
    const clubs: GeneratedClub[] = clubNames.map((name, index) => ({
      id: deterministicUuidV7<"Club">({
        worldSeed: world.seed,
        context: `${world.id}:club:${index}`,
        timestampMilliseconds: baseTimestamp,
      }),
      name,
      shortCode: `CLB-${String(index + 1).padStart(2, "0")}`,
    }));
    const persons: GeneratedPerson[] = [];
    const players: GeneratedPlayer[] = [];
    const squads: GeneratedSquad[] = [];

    clubs.forEach((club, clubIndex) => {
      const squadPlayerIds: PlayerId[] = [];
      // O elenco em si é de `player-generation.ts`: é lá que moram o teto comum
      // de 1.380, a curva etária e o arquétipo por posição (R-57/R-188). Aqui
      // ficam só os ids e as pessoas.
      const squad = generateSquadAttributes({
        worldSeed: world.seed,
        clubIndex,
      });

      squad.forEach((generated, squadIndex) => {
        const globalIndex =
          clubIndex * SQUAD_POSITION_TEMPLATE.length + squadIndex;
        const random = new SeededRandom({
          worldSeed: world.seed,
          context: `person:${globalIndex}`,
        });
        const personId = deterministicUuidV7<"Person">({
          worldSeed: world.seed,
          context: `${world.id}:person:${globalIndex}`,
          timestampMilliseconds: baseTimestamp,
        }) as PersonId;
        const playerId = deterministicUuidV7<"Player">({
          worldSeed: world.seed,
          context: `${world.id}:player:${globalIndex}`,
          timestampMilliseconds: baseTimestamp,
        }) as PlayerId;

        persons.push({
          id: personId,
          firstName: FIRST_NAMES[random.nextInt(0, FIRST_NAMES.length)]!,
          lastName: LAST_NAMES[random.nextInt(0, LAST_NAMES.length)]!,
          birthDate: birthDateForAge(
            startDate.toString(),
            generated.age,
            random,
          ),
          primaryNationality: "BR",
        });
        players.push({
          id: playerId,
          personId,
          clubId: club.id,
          primaryPosition: generated.position,
          ...(squadIndex < 2
            ? { secondaryPosition: secondaryPositionFor(generated.position) }
            : {}),
          dominantFoot: dominantFootFor(generated.position, random),
          attributes: generated.attributes,
          potentialAbility: generated.potentialAbility,
          generationSource: "INITIAL_WORLD",
        });
        squadPlayerIds.push(playerId);
      });

      squads.push({
        id: deterministicUuidV7<"Squad">({
          worldSeed: world.seed,
          context: `${world.id}:squad:${clubIndex}`,
          timestampMilliseconds: baseTimestamp,
        }),
        clubId: club.id,
        playerIds: squadPlayerIds,
      });
    });

    const competitionId = deterministicUuidV7<"Competition">({
      worldSeed: world.seed,
      context: `${world.id}:competition:initial-league`,
      timestampMilliseconds: baseTimestamp,
    }) as CompetitionId;
    const fixtures = generateFixtures({
      world,
      startDate,
      competitionId,
      clubIds: clubs.map((club) => club.id),
      baseTimestamp,
    });

    return {
      gameWorldId: world.id,
      rulesetVersion: world.rulesetVersion,
      sourceWorldVersion: world.version,
      clubs,
      persons,
      players,
      squads,
      competition: {
        id: competitionId,
        name: "Liga Inicial",
        seasonNumber: 1,
        rounds: 30,
        clubIds: clubs.map((club) => club.id),
      },
      fixtures,
    };
  }
}





function dominantFootFor(position: PlayerPositionType, random: SeededRandom) {
  if (position === PlayerPosition.LB || position === PlayerPosition.LW) {
    return random.nextInt(0, 10) < 8 ? DominantFoot.LEFT : DominantFoot.RIGHT;
  }
  if (position === PlayerPosition.RB || position === PlayerPosition.RW) {
    return random.nextInt(0, 10) < 8 ? DominantFoot.RIGHT : DominantFoot.LEFT;
  }
  const draw = random.nextInt(0, 100);
  return draw < 12
    ? DominantFoot.LEFT
    : draw < 16
      ? DominantFoot.BOTH
      : DominantFoot.RIGHT;
}

function secondaryPositionFor(
  position: PlayerPositionType,
): PlayerPositionType {
  const alternatives: Partial<Record<PlayerPositionType, PlayerPositionType>> =
    {
      [PlayerPosition.GK]: PlayerPosition.GK,
      [PlayerPosition.CB]: PlayerPosition.CDM,
      [PlayerPosition.LB]: PlayerPosition.LW,
      [PlayerPosition.RB]: PlayerPosition.RW,
      [PlayerPosition.CDM]: PlayerPosition.CM,
      [PlayerPosition.CM]: PlayerPosition.CAM,
      [PlayerPosition.CAM]: PlayerPosition.CM,
      [PlayerPosition.LW]: PlayerPosition.RW,
      [PlayerPosition.RW]: PlayerPosition.LW,
      [PlayerPosition.ST]: PlayerPosition.CF,
      [PlayerPosition.CF]: PlayerPosition.ST,
    };
  return alternatives[position] ?? position;
}

function birthDateForAge(
  startDate: string,
  age: number,
  random: SeededRandom,
): string {
  const [startYear, startMonth, startDay] = startDate
    .split("-")
    .map(Number) as [number, number, number];
  const month = random.nextInt(1, 13);
  const maxDay = new Date(Date.UTC(startYear, month, 0)).getUTCDate();
  const day = random.nextInt(1, maxDay + 1);
  const birthdayAlreadyOccurred =
    month < startMonth || (month === startMonth && day <= startDay);
  const birthYear = startYear - age - (birthdayAlreadyOccurred ? 0 : 1);
  return `${birthYear.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function shuffledClubNames(seed: string): string[] {
  const names = [...CLUB_NAMES];
  const random = new SeededRandom({ worldSeed: seed, context: "club-names" });
  for (let index = names.length - 1; index > 0; index -= 1) {
    const swapIndex = random.nextInt(0, index + 1);
    [names[index], names[swapIndex]] = [names[swapIndex]!, names[index]!];
  }
  return names;
}

function generateFixtures(
  input: Readonly<{
    world: GameWorldSnapshot;
    startDate: WorldDate;
    competitionId: CompetitionId;
    clubIds: readonly ClubId[];
    baseTimestamp: number;
  }>,
): GeneratedFixture[] {
  const rotation = [...input.clubIds];
  const firstLeg: GeneratedFixture[] = [];

  for (
    let roundIndex = 0;
    roundIndex < input.clubIds.length - 1;
    roundIndex += 1
  ) {
    for (
      let pairIndex = 0;
      pairIndex < input.clubIds.length / 2;
      pairIndex += 1
    ) {
      const first = rotation[pairIndex]!;
      const second = rotation[rotation.length - 1 - pairIndex]!;
      const firstIsHome = (roundIndex + pairIndex) % 2 === 0;
      const homeClubId = firstIsHome ? first : second;
      const awayClubId = firstIsHome ? second : first;
      const fixtureIndex = firstLeg.length;
      firstLeg.push({
        id: deterministicUuidV7<"Fixture">({
          worldSeed: input.world.seed,
          context: `${input.world.id}:fixture:${fixtureIndex}`,
          timestampMilliseconds: input.baseTimestamp,
        }),
        competitionId: input.competitionId,
        round: roundIndex + 1,
        leg: 1,
        homeClubId,
        awayClubId,
        scheduledWorldDate: input.startDate
          .addDays((roundIndex + 1) * 3)
          .toString(),
      });
    }

    rotation.splice(1, 0, rotation.pop()!);
  }

  const secondLeg = firstLeg.map((fixture, index): GeneratedFixture => ({
    id: deterministicUuidV7<"Fixture">({
      worldSeed: input.world.seed,
      context: `${input.world.id}:fixture:${firstLeg.length + index}`,
      timestampMilliseconds: input.baseTimestamp,
    }),
    competitionId: fixture.competitionId,
    round: fixture.round + 15,
    leg: 2,
    homeClubId: fixture.awayClubId,
    awayClubId: fixture.homeClubId,
    scheduledWorldDate: input.startDate
      .addDays((fixture.round + 15) * 3)
      .toString(),
  }));

  return [...firstLeg, ...secondLeg];
}

function requiredWorldDate(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}
