import { Club, type ClubSnapshot } from "@grinta/core";
import { WorldDate, parseRulesetVersion } from "@grinta/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaClubRepository } from "../src/prisma-club-repository.js";
import { CLUB_ID, CLUB_TABLES, WORLD_ID, seedWorld } from "./fixtures.js";
import { connect, hasDatabase, skipReason, truncate } from "./postgres.harness.js";

const OTHER_CLUB_ID = "019b76da-a800-7787-9462-49c009be4444";

function ruleset() {
  const parsed = parseRulesetVersion("1.0.0");
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

/**
 * Um clube completo, como a gênese o produz. Ids fixos: nada de derivar do
 * relógio num teste que assere igualdade de snapshot.
 */
function clubSnapshot(
  over: { id?: string; name?: string; shortCode?: string } = {},
): ClubSnapshot {
  const id = over.id ?? CLUB_ID;
  const identity = {
    id: `019b76da-a800-7aaa-9462-${id.slice(-12)}` as never,
    name: over.name ?? "Grinta FC",
    shortCode: over.shortCode ?? "GRI",
    effectiveFrom: "2026-01-01",
    effectiveThrough: null,
    rulesetVersion: ruleset(),
  } as const;
  return {
    id: id as never,
    gameWorldId: WORLD_ID as never,
    identity,
    identityHistory: [identity],
    regionId: "BR-SP",
    reputationBand: 1,
    status: "ACTIVE",
    departments: [
      {
        kind: "FOOTBALL",
        level: 1,
        targetLevel: 2,
        capacity: 10,
        condition: 100,
        maintenanceDueOn: null,
      },
      {
        kind: "MEDICAL",
        level: 1,
        targetLevel: 1,
        capacity: 10,
        condition: 80,
        maintenanceDueOn: "2026-03-01",
      },
    ],
    stadium: {
      id: `019b76da-a800-7bbb-9462-${id.slice(-12)}` as never,
      name: "Estádio Grinta",
      tenure: "OWNED",
      capacity: 10_000,
      pitchQuality: 60,
      condition: 100,
      licenseStatus: "LICENSED",
      maintenanceDueOn: null,
      version: 1,
    },
    ticketPolicies: [],
    commercialAgreements: [],
    boardDecisions: [],
    version: 1,
  };
}

describe.skipIf(!hasDatabase)(
  `PrismaClubRepository ${hasDatabase ? "" : `— PULADO: ${skipReason}`}`,
  () => {
    let client: ReturnType<typeof connect>;
    let repository: PrismaClubRepository;

    /**
     * O clube ocupa 6 tabelas: meio clube gravado é corrupção. O adapter recebe
     * `TransactionClient` justamente para NÃO conseguir abrir a sua — quem
     * salva abre. Aqui isso é explícito; em produção será o UnitOfWork de C3,
     * quando o append de evento tiver de entrar no mesmo commit (Decisão 19.10).
     */
    const save = (snapshot: ClubSnapshot, expectedVersion: number | null) =>
      client.$transaction((tx) =>
        new PrismaClubRepository(tx).saveClub(snapshot, expectedVersion),
      );

    beforeAll(() => {
      client = connect();
      repository = new PrismaClubRepository(client);
    });

    beforeEach(async () => {
      await truncate(client, CLUB_TABLES);
      await seedWorld(client);
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    it("round-trip: o snapshot volta idêntico", async () => {
      const snapshot = clubSnapshot();
      await save(snapshot, null);
      expect(await repository.findClubById(snapshot.gameWorldId, snapshot.id)).toEqual(
        snapshot,
      );
    });

    it("devolve null para clube que não existe", async () => {
      expect(
        await repository.findClubById(WORLD_ID as never, OTHER_CLUB_ID as never),
      ).toBeNull();
    });

    /**
     * A identidade vigente NÃO é coluna do clube: é o período aberto. O
     * snapshot tem `identity` e `identityHistory`, mas a tabela tem uma verdade
     * só — `identity` deriva do período com `effectiveThrough IS NULL`.
     */
    it("a identidade vigente deriva do período aberto, não de uma coluna", async () => {
      const snapshot = clubSnapshot();
      await save(snapshot, null);
      const rows = await client.clubIdentityPeriod.findMany({
        where: { gameWorldId: WORLD_ID, clubId: CLUB_ID },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]?.effectiveThrough).toBeNull();
      expect(rows[0]?.name).toBe("Grinta FC");
    });

    it("o rebranding fecha o período anterior e abre o novo — o histórico volta em ordem", async () => {
      const snapshot = clubSnapshot();
      await save(snapshot, null);

      const loaded = Club.fromSnapshot(snapshot);
      if (!loaded.ok) throw loaded.error;
      const effectiveOn = WorldDate.parse("2026-06-01");
      if (!effectiveOn.ok) throw effectiveOn.error;
      const renamed = loaded.value.updateIdentity({
        name: "Grinta United",
        shortCode: "GRU",
        effectiveOn: effectiveOn.value,
        rulesetVersion: ruleset(),
        identityId: "019b76da-a800-7ccc-9462-49c009be9999" as never,
      });
      if (!renamed.ok) throw renamed.error;
      await save(loaded.value.snapshot(), 1);

      const back = await repository.findClubById(WORLD_ID as never, CLUB_ID as never);
      expect(back?.identity.name).toBe("Grinta United");
      expect(back?.identityHistory.map(({ name, effectiveThrough }) => [name, effectiveThrough]))
        .toEqual([
          ["Grinta FC", "2026-05-31"],
          ["Grinta United", null],
        ]);
    });

    /**
     * Índice parcial `ClubIdentityPeriod_nome_unico_vigente` (context map:153).
     *
     * A asserção nomeia os campos de propósito: um `rejects.toThrow()` seco
     * passaria se o save quebrasse por qualquer outro motivo — e daria a
     * impressão de que a unicidade de nome está provada quando o que falhou foi
     * outra coisa. `(gameWorldId, name)` distingue este índice do outro parcial
     * da mesma tabela, que é sobre `(gameWorldId, clubId)`.
     */
    it("dois clubes não podem ter o mesmo nome VIGENTE no mundo", async () => {
      await save(clubSnapshot(), null);
      await expect(
        save(clubSnapshot({ id: OTHER_CLUB_ID }), null),
      ).rejects.toThrow(/Unique constraint failed on the fields[^)]*gameWorldId[^)]*name/u);
    });

    /**
     * A razão de o índice ser PARCIAL: um unique total proibiria o nome
     * abandonado de voltar ao pool — e proibiria o clube de retomar o próprio
     * nome antigo.
     */
    it("o nome abandonado num rebranding volta ao pool", async () => {
      const snapshot = clubSnapshot();
      await save(snapshot, null);

      const loaded = Club.fromSnapshot(snapshot);
      if (!loaded.ok) throw loaded.error;
      const effectiveOn = WorldDate.parse("2026-06-01");
      if (!effectiveOn.ok) throw effectiveOn.error;
      const renamed = loaded.value.updateIdentity({
        name: "Grinta United",
        shortCode: "GRU",
        effectiveOn: effectiveOn.value,
        rulesetVersion: ruleset(),
        identityId: "019b76da-a800-7ccc-9462-49c009be9999" as never,
      });
      if (!renamed.ok) throw renamed.error;
      await save(loaded.value.snapshot(), 1);

      // "Grinta FC" está livre: o período que o segurava foi fechado.
      await expect(
        save(clubSnapshot({ id: OTHER_CLUB_ID, name: "Grinta FC" }), null),
      ).resolves.toBeUndefined();
    });

    it("recusa quando a versão mudou por baixo", async () => {
      const snapshot = clubSnapshot();
      await save(snapshot, null);
      await save({ ...snapshot, version: 2 }, 1);
      await expect(
        save({ ...snapshot, version: 2 }, 1),
      ).rejects.toMatchObject({ code: "CLUB_VERSION_CONFLICT" });
    });

    /**
     * O risco real de decompor um snapshot em 6 tabelas: um save que só insere
     * duplica as coleções no segundo save. O array do domínio é a verdade — a
     * tabela tem que ficar igual a ele, não somar a ele.
     */
    it("salvar duas vezes não duplica as coleções", async () => {
      const snapshot = clubSnapshot();
      await save(snapshot, null);
      await save({ ...snapshot, version: 2 }, 1);

      expect(
        await client.clubDepartment.count({ where: { gameWorldId: WORLD_ID, clubId: CLUB_ID } }),
      ).toBe(2);
      expect(
        await client.clubIdentityPeriod.count({ where: { gameWorldId: WORLD_ID, clubId: CLUB_ID } }),
      ).toBe(1);
      expect(
        await client.stadium.count({ where: { gameWorldId: WORLD_ID, clubId: CLUB_ID } }),
      ).toBe(1);
    });

    it("as coleções opcionais atravessam", async () => {
      const snapshot: ClubSnapshot = {
        ...clubSnapshot(),
        ticketPolicies: [
          {
            id: "019b76da-a800-7ddd-9462-49c009be0001" as never,
            priceMinor: 5_000,
            effectiveOn: "2026-02-01",
            rulesetVersion: ruleset(),
          },
        ],
        commercialAgreements: [
          {
            id: "019b76da-a800-7eee-9462-49c009be0002" as never,
            asset: "SHIRT_FRONT",
            exclusive: true,
            startsOn: "2026-01-01",
            endsOn: "2026-12-31",
            externalAgreementRef: "SPO-1",
            rulesetVersion: ruleset(),
          },
        ],
        boardDecisions: [
          {
            id: "019b76da-a800-7fff-9462-49c009be0003" as never,
            decisionType: "HIRE_MANAGER",
            authorId: "board",
            justification: "Reestruturação",
            effectiveFrom: "2026-01-05",
            effectiveThrough: null,
            recordedAt: "2026-01-05",
            rulesetVersion: ruleset(),
          },
        ],
      };
      await save(snapshot, null);
      expect(await repository.findClubById(snapshot.gameWorldId, snapshot.id)).toEqual(
        snapshot,
      );
    });

    /**
     * O mundo isola: o índice de nome é por mundo, e um clube nunca é achado a
     * partir do mundo errado.
     */
    it("isolamento por mundo: o mesmo nome convive em mundos diferentes", async () => {
      await save(clubSnapshot(), null);
      await client.gameWorld.create({
        data: {
          id: "019b76da-a800-7787-9462-49c009be5555",
          seed: "outro",
          rulesetVersion: "1.0.0",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          currentDate: new Date("2026-01-01T00:00:00.000Z"),
        },
      });
      const elsewhere: ClubSnapshot = {
        ...clubSnapshot({ id: OTHER_CLUB_ID }),
        gameWorldId: "019b76da-a800-7787-9462-49c009be5555" as never,
      };
      await expect(save(elsewhere, null)).resolves.toBeUndefined();
      expect(
        await repository.findClubById(WORLD_ID as never, OTHER_CLUB_ID as never),
      ).toBeNull();
    });
  },
);
