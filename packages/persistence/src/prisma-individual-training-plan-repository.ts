import {
  derivePotentialLayers,
  sessionRawGainPoints,
  type IndividualTrainingPlanRepository,
  type IndividualTrainingPlanSnapshot,
  type IndividualTrainingTarget,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/** Idade em anos completos na data do mundo (UTC). */
function ageOn(birthDate: Date, asOf: Date): number {
  let age = asOf.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday =
    asOf.getUTCMonth() < birthDate.getUTCMonth() ||
    (asOf.getUTCMonth() === birthDate.getUTCMonth() &&
      asOf.getUTCDate() < birthDate.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * O plano de treino INDIVIDUAL em Postgres (M-TRAINING-INDIV).
 *
 * `save` usa `updateMany` com a versão esperada no WHERE — concorrência
 * otimista no BANCO, como o plano coletivo. O alvo (discriminated union) é
 * achatado em três colunas: `targetKind` + `targetAttributeCode`/`targetPosition`.
 */
interface Row {
  readonly id: string;
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly playerId: string;
  readonly targetKind: string;
  readonly targetAttributeCodes: string[];
  readonly targetPosition: string | null;
  readonly targetArchetype: string | null;
  readonly intensity: number;
  readonly version: number;
}

function toTarget(row: Row): IndividualTrainingTarget {
  if (row.targetKind === "POSITION") {
    return { kind: "POSITION", position: row.targetPosition ?? "" };
  }
  if (row.targetKind === "GK_ARCHETYPE") {
    return { kind: "GK_ARCHETYPE", archetype: row.targetArchetype ?? "" };
  }
  return { kind: "ATTRIBUTE", attributeCodes: row.targetAttributeCodes };
}

function toSnapshot(row: Row): IndividualTrainingPlanSnapshot {
  return {
    id: row.id,
    gameWorldId: row.gameWorldId,
    clubId: row.clubId,
    playerId: row.playerId,
    target: toTarget(row),
    intensity: row.intensity,
    version: row.version,
  };
}

function targetColumns(target: IndividualTrainingTarget): {
  targetKind: string;
  targetAttributeCodes: string[];
  targetPosition: string | null;
  targetArchetype: string | null;
} {
  if (target.kind === "POSITION") {
    return { targetKind: "POSITION", targetAttributeCodes: [], targetPosition: target.position, targetArchetype: null };
  }
  if (target.kind === "GK_ARCHETYPE") {
    return { targetKind: "GK_ARCHETYPE", targetAttributeCodes: [], targetPosition: null, targetArchetype: target.archetype };
  }
  return { targetKind: "ATTRIBUTE", targetAttributeCodes: [...target.attributeCodes], targetPosition: null, targetArchetype: null };
}

export class PrismaIndividualTrainingPlanRepository
  implements IndividualTrainingPlanRepository
{
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async findByPlayer(
    gameWorldId: string,
    clubId: string,
    playerId: string,
  ): Promise<IndividualTrainingPlanSnapshot | null> {
    const row = await this.client.individualTrainingPlan.findFirst({
      where: { gameWorldId, clubId, playerId },
    });
    return row === null ? null : toSnapshot(row);
  }

  public async findAllActive(
    gameWorldId: string,
  ): Promise<readonly IndividualTrainingPlanSnapshot[]> {
    const rows = await this.client.individualTrainingPlan.findMany({
      where: { gameWorldId },
    });
    return rows.map(toSnapshot);
  }

  public async playerIdsWithPlan(
    gameWorldId: string,
    clubId: string,
  ): Promise<readonly string[]> {
    const rows = await this.client.individualTrainingPlan.findMany({
      where: { gameWorldId, clubId },
      select: { playerId: true },
    });
    return rows.map((r) => r.playerId);
  }

  public async dailyBudget(
    gameWorldId: string,
    playerId: string,
  ): Promise<number | null> {
    const player = await this.client.player.findUnique({
      where: { id: playerId },
      include: { person: true },
    });
    if (player === null || player.gameWorldId !== gameWorldId) return null;
    const world = await this.client.gameWorld.findUnique({
      where: { id: gameWorldId },
      select: { currentDate: true },
    });
    if (world === null) return null;
    const usableCeiling = derivePotentialLayers({
      natural: player.potentialAbility,
      baselineAbility: player.baselineAbility,
      currentAbility: player.currentAbility,
    }).usable;
    // A MESMA conta da virada (settle) e da projeção de sessão: 1 dia lógico.
    return sessionRawGainPoints({
      usableCeiling,
      currentAbility: player.currentAbility,
      morale: player.morale,
      fatigue: player.fatigue,
      age: ageOn(player.person.birthDate, world.currentDate),
      elapsedDays: 1,
      durationDays: 1,
    });
  }

  public async save(
    plan: IndividualTrainingPlanSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    const cols = targetColumns(plan.target);
    if (expectedVersion === null) {
      await this.client.individualTrainingPlan.create({
        data: {
          id: plan.id,
          gameWorldId: plan.gameWorldId,
          clubId: plan.clubId,
          playerId: plan.playerId,
          ...cols,
          intensity: plan.intensity,
          version: plan.version,
        },
      });
      return;
    }
    const updated = await this.client.individualTrainingPlan.updateMany({
      where: { id: plan.id, version: expectedVersion },
      data: { ...cols, intensity: plan.intensity, version: plan.version },
    });
    if (updated.count === 0) {
      throw new Error(
        `AGGREGATE_VERSION_CONFLICT: plano individual ${plan.id} não está na versão ${expectedVersion}.`,
      );
    }
  }
}
