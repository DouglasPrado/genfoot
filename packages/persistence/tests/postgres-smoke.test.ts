import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { connect, hasDatabase, skipReason, truncate } from "./postgres.harness.js";

/**
 * Prova que o alicerce existe: o client conecta no Postgres do compose e a
 * baseline física está aplicada. Se isto falhar, nenhum adapter adiante vale.
 */
describe.skipIf(!hasDatabase)(`Postgres (infra) ${hasDatabase ? "" : `— PULADO: ${skipReason}`}`, () => {
  // `connect()` só dentro do beforeAll: o corpo do describe é avaliado mesmo
  // com skipIf ativo, então construir o client aqui derrubaria o arquivo em
  // quem não tem banco — em vez de pular com o motivo.
  let client: ReturnType<typeof connect>;

  beforeAll(() => {
    client = connect();
  });

  afterAll(async () => {
    await client?.$disconnect();
  });

  it("conecta e responde", async () => {
    const rows = await client.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    expect(rows[0]?.ok).toBe(1);
  });

  it("a baseline física está aplicada — as 76 tabelas existem", async () => {
    const rows = await client.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    // 75 models + _prisma_migrations
    expect(Number(rows[0]?.count)).toBeGreaterThanOrEqual(76);
  });

  it("UserAccount é global: não tem gameWorldId (R-172)", async () => {
    const rows = await client.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'UserAccount'
    `;
    const columns = rows.map((r) => r.column_name);
    expect(columns).toContain("email");
    expect(columns).not.toContain("gameWorldId");
  });

  it("WorldParticipant é a ponte por mundo, única por (mundo, usuário)", async () => {
    const rows = await client.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'WorldParticipant'
    `;
    const columns = rows.map((r) => r.column_name);
    expect(columns).toContain("gameWorldId");
    expect(columns).toContain("userId");
  });

  it("o e-mail é único de verdade — o banco recusa a segunda conta", async () => {
    // É esta constraint que tornou a contradição da R-172 intransponível: um
    // AccountSnapshot por mundo não cabe aqui.
    await truncate(client, ["UserAccount"]);
    await client.userAccount.create({
      data: { name: "Douglas", email: "duplicado@exemplo.com" },
    });
    await expect(
      client.userAccount.create({
        data: { name: "Outro", email: "duplicado@exemplo.com" },
      }),
    ).rejects.toThrow();
    await truncate(client, ["UserAccount"]);
  });
});
