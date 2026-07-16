import { Module } from "@nestjs/common";
import {
  createPrismaClient,
  PrismaClubReadModel,
  PrismaClubRepository,
  PrismaIdentityReadModel,
  PrismaIdentityUnitOfWork,
  PrismaWorldRepository,
  type PrismaClient,
} from "@grinta/persistence";

import { IdempotencyStore } from "./idempotency-store.js";
import {
  CLUB_READ_MODEL,
  CLUB_REPOSITORY,
  GAME_WORLD_REPOSITORY,
  IDEMPOTENCY_STORE,
  IDENTITY_READ_MODEL,
  IDENTITY_UNIT_OF_WORK,
  PRISMA_CLIENT,
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
      provide: IDEMPOTENCY_STORE,
      useFactory: (): IdempotencyStore => new IdempotencyStore(),
    },
  ],
  exports: [
    PRISMA_CLIENT,
    GAME_WORLD_REPOSITORY,
    CLUB_REPOSITORY,
    CLUB_READ_MODEL,
    IDEMPOTENCY_STORE,
    IDENTITY_UNIT_OF_WORK,
    IDENTITY_READ_MODEL,
  ],
})
export class CoreModule {}
