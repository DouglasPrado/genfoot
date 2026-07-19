import type { Prisma } from "./generated/prisma/client.js";
import type {
  AccrualContextReader,
  AccrualBufferWriter,
  BufferIncrement,
  PlayerAccrualContext,
} from "@grinta/core";
import {
  GOALKEEPING_ATTRIBUTES,
  MENTAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
  deterministicUuidV7,
} from "@grinta/core";

const ALL_ATTRIBUTE_CODES: readonly string[] = [
  ...TECHNICAL_ATTRIBUTES,
  ...PHYSICAL_ATTRIBUTES,
  ...MENTAL_ATTRIBUTES,
  ...GOALKEEPING_ATTRIBUTES,
];

/**
 * Contexto de accrual dos jogadores de um clube (R-212).
 *
 * Lê o que a fórmula de desenvolvimento precisa por jogador — idade, habilidade,
 * base, teto natural e quais atributos se aplicam à posição. Vem de `Player` +
 * `PlayerAttributes`; o elenco vem de `SquadMembership` ativo.
 */
export class PrismaAccrualContextReader implements AccrualContextReader {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async contextFor(
    gameWorldId: string,
    clubId: string,
    playerIds: readonly string[],
  ): Promise<readonly PlayerAccrualContext[]> {
    if (playerIds.length === 0) return [];
    const rows = await this.client.player.findMany({
      where: {
        gameWorldId,
        id: { in: [...playerIds] },
        squadMemberships: { some: { isActive: true, squad: { clubId } } },
      },
      include: { person: true, attributes: true },
    });

    return rows
      .filter((row) => row.attributes !== null)
      .map((row) => {
        const attrs = row.attributes as unknown as Record<
          string,
          number | null
        >;
        // Atributo aplicável = não-`null` no grid canônico (R-188). O grid de
        // goleiro é `null` em quem não é goleiro, e treinar o que não se aplica
        // não rende. Varre só os códigos de atributo, não as colunas técnicas.
        const applicableAttributes = ALL_ATTRIBUTE_CODES.filter(
          (code) => typeof attrs[code] === "number",
        );

        return {
          playerId: row.id,
          age: row.person.ageVirtual,
          baselineAbility: row.baselineAbility,
          currentAbility: row.currentAbility,
          naturalPotential: row.potentialAbility,
          applicableAttributes,
        };
      });
  }
}

/**
 * Soma incrementos ao buffer `PlayerDevelopmentAccrual` (R-212/R-82).
 *
 * Upsert por `(playerId, seasonId, attributeCode)`: um dia de treino SOMA ao que
 * já foi acumulado na temporada, não substitui. `pendingDeltaMinor` é BigInt —
 * o delta escalado nunca vira float. `evidenceCount` conta os dias, para a
 * `M-PLAYER-DEV` poder dizer "3 semanas de foco em passe".
 */
export class PrismaAccrualBufferWriter implements AccrualBufferWriter {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async addToBuffer(
    increments: readonly BufferIncrement[],
  ): Promise<void> {
    for (const inc of increments) {
      const delta = BigInt(inc.pendingDelta);
      const id = deterministicUuidV7({
        worldSeed: inc.gameWorldId,
        context: `accrual:${inc.playerId}:${inc.seasonId}:${inc.attributeCode}`,
        timestampMilliseconds: 0,
      });
      await this.client.playerDevelopmentAccrual.upsert({
        where: {
          playerId_seasonId_attributeCode: {
            playerId: inc.playerId,
            seasonId: inc.seasonId,
            attributeCode: inc.attributeCode,
          },
        },
        create: {
          id,
          gameWorldId: inc.gameWorldId,
          playerId: inc.playerId,
          seasonId: inc.seasonId,
          attributeCode: inc.attributeCode,
          pendingDeltaMinor: delta,
          evidenceCount: 1,
        },
        update: {
          pendingDeltaMinor: { increment: delta },
          evidenceCount: { increment: 1 },
        },
      });
    }
  }
}
