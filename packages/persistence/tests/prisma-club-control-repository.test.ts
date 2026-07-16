import { ClubControl } from "@grinta/core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaClubControlRepository } from "../src/prisma-club-control-repository.js";
import {
  CLUB_ID,
  IDENTITY_TABLES,
  OTHER_WORLD_ID,
  WORLD_ID,
  WORLD_SEED,
  seedAccount,
  seedClub,
  seedParticipant,
  seedWorld,
} from "./fixtures.js";
import { connect, hasDatabase, skipReason, truncate } from "./postgres.harness.js";

describe.skipIf(!hasDatabase)(
  `PrismaClubControlRepository ${hasDatabase ? "" : `— PULADO: ${skipReason}`}`,
  () => {
    let client: ReturnType<typeof connect>;
    let repository: PrismaClubControlRepository;
    let participantId: string;

    function control(over: { clubId?: string; occurredOn?: string } = {}) {
      const result = ClubControl.start({
        gameWorldId: WORLD_ID,
        clubId: over.clubId ?? CLUB_ID,
        worldParticipantId: participantId,
        worldSeed: WORLD_SEED,
        occurredOn: over.occurredOn ?? "2026-01-05",
      });
      if (!result.ok) throw result.error;
      return result.value;
    }

    beforeAll(() => {
      client = connect();
      repository = new PrismaClubControlRepository(client);
    });

    beforeEach(async () => {
      await truncate(client, IDENTITY_TABLES);
      await seedWorld(client);
      const accountId = await seedAccount(client);
      participantId = await seedParticipant(client, accountId);
      await seedClub(client);
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    it("round-trip: o snapshot volta idêntico", async () => {
      const snapshot = control().snapshot();
      await repository.saveControl(snapshot, null);
      expect(await repository.findControlById(WORLD_ID, snapshot.id)).toEqual(snapshot);
    });

    /**
     * A FK que não existia. Até o `WorldParticipant` ganhar `id` (R-175), o
     * domínio não conseguia produzir `worldParticipantId` — ele só tinha
     * `accountId`, e a conta é global. Este teste prova que o elo fecha no
     * banco de verdade.
     */
    it("o controle pendura na participação, e o banco recusa participação inexistente", async () => {
      const snapshot = control().snapshot();
      await expect(
        repository.saveControl(
          {
            ...snapshot,
            worldParticipantId: "019b76da-a800-7787-9462-49c009be0000" as never,
          },
          null,
        ),
      ).rejects.toThrow();
    });

    // `endedReason` é obrigatório no evento e não tinha coluna: o motivo
    // evaporava na gravação. Aqui ele tem de atravessar.
    it("round-trip preserva o motivo do encerramento", async () => {
      const entity = control();
      await repository.saveControl(entity.snapshot(), null);
      entity.end("SWITCH_REQUESTED", "2026-06-01");
      await repository.saveControl(entity.snapshot(), 1);

      const loaded = await repository.findControlById(WORLD_ID, entity.snapshot().id);
      expect(loaded?.endedReason).toBe("SWITCH_REQUESTED");
      expect(loaded?.endedOn).toBe("2026-06-01");
      expect(loaded).toEqual(entity.snapshot());
    });

    // R-177: era `startsAtWorldTick BigInt`, o único par de colunas com tick do
    // schema — e sem conversor data↔tick em lado nenhum.
    it("a data do mundo atravessa sem deslizar de dia", async () => {
      const snapshot = control({ occurredOn: "2026-12-31" }).snapshot();
      await repository.saveControl(snapshot, null);
      expect(
        (await repository.findControlById(WORLD_ID, snapshot.id))?.startsOn,
      ).toBe("2026-12-31");
    });

    describe("findActiveControlForClub", () => {
      it("acha o controle ativo do clube", async () => {
        const snapshot = control().snapshot();
        await repository.saveControl(snapshot, null);
        expect(await repository.findActiveControlForClub(WORLD_ID, CLUB_ID)).toEqual(
          snapshot,
        );
      });

      it("devolve null quando ninguém comanda — é o clube da IA (R-180)", async () => {
        expect(await repository.findActiveControlForClub(WORLD_ID, CLUB_ID)).toBeNull();
      });

      it("não devolve controle encerrado", async () => {
        const entity = control();
        await repository.saveControl(entity.snapshot(), null);
        entity.end("SWITCH_REQUESTED", "2026-06-01");
        await repository.saveControl(entity.snapshot(), 1);
        expect(await repository.findActiveControlForClub(WORLD_ID, CLUB_ID)).toBeNull();
      });
    });

    /**
     * A invariante que `world-identity.ts:545` sustentava com um `find` num
     * array do mundo inteiro. Agora é índice único PARCIAL
     * (`WHERE status = 'ACTIVE'`) — que o Prisma não expressa e foi como SQL
     * cru na migration.
     */
    describe("1 controle ativo por clube (índice parcial)", () => {
      it("o banco recusa um segundo controle ativo no mesmo clube", async () => {
        await repository.saveControl(control().snapshot(), null);

        const outroAccountId = await seedAccount(client, "outro@exemplo.com");
        const outroParticipantId = await seedParticipant(client, outroAccountId);
        const rival = ClubControl.start({
          gameWorldId: WORLD_ID,
          clubId: CLUB_ID,
          worldParticipantId: outroParticipantId,
          worldSeed: WORLD_SEED,
          occurredOn: "2026-02-01",
        });
        if (!rival.ok) throw rival.error;

        await expect(
          repository.saveControl(rival.value.snapshot(), null),
        ).rejects.toThrow();
      });

      // O `WHERE` é o que permite trocar de gestor. Sem ele, o clube não
      // poderia ter dois controles nem ao longo do tempo.
      it("aceita um controle novo depois que o anterior encerrou", async () => {
        const entity = control();
        await repository.saveControl(entity.snapshot(), null);
        entity.end("SWITCH_REQUESTED", "2026-06-01");
        await repository.saveControl(entity.snapshot(), 1);

        const outroAccountId = await seedAccount(client, "outro@exemplo.com");
        const outroParticipantId = await seedParticipant(client, outroAccountId);
        const sucessor = ClubControl.start({
          gameWorldId: WORLD_ID,
          clubId: CLUB_ID,
          worldParticipantId: outroParticipantId,
          worldSeed: WORLD_SEED,
          occurredOn: "2026-06-02",
        });
        if (!sucessor.ok) throw sucessor.error;

        await repository.saveControl(sucessor.value.snapshot(), null);
        expect(
          (await repository.findActiveControlForClub(WORLD_ID, CLUB_ID))?.id,
        ).toBe(sucessor.value.snapshot().id);
      });
    });

    describe("concorrência otimista por linha (R-175)", () => {
      it("recusa quando a versão mudou por baixo", async () => {
        const entity = control();
        const first = entity.snapshot();
        await repository.saveControl(first, null);
        await repository.saveControl({ ...first, version: 2 }, 1);
        await expect(
          repository.saveControl({ ...first, version: 2 }, 1),
        ).rejects.toMatchObject({ code: "CONTROL_VERSION_CONFLICT" });
      });
    });

    it("não enxerga controle de outro mundo", async () => {
      const snapshot = control().snapshot();
      await repository.saveControl(snapshot, null);
      expect(await repository.findControlById(OTHER_WORLD_ID, snapshot.id)).toBeNull();
    });
  },
);
