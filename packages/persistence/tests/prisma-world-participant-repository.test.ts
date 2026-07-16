import { WorldParticipant } from "@grinta/core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaWorldParticipantRepository } from "../src/prisma-world-participant-repository.js";
import {
  IDENTITY_TABLES,
  WORLD_ID,
  WORLD_SEED,
  accountSnapshot,
  seedAccount,
  seedWorld,
} from "./fixtures.js";
import { connect, hasDatabase, skipReason, truncate } from "./postgres.harness.js";

function participant(over: Record<string, unknown> = {}) {
  const result = WorldParticipant.join({
    gameWorldId: WORLD_ID,
    accountId: accountSnapshot().id,
    worldSeed: WORLD_SEED,
    occurredOn: "2026-01-02",
    ...over,
  });
  if (!result.ok) throw result.error;
  return result.value;
}

describe.skipIf(!hasDatabase)(
  `PrismaWorldParticipantRepository ${hasDatabase ? "" : `— PULADO: ${skipReason}`}`,
  () => {
    let client: ReturnType<typeof connect>;
    let repository: PrismaWorldParticipantRepository;

    beforeAll(() => {
      client = connect();
      repository = new PrismaWorldParticipantRepository(client);
    });

    beforeEach(async () => {
      await truncate(client, IDENTITY_TABLES);
      // As FKs são reais: sem mundo e sem conta, a participação não existe. É
      // justamente isso que o JSON não impunha.
      await seedWorld(client);
      await seedAccount(client);
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    // A prova que importa: o que sai do banco é idêntico ao que entrou. Um mock
    // concordaria com qualquer decomposição errada, inclusive as que perdem dado.
    it("round-trip: o snapshot volta idêntico", async () => {
      const snapshot = participant().snapshot();
      await repository.saveParticipant(snapshot, null);
      expect(await repository.findParticipantById(WORLD_ID, snapshot.id)).toEqual(
        snapshot,
      );
    });

    it("acha por conta — é como o login resolve a participação", async () => {
      const snapshot = participant().snapshot();
      await repository.saveParticipant(snapshot, null);
      expect(
        await repository.findParticipantByAccount(WORLD_ID, snapshot.accountId),
      ).toEqual(snapshot);
    });

    it("devolve null para quem não existe, em vez de explodir", async () => {
      expect(
        await repository.findParticipantById(WORLD_ID, "019b76da-a800-7787-9462-49c009be0000"),
      ).toBeNull();
      expect(
        await repository.findParticipantByAccount(WORLD_ID, "019b76da-a800-7787-9462-49c009be0000"),
      ).toBeNull();
    });

    // `leftOn` é DATE nullable: null tem que atravessar como null, não como
    // epoch nem como a data de hoje.
    it("round-trip preserva participação encerrada, com a data da saída", async () => {
      const entity = participant();
      await repository.saveParticipant(entity.snapshot(), null);
      entity.leave("2026-03-10");
      await repository.saveParticipant(entity.snapshot(), 1);

      const loaded = await repository.findParticipantById(WORLD_ID, entity.snapshot().id);
      expect(loaded?.leftOn).toBe("2026-03-10");
      expect(loaded).toEqual(entity.snapshot());
    });

    // R-177: a coluna é DATE. A data do mundo tem de atravessar sem deslizar de
    // dia — 31/12 virando 30/12 por fuso quebraria o determinismo.
    it("a data do mundo atravessa sem deslizar de dia", async () => {
      const snapshot = participant({ occurredOn: "2026-12-31" }).snapshot();
      await repository.saveParticipant(snapshot, null);
      expect(
        (await repository.findParticipantById(WORLD_ID, snapshot.id))?.joinedOn,
      ).toBe("2026-12-31");
    });

    // Cooldown é atributo, não tabela: 1 por (conta, mundo) = 1 por
    // participação, e não é aggregate root no context map (:67).
    it("round-trip preserva o cooldown, e null atravessa como null", async () => {
      const entity = participant();
      await repository.saveParticipant(entity.snapshot(), null);
      expect(
        (await repository.findParticipantById(WORLD_ID, entity.snapshot().id))
          ?.cooldownUntilOn,
      ).toBeNull();

      entity.startCooldown("2026-04-09");
      await repository.saveParticipant(entity.snapshot(), 1);
      const loaded = await repository.findParticipantById(WORLD_ID, entity.snapshot().id);
      expect(loaded?.cooldownUntilOn).toBe("2026-04-09");
      expect(loaded).toEqual(entity.snapshot());
    });

    describe("concorrência otimista por linha (R-175)", () => {
      it("atualiza quando a versão confere", async () => {
        const entity = participant();
        await repository.saveParticipant(entity.snapshot(), null);
        entity.leave("2026-03-10");
        await repository.saveParticipant(entity.snapshot(), 1);
        expect(
          (await repository.findParticipantById(WORLD_ID, entity.snapshot().id))?.status,
        ).toBe("ENDED");
      });

      // Sem isto, uma escrita concorrente sobrescreveria a outra em silêncio.
      it("recusa quando a versão mudou por baixo", async () => {
        const entity = participant();
        const first = entity.snapshot();
        await repository.saveParticipant(first, null);
        await repository.saveParticipant({ ...first, version: 2 }, 1);
        await expect(
          repository.saveParticipant({ ...first, version: 2 }, 1),
        ).rejects.toMatchObject({ code: "PARTICIPANT_VERSION_CONFLICT" });
      });
    });

    /**
     * A invariante que o mega-agregado sustentava varrendo um array em memória
     * (`world-identity.ts:138`, O(mundo) por comando) e que agora é do banco:
     * `@@unique([gameWorldId, userId])` — "1 participação por usuário/mundo".
     */
    it("o banco recusa duas participações da mesma conta no mesmo mundo", async () => {
      const snapshot = participant().snapshot();
      await repository.saveParticipant(snapshot, null);
      await expect(
        repository.saveParticipant(
          { ...snapshot, id: "019b76da-a800-7787-9462-49c009be7777" as never },
          null,
        ),
      ).rejects.toThrow();
    });

    // Isolamento por mundo: o mesmo id em outro mundo não é encontrável aqui.
    it("não enxerga participação de outro mundo", async () => {
      const snapshot = participant().snapshot();
      await repository.saveParticipant(snapshot, null);
      expect(
        await repository.findParticipantById(
          "019b76da-a800-7787-9462-49c009be5555",
          snapshot.id,
        ),
      ).toBeNull();
    });
  },
);
