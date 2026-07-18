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

    // Os anúncios ativos (C6): um LISTED aparece no mercado — inclusive o do
    // próprio clube — com o preço pedido.
    const listings = await this.client.transferListing.findMany({
      where: { gameWorldId, status: "LISTED" },
      select: { playerId: true, askingPriceMinor: true },
    });
    const asking = new Map<string, bigint>(
      listings.map((l) => [l.playerId, l.askingPriceMinor]),
    );

    const include = {
      attributes: true,
      person: { select: { firstName: true, lastName: true, birthDate: true } },
      squadMemberships: {
        where: { squad: { category: "FIRST_TEAM" } },
        take: 1,
        include: { squad: { select: { clubId: true } } },
      },
    } as const;

    // Três grupos, unidos: o scout (melhores de OUTROS clubes), os agentes livres
    // (dispensados, sem elenco — R-200) e os listados (sempre visíveis, por id).
    const [scout, freeAgents, listedRows] = await Promise.all([
      this.client.player.findMany({
        where: {
          gameWorldId,
          squadMemberships: { some: { squad: { category: "FIRST_TEAM" } } },
        },
        orderBy: { currentAbility: "desc" },
        take: SCOUT_LIMIT * 2,
        include,
      }),
      this.client.player.findMany({
        where: { gameWorldId, squadMemberships: { none: {} } },
        orderBy: { currentAbility: "desc" },
        take: SCOUT_LIMIT,
        include,
      }),
      asking.size === 0
        ? Promise.resolve([])
        : this.client.player.findMany({
            where: { gameWorldId, id: { in: [...asking.keys()] } },
            include,
          }),
    ]);

    const byId = new Map<string, (typeof scout)[number]>();
    for (const p of [...scout, ...freeAgents, ...listedRows]) byId.set(p.id, p);
    const rows = [...byId.values()];

    const clubIds = new Set<string>();
    for (const p of rows) {
      const clubId = p.squadMemberships[0]?.squad.clubId;
      if (clubId != null) clubIds.add(clubId);
    }
    const names = await this.clubNames(gameWorldId, [...clubIds]);

    const items: MarketPlayerView[] = [];
    for (const p of rows) {
      if (p.attributes === null) continue;
      const clubId = p.squadMemberships[0]?.squad.clubId ?? null;
      const freeAgent = clubId === null;
      const listed = asking.has(p.id);
      // O próprio clube some do scout, MENOS quando anunciado. Agente livre sempre.
      if (clubId !== null && clubId === excludeClubId && !listed) continue;
      const age = ageOn(p.person.birthDate, asOf);
      const grid = readGrid(p.attributes);
      const identity = clubId === null ? undefined : names.get(clubId);
      const fullValue = estimatePlayerValueMinor(p.currentAbility, age);
      // Agente livre: valor cai 30% (R-200).
      const valueMinor = freeAgent ? (fullValue * 70n) / 100n : fullValue;
      items.push({
        playerId: p.id,
        name: `${p.person.firstName} ${p.person.lastName}`,
        clubId,
        clubName: freeAgent ? "Sem clube" : (identity?.name ?? "—"),
        freeAgent,
        clubPrimaryColor: identity?.primaryColor ?? null,
        clubSecondaryColor: identity?.secondaryColor ?? null,
        clubCrestTemplateId: identity?.crestTemplateId ?? null,
        primaryPosition: p.primaryPosition,
        age,
        overall: p.currentAbility,
        potential: p.potentialAbility,
        groups: rollupAttributes(grid),
        attributes: grid,
        valueMinor: valueMinor.toString(),
        listed,
        askingPriceMinor: asking.get(p.id)?.toString() ?? null,
      });
    }

    items.sort((a, b) => b.overall - a.overall);
    return { players: items };
  }

  private async clubNames(
    gameWorldId: GameWorldId,
    clubIds: readonly string[],
  ): Promise<
    Map<
      string,
      {
        name: string;
        primaryColor: string | null;
        secondaryColor: string | null;
        crestTemplateId: string | null;
      }
    >
  > {
    const periods = await this.client.clubIdentityPeriod.findMany({
      where: { gameWorldId, clubId: { in: [...clubIds] }, effectiveThrough: null },
      select: {
        clubId: true,
        name: true,
        primaryColor: true,
        secondaryColor: true,
        crestTemplateId: true,
      },
    });
    return new Map(
      periods.map((p) => [
        p.clubId,
        {
          name: p.name,
          primaryColor: p.primaryColor,
          secondaryColor: p.secondaryColor,
          crestTemplateId: p.crestTemplateId,
        },
      ]),
    );
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
