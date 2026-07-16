import { ResolveAccountForSubject, UserAccount } from "@grinta/core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaUserAccountRepository } from "../src/prisma-user-account-repository.js";
import { connect, hasDatabase, skipReason, truncate } from "./postgres.harness.js";

const base = {
  email: "douglas@exemplo.com",
  name: "Douglas",
  occurredOn: "2026-01-02",
  idempotencySeed: "grinta-demo",
};

function register(over: Partial<typeof base> & { externalSubject?: string } = {}) {
  const result = UserAccount.register({ ...base, ...over });
  if (!result.ok) throw result.error;
  return result.value.snapshot();
}

describe.skipIf(!hasDatabase)(
  `PrismaUserAccountRepository ${hasDatabase ? "" : `— PULADO: ${skipReason}`}`,
  () => {
    let client: ReturnType<typeof connect>;
    let repository: PrismaUserAccountRepository;

    beforeAll(() => {
      client = connect();
      repository = new PrismaUserAccountRepository(client);
    });

    beforeEach(async () => {
      await truncate(client, ["UserAccount"]);
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    // A prova que importa: o que sai do banco é idêntico ao que entrou. Um mock
    // concordaria com qualquer decomposição errada, inclusive as que perdem dado.
    it("round-trip: o snapshot volta idêntico", async () => {
      const snapshot = register({ externalSubject: "user_clerk1" });
      await repository.saveAccount(snapshot, null);
      expect(await repository.findAccountById(snapshot.id)).toEqual(snapshot);
    });

    it("round-trip preserva conta sem vínculo externo", async () => {
      const snapshot = register();
      await repository.saveAccount(snapshot, null);
      const loaded = await repository.findAccountById(snapshot.id);
      expect(loaded?.externalSubject).toBeNull();
      expect(loaded).toEqual(snapshot);
    });

    it("acha por e-mail e por subject — as duas chaves únicas", async () => {
      const snapshot = register({ externalSubject: "user_clerk1" });
      await repository.saveAccount(snapshot, null);
      expect(await repository.findAccountByEmail(snapshot.email)).toEqual(snapshot);
      expect(await repository.findAccountByExternalSubject("user_clerk1")).toEqual(
        snapshot,
      );
    });

    it("devolve null para quem não existe, em vez de explodir", async () => {
      expect(await repository.findAccountByEmail("ninguem@exemplo.com")).toBeNull();
      expect(await repository.findAccountByExternalSubject("nao_existe")).toBeNull();
    });

    // `createdOn` é data do MUNDO; `createdAt` é DateTime. A conversão tem de
    // ser estável nos dois sentidos, senão o determinismo do domínio se perde.
    it("a data do mundo atravessa sem deslizar de dia", async () => {
      const snapshot = register({ occurredOn: "2026-12-31" });
      await repository.saveAccount(snapshot, null);
      expect((await repository.findAccountById(snapshot.id))?.createdOn).toBe(
        "2026-12-31",
      );
    });

    describe("concorrência otimista", () => {
      it("atualiza quando a versão confere", async () => {
        const snapshot = register();
        await repository.saveAccount(snapshot, null);
        const next = { ...snapshot, name: "Douglas Prado", version: 2 };
        await repository.saveAccount(next, 1);
        expect((await repository.findAccountById(snapshot.id))?.name).toBe(
          "Douglas Prado",
        );
      });

      // Sem isto, uma escrita concorrente sobrescreveria a outra em silêncio.
      it("recusa quando a versão mudou por baixo", async () => {
        const snapshot = register();
        await repository.saveAccount(snapshot, null);
        await repository.saveAccount({ ...snapshot, version: 2 }, 1);
        await expect(
          repository.saveAccount({ ...snapshot, name: "Tarde", version: 2 }, 1),
        ).rejects.toMatchObject({ code: "ACCOUNT_REVISION_CONFLICT" });
      });

      it("criar duas vezes falha — quem arbitra é o índice único", async () => {
        const snapshot = register();
        await repository.saveAccount(snapshot, null);
        await expect(repository.saveAccount(snapshot, null)).rejects.toThrow();
      });
    });

    // O e-mail único é a razão pela qual a conta não podia ser por mundo (R-172).
    it("o banco recusa duas contas com o mesmo e-mail", async () => {
      await repository.saveAccount(register({ externalSubject: "a" }), null);
      const outra = { ...register({ externalSubject: "b" }), id: "019b76da-a800-7787-9462-49c009be3999" as never };
      await expect(repository.saveAccount(outra, null)).rejects.toThrow();
    });

    // O caso de uso contra o banco real: é este caminho que todo login segue.
    describe("ResolveAccountForSubject sobre Postgres", () => {
      it("cria no primeiro acesso e reusa no segundo", async () => {
        const useCase = new ResolveAccountForSubject(repository);
        const input = { subject: "user_clerk1", ...base };
        const first = await useCase.execute(input);
        const second = await useCase.execute(input);
        expect(first.ok && second.ok).toBe(true);
        if (!first.ok || !second.ok) return;
        expect(second.value.id).toBe(first.value.id);
        expect(await client.userAccount.count()).toBe(1);
      });

      it("liga o subject a uma conta que já existia com o e-mail", async () => {
        await repository.saveAccount(register(), null);
        const useCase = new ResolveAccountForSubject(repository);
        const result = await useCase.execute({ subject: "user_clerk1", ...base });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.externalSubject).toBe("user_clerk1");
        expect(await client.userAccount.count()).toBe(1);
      });
    });
  },
);
