import { createPrismaClient, type PrismaClient } from "../src/prisma-connection.js";

/**
 * Harness dos testes que falam com o Postgres de verdade (R-173).
 *
 * A ida-e-volta de snapshot só é prova se atravessar o banco real: um mock
 * concorda com qualquer decomposição errada, inclusive as que perdem dado.
 * Por isso estes testes exigem `DATABASE_URL` e o container do docker-compose.
 *
 * Quando a URL não está definida (CI sem banco, colega sem Docker), os testes
 * são PULADOS e dizem por quê — nunca passam em silêncio dando a impressão de
 * que a persistência foi verificada.
 */
export const DATABASE_URL = process.env.DATABASE_URL ?? "";
export const hasDatabase = DATABASE_URL.trim() !== "";

export const skipReason =
  "DATABASE_URL não definida — suba o Postgres (docker compose up -d) e exporte a URL. Sem banco, round-trip não é prova.";

export function connect(): PrismaClient {
  return createPrismaClient(DATABASE_URL);
}

/**
 * Limpa as tabelas tocadas por um teste. TRUNCATE ... CASCADE em vez de delete
 * por tabela: a ordem das FKs muda a cada porta migrada, e um teste que quebra
 * por ordem de limpeza esconde o defeito real.
 */
export async function truncate(
  client: PrismaClient,
  tables: readonly string[],
): Promise<void> {
  if (tables.length === 0) return;
  const list = tables.map((t) => `"${t}"`).join(", ");
  await client.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
}
