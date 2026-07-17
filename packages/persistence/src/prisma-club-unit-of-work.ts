import type { ClubRepositories, ClubUnitOfWork } from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaClubRepository } from "./prisma-club-repository.js";
import { PrismaDomainEventLogRepository } from "./prisma-domain-event-log-repository.js";
import { PrismaIdempotencyRepository } from "./prisma-idempotency-repository.js";

/**
 * O único lugar do C3 que abre transação (Decisão 19.10).
 *
 * Os adapters recebem `Prisma.TransactionClient` — que não tem `$transaction` —,
 * então nenhum deles consegue abrir a sua por conta própria. Não é convenção: é
 * o tipo que impede.
 *
 * Em C3 a transação carrega mais peso que em C1: o `PrismaClubRepository`
 * reescreve 6 tabelas por save. Sem ela, um rebranding que falhasse no meio
 * deixaria o clube sem estádio e sem departamentos — o `saveClub` apaga os
 * filhos antes de reinseri-los.
 */
export class PrismaClubUnitOfWork implements ClubUnitOfWork {
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(work: (repositories: ClubRepositories) => Promise<T>): Promise<T> {
    return this.client.$transaction((tx) => work(bindClub(tx)));
  }
}

export function bindClub(tx: Prisma.TransactionClient): ClubRepositories {
  return {
    clubs: new PrismaClubRepository(tx),
    events: new PrismaDomainEventLogRepository(tx),
    idempotency: new PrismaIdempotencyRepository(tx),
  };
}
