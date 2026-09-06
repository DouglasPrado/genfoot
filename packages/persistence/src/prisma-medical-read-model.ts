import {
  LAST_REHAB_STAGE,
  RETURN_TO_TRAINING_STAGE,
  rehabStageCode,
  relapseRiskScore,
  treatmentOptionsFor,
  type InjuryEpisodeSnapshot,
  type InjurySeverity,
  type TreatmentProfile,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import { PrismaInjuryEpisodeRepository } from "./prisma-injury-episode-repository.js";

/**
 * Leitura do departamento médico (`M-MEDICAL` e `M-MEDICAL-CASE`).
 *
 * A tela precisa de coisas que o episódio sozinho não tem — nome do jogador,
 * fadiga, nível da comissão médica. Read model separado da porta de escrita
 * (R-175): a escrita carrega UM episódio por id; a tela quer a lista do clube.
 */

/**
 * Confidencialidade médica (§16): a mesma lesão é vista diferente por camada.
 *
 * Hoje só a camada `STAFF` é servida — é a que as duas telas mostram, porque
 * quem joga É a comissão. `PUBLIC` e `MARKET` existem no doc e ainda NÃO têm
 * regra ratificada de distorção; servi-las com o mesmo dado seria fingir
 * assimetria que não existe.
 */
export const MEDICAL_DISCLOSURE_LAYERS = ["TRUE", "STAFF", "PUBLIC", "MARKET"] as const;

export type MedicalDisclosureLayer = (typeof MEDICAL_DISCLOSURE_LAYERS)[number];

export interface MedicalCaseRow {
  readonly injuryId: string;
  readonly playerId: string;
  readonly playerName: string;
  readonly position: string;
  readonly state: InjuryEpisodeSnapshot["state"];
  readonly rehabStage: number | null;
  readonly rehabStageCode: string | null;
  readonly rehabStageTotal: number;
  readonly injuryType: string;
  readonly region: string;
  /** Gravidade só existe depois do diagnóstico; antes é suspeita. */
  readonly severity: InjurySeverity | null;
  readonly occurredOn: string;
  readonly estimatedReturnOn: string | null;
  readonly minimumDays: number | null;
  readonly maximumDays: number | null;
  readonly treatmentOption: string | null;
  /**
   * Risco de recaída 0–100 — só existe DENTRO da reabilitação. Fora dela é
   * `null`: quem nem começou a tratar não tem o que recair, e mostrar 97% num
   * caso em avaliação é número inventado com cara de medição.
   */
  readonly relapseRisk: number | null;
  readonly returnRiskScore: number | null;
  readonly relapseCount: number;
  /** Fadiga 0–100 e a condição geral derivada dela. */
  readonly fatigue: number;
  readonly condition: number;
  /** Já voltou a treinar (S4+) — muda o que a tela de treino permite. */
  readonly backInTraining: boolean;
}

/**
 * Jogador impedido por motivo médico SEM episódio aberto.
 *
 * Existe por duas razões legítimas: §16 prevê dor/fadiga/restrição sem lesão
 * diagnosticada, e mundos criados antes desta vertical têm `availability`
 * marcada sem nenhum `PlayerInjury` por trás. Em ambos os casos o elenco mostra
 * o jogador como indisponível — se o departamento médico o omitisse, as duas
 * telas se contradiriam, e a contradição é pior que a lacuna.
 */
export interface MedicalRestrictionRow {
  readonly playerId: string;
  readonly playerName: string;
  readonly position: string;
  readonly availability: string;
  readonly fatigue: number;
  readonly condition: number;
}

export interface MedicalDepartmentView {
  readonly cases: readonly MedicalCaseRow[];
  /** Impedidos sem caso registrado — a tela diz que não há o que conduzir. */
  readonly restrictions: readonly MedicalRestrictionRow[];
  readonly squadSize: number;
  readonly healthyCount: number;
  /**
   * Nível da comissão médica 0–100 (média de `medicalKnowledge` dos
   * contratados). `null` quando o clube não tem staff médico contratado — a
   * tela diz "sem comissão médica", não inventa um nível.
   */
  readonly departmentLevel: number | null;
}

export interface MedicalCaseDetail {
  readonly case: MedicalCaseRow | null;
  /** Opções recomendadas para a gravidade diagnosticada (vazio sem diagnóstico). */
  readonly treatmentOptions: readonly TreatmentProfile[];
  readonly disclosureLayer: MedicalDisclosureLayer;
}

export class PrismaMedicalReadModel {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async department(
    gameWorldId: string,
    clubId: string,
  ): Promise<MedicalDepartmentView> {
    const episodes = await new PrismaInjuryEpisodeRepository(
      this.client,
    ).listOpenByClub(gameWorldId, clubId);

    const [rows, squadSize, departmentLevel, blocked] = await Promise.all([
      this.playerRows(
        gameWorldId,
        episodes.map((episode) => episode.playerId),
      ),
      this.client.squadMembership.count({
        where: { isActive: true, squad: { clubId }, player: { gameWorldId } },
      }),
      this.departmentLevel(gameWorldId, clubId),
      this.medicallyBlocked(gameWorldId, clubId),
    ]);

    const cases = episodes
      .map((episode) => toCaseRow(episode, rows.get(episode.playerId)))
      .filter((row): row is MedicalCaseRow => row !== null);

    const withCase = new Set(cases.map((row) => row.playerId));
    const restrictions = blocked.filter((row) => !withCase.has(row.playerId));

    return {
      cases,
      restrictions,
      squadSize,
      healthyCount: Math.max(0, squadSize - cases.length - restrictions.length),
      departmentLevel,
    };
  }

  /**
   * Quem o elenco mostra como impedido por motivo MÉDICO.
   *
   * Só `INJURED`. `SUSPENDED` é disciplina, e **`UNAVAILABLE` não é médico**:
   * no domínio ele é o jogador em sessão de treino (`Player.beginTraining`,
   * `player.ts:328`), que sai sozinho quando a sessão fecha — o mesmo cuidado
   * que `availability-model.ts:21` já toma na escalação. Listá-lo aqui poria o
   * elenco inteiro em recuperação num dia de treino.
   */
  private async medicallyBlocked(
    gameWorldId: string,
    clubId: string,
  ): Promise<readonly MedicalRestrictionRow[]> {
    const rows = await this.client.squadMembership.findMany({
      where: {
        isActive: true,
        squad: { clubId },
        player: {
          gameWorldId,
          availability: "INJURED",
        },
      },
      include: {
        player: {
          select: {
            id: true,
            fatigue: true,
            availability: true,
            primaryPosition: true,
            person: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    return rows.map((row) => ({
      playerId: row.player.id,
      playerName:
        `${row.player.person.firstName} ${row.player.person.lastName}`.trim(),
      position: row.player.primaryPosition,
      availability: row.player.availability,
      fatigue: row.player.fatigue,
      condition: Math.max(0, 100 - row.player.fatigue),
    }));
  }

  public async case(
    gameWorldId: string,
    playerId: string,
  ): Promise<MedicalCaseDetail> {
    const episode = await new PrismaInjuryEpisodeRepository(
      this.client,
    ).findOpenByPlayer(gameWorldId, playerId);
    if (episode === null) {
      return { case: null, treatmentOptions: [], disclosureLayer: "STAFF" };
    }
    const rows = await this.playerRows(gameWorldId, [playerId]);
    return {
      case: toCaseRow(episode, rows.get(playerId)),
      // Sem diagnóstico não há recomendação: a comissão ainda não sabe o que
      // está tratando. Devolver a tabela inteira aqui convidaria a escolher
      // cirurgia às cegas.
      treatmentOptions:
        episode.diagnosis === null
          ? []
          : treatmentOptionsFor(episode.diagnosis.severity),
      disclosureLayer: "STAFF",
    };
  }

  private async playerRows(
    gameWorldId: string,
    playerIds: readonly string[],
  ): Promise<Map<string, PlayerRow>> {
    if (playerIds.length === 0) return new Map();
    const rows = await this.client.player.findMany({
      where: { gameWorldId, id: { in: [...playerIds] } },
      select: {
        id: true,
        fatigue: true,
        primaryPosition: true,
        person: { select: { firstName: true, lastName: true } },
      },
    });
    return new Map(
      rows.map((row) => [
        row.id,
        {
          fatigue: row.fatigue,
          position: row.primaryPosition,
          name: `${row.person.firstName} ${row.person.lastName}`.trim(),
        },
      ]),
    );
  }

  private async departmentLevel(
    gameWorldId: string,
    clubId: string,
  ): Promise<number | null> {
    const contracts = await this.client.staffContract.findMany({
      where: { gameWorldId, clubId },
      select: { staff: { select: { medicalKnowledge: true, role: true } } },
    });
    const medics = contracts
      .map((contract) => contract.staff)
      .filter((staff) => staff.role === "DOCTOR" || staff.role === "PHYSIOTHERAPIST");
    if (medics.length === 0) return null;
    return Math.round(
      medics.reduce((sum, staff) => sum + staff.medicalKnowledge, 0) /
        medics.length,
    );
  }
}

interface PlayerRow {
  readonly fatigue: number;
  readonly position: string;
  readonly name: string;
}

function toCaseRow(
  episode: InjuryEpisodeSnapshot,
  player: PlayerRow | undefined,
): MedicalCaseRow | null {
  // Episódio sem jogador é dado órfão (jogador removido do mundo): some da
  // lista em vez de virar linha com nome vazio.
  if (player === undefined) return null;
  return {
    injuryId: episode.id,
    playerId: episode.playerId,
    playerName: player.name,
    position: player.position,
    state: episode.state,
    rehabStage: episode.rehabStage,
    rehabStageCode:
      episode.rehabStage === null ? null : rehabStageCode(episode.rehabStage),
    rehabStageTotal: LAST_REHAB_STAGE,
    injuryType: episode.injuryType,
    region: episode.region,
    severity: episode.diagnosis?.severity ?? null,
    occurredOn: episode.occurredOn,
    estimatedReturnOn: episode.treatment?.estimatedReturnOn ?? null,
    minimumDays: episode.diagnosis?.minimumDays ?? null,
    maximumDays: episode.diagnosis?.maximumDays ?? null,
    treatmentOption: episode.treatment?.option ?? null,
    relapseRisk:
      episode.state === "REHAB" ? relapseRiskScore(episode) : null,
    returnRiskScore: episode.diagnosis?.returnRiskScore ?? null,
    relapseCount: episode.relapseCount,
    fatigue: player.fatigue,
    condition: Math.max(0, 100 - player.fatigue),
    backInTraining:
      episode.rehabStage !== null &&
      episode.rehabStage >= RETURN_TO_TRAINING_STAGE,
  };
}
