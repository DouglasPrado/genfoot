import {
  SquadCategory,
  rollupAttributes,
  type PlayerAttributes,
  type RosterView,
  type SquadReadModel,
} from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";

import type { PrismaClient } from "./prisma-connection.js";

/**
 * Read model do elenco (M-03).
 *
 * Lê pelo Postgres, não pela porta de escrita (R-175): a escrita carrega UM
 * agregado; a tela quer a lista pronta, com nome (que mora na pessoa) e overall
 * (derivado). Um JOIN resolve o que reidratar 23 agregados desperdiçaria.
 */
export class PrismaSquadReadModel implements SquadReadModel {
  public constructor(private readonly client: PrismaClient) {}

  public async roster(
    gameWorldId: GameWorldId,
    clubId: string,
  ): Promise<RosterView | null> {
    const squad = await this.client.squad.findFirst({
      where: { gameWorldId, clubId, category: SquadCategory.FIRST_TEAM },
      include: {
        memberships: {
          orderBy: { shirtNumber: "asc" },
          include: {
            player: { include: { attributes: true, person: true } },
          },
        },
      },
    });
    if (squad === null) return null;

    const world = await this.client.gameWorld.findUnique({
      where: { id: gameWorldId },
      select: { currentDate: true },
    });
    const asOf = world?.currentDate ?? new Date();

    return {
      clubId,
      squadName: squad.name,
      seasonNumber: squad.seasonNumber,
      players: squad.memberships
        .filter((m) => m.player.attributes !== null)
        .map((m) => {
          const grid = readGrid(m.player.attributes!);
          return {
            playerId: m.player.id,
            shirtNumber: m.shirtNumber ?? 0,
            name: `${m.player.person.firstName} ${m.player.person.lastName}`,
            primaryPosition: m.player.primaryPosition,
            secondaryPosition: m.player.secondaryPosition ?? null,
            age: ageOn(m.player.person.birthDate, asOf),
            // A coluna é projeção (R-09); a tela pode confiar nela para exibir.
            overall: m.player.currentAbility,
            potential: m.player.potentialAbility,
            availability: m.player.availability,
            groups: rollupAttributes(grid),
          };
        }),
    };
  }
}

/** Idade em anos completos na data do mundo. */
function ageOn(birthDate: Date, asOf: Date): number {
  let age = asOf.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday =
    asOf.getUTCMonth() < birthDate.getUTCMonth() ||
    (asOf.getUTCMonth() === birthDate.getUTCMonth() &&
      asOf.getUTCDate() < birthDate.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function readGrid(row: Record<string, unknown>): PlayerAttributes {
  const grid: Record<string, number | null> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "playerId") continue;
    grid[key] = value as number | null;
  }
  return grid as PlayerAttributes;
}
