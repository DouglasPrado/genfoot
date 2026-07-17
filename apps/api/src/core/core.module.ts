import { Module } from "@nestjs/common";
import {
  createPrismaClient,
  PrismaClubControlRepository,
  PrismaClubReadModel,
  PrismaSquadReadModel,
  PrismaLedgerReadModel,
  PrismaCompetitionReadModel,
  PrismaClubRepository,
  PrismaClubUnitOfWork,
  PrismaGenesisUnitOfWork,
  PrismaIdentityReadModel,
  PrismaUserAccountRepository,
  PrismaIdentityUnitOfWork,
  PrismaWorldReadModel,
  PrismaWorldRepository,
  type PrismaClient,
} from "@grinta/persistence";

import { IdempotencyStore } from "./idempotency-store.js";
import {
  CLUB_CONTROL_REPOSITORY,
  CLUB_READ_MODEL,
  SQUAD_READ_MODEL,
  LEDGER_READ_MODEL,
  COMPETITION_READ_MODEL,
  CLUB_REPOSITORY,
  CLUB_UNIT_OF_WORK,
  GENESIS_UNIT_OF_WORK,
  GAME_WORLD_REPOSITORY,
  IDEMPOTENCY_STORE,
  IDENTITY_READ_MODEL,
  IDENTITY_UNIT_OF_WORK,
  PRISMA_CLIENT,
  USER_ACCOUNT_REPOSITORY,
  WORLD_READ_MODEL,
} from "./tokens.js";

/**
 * Fronteira domínio↔infra da API. Nenhuma regra vive aqui: a API só orquestra
 * os casos de uso de `@grinta/core`.
 *
 * **Há UM armazenamento: o Postgres.** O adapter JSON e os três wrappers
 * preguiçosos (`LazyWorldRepository` e irmãos) morreram junto com a arquitetura
 * morta. Eles só existiam porque a migração era contexto a contexto e exigir
 * `DATABASE_URL` no boot derrubaria a API por causa de um contexto — o próprio
 * comentário deles dizia que sumiriam quando o último migrasse.
 *
 * Agora o boot EXIGE o banco, e isso é a melhoria: uma API que sobe sem
 * `DATABASE_URL` e só falha no primeiro request esconde o defeito até o usuário
 * o encontrar.
 */
@Module({
  providers: [
    {
      provide: PRISMA_CLIENT,
      useFactory: (): PrismaClient => {
        const url = process.env.DATABASE_URL;
        if (url === undefined || url.trim() === "") {
          throw new Error(
            "DATABASE_URL não definida. O Postgres é o único armazenamento (R-173): " +
              "suba o banco (docker compose up -d) e exporte a URL.",
          );
        }
        return createPrismaClient(url);
      },
    },
    {
      provide: GAME_WORLD_REPOSITORY,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaWorldRepository =>
        new PrismaWorldRepository(client),
    },
    {
      provide: WORLD_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaWorldReadModel =>
        new PrismaWorldReadModel(client),
    },
    {
      provide: CLUB_REPOSITORY,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaClubRepository =>
        new PrismaClubRepository(client),
    },
    {
      provide: CLUB_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaClubReadModel =>
        new PrismaClubReadModel(client),
    },
    {
      provide: SQUAD_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaSquadReadModel =>
        new PrismaSquadReadModel(client),
    },
    {
      provide: LEDGER_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaLedgerReadModel =>
        new PrismaLedgerReadModel(client),
    },
    {
      provide: COMPETITION_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaCompetitionReadModel =>
        new PrismaCompetitionReadModel(client),
    },
    {
      provide: CLUB_UNIT_OF_WORK,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaClubUnitOfWork =>
        new PrismaClubUnitOfWork(client),
    },
    {
      provide: GENESIS_UNIT_OF_WORK,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaGenesisUnitOfWork =>
        new PrismaGenesisUnitOfWork(client),
    },
    {
      provide: CLUB_CONTROL_REPOSITORY,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaClubControlRepository =>
        new PrismaClubControlRepository(client),
    },
    {
      provide: IDENTITY_UNIT_OF_WORK,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaIdentityUnitOfWork =>
        new PrismaIdentityUnitOfWork(client),
    },
    {
      provide: IDENTITY_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaIdentityReadModel =>
        new PrismaIdentityReadModel(client),
    },
    {
      provide: USER_ACCOUNT_REPOSITORY,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaUserAccountRepository =>
        new PrismaUserAccountRepository(client),
    },
    {
      provide: IDEMPOTENCY_STORE,
      useFactory: (): IdempotencyStore => new IdempotencyStore(),
    },
  ],
  exports: [
    PRISMA_CLIENT,
    GAME_WORLD_REPOSITORY,
    WORLD_READ_MODEL,
    CLUB_REPOSITORY,
    CLUB_READ_MODEL,
    SQUAD_READ_MODEL,
    LEDGER_READ_MODEL,
    COMPETITION_READ_MODEL,
    CLUB_UNIT_OF_WORK,
    GENESIS_UNIT_OF_WORK,
    CLUB_CONTROL_REPOSITORY,
    IDEMPOTENCY_STORE,
    IDENTITY_UNIT_OF_WORK,
    IDENTITY_READ_MODEL,
    USER_ACCOUNT_REPOSITORY,
  ],
})
export class CoreModule {}
