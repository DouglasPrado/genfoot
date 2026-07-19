import {
  seasonIdFor,
  seasonNumberOn,
  seasonWindow,
  type SeasonLifecycleRepository,
  type SeasonMaterialization,
} from "@grinta/core";

import type { PrismaClient } from "./prisma-connection.js";

/**
 * Materializa a `Season` como entidade do MUNDO (R-219).
 *
 * O id de cada temporada é DETERMINÍSTICO (`seasonIdFor`) e é gravado no create;
 * o upsert por `(gameWorldId, number)` deixa a operação idempotente. Como a
 * ativação materializa a Temporada 1 ANTES de qualquer autoria de competição, o
 * `ensureSeasonId` da competição encontra esta linha e a reusa — a competição
 * ANEXA, não cria (R-219).
 *
 * Tudo num `$transaction`: ou o conjunto de temporadas e o `currentSeasonId`
 * batem, ou nada muda. Sem isto, um crash no meio deixaria `currentSeasonId`
 * apontando para uma temporada que não terminou de nascer.
 */
function isoToDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export class PrismaSeasonLifecycleRepository
  implements SeasonLifecycleRepository
{
  public constructor(private readonly client: PrismaClient) {}

  public async ensureCurrentSeason(input: {
    readonly gameWorldId: string;
    readonly worldSeed: string;
    readonly startDate: string;
    readonly currentDate: string;
  }): Promise<SeasonMaterialization> {
    const currentNumber = seasonNumberOn(input.startDate, input.currentDate);
    const currentSeasonId = seasonIdFor(
      input.worldSeed,
      input.gameWorldId,
      currentNumber,
    );

    await this.client.$transaction(async (tx) => {
      for (let number = 1; number <= currentNumber; number += 1) {
        const id = seasonIdFor(input.worldSeed, input.gameWorldId, number);
        const window = seasonWindow(input.startDate, number);
        // A corrente fica ACTIVE; as anteriores, FINISHED. Passado nunca reabre:
        // o update de uma temporada já FINISHED só reescreve o mesmo estado.
        const status = number < currentNumber ? "FINISHED" : "ACTIVE";
        const name = `Temporada ${number}`;
        const startsAt = isoToDate(window.startsAt);
        const endsAt = isoToDate(window.endsAt);

        await tx.season.upsert({
          where: {
            gameWorldId_number: {
              gameWorldId: input.gameWorldId,
              number,
            },
          },
          create: {
            id,
            gameWorldId: input.gameWorldId,
            number,
            name,
            status,
            startsAt,
            endsAt,
          },
          update: {
            // Não toca o id (PK imutável; a FK da edição de competição aponta
            // para ela). Só o estado e a janela, que a virada precisa manter.
            status,
            startsAt,
            endsAt,
          },
        });
      }

      await tx.gameWorld.update({
        where: { id: input.gameWorldId },
        data: { currentSeasonId },
      });
    });

    return { currentSeasonId, currentSeasonNumber: currentNumber };
  }
}
