import { WorldDate, newGameWorldId, parseRulesetVersion } from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  PlayerPosition,
  WorldGenesisGenerator,
  derivePlayerOverall,
  validateWorldGenesis,
  type GameWorldSnapshot,
} from "../src/index.js";

function worldSnapshot(): GameWorldSnapshot {
  const date = WorldDate.parse("2026-01-01");
  const ruleset = parseRulesetVersion("1.0.0");
  if (!date.ok) throw date.error;
  if (!ruleset.ok) throw ruleset.error;
  const world = GameWorld.create({
    id: newGameWorldId(),
    seed: "grinta-genesis-001",
    startDate: date.value,
    rulesetVersion: ruleset.value,
  });
  if (!world.ok) throw world.error;
  return world.value.snapshot();
}

describe("WorldGenesisGenerator", () => {
  it("reproduz exatamente a mesma gênese para o mesmo mundo", () => {
    const world = worldSnapshot();
    const generator = new WorldGenesisGenerator();

    expect(generator.generate(world)).toEqual(generator.generate(world));
  });

  it("mantém o mesmo conteúdo para a mesma seed em mundos com IDs distintos", () => {
    const generator = new WorldGenesisGenerator();
    const first = generator.generate(worldSnapshot());
    const second = generator.generate(worldSnapshot());

    expect(semanticGenesis(first)).toEqual(semanticGenesis(second));
    expect(first.gameWorldId).not.toBe(second.gameWorldId);
    expect(first.clubs[0]!.id).not.toBe(second.clubs[0]!.id);
  });

  it("gera clubes, pessoas, jogadores e elencos válidos", () => {
    const world = worldSnapshot();
    const genesis = new WorldGenesisGenerator().generate(world);
    const validated = validateWorldGenesis(world, genesis);

    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    expect(validated.value.summary).toEqual({
      clubCount: 16,
      personCount: 368,
      playerCount: 368,
      squadCount: 16,
      averageOverall: 60,
    });
    expect(new Set(genesis.players.map(({ id }) => id))).toHaveLength(368);
    expect(
      new Set(genesis.players.map(({ personId }) => personId)),
    ).toHaveLength(368);
    // NÃO se exige 60 por jogador — era o que estava aqui, e contradizia a
    // R-57: "os pontos podem ser distribuídos de formas diferentes entre
    // goleiros, defesa, meio e ataque". Com todo mundo em 60 não há
    // distribuição possível, e o elenco não tem titular nem reserva. O que
    // vale é o TETO, checado por elenco logo abaixo.
    const notas = genesis.players.map((player) =>
      derivePlayerOverall(player.primaryPosition, player.attributes),
    );
    expect(Math.min(...notas)).toBeGreaterThan(40);
    expect(Math.max(...notas)).toBeLessThan(80);

    for (const squad of genesis.squads) {
      const players = squad.playerIds.map((id) =>
        genesis.players.find((player) => player.id === id),
      );
      expect(players).not.toContain(undefined);
      expect(players).toHaveLength(23);
      expect(
        players.filter(
          (player) => player?.primaryPosition === PlayerPosition.GK,
        ),
      ).toHaveLength(2);
      expect(
        players.reduce(
          (total, player) =>
            total +
            derivePlayerOverall(player!.primaryPosition, player!.attributes),
          0,
        ),
      ).toBe(1_380);
    }
  });

  it("gera somente atletas de 26 a 33 anos na data inicial", () => {
    const genesis = new WorldGenesisGenerator().generate(worldSnapshot());
    const ages = genesis.persons.map(({ birthDate }) =>
      ageAt("2026-01-01", birthDate),
    );

    expect(Math.min(...ages)).toBeGreaterThanOrEqual(26);
    expect(Math.max(...ages)).toBeLessThanOrEqual(33);
  });

  // O calendário deixou de nascer na gênese (R-203): o mundo nasce sem
  // competição. O sorteio turno-returno vive agora em competition-schedule.ts,
  // testado lá (competition-schedule.test.ts).

  it("rejeita corrupção dos vínculos de elenco", () => {
    const world = worldSnapshot();
    const genesis = new WorldGenesisGenerator().generate(world);
    const corrupted = {
      ...genesis,
      squads: [
        {
          ...genesis.squads[0]!,
          playerIds: genesis.squads[0]!.playerIds.slice(0, 22),
        },
        ...genesis.squads.slice(1),
      ],
    };

    const result = validateWorldGenesis(world, corrupted);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_WORLD_GENESIS");
  });
});

function ageAt(reference: string, birthDate: string): number {
  const referenceDate = new Date(`${reference}T00:00:00Z`);
  const birth = new Date(`${birthDate}T00:00:00Z`);
  let age = referenceDate.getUTCFullYear() - birth.getUTCFullYear();
  if (
    referenceDate.getUTCMonth() < birth.getUTCMonth() ||
    (referenceDate.getUTCMonth() === birth.getUTCMonth() &&
      referenceDate.getUTCDate() < birth.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

function semanticGenesis(
  genesis: ReturnType<WorldGenesisGenerator["generate"]>,
) {
  const clubNames = new Map(genesis.clubs.map((club) => [club.id, club.name]));
  return {
    clubs: genesis.clubs.map(({ name, shortCode }) => ({ name, shortCode })),
    persons: genesis.persons.map(
      ({ firstName, lastName, birthDate, primaryNationality }) => ({
        firstName,
        lastName,
        birthDate,
        primaryNationality,
      }),
    ),
    players: genesis.players.map(
      ({
        clubId,
        primaryPosition,
        secondaryPosition,
        dominantFoot,
        attributes,
        potentialAbility,
      }) => ({
        clubName: clubNames.get(clubId),
        primaryPosition,
        secondaryPosition,
        dominantFoot,
        attributes,
        potentialAbility,
      }),
    ),
  };
}
