import { beforeEach, describe, expect, it } from "vitest";

import type { UserAccountRepository } from "../../src/identity/user-account-repository.js";
import type { UserAccountSnapshot } from "../../src/identity/user-account.js";
import { ResolveAccountForSubject } from "../../src/identity/user-account-use-cases.js";

class MemoryAccountRepository implements UserAccountRepository {
  public readonly rows = new Map<string, UserAccountSnapshot>();
  public saves = 0;

  public findAccountById(id: string): Promise<UserAccountSnapshot | null> {
    return Promise.resolve(this.rows.get(id) ?? null);
  }

  public findAccountByEmail(email: string): Promise<UserAccountSnapshot | null> {
    return Promise.resolve(
      [...this.rows.values()].find((r) => r.email === email) ?? null,
    );
  }

  public findAccountByExternalSubject(
    subject: string,
  ): Promise<UserAccountSnapshot | null> {
    return Promise.resolve(
      [...this.rows.values()].find((r) => r.externalSubject === subject) ?? null,
    );
  }

  public saveAccount(
    snapshot: UserAccountSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    const current = this.rows.get(snapshot.id);
    // Concorrência otimista: espelha o que o Postgres vai impor, senão o teste
    // aprova um caso que o banco recusa.
    if (expectedVersion === null && current !== undefined) {
      return Promise.reject(new Error("conflito: conta já existe"));
    }
    if (expectedVersion !== null && current?.version !== expectedVersion) {
      return Promise.reject(new Error("conflito: versão mudou"));
    }
    this.rows.set(snapshot.id, snapshot);
    this.saves += 1;
    return Promise.resolve();
  }
}

const input = {
  subject: "user_clerk1",
  email: "douglas@exemplo.com",
  name: "Douglas",
  occurredOn: "2026-01-01",
  idempotencySeed: "grinta-demo",
};

describe("ResolveAccountForSubject", () => {
  let repository: MemoryAccountRepository;
  let useCase: ResolveAccountForSubject;

  beforeEach(() => {
    repository = new MemoryAccountRepository();
    useCase = new ResolveAccountForSubject(repository);
  });

  it("cria a conta no primeiro acesso, já ligada ao provedor", async () => {
    const result = await useCase.execute(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.email).toBe("douglas@exemplo.com");
    expect(result.value.externalSubject).toBe("user_clerk1");
    expect(repository.saves).toBe(1);
  });

  // Todo login passa por aqui: se criasse conta a cada acesso, o e-mail único
  // do Postgres explodiria no segundo.
  it("no segundo acesso devolve a mesma conta, sem gravar de novo", async () => {
    const first = await useCase.execute(input);
    const second = await useCase.execute(input);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.value.id).toBe(first.value.id);
    expect(repository.saves).toBe(1);
  });

  // Conta que nasceu por outro caminho (seed, admin) e agora entra pelo
  // provedor: liga em vez de duplicar.
  it("liga o subject a uma conta que já existia com aquele e-mail", async () => {
    await useCase.execute({ ...input, subject: "" });
    const linked = await useCase.execute(input);
    expect(linked.ok).toBe(true);
    if (!linked.ok) return;
    expect(linked.value.externalSubject).toBe("user_clerk1");
    expect(repository.rows.size).toBe(1);
  });

  // Sequestro: o e-mail já pertence a uma conta ligada a OUTRA identidade.
  it("recusa quando o e-mail pertence a conta de outro subject", async () => {
    await useCase.execute(input);
    const result = await useCase.execute({ ...input, subject: "user_invasor" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("ACCOUNT_ALREADY_LINKED");
  });

  it("normaliza o e-mail antes de procurar — caixa não cria conta nova", async () => {
    const first = await useCase.execute(input);
    const second = await useCase.execute({ ...input, email: "DOUGLAS@Exemplo.COM" });
    if (!first.ok || !second.ok) return;
    expect(second.value.id).toBe(first.value.id);
    expect(repository.rows.size).toBe(1);
  });

  it("exige subject: sem prova do provedor não se resolve conta", async () => {
    const result = await useCase.execute({ ...input, subject: "   " });
    expect(result.ok).toBe(false);
  });

  it("propaga erro de validação da conta", async () => {
    const result = await useCase.execute({ ...input, email: "sem-arroba" });
    expect(result.ok).toBe(false);
  });
});
