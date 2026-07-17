import {
  ConfirmOnboarding,
  EndClubControl,
  JoinWorld,
  ReleaseClubReservation,
  ReserveClub,
  verifyEventChain,
} from "@grinta/core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  PrismaDomainEventLogRepository,
  sha256,
} from "../src/prisma-domain-event-log-repository.js";
import { PrismaIdentityUnitOfWork } from "../src/prisma-identity-unit-of-work.js";
import {
  CLUB_ID,
  IDENTITY_TABLES,
  WORLD_ID,
  WORLD_SEED,
  accountSnapshot,
  seedAccount,
  seedClub,
  seedWorld,
} from "./fixtures.js";
import { connect, hasDatabase, skipReason, truncate } from "./postgres.harness.js";

const OUTRO_CLUBE = "019b76da-a800-7787-9462-49c009beaaaa";

/**
 * O onboarding ponta a ponta contra o Postgres real (R-173). Não é teste de
 * unidade dos agregados — esses já existem. Aqui o que se prova é o que só o
 * banco pode dizer: as invariantes que saíram das varreduras de array e viraram
 * índices, e a transação que a Decisão 19.10 exige.
 */
describe.skipIf(!hasDatabase)(
  `Comandos de C1 sobre Postgres ${hasDatabase ? "" : `— PULADO: ${skipReason}`}`,
  () => {
    let client: ReturnType<typeof connect>;
    let unitOfWork: PrismaIdentityUnitOfWork;
    let events: PrismaDomainEventLogRepository;
    let accountId: string;

    const base = { gameWorldId: WORLD_ID, worldSeed: WORLD_SEED, occurredOn: "2026-01-05" };

    /**
     * `attemptKey` discrimina TENTATIVAS: é semente do id, e vem do
     * `idempotencyKey` do comando. Repetir a chave devolve a mesma reserva;
     * uma tentativa nova precisa de chave nova — a reserva é 1 por VEZ, e o
     * clube circula.
     */
    async function reservar(clubId = CLUB_ID, account = accountId, attemptKey = "t1") {
      const result = await new ReserveClub(unitOfWork).execute({
        ...base,
        accountId: account,
        clubId,
        expiresOn: "2026-01-07",
        attemptKey,
      });
      if (!result.ok) throw new Error(`reserva falhou: ${result.error.code}`);
      return result.value;
    }

    async function comandar(clubId = CLUB_ID, account = accountId, attemptKey = "t1") {
      const reservation = await reservar(clubId, account, attemptKey);
      const result = await new ConfirmOnboarding(unitOfWork).execute({
        ...base,
        reservationId: reservation.id,
      });
      if (!result.ok) throw new Error(`confirmação falhou: ${result.error.code}`);
      return result.value;
    }

    beforeAll(() => {
      client = connect();
      unitOfWork = new PrismaIdentityUnitOfWork(client);
      events = new PrismaDomainEventLogRepository(client);
    });

    beforeEach(async () => {
      await truncate(client, [
        ...IDENTITY_TABLES,
        "ClubEntryReservation",
        "DomainEventLog",
        "IdempotencyKey",
      ]);
      await seedWorld(client);
      await seedClub(client);
      await seedClub(client, OUTRO_CLUBE);
      accountId = await seedAccount(client);
      const joined = await new JoinWorld(unitOfWork).execute({ ...base, accountId });
      if (!joined.ok) throw new Error(`ingresso falhou: ${joined.error.code}`);
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    describe("JoinWorld", () => {
      it("entrar duas vezes devolve a mesma participação", async () => {
        const primeiro = await new JoinWorld(unitOfWork).execute({ ...base, accountId });
        const segundo = await new JoinWorld(unitOfWork).execute({ ...base, accountId });
        expect(primeiro.ok && segundo.ok).toBe(true);
        if (!primeiro.ok || !segundo.ok) return;
        expect(segundo.value.id).toBe(primeiro.value.id);
        expect(await client.worldParticipant.count()).toBe(1);
      });

      // A conta é global (R-172): só o caso de uso enxerga a porta de
      // plataforma, e o agregado do mundo não teria como saber.
      it("recusa conta que não existe", async () => {
        const result = await new JoinWorld(unitOfWork).execute({
          ...base,
          accountId: "019b76da-a800-7787-9462-49c009be0000",
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("ACCOUNT_NOT_FOUND");
      });
    });

    describe("ReserveClub", () => {
      it("retém a vaga e registra o evento", async () => {
        const reservation = await reservar();
        expect(reservation.status).toBe("HELD");

        const chain = await events.readAggregateChain(
          WORLD_ID,
          "ClubEntryReservation",
          reservation.id,
        );
        expect(chain.map((link) => link.eventType)).toEqual(["ClubReserved"]);
      });

      it("recusa clube já reservado por outro", async () => {
        await reservar();
        const outroId = await seedAccount(client, "outro@exemplo.com");
        await new JoinWorld(unitOfWork).execute({ ...base, accountId: outroId });

        const result = await new ReserveClub(unitOfWork).execute({
          ...base,
          accountId: outroId,
          clubId: CLUB_ID,
          expiresOn: "2026-01-07",
          attemptKey: "t2",
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("CLUB_SLOT_UNAVAILABLE");
      });

      it("recusa clube que já tem gestor", async () => {
        await comandar();
        const outroId = await seedAccount(client, "outro@exemplo.com");
        await new JoinWorld(unitOfWork).execute({ ...base, accountId: outroId });

        const result = await new ReserveClub(unitOfWork).execute({
          ...base,
          accountId: outroId,
          clubId: CLUB_ID,
          expiresOn: "2026-01-07",
          attemptKey: "t2",
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("CLUB_ALREADY_CONTROLLED");
      });

      it("recusa quem não participa do mundo", async () => {
        const forasteiro = accountSnapshot("forasteiro@exemplo.com");
        await client.userAccount.create({
          data: { id: forasteiro.id, name: forasteiro.name, email: forasteiro.email },
        });
        const result = await new ReserveClub(unitOfWork).execute({
          ...base,
          accountId: forasteiro.id,
          clubId: CLUB_ID,
          expiresOn: "2026-01-07",
          attemptKey: "t3",
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("PARTICIPATION_NOT_FOUND");
      });
    });

    describe("ConfirmOnboarding", () => {
      it("confirma a reserva e ativa o controle", async () => {
        const control = await comandar();
        expect(control.status).toBe("ACTIVE");
        expect(control.clubId).toBe(CLUB_ID);

        const reservation = await client.clubEntryReservation.findFirst();
        expect(reservation?.status).toBe("CONFIRMED");
      });

      // Confirmar reserva vencida daria a vaga a quem perdeu o prazo.
      it("recusa confirmar reserva vencida", async () => {
        const reservation = await reservar();
        const result = await new ConfirmOnboarding(unitOfWork).execute({
          ...base,
          occurredOn: "2026-01-08",
          reservationId: reservation.id,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("CLUB_SLOT_RESERVATION_EXPIRED");
      });

      it("recusa reserva inexistente", async () => {
        const result = await new ConfirmOnboarding(unitOfWork).execute({
          ...base,
          reservationId: "019b76da-a800-7787-9462-49c009be0000",
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("RESERVATION_NOT_FOUND");
      });
    });

    describe("EndClubControl", () => {
      it("encerra com motivo e põe a conta de castigo", async () => {
        const control = await comandar();
        const result = await new EndClubControl(unitOfWork).execute({
          ...base,
          occurredOn: "2026-03-10",
          controlId: control.id,
          reason: "SWITCH_REQUESTED",
          cooldownDays: 30,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.endedReason).toBe("SWITCH_REQUESTED");

        const participant = await client.worldParticipant.findFirst();
        expect(participant?.cooldownUntilOn?.toISOString().slice(0, 10)).toBe("2026-04-09");
      });

      it("o castigo impede reservar outro clube", async () => {
        const control = await comandar();
        await new EndClubControl(unitOfWork).execute({
          ...base,
          occurredOn: "2026-03-10",
          controlId: control.id,
          reason: "SWITCH_REQUESTED",
          cooldownDays: 30,
        });

        const result = await new ReserveClub(unitOfWork).execute({
          ...base,
          occurredOn: "2026-03-11",
          accountId,
          clubId: OUTRO_CLUBE,
          expiresOn: "2026-03-13",
          attemptKey: "t4",
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("ACCOUNT_COOLDOWN_ACTIVE");
      });

      it("depois do castigo, dá para assumir outro clube", async () => {
        const control = await comandar();
        await new EndClubControl(unitOfWork).execute({
          ...base,
          occurredOn: "2026-03-10",
          controlId: control.id,
          reason: "SWITCH_REQUESTED",
          cooldownDays: 30,
        });

        const result = await new ReserveClub(unitOfWork).execute({
          ...base,
          occurredOn: "2026-04-10",
          accountId,
          clubId: OUTRO_CLUBE,
          expiresOn: "2026-04-12",
          attemptKey: "t5",
        });
        expect(result.ok).toBe(true);
      });

      // A vaga volta a circular: o índice parcial é `WHERE status = 'ACTIVE'`.
      it("o clube liberado pode ser assumido por outro", async () => {
        const control = await comandar();
        await new EndClubControl(unitOfWork).execute({
          ...base,
          occurredOn: "2026-03-10",
          controlId: control.id,
          reason: "SWITCH_REQUESTED",
          cooldownDays: 30,
        });

        const outroId = await seedAccount(client, "outro@exemplo.com");
        await new JoinWorld(unitOfWork).execute({
          ...base,
          occurredOn: "2026-03-11",
          accountId: outroId,
        });
        const result = await new ReserveClub(unitOfWork).execute({
          ...base,
          occurredOn: "2026-03-11",
          accountId: outroId,
          clubId: CLUB_ID,
          expiresOn: "2026-03-13",
          attemptKey: "t6",
        });
        expect(result.ok).toBe(true);
      });
    });

    describe("ReleaseClubReservation", () => {
      it("libera e o clube volta a ficar disponível", async () => {
        const reservation = await reservar();
        const result = await new ReleaseClubReservation(unitOfWork).execute({
          ...base,
          reservationId: reservation.id,
        });
        expect(result.ok).toBe(true);
        // Tentativa nova, chave nova: é exatamente o que o attemptKey
        // discrimina. Com a mesma chave, o id repetiria e colidiria — e foi
        // este teste que pegou o defeito.
        expect((await reservar(CLUB_ID, accountId, "t-again")).status).toBe("HELD");
      });
    });

    /**
     * Decisão 19.10: agregado e evento no MESMO commit. Se o controle falhar, a
     * confirmação da reserva não pode ficar — nem o evento dela.
     */
    describe("transação (Decisão 19.10)", () => {
      it("falha de domínio não deixa escrita parcial", async () => {
        const reservation = await reservar();
        const antes = await client.domainEventLog.count();

        const result = await new ConfirmOnboarding(unitOfWork).execute({
          ...base,
          occurredOn: "2026-01-08", // vencida
          reservationId: reservation.id,
        });
        expect(result.ok).toBe(false);

        // A reserva continua HELD e nenhum evento entrou.
        const depois = await client.clubEntryReservation.findUnique({
          where: { gameWorldId_id: { gameWorldId: WORLD_ID, id: reservation.id } },
        });
        expect(depois?.status).toBe("HELD");
        expect(await client.domainEventLog.count()).toBe(antes);
        expect(await client.clubControl.count()).toBe(0);
      });
    });

    /**
     * O fluxo inteiro produz uma cadeia de integridade íntegra (R-133), com
     * `worldSequence` sem buraco — e é isso que o mega-agregado nunca teve,
     * porque os eventos ficavam presos dentro do snapshot e nunca eram drenados.
     */
    it("o onboarding inteiro deixa uma cadeia de eventos verificável", async () => {
      const control = await comandar();
      await new EndClubControl(unitOfWork).execute({
        ...base,
        occurredOn: "2026-03-10",
        controlId: control.id,
        reason: "SWITCH_REQUESTED",
        cooldownDays: 30,
      });

      const chain = await events.readWorldChain(WORLD_ID);
      expect(chain.map((link) => link.eventType)).toEqual([
        "WorldParticipationActivated",
        "ClubReserved",
        "ClubControlActivated",
        "ClubControlEnded",
        "CooldownStarted",
      ]);
      expect(chain.map((link) => link.sequence)).toEqual([1n, 2n, 3n, 4n, 5n]);
      expect(verifyEventChain(chain, sha256).ok).toBe(true);
    });
  },
);
