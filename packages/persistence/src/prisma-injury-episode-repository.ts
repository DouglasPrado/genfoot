import {
  MedicalEpisodeState,
  TERMINAL_EPISODE_STATES,
  type InjuryCause,
  type InjuryEpisodeRepository,
  type InjuryEpisodeSnapshot,
  type InjurySeverity,
  type InjuryType,
  type TreatmentOption,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * O episódio médico em Postgres (MED-1..MED-9).
 *
 * `save` usa `updateMany` com a versão esperada no WHERE — concorrência
 * otimista no BANCO, igual ao resto do C4: duas transições concorrentes com a
 * mesma `expectedVersion` e a segunda atualiza 0 linhas e é recusada.
 *
 * As datas do domínio são datas do MUNDO (`YYYY-MM-DD`), não instantes reais;
 * a coluna é `DateTime`, então a conversão fixa meia-noite UTC nos dois
 * sentidos — sem `Date.now()` em lugar nenhum.
 */

const OPEN_STATES = Object.values(MedicalEpisodeState).filter(
  (state) => !TERMINAL_EPISODE_STATES.includes(state),
);

const toWorldDate = (value: Date): string => value.toISOString().slice(0, 10);

const fromWorldDate = (value: string): Date =>
  new Date(`${value}T00:00:00.000Z`);

type InjuryRow = {
  id: string;
  gameWorldId: string;
  clubId: string | null;
  playerId: string;
  state: string;
  rehabStage: number | null;
  injuryType: string;
  cause: string;
  region: string;
  severity: string;
  occurredAt: Date;
  expectedReturnAt: Date | null;
  recoveredAt: Date | null;
  diagnosisMinimumDays: number | null;
  diagnosisMaximumDays: number | null;
  returnRiskScore: number | null;
  diagnosisRevisions: number;
  treatmentOption: string | null;
  treatmentStartedAt: Date | null;
  relapseCount: number;
  version: number;
};

function toSnapshot(row: InjuryRow): InjuryEpisodeSnapshot {
  const hasDiagnosis =
    row.diagnosisMinimumDays !== null &&
    row.diagnosisMaximumDays !== null &&
    row.returnRiskScore !== null;

  return {
    id: row.id,
    gameWorldId: row.gameWorldId,
    // `clubId` é opcional na tabela (lesão de jogador sem clube), mas o
    // episódio do domínio sempre tem dono do tratamento; string vazia deixaria
    // a ausência silenciosa, então preserva-se o vazio explícito.
    clubId: row.clubId ?? "",
    playerId: row.playerId,
    state: row.state as InjuryEpisodeSnapshot["state"],
    rehabStage: row.rehabStage,
    injuryType: row.injuryType as InjuryType,
    cause: row.cause as InjuryCause,
    region: row.region,
    occurredOn: toWorldDate(row.occurredAt),
    diagnosis: hasDiagnosis
      ? {
          severity: row.severity as InjurySeverity,
          minimumDays: row.diagnosisMinimumDays as number,
          maximumDays: row.diagnosisMaximumDays as number,
          returnRiskScore: row.returnRiskScore as number,
          revisions: row.diagnosisRevisions,
        }
      : null,
    treatment:
      row.treatmentOption !== null && row.treatmentStartedAt !== null
        ? {
            option: row.treatmentOption as TreatmentOption,
            startedOn: toWorldDate(row.treatmentStartedAt),
            estimatedReturnOn:
              row.expectedReturnAt === null
                ? toWorldDate(row.treatmentStartedAt)
                : toWorldDate(row.expectedReturnAt),
          }
        : null,
    relapseCount: row.relapseCount,
    dischargedOn: row.recoveredAt === null ? null : toWorldDate(row.recoveredAt),
    version: row.version,
  };
}

/** Nome legível do caso — a lista `M-MEDICAL` mostra isto, não o enum cru. */
const INJURY_TYPE_LABELS: Readonly<Record<string, string>> = {
  LIGHT: "Lesão leve",
  MODERATE: "Lesão moderada",
  SERIOUS: "Lesão grave",
  MUSCULAR: "Lesão muscular",
  IMPACT: "Lesão por pancada",
  RECURRENT: "Lesão recorrente",
};

function writableColumns(episode: InjuryEpisodeSnapshot) {
  return {
    clubId: episode.clubId === "" ? null : episode.clubId,
    state: episode.state as never,
    rehabStage: episode.rehabStage,
    injuryType: episode.injuryType as never,
    cause: episode.cause as never,
    region: episode.region,
    // A gravidade vive na coluna que já existia; sem diagnóstico fechado ela
    // ainda é a suspeita inicial, e a faixa vem do catálogo da própria
    // gravidade — não se inventa número aqui.
    severity: (episode.diagnosis?.severity ?? "LIGHT") as never,
    name:
      INJURY_TYPE_LABELS[episode.injuryType] ??
      INJURY_TYPE_LABELS.LIGHT ??
      "Lesão",
    occurredAt: fromWorldDate(episode.occurredOn),
    expectedReturnAt:
      episode.treatment === null
        ? null
        : fromWorldDate(episode.treatment.estimatedReturnOn),
    recoveredAt:
      episode.dischargedOn === null ? null : fromWorldDate(episode.dischargedOn),
    diagnosisMinimumDays: episode.diagnosis?.minimumDays ?? null,
    diagnosisMaximumDays: episode.diagnosis?.maximumDays ?? null,
    returnRiskScore: episode.diagnosis?.returnRiskScore ?? null,
    diagnosisRevisions: episode.diagnosis?.revisions ?? 0,
    treatmentOption: (episode.treatment?.option ?? null) as never,
    treatmentStartedAt:
      episode.treatment === null
        ? null
        : fromWorldDate(episode.treatment.startedOn),
    relapseCount: episode.relapseCount,
    version: episode.version,
  };
}

export class PrismaInjuryEpisodeRepository implements InjuryEpisodeRepository {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async findOpenByPlayer(
    gameWorldId: string,
    playerId: string,
  ): Promise<InjuryEpisodeSnapshot | null> {
    const row = await this.client.playerInjury.findFirst({
      where: { gameWorldId, playerId, state: { in: OPEN_STATES as never } },
      orderBy: { occurredAt: "desc" },
    });
    return row === null ? null : toSnapshot(row);
  }

  public async findById(
    gameWorldId: string,
    injuryId: string,
  ): Promise<InjuryEpisodeSnapshot | null> {
    const row = await this.client.playerInjury.findFirst({
      where: { gameWorldId, id: injuryId },
    });
    return row === null ? null : toSnapshot(row);
  }

  public async listOpenByClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<readonly InjuryEpisodeSnapshot[]> {
    const rows = await this.client.playerInjury.findMany({
      where: { gameWorldId, clubId, state: { in: OPEN_STATES as never } },
      orderBy: { occurredAt: "asc" },
    });
    return rows.map((row) => toSnapshot(row));
  }

  public async save(
    episode: InjuryEpisodeSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    const columns = writableColumns(episode);
    if (expectedVersion === null) {
      await this.client.playerInjury.create({
        data: {
          id: episode.id,
          gameWorldId: episode.gameWorldId,
          playerId: episode.playerId,
          ...columns,
        },
      });
      return;
    }
    const updated = await this.client.playerInjury.updateMany({
      where: { id: episode.id, version: expectedVersion },
      data: columns,
    });
    if (updated.count === 0) {
      throw new Error(
        `AGGREGATE_VERSION_CONFLICT: episódio médico ${episode.id} não está na versão ${expectedVersion}.`,
      );
    }
  }
}
