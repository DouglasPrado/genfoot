import type {
  MedicalRepositories,
  MedicalUnitOfWork,
  PlayerAvailabilityWriter,
  TrainingLoadEntry,
  TrainingLoadReader,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaInjuryEpisodeRepository } from "./prisma-injury-episode-repository.js";

/**
 * Portas do departamento médico em Postgres: quem levou carga hoje e quem muda
 * de disponibilidade.
 */

function ageOn(birthDate: Date, worldDate: string): number {
  const born = birthDate.toISOString().slice(0, 10);
  const today = worldDate.slice(0, 10);
  let age = Number(today.slice(0, 4)) - Number(born.slice(0, 4));
  if (today.slice(5) < born.slice(5)) age -= 1;
  return age;
}

/**
 * Quem treinou no dia.
 *
 * Só entra quem está DISPONÍVEL: lesionado não treina, então não sorteia lesão
 * nova — quem já tem episódio aberto continua no episódio, não ganha outro.
 * A intensidade é a do plano individual quando existe; senão, a do coletivo do
 * clube; sem nenhum plano, o jogador não está sob carga dirigida e fica fora.
 */
export class PrismaTrainingLoadReader implements TrainingLoadReader {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async playersUnderLoad(
    gameWorldId: string,
    worldDate: string,
  ): Promise<readonly TrainingLoadEntry[]> {
    const memberships = await this.client.squadMembership.findMany({
      where: {
        isActive: true,
        squad: { club: { gameWorldId } },
        player: { gameWorldId, availability: "AVAILABLE" },
      },
      include: {
        squad: { select: { clubId: true } },
        player: {
          select: {
            id: true,
            fatigue: true,
            person: { select: { birthDate: true } },
            injuries: {
              select: { region: true },
              where: { gameWorldId },
            },
          },
        },
      },
    });
    if (memberships.length === 0) return [];

    const clubIds = [...new Set(memberships.map((row) => row.squad.clubId))];
    const [individualPlans, collectivePlans] = await Promise.all([
      this.client.individualTrainingPlan.findMany({
        where: { gameWorldId, clubId: { in: clubIds } },
        select: { playerId: true, intensity: true },
      }),
      this.client.trainingPlan.findMany({
        where: { gameWorldId, clubId: { in: clubIds } },
        select: { clubId: true, intensity: true },
      }),
    ]);

    const individualIntensity = new Map(
      individualPlans.map((plan) => [plan.playerId, plan.intensity]),
    );
    const collectiveIntensity = new Map(
      collectivePlans.map((plan) => [plan.clubId, plan.intensity]),
    );

    const entries: TrainingLoadEntry[] = [];
    for (const row of memberships) {
      const intensity =
        individualIntensity.get(row.player.id) ??
        collectiveIntensity.get(row.squad.clubId);
      // Sem plano nenhum não há carga dirigida — e sem carga o risco desta
      // regra não existe (a lesão de partida entra por outro gatilho).
      if (intensity === undefined) continue;

      entries.push({
        playerId: row.player.id,
        clubId: row.squad.clubId,
        fatigue: row.player.fatigue,
        age: ageOn(row.player.person.birthDate, worldDate),
        intensity,
        injuredRegionHistory: [
          ...new Set(row.player.injuries.map((injury) => injury.region)),
        ],
      });
    }
    return entries;
  }
}

/**
 * O estado oficial do jogador (P4). O episódio médico PEDE a mudança; quem
 * escreve `availability` é isto — e é o que a escalação e o treino leem.
 */
export class PrismaPlayerAvailabilityWriter implements PlayerAvailabilityWriter {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async markInjured(
    gameWorldId: string,
    playerId: string,
  ): Promise<void> {
    await this.client.player.updateMany({
      where: { gameWorldId, id: playerId },
      data: { availability: "INJURED" },
    });
  }

  public async markAvailable(
    gameWorldId: string,
    playerId: string,
  ): Promise<void> {
    await this.client.player.updateMany({
      where: { gameWorldId, id: playerId },
      data: { availability: "AVAILABLE" },
    });
  }

  public async markRetired(
    gameWorldId: string,
    playerId: string,
  ): Promise<void> {
    await this.client.player.updateMany({
      where: { gameWorldId, id: playerId },
      // `status` é a carreira (terminal RETIRED, INV-4); `availability` é a
      // disponibilidade esportiva. A aposentadoria médica move as duas.
      data: { availability: "UNAVAILABLE", status: "RETIRED" },
    });
  }
}

/** A transação do departamento médico — settle da virada e comandos da tela. */
export class PrismaMedicalUnitOfWork implements MedicalUnitOfWork {
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(work: (repos: MedicalRepositories) => Promise<T>): Promise<T> {
    return this.client.$transaction(
      (tx: Prisma.TransactionClient) =>
        work({
          episodes: new PrismaInjuryEpisodeRepository(tx),
          loads: new PrismaTrainingLoadReader(tx),
          availability: new PrismaPlayerAvailabilityWriter(tx),
        }),
      { timeout: 120_000, maxWait: 10_000 },
    );
  }
}
