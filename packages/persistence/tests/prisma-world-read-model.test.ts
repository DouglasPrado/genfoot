import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaWorldReadModel } from "../src/prisma-world-read-model.js";
import { CLUB_TABLES, WORLD_ID, seedAccount, seedClub, seedParticipant, seedWorld } from "./fixtures.js";
import { connect, hasDatabase, skipReason, truncate } from "./postgres.harness.js";

const OTHER_CLUB = "019b76da-a800-7787-9462-49c009be4444";

describe.skipIf(!hasDatabase)(
  `PrismaWorldReadModel ${hasDatabase ? "" : `— PULADO: ${skipReason}`}`,
  () => {
    let client: ReturnType<typeof connect>;
    let readModel: PrismaWorldReadModel;

    beforeAll(() => {
      client = connect();
      readModel = new PrismaWorldReadModel(client);
    });

    beforeEach(async () => {
      await truncate(client, [...CLUB_TABLES, "UserAccount", "WorldParticipant", "ClubControl"]);
      await seedWorld(client);
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    it("lista o mundo com a contagem de clubes", async () => {
      await seedClub(client);
      const [world] = await readModel.listWorlds();
      expect(world?.seed).toBe("grinta-demo");
      expect(world?.clubCount).toBe(1);
    });

    /**
     * `openSlots` é o que `M-WORLD-PICK` chama de "vagas". Vaga é a AUSÊNCIA de
     * `ClubControl` ativo (R-180: a IA é a ausência de controle) — não há flag
     * "livre" para contar.
     */
    it("clube sem gestor é vaga", async () => {
      await seedClub(client);
      await seedClub(client, OTHER_CLUB);
      const [world] = await readModel.listWorlds();
      expect(world?.openSlots).toBe(2);
    });

    it("clube com gestor ativo deixa de ser vaga", async () => {
      await seedClub(client);
      await seedClub(client, OTHER_CLUB);
      const accountId = await seedAccount(client);
      const participantId = await seedParticipant(client, accountId);
      await client.clubControl.create({
        data: {
          id: "019b76da-a800-7ccc-9462-49c009be0001",
          gameWorldId: WORLD_ID,
          clubId: OTHER_CLUB,
          worldParticipantId: participantId,
          status: "ACTIVE",
          startsOn: new Date("2026-01-02T00:00:00.000Z"),
        },
      });
      const [world] = await readModel.listWorlds();
      expect(world?.clubCount).toBe(2);
      expect(world?.openSlots).toBe(1);
    });

    /** Controle ENCERRADO não ocupa vaga: o clube voltou ao pool. */
    it("controle encerrado devolve a vaga", async () => {
      await seedClub(client);
      const accountId = await seedAccount(client);
      const participantId = await seedParticipant(client, accountId);
      await client.clubControl.create({
        data: {
          id: "019b76da-a800-7ccc-9462-49c009be0002",
          gameWorldId: WORLD_ID,
          clubId: "019b76da-a800-7787-9462-49c009be3333",
          worldParticipantId: participantId,
          status: "ENDED",
          startsOn: new Date("2026-01-02T00:00:00.000Z"),
        },
      });
      const [world] = await readModel.listWorlds();
      expect(world?.openSlots).toBe(1);
    });

    describe("elegibilidade do usuário", () => {
      it("sem conta, a lista vem sem participação — é o caso do admin", async () => {
        await seedClub(client);
        const [world] = await readModel.listWorlds();
        expect(world?.myParticipation).toBeNull();
      });

      it("quem nunca entrou tem participação nula", async () => {
        await seedClub(client);
        const accountId = await seedAccount(client);
        const [world] = await readModel.listWorlds(accountId);
        expect(world?.myParticipation).toBeNull();
      });

      it("quem participa e não tem clube aparece sem controle", async () => {
        await seedClub(client);
        const accountId = await seedAccount(client);
        await seedParticipant(client, accountId);
        const [world] = await readModel.listWorlds(accountId);
        expect(world?.myParticipation).toEqual({
          status: "ACTIVE",
          hasActiveControl: false,
          cooldownUntilOn: null,
        });
      });

      it("quem tem clube aparece com controle ativo", async () => {
        const clubId = await seedClub(client);
        const accountId = await seedAccount(client);
        const participantId = await seedParticipant(client, accountId);
        await client.clubControl.create({
          data: {
            id: "019b76da-a800-7ccc-9462-49c009be0003",
            gameWorldId: WORLD_ID,
            clubId,
            worldParticipantId: participantId,
            status: "ACTIVE",
            startsOn: new Date("2026-01-02T00:00:00.000Z"),
          },
        });
        const [world] = await readModel.listWorlds(accountId);
        expect(world?.myParticipation?.hasActiveControl).toBe(true);
      });

      /**
       * A participação de OUTRO jogador não é a minha. Sem o filtro por conta, a
       * tela diria a todo mundo que já tem clube porque alguém tem.
       */
      it("a participação de outro jogador não vaza para a minha", async () => {
        await seedClub(client);
        const outro = await seedAccount(client, "outro@exemplo.com");
        await seedParticipant(client, outro);
        const eu = await seedAccount(client, "eu@exemplo.com");
        const [world] = await readModel.listWorlds(eu);
        expect(world?.myParticipation).toBeNull();
      });

      it("o cooldown de saída atravessa (R-26)", async () => {
        await seedClub(client);
        const accountId = await seedAccount(client);
        const participantId = await seedParticipant(client, accountId);
        await client.worldParticipant.update({
          where: { id: participantId },
          data: {
            status: "ENDED",
            cooldownUntilOn: new Date("2026-02-01T00:00:00.000Z"),
          },
        });
        const [world] = await readModel.listWorlds(accountId);
        expect(world?.myParticipation).toEqual({
          status: "ENDED",
          hasActiveControl: false,
          cooldownUntilOn: "2026-02-01",
        });
      });
    });
  },
);
