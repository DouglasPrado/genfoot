import type { IdentityRepositories, IdentityUnitOfWork } from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import type { PrismaClient } from "./prisma-connection.js";
import { PrismaClubControlRepository } from "./prisma-club-control-repository.js";
import { PrismaClubEntryReservationRepository } from "./prisma-club-entry-reservation-repository.js";
import { PrismaDomainEventLogRepository } from "./prisma-domain-event-log-repository.js";
import { PrismaIdempotencyRepository } from "./prisma-idempotency-repository.js";
import { PrismaUserAccountRepository } from "./prisma-user-account-repository.js";
import { PrismaWorldParticipantRepository } from "./prisma-world-participant-repository.js";

/**
 * O único lugar do C1 que abre transação (Decisão 19.10).
 *
 * Os adapters recebem `Prisma.TransactionClient` — que não tem `$transaction` —,
 * então nenhum deles consegue abrir a sua por conta própria. Não é convenção: é
 * o tipo que impede.
 */
export class PrismaIdentityUnitOfWork implements IdentityUnitOfWork {
  public constructor(private readonly client: PrismaClient) {}

  public run<T>(work: (repositories: IdentityRepositories) => Promise<T>): Promise<T> {
    return this.client.$transaction((tx) => work(bind(tx)));
  }
}

export function bind(tx: Prisma.TransactionClient): IdentityRepositories {
  return {
    accounts: new PrismaUserAccountRepository(tx),
    participants: new PrismaWorldParticipantRepository(tx),
    reservations: new PrismaClubEntryReservationRepository(tx),
    controls: new PrismaClubControlRepository(tx),
    events: new PrismaDomainEventLogRepository(tx),
    idempotency: new PrismaIdempotencyRepository(tx),
  };
}
