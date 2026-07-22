import {
  derivePotentialLayers,
  perAttributeGain,
  sessionElapsedDays,
  sessionRawGainPoints,
  type TrainingSessionSnapshot,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * As sessões de treino ATIVAS de um clube (R-221 Fase 2a, leitura), agora com a
 * PROJEÇÃO do ganho POR HABILIDADE — "onde cada atributo vai chegar" pelo tempo
 * treinado, já com o ganho DIVIDIDO entre as habilidades escolhidas.
 *
 * A projeção usa as MESMAS funções puras que a coleta aplica
 * (`sessionRawGainPoints` + `perAttributeGain`), então o número que a tela mostra
 * bate com o que a coleta vai render. O cliente NÃO computa isso.
 */
export interface TrainingAttributeProjection {
  readonly attributeCode: string;
  /** Valor atual (0..100), ou null se não se aplica. */
  readonly currentValue: number | null;
  /** Pontos que a coleta renderia agora nesta habilidade (o bruto ÷ N). */
  readonly projectedGainPoints: number;
  /** Valor projetado (atual + ganho), ou null. */
  readonly projectedValue: number | null;
}

export interface TrainingSessionView extends TrainingSessionSnapshot {
  /** Dias já treinados (tetado na duração). */
  readonly elapsedDays: number;
  /** O bruto projetado da sessão (antes de dividir entre as habilidades). */
  readonly rawGainPoints: number;
  /** Projeção por habilidade treinada. */
  readonly projections: readonly TrainingAttributeProjection[];
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
      const codes = row.attributeCodes;
      const snapshot: TrainingSessionSnapshot = {
        id: row.id,
        gameWorldId: row.gameWorldId,
        clubId: row.clubId,
        playerId: row.playerId,
        attributeCodes: codes,
        startDate: isoDate(row.startDate),
        durationDays: row.durationDays,
        active: row.active,
        version: row.version,
      };

      const player = row.player;
      const attrs = player.attributes as Record<string, unknown> | null;
      const currentOf = (code: string): number | null => {
        const raw = attrs?.[code];
        return typeof raw === "number" ? raw : null;
      };

      // Sem data do mundo não há projeção honesta — só os valores atuais.
      if (worldDate === null) {
        return {
          ...snapshot,
          elapsedDays: 0,
          rawGainPoints: 0,
          projections: codes.map((code) => {
            const currentValue = currentOf(code);
            return {
              attributeCode: code,
              currentValue,
              projectedGainPoints: 0,
              projectedValue: currentValue,
            };
          }),
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
      const rawGainPoints = sessionRawGainPoints({
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
        rawGainPoints,
        projections: codes.map((code) => {
          const currentValue = currentOf(code);
          const projectedGainPoints = perAttributeGain({
            rawGain: rawGainPoints,
            attributeCount: codes.length,
            attributeCurrentValue: currentValue,
          });
          return {
            attributeCode: code,
            currentValue,
            projectedGainPoints,
            projectedValue:
              currentValue === null ? null : currentValue + projectedGainPoints,
          };
        }),
      };
    });
  }
}
