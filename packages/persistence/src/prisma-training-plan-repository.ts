import type { Prisma } from "./generated/prisma/client.js";
import type {
  TrainingContextReader,
  TrainingPlanRepository,
  TrainingPlanSnapshot,
} from "@grinta/core";

/**
 * O plano de treino em Postgres (R-214).
 *
 * `save` usa `updateMany` com a versão esperada no WHERE — concorrência
 * otimista no BANCO, não no processo. Duas requisições concorrentes com a mesma
 * `expectedVersion`: a primeira casa e incrementa, a segunda atualiza 0 linhas e
 * é recusada. Checar em memória antes do UPDATE deixaria a janela aberta.
 */
export class PrismaTrainingPlanRepository implements TrainingPlanRepository {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async findByClubSeason(
    gameWorldId: string,
    clubId: string,
    seasonId: string,
  ): Promise<TrainingPlanSnapshot | null> {
    const row = await this.client.trainingPlan.findFirst({
      where: { gameWorldId, clubId, seasonId },
      include: { entries: true },
    });
    if (row === null) return null;
    return {
      id: row.id,
      gameWorldId: row.gameWorldId,
      clubId: row.clubId,
      seasonId: row.seasonId,
      name: row.name,
      focus: row.focus,
      intensity: row.intensity,
      entries: row.entries.map((entry) => ({
        playerId: entry.playerId,
        focus: entry.focus,
        workload: entry.workload,
      })),
      // `qualityFactor` é derivado da agenda (R-13) e recalculado a cada
      // gravação; a coluna não existe. Ler 1 aqui é honesto — quem precisa do
      // valor real recebe do use-case, que acabou de o computar.
      qualityFactor: 1,
      version: row.version,
    };
  }

  public async save(
    plan: TrainingPlanSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    if (expectedVersion === null) {
      await this.client.trainingPlan.create({
        data: {
          id: plan.id,
          gameWorldId: plan.gameWorldId,
          clubId: plan.clubId,
          seasonId: plan.seasonId,
          name: plan.name,
          focus: plan.focus,
          intensity: plan.intensity,
          startsAt: new Date(0),
          version: plan.version,
          entries: {
            create: plan.entries.map((entry) => ({
              playerId: entry.playerId,
              focus: entry.focus,
              workload: entry.workload,
            })),
          },
        },
      });
      return;
    }

    const updated = await this.client.trainingPlan.updateMany({
      where: { id: plan.id, version: expectedVersion },
      data: {
        name: plan.name,
        focus: plan.focus,
        intensity: plan.intensity,
        version: plan.version,
      },
    });
    if (updated.count === 0) {
      throw new Error(
        `AGGREGATE_VERSION_CONFLICT: plano ${plan.id} não está na versão ${expectedVersion}.`,
      );
    }
    // As entradas são substituídas por inteiro: o plano é a lista, e um merge
    // deixaria jogador removido da tela ainda treinando no banco.
    await this.client.trainingPlayerEntry.deleteMany({
      where: { trainingPlanId: plan.id },
    });
    await this.client.trainingPlayerEntry.createMany({
      data: plan.entries.map((entry) => ({
        trainingPlanId: plan.id,
        playerId: entry.playerId,
        focus: entry.focus,
        workload: entry.workload,
      })),
    });
  }
}

/**
 * O que o treino pergunta ao resto do mundo (elenco, médico, estrutura).
 *
 * Porta estreita (R-175): o plano não é dono do elenco nem do departamento
 * médico — perguntar é mais barato que possuir.
 */
export class PrismaTrainingContextReader implements TrainingContextReader {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async squadPlayerIds(
    gameWorldId: string,
    clubId: string,
  ): Promise<readonly string[]> {
    const rows = await this.client.squadMembership.findMany({
      where: { isActive: true, squad: { gameWorldId, clubId } },
      select: { playerId: true },
    });
    return rows.map((row) => row.playerId);
  }

  public async medicallyRestrictedPlayerIds(
    gameWorldId: string,
    clubId: string,
  ): Promise<readonly string[]> {
    // Restrição médica é o estado OFICIAL do jogador, não uma tabela de lesões
    // à parte: `availability` é o que a partida e a escalação consultam, e o
    // treino tem de concordar com elas.
    const rows = await this.client.player.findMany({
      where: {
        gameWorldId,
        availability: { in: ["INJURED", "UNAVAILABLE"] },
        squadMemberships: { some: { isActive: true, squad: { clubId } } },
      },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  public trainingCapacity(): Promise<number> {
    // R-13 diz que a capacidade vem do NÍVEL do CT, que ainda não existe no
    // código (a R-197 registra a ausência). Devolver o nível 3 (2 sessões) é o
    // mesmo provisório declarado da R-213 — e é dívida, não regra: hoje clube
    // nível 1 e nível 5 têm a mesma agenda.
    return Promise.resolve(2);
  }
}
