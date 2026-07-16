import { ClubEntryReservation } from "@grinta/core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaClubEntryReservationRepository } from "../src/prisma-club-entry-reservation-repository.js";
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
  `PrismaClubEntryReservationRepository ${hasDatabase ? "" : `— PULADO: ${skipReason}`}`,
  () => {
    let client: ReturnType<typeof connect>;
    let repository: PrismaClubEntryReservationRepository;
    let participantId: string;

    function reservation(
      over: { clubId?: string; expiresOn?: string; participantId?: string } = {},
    ) {
      const result = ClubEntryReservation.hold({
        gameWorldId: WORLD_ID,
        clubId: over.clubId ?? CLUB_ID,
        worldParticipantId: over.participantId ?? participantId,
        worldSeed: WORLD_SEED,
        attemptKey: "t1",
        occurredOn: "2026-01-05",
        expiresOn: over.expiresOn ?? "2026-01-07",
      });
      if (!result.ok) throw result.error;
      return result.value;
    }

    beforeAll(() => {
      client = connect();
      repository = new PrismaClubEntryReservationRepository(client);
    });

    beforeEach(async () => {
      await truncate(client, [...IDENTITY_TABLES, "ClubEntryReservation"]);
      await seedWorld(client);
      const accountId = await seedAccount(client);
      participantId = await seedParticipant(client, accountId);
      await seedClub(client);
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    it("round-trip: o snapshot volta idêntico", async () => {
      const snapshot = reservation().snapshot();
      await repository.saveReservation(snapshot, null);
      expect(await repository.findReservationById(WORLD_ID, snapshot.id)).toEqual(
        snapshot,
      );
    });

    it("as duas datas atravessam sem deslizar de dia", async () => {
      const snapshot = reservation({ expiresOn: "2026-12-31" }).snapshot();
      await repository.saveReservation(snapshot, null);
      const loaded = await repository.findReservationById(WORLD_ID, snapshot.id);
      expect(loaded?.heldOn).toBe("2026-01-05");
      expect(loaded?.expiresOn).toBe("2026-12-31");
    });

    describe("findHeldReservationForClub", () => {
      it("acha a reserva retida do clube", async () => {
        const snapshot = reservation().snapshot();
        await repository.saveReservation(snapshot, null);
        expect(await repository.findHeldReservationForClub(WORLD_ID, CLUB_ID)).toEqual(
          snapshot,
        );
      });

      it.each(["confirm", "release"] as const)(
        "não devolve reserva depois de %s",
        async (action) => {
          const entity = reservation();
          await repository.saveReservation(entity.snapshot(), null);
          entity[action]();
          await repository.saveReservation(entity.snapshot(), 1);
          expect(
            await repository.findHeldReservationForClub(WORLD_ID, CLUB_ID),
          ).toBeNull();
        },
      );
    });

    /**
     * A razão de a tabela existir. Com a reserva dentro do blob de identidade,
     * expirar significava carregar o mundo inteiro e varrer o array. Aqui o
     * varredor acha as vencidas pelo índice `(status, expiresOn)`.
     */
    describe("findExpiredOn", () => {
      it("acha as retidas cujo prazo já passou", async () => {
        const snapshot = reservation().snapshot();
        await repository.saveReservation(snapshot, null);
        const vencidas = await repository.findExpiredOn(WORLD_ID, "2026-01-08");
        expect(vencidas.map((r) => r.id)).toEqual([snapshot.id]);
      });

      // O prazo vale até o FIM do dia de `expiresOn`: varrer com `<=` cortaria
      // um dia de quem ainda tem direito à vaga.
      it("não devolve reserva no último dia do prazo", async () => {
        await repository.saveReservation(reservation().snapshot(), null);
        expect(await repository.findExpiredOn(WORLD_ID, "2026-01-07")).toEqual([]);
      });

      it("não devolve reserva já resolvida, mesmo vencida", async () => {
        const entity = reservation();
        await repository.saveReservation(entity.snapshot(), null);
        entity.confirm();
        await repository.saveReservation(entity.snapshot(), 1);
        expect(await repository.findExpiredOn(WORLD_ID, "2026-01-08")).toEqual([]);
      });

      it("não vaza reserva de outro mundo", async () => {
        await repository.saveReservation(reservation().snapshot(), null);
        expect(await repository.findExpiredOn(OTHER_WORLD_ID, "2026-01-08")).toEqual([]);
      });
    });

    /**
     * Era `world-identity.ts:577`, um `.some()` sobre o array de reservas do
     * mundo inteiro. Agora é índice único parcial (`WHERE status = 'HELD'`).
     */
    describe("1 reserva retida por clube (índice parcial)", () => {
      it("o banco recusa uma segunda reserva retida no mesmo clube", async () => {
        await repository.saveReservation(reservation().snapshot(), null);

        const outroAccountId = await seedAccount(client, "outro@exemplo.com");
        const outroParticipantId = await seedParticipant(client, outroAccountId);
        await expect(
          repository.saveReservation(
            reservation({ participantId: outroParticipantId }).snapshot(),
            null,
          ),
        ).rejects.toThrow();
      });

      // O WHERE é o que permite a vaga circular: sem ele, um clube nunca
      // poderia ser reservado duas vezes na história.
      it("aceita reserva nova depois que a anterior expirou", async () => {
        const entity = reservation();
        await repository.saveReservation(entity.snapshot(), null);
        entity.expire("2026-01-08");
        await repository.saveReservation(entity.snapshot(), 1);

        const outroAccountId = await seedAccount(client, "outro@exemplo.com");
        const outroParticipantId = await seedParticipant(client, outroAccountId);
        const nova = reservation({ participantId: outroParticipantId });
        await repository.saveReservation(nova.snapshot(), null);

        expect((await repository.findHeldReservationForClub(WORLD_ID, CLUB_ID))?.id).toBe(
          nova.snapshot().id,
        );
      });
    });

    it("recusa quando a versão mudou por baixo", async () => {
      const snapshot = reservation().snapshot();
      await repository.saveReservation(snapshot, null);
      await repository.saveReservation({ ...snapshot, version: 2 }, 1);
      await expect(
        repository.saveReservation({ ...snapshot, version: 2 }, 1),
      ).rejects.toMatchObject({ code: "RESERVATION_VERSION_CONFLICT" });
    });

    it("o banco recusa reserva para participação inexistente", async () => {
      const snapshot = reservation().snapshot();
      await expect(
        repository.saveReservation(
          {
            ...snapshot,
            worldParticipantId: "019b76da-a800-7787-9462-49c009be0000" as never,
          },
          null,
        ),
      ).rejects.toThrow();
    });
  },
);
