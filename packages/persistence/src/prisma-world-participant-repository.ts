import type {
  WorldParticipantRepository,
  WorldParticipantSnapshot,
} from "@grinta/core";
import { ParticipationStatus } from "@grinta/core";

import type { PrismaClient } from "./prisma-connection.js";

/**
 * Adapter do vínculo conta ↔ mundo (R-175). Segundo agregado por entidade, e o
 * primeiro com escopo de mundo — a conta (R-172) é global.
 *
 * `joinedOn`/`leftOn` são colunas DATE (R-177): a conversão é explícita nos dois
 * sentidos, à meia-noite UTC. O domínio não conhece hora, e guardar o horário
 * local aqui quebraria o determinismo.
 */
export class PrismaWorldParticipantRepository implements WorldParticipantRepository {
  public constructor(private readonly client: PrismaClient) {}

  public async findParticipantById(
    gameWorldId: string,
    id: string,
  ): Promise<WorldParticipantSnapshot | null> {
    return toSnapshot(
      await this.client.worldParticipant.findUnique({
        where: { gameWorldId_id: { gameWorldId, id } },
      }),
    );
  }

  public async findParticipantByAccount(
    gameWorldId: string,
    accountId: string,
  ): Promise<WorldParticipantSnapshot | null> {
    return toSnapshot(
      await this.client.worldParticipant.findUnique({
        where: { gameWorldId_userId: { gameWorldId, userId: accountId } },
      }),
    );
  }

  public async saveParticipant(
    snapshot: WorldParticipantSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    const data = {
      status: snapshot.status,
      joinedOn: fromWorldDate(snapshot.joinedOn),
      leftOn: snapshot.leftOn === null ? null : fromWorldDate(snapshot.leftOn),
      cooldownUntilOn:
        snapshot.cooldownUntilOn === null
          ? null
          : fromWorldDate(snapshot.cooldownUntilOn),
      version: snapshot.version,
    };

    if (expectedVersion === null) {
      await this.client.worldParticipant.create({
        data: {
          id: snapshot.id,
          gameWorldId: snapshot.gameWorldId,
          userId: snapshot.accountId,
          ...data,
        },
      });
      return;
    }

    // updateMany + count: o `where` casa id E versão, então uma escrita
    // concorrente que já subiu a versão não é sobrescrita em silêncio — afeta
    // 0 linhas e vira conflito.
    const { count } = await this.client.worldParticipant.updateMany({
      where: { id: snapshot.id, gameWorldId: snapshot.gameWorldId, version: expectedVersion },
      data,
    });
    if (count === 0) {
      throw new ParticipantVersionConflict(snapshot.id, expectedVersion);
    }
  }
}

export class ParticipantVersionConflict extends Error {
  public readonly code = "PARTICIPANT_VERSION_CONFLICT";
  public constructor(id: string, expectedVersion: number) {
    super(`Participação ${id} mudou: versão esperada ${expectedVersion} não confere.`);
  }
}

interface WorldParticipantRow {
  readonly id: string;
  readonly gameWorldId: string;
  readonly userId: string;
  readonly status: string;
  readonly joinedOn: Date;
  readonly leftOn: Date | null;
  readonly cooldownUntilOn: Date | null;
  readonly version: number;
}

function toSnapshot(
  row: WorldParticipantRow | null,
): WorldParticipantSnapshot | null {
  if (row === null) return null;
  return {
    id: row.id as WorldParticipantSnapshot["id"],
    gameWorldId: row.gameWorldId as WorldParticipantSnapshot["gameWorldId"],
    accountId: row.userId as WorldParticipantSnapshot["accountId"],
    status:
      row.status === "ENDED" ? ParticipationStatus.ENDED : ParticipationStatus.ACTIVE,
    joinedOn: toWorldDate(row.joinedOn),
    leftOn: row.leftOn === null ? null : toWorldDate(row.leftOn),
    cooldownUntilOn:
      row.cooldownUntilOn === null ? null : toWorldDate(row.cooldownUntilOn),
    version: row.version,
  };
}

/** `YYYY-MM-DD` → meia-noite UTC, que é o que a coluna DATE guarda. */
function fromWorldDate(worldDate: string): Date {
  return new Date(`${worldDate}T00:00:00.000Z`);
}

/** Volta só a data: o domínio não conhece hora. */
function toWorldDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
