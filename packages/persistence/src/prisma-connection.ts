import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/prisma/client.js";

/**
 * Conexão com o Postgres (R-173: armazenamento único).
 *
 * No Prisma 7 o client não conecta sozinho — recebe um driver adapter. A URL
 * vem de `DATABASE_URL`; não há default embutido de propósito: apontar para um
 * banco por engano é pior do que falhar na largada.
 */
export function createPrismaClient(
  databaseUrl: string = process.env.DATABASE_URL ?? "",
): PrismaClient {
  if (databaseUrl.trim() === "") {
    throw new Error(
      "DATABASE_URL não definida. O Postgres é o armazenamento oficial (R-173); veja docker-compose.yml.",
    );
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}

export { PrismaClient };
