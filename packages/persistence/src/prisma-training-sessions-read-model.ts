import {
  derivePotentialLayers,
  projectSessionGainPoints,
  sessionElapsedDays,
  type TrainingSessionSnapshot,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * As sessões de treino ATIVAS de um clube (R-221 Fase 2a, leitura), agora com a
 * PROJEÇÃO do ganho — "onde o atributo vai chegar" pelo tempo já treinado.
 *
 * A projeção usa a MESMA função pura que a coleta aplica
 * (`projectSessionGainPoints`), então o número que a tela mostra bate com o que
 * a coleta vai render. O cliente NÃO computa isso: regra de domínio mora no
 * servidor (cliente é não-autoritativo).
 */
export interface TrainingSessionView extends TrainingSessionSnapshot {
  /** Dias já treinados (tetado na duração). */
  readonly elapsedDays: number;
  /** Valor atual do atributo-foco (0..100), ou null se não se aplica. */
  readonly attributeCurrentValue: number | null;
  /** Pontos que a coleta renderia agora. */
  readonly projectedGainPoints: number;
  /** Valor projetado do atributo depois de coletar (atual + ganho). */
  readonly projectedValue: number | null;
}

export interface TrainingSessionsReadModel {
  activeByClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<readonly TrainingSessionView[]>;
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
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

export class PrismaTrainingSessionsReadModel
  implements TrainingSessionsReadModel
{
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async activeByClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<readonly TrainingSessionView[]> {
    const rows = await this.client.trainingSession.findMany({
      where: { gameWorldId, clubId, active: true },
      orderBy: { startDate: "asc" },
      include: {
        player: { include: { attributes: true, person: true } },
      },
    });
    // A data lógica do mundo — base do tempo decorrido e da idade.
    const world = await this.client.gameWorld.findUnique({
      where: { id: gameWorldId },
      select: { currentDate: true },
    });
    const worldDate = world?.currentDate ?? null;

    return rows.map((row) => {
      const snapshot: TrainingSessionSnapshot = {
        id: row.id,
        gameWorldId: row.gameWorldId,
        clubId: row.clubId,
        playerId: row.playerId,
        attributeCode: row.attributeCode,
        startDate: isoDate(row.startDate),
        durationDays: row.durationDays,
        active: row.active,
        version: row.version,
      };

      const player = row.player;
      const attrs = player.attributes as Record<string, unknown> | null;
      const rawCurrent = attrs?.[row.attributeCode];
      const attributeCurrentValue =
        typeof rawCurrent === "number" ? rawCurrent : null;

      // Sem data do mundo não há projeção honesta — devolve os campos nulos em
      // vez de inventar tempo decorrido.
      if (worldDate === null) {
        return {
          ...snapshot,
          elapsedDays: 0,
          attributeCurrentValue,
          projectedGainPoints: 0,
          projectedValue: attributeCurrentValue,
        };
      }

      const elapsedDays = Math.min(
        sessionElapsedDays(snapshot.startDate, isoDate(worldDate)),
        row.durationDays,
      );
      const usableCeiling = derivePotentialLayers({
        natural: player.potentialAbility,
        baselineAbility: player.baselineAbility,
        currentAbility: player.currentAbility,
      }).usable;
      const projectedGainPoints = projectSessionGainPoints({
        attributeCurrentValue,
        usableCeiling,
        currentAbility: player.currentAbility,
        morale: player.morale,
        fatigue: player.fatigue,
        age: ageOn(player.person.birthDate, worldDate),
        elapsedDays,
        durationDays: row.durationDays,
      });

      return {
        ...snapshot,
        elapsedDays,
        attributeCurrentValue,
        projectedGainPoints,
        projectedValue:
          attributeCurrentValue === null
            ? null
            : attributeCurrentValue + projectedGainPoints,
      };
    });
  }
}
