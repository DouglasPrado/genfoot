import {
  estimatePlayerValueMinor,
  rollupAttributes,
  type MarketPlayerView,
  type MarketReadModel,
  type MarketView,
  type PlayerAttributes,
} from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";

import type { PrismaClient } from "./prisma-connection.js";

const SCOUT_LIMIT = 80;

/**
 * Read model do mercado (M-06) — o scout.
 *
 * O clube de um jogador vem do ELENCO (R-189): `Player` não tem `clubId`, então
 * o vínculo é `SquadMembership → Squad.clubId`. O valor é a estimativa da R-41,
 * calculada na hora — não há coluna de valor até C9.
 */
export class PrismaMarketReadModel implements MarketReadModel {
  public constructor(private readonly client: PrismaClient) {}

  public async scoutablePlayers(
    gameWorldId: GameWorldId,
    excludeClubId: string | null,
  ): Promise<MarketView> {
    const world = await this.client.gameWorld.findUnique({
      where: { id: gameWorldId },
      select: { currentDate: true },
    });
    const asOf = world?.currentDate ?? new Date();

    // Os melhores por overall, com o elenco (para achar o clube) e a pessoa (nome,
    // idade). O vínculo jogador→clube é o elenco (R-189).
    const players = await this.client.player.findMany({
      where: {
        gameWorldId,
        squadMemberships: {
          some: { squad: { category: "FIRST_TEAM" } },
        },
      },
      orderBy: { currentAbility: "desc" },
      take: SCOUT_LIMIT * 2, // folga: filtramos o próprio clube depois
      include: {
        attributes: true,
        person: { select: { firstName: true, lastName: true, birthDate: true } },
        squadMemberships: {
          where: { squad: { category: "FIRST_TEAM" } },
          take: 1,
          include: { squad: { select: { clubId: true } } },
        },
      },
    });

    const clubIds = new Set<string>();
    for (const p of players) {
      const clubId = p.squadMemberships[0]?.squad.clubId;
      if (clubId != null) clubIds.add(clubId);
    }
    const names = await this.clubNames(gameWorldId, [...clubIds]);

    const items: MarketPlayerView[] = [];
    for (const p of players) {
      const clubId = p.squadMemberships[0]?.squad.clubId;
      if (clubId == null || clubId === excludeClubId) continue;
      // Sem grid de atributos não há card de habilidades — e overall/valor
      // dependem do grid. Pula (como o roster faz), em vez de mostrar meio card.
      if (p.attributes === null) continue;
      const age = ageOn(p.person.birthDate, asOf);
      const grid = readGrid(p.attributes);
      items.push({
        playerId: p.id,
        name: `${p.person.firstName} ${p.person.lastName}`,
        clubId,
        clubName: names.get(clubId)?.name ?? "—",
        primaryPosition: p.primaryPosition,
        age,
        overall: p.currentAbility,
        potential: p.potentialAbility,
        groups: rollupAttributes(grid),
        attributes: grid,
        valueMinor: estimatePlayerValueMinor(p.currentAbility, age).toString(),
      });
      if (items.length >= SCOUT_LIMIT) break;
    }

    return { players: items };
  }

  private async clubNames(
    gameWorldId: GameWorldId,
    clubIds: readonly string[],
  ): Promise<Map<string, { name: string }>> {
    const periods = await this.client.clubIdentityPeriod.findMany({
      where: { gameWorldId, clubId: { in: [...clubIds] }, effectiveThrough: null },
      select: { clubId: true, name: true },
    });
    return new Map(periods.map((p) => [p.clubId, { name: p.name }]));
  }
}

/** Lê a linha de atributos do Prisma para o grid do domínio (menos `playerId`). */
function readGrid(row: Record<string, unknown>): PlayerAttributes {
  const grid: Record<string, number | null> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "playerId") continue;
    grid[key] = value as number | null;
  }
  return grid as PlayerAttributes;
}

function ageOn(birthDate: Date, asOf: Date): number {
  let age = asOf.getUTCFullYear() - birthDate.getUTCFullYear();
  const before =
    asOf.getUTCMonth() < birthDate.getUTCMonth() ||
    (asOf.getUTCMonth() === birthDate.getUTCMonth() &&
      asOf.getUTCDate() < birthDate.getUTCDate());
  if (before) age -= 1;
  return age;
}
