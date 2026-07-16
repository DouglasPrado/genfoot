import { UserAccount, WorldParticipant } from "@grinta/core";

import type { PrismaClient } from "../src/prisma-connection.js";

/**
 * Fixtures dos testes de Postgres. As FKs são reais: a partir de R-175 quase
 * todo agregado de C1 pendura em mundo + conta + participação, e o banco recusa
 * o que o JSON aceitava calado.
 *
 * Os ids são fixos e distintos por conceito — nada de derivar do relógio.
 */
export const WORLD_ID = "019b76da-a800-7787-9462-49c009be1111";
export const CLUB_ID = "019b76da-a800-7787-9462-49c009be3333";
export const OTHER_WORLD_ID = "019b76da-a800-7787-9462-49c009be5555";
export const WORLD_SEED = "grinta-demo";

/** Ordem de limpeza não importa: TRUNCATE ... CASCADE resolve as FKs. */
export const IDENTITY_TABLES = [
  "GameWorld",
  "UserAccount",
  "WorldParticipant",
  "Club",
  "ClubControl",
];

export function accountSnapshot(email = "douglas@exemplo.com") {
  const result = UserAccount.register({
    email,
    name: "Douglas",
    occurredOn: "2026-01-02",
    idempotencySeed: WORLD_SEED,
  });
  if (!result.ok) throw result.error;
  return result.value.snapshot();
}

export function participantSnapshot(accountId: string, occurredOn = "2026-01-02") {
  const result = WorldParticipant.join({
    gameWorldId: WORLD_ID,
    accountId,
    worldSeed: WORLD_SEED,
    occurredOn,
  });
  if (!result.ok) throw result.error;
  return result.value.snapshot();
}

export async function seedWorld(client: PrismaClient): Promise<void> {
  await client.gameWorld.create({
    data: {
      id: WORLD_ID,
      name: "Mundo de teste",
      currentDate: new Date("2026-01-02T00:00:00.000Z"),
      maxClubs: 16,
      initialClubCashMinor: 100_000_00n,
      currencyId: "019b76da-a800-7787-9462-49c009becccc",
    },
  });
}

export async function seedAccount(
  client: PrismaClient,
  email?: string,
): Promise<string> {
  const snapshot = accountSnapshot(email);
  // Sem `createdAt`: é instante de plataforma, e quem o grava é o
  // `@default(now())`. A conta é global (R-172) e não tem data de mundo.
  await client.userAccount.create({
    data: { id: snapshot.id, name: snapshot.name, email: snapshot.email },
  });
  return snapshot.id;
}

export async function seedParticipant(
  client: PrismaClient,
  accountId: string,
): Promise<string> {
  const snapshot = participantSnapshot(accountId);
  await client.worldParticipant.create({
    data: {
      id: snapshot.id,
      gameWorldId: snapshot.gameWorldId,
      userId: snapshot.accountId,
      status: snapshot.status,
      joinedOn: new Date(`${snapshot.joinedOn}T00:00:00.000Z`),
    },
  });
  return snapshot.id;
}

export async function seedClub(client: PrismaClient, id = CLUB_ID): Promise<string> {
  await client.club.create({
    data: {
      id,
      gameWorldId: WORLD_ID,
      name: "Clube de teste",
      shortName: "CTE",
      slug: `clube-${id.slice(-4)}`,
      country: "BR",
      currencyId: "019b76da-a800-7787-9462-49c009becccc",
      cashMinor: 0n,
      wageBudgetMinor: 0n,
      transferBudgetMinor: 0n,
    },
  });
  return id;
}
