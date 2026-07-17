import { GameWorld } from "@grinta/core";
import { WorldDate, parseRulesetVersion } from "@grinta/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaWorldRepository } from "../src/prisma-world-repository.js";
import { IDENTITY_TABLES, WORLD_ID } from "./fixtures.js";
import { connect, hasDatabase, skipReason, truncate } from "./postgres.harness.js";

function world(over: { seed?: string; startDate?: string } = {}) {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse(over.startDate ?? "2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: WORLD_ID as never,
    seed: over.seed ?? "grinta-demo",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value;
}

describe.skipIf(!hasDatabase)(
  `PrismaWorldRepository ${hasDatabase ? "" : `— PULADO: ${skipReason}`}`,
  () => {
    let client: ReturnType<typeof connect>;
    let repository: PrismaWorldRepository;

    beforeAll(() => {
      client = connect();
      repository = new PrismaWorldRepository(client);
    });

    beforeEach(async () => {
      await truncate(client, IDENTITY_TABLES);
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    it("round-trip: o snapshot volta idêntico", async () => {
      const snapshot = world().snapshot();
      await repository.save(snapshot, null);
      expect(await repository.findById(snapshot.id)).toEqual(snapshot);
    });

    /**
     * R-182, e a razão de esta task existir. `seed` não tinha coluna: o
     * determinismo e o replay são invariante canônica, e o mundo não era
     * reproduzível a partir do banco.
     */
    it("o seed atravessa — sem ele não há replay", async () => {
      const snapshot = world({ seed: "semente-especifica" }).snapshot();
      await repository.save(snapshot, null);
      expect((await repository.findById(snapshot.id))?.seed).toBe("semente-especifica");
    });

    it("as duas datas atravessam sem deslizar de dia", async () => {
      const snapshot = world({ startDate: "2026-12-31" }).snapshot();
      await repository.save(snapshot, null);
      const loaded = await repository.findById(snapshot.id);
      expect(loaded?.startDate).toBe("2026-12-31");
      expect(loaded?.currentDate).toBe("2026-12-31");
    });

    it("o rulesetVersion volta como semver, não como texto solto", async () => {
      const snapshot = world().snapshot();
      await repository.save(snapshot, null);
      expect((await repository.findById(snapshot.id))?.rulesetVersion).toBe("1.0.0");
    });

    it("devolve null para mundo que não existe", async () => {
      expect(
        await repository.findById("019b76da-a800-7787-9462-49c009be0000" as never),
      ).toBeNull();
    });

    it("recusa quando a versão mudou por baixo", async () => {
      const snapshot = world().snapshot();
      await repository.save(snapshot, null);
      await repository.save({ ...snapshot, version: 2 }, 1);
      await expect(
        repository.save({ ...snapshot, version: 2 }, 1),
      ).rejects.toMatchObject({ code: "WORLD_VERSION_CONFLICT" });
    });

    /**
     * O `worldSequence` é do append de eventos, que o incrementa sob lock
     * (R-176). Se o save do mundo o escrevesse, um snapshot velho o faria andar
     * para trás — e a ordem total do mundo, que sustenta replay e fencing,
     * quebraria em silêncio.
     */
    it("salvar o mundo NÃO mexe no worldSequence", async () => {
      const snapshot = world().snapshot();
      await repository.save(snapshot, null);
      await client.gameWorld.update({
        where: { id: snapshot.id },
        data: { worldSequence: 42n },
      });

      await repository.save({ ...snapshot, version: 2 }, 1);
      const row = await client.gameWorld.findUnique({ where: { id: snapshot.id } });
      expect(row?.worldSequence).toBe(42n);
    });

    it("lê de volta o worldSequence que o append moveu", async () => {
      const snapshot = world().snapshot();
      await repository.save(snapshot, null);
      await client.gameWorld.update({
        where: { id: snapshot.id },
        data: { worldSequence: 7n },
      });
      expect((await repository.findById(snapshot.id))?.worldSequence).toBe(7);
    });
  },
);
