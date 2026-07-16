import { resolve } from "node:path";

import { Module } from "@nestjs/common";
import { JsonWorldRepository } from "@grinta/persistence";

import { IdempotencyStore } from "./idempotency-store.js";
import { LazyIdentityReadModel } from "./lazy-identity-read-model.js";
import { LazyWorldRepository } from "./lazy-world-repository.js";
import { LazyIdentityUnitOfWork } from "./lazy-identity-unit-of-work.js";
import {
  GAME_WORLD_REPOSITORY,
  IDEMPOTENCY_STORE,
  IDENTITY_READ_MODEL,
  IDENTITY_UNIT_OF_WORK,
  WORLD_REPOSITORY,
} from "./tokens.js";

/**
 * Fronteira domínio↔infra da API. Nenhuma regra vive aqui: a API só orquestra
 * os casos de uso de `@grinta/core`.
 *
 * Hoje há DOIS armazenamentos, e isso é transitório e declarado (R-173): C1 já
 * está no Postgres, por agregados (R-175); os outros quinze contextos seguem no
 * adapter JSON, que é condenado. Enquanto durar, o estado é PARCIAL — não
 * "pronto".
 */
@Module({
  providers: [
    {
      provide: WORLD_REPOSITORY,
      useFactory: (): JsonWorldRepository => {
        const dataDirectory =
          process.env.GRINTA_API_DATA_DIR ??
          resolve(process.cwd(), ".grinta/api/worlds");
        return new JsonWorldRepository(dataDirectory);
      },
    },
    {
      provide: IDEMPOTENCY_STORE,
      useFactory: (): IdempotencyStore => new IdempotencyStore(),
    },
    {
      provide: IDENTITY_UNIT_OF_WORK,
      useFactory: (): LazyIdentityUnitOfWork => new LazyIdentityUnitOfWork(),
    },
    {
      provide: IDENTITY_READ_MODEL,
      useFactory: (): LazyIdentityReadModel => new LazyIdentityReadModel(),
    },
    {
      provide: GAME_WORLD_REPOSITORY,
      useFactory: (): LazyWorldRepository => new LazyWorldRepository(),
    },
  ],
  exports: [
    WORLD_REPOSITORY,
    IDEMPOTENCY_STORE,
    IDENTITY_UNIT_OF_WORK,
    IDENTITY_READ_MODEL,
    GAME_WORLD_REPOSITORY,
  ],
})
export class CoreModule {}
