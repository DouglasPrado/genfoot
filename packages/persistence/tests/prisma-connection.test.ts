import { describe, expect, it } from "vitest";

import { createPrismaClient } from "../src/prisma-connection.js";

describe("createPrismaClient", () => {
  // Sem default embutido de propósito: apontar para o banco errado em silêncio
  // é pior do que falhar na largada.
  it("recusa subir sem DATABASE_URL, em vez de assumir um banco", () => {
    expect(() => createPrismaClient("")).toThrow(/DATABASE_URL/);
    expect(() => createPrismaClient("   ")).toThrow(/DATABASE_URL/);
  });

  it("constrói o client quando a URL existe", () => {
    const client = createPrismaClient(
      "postgresql://grinta:grinta@localhost:5433/grinta?schema=public",
    );
    expect(client).toBeDefined();
  });
});
