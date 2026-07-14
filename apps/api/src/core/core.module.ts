import { resolve } from "node:path";

import { Module } from "@nestjs/common";
import { JsonWorldRepository } from "@grinta/persistence";

import { IdempotencyStore } from "./idempotency-store.js";
import { IDEMPOTENCY_STORE, WORLD_REPOSITORY } from "./tokens.js";

/**
 * Fronteira domínio↔infra da API. Provê o repositório de persistência (adapter
 * JSON — o roadmap fecha o Prisma por último) e o store de idempotência de
 * transporte, ambos por token explícito (DI sem metadados). Nenhuma regra vive
 * aqui: a API só orquestra os casos de uso de `@grinta/core`.
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
  ],
  exports: [WORLD_REPOSITORY, IDEMPOTENCY_STORE],
})
export class CoreModule {}
