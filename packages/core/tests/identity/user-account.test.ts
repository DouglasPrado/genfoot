import { describe, expect, it } from "vitest";

import { AccountStatus } from "../../src/identity/identity-types.js";
import {
  normalizeEmail,
  UserAccount,
} from "../../src/identity/user-account.js";

const base = {
  email: "Douglas@Exemplo.com ",
  name: " Douglas ",
  locale: "pt-BR",
  occurredOn: "2026-01-01",
  idempotencySeed: "grinta-demo",
};

function register(over: Partial<typeof base> & { externalSubject?: string } = {}) {
  const result = UserAccount.register({ ...base, ...over });
  if (!result.ok) throw new Error(`esperava sucesso: ${result.error.code}`);
  return result.value;
}

describe("normalizeEmail", () => {
  it("normaliza caixa e espaços — é a chave única do modelo físico", () => {
    expect(normalizeEmail("  Douglas@Exemplo.COM ")).toBe("douglas@exemplo.com");
  });
});

describe("UserAccount.register", () => {
  it("cria conta ativa com e-mail normalizado e nome aparado", () => {
    const snapshot = register().snapshot();
    expect(snapshot.email).toBe("douglas@exemplo.com");
    expect(snapshot.name).toBe("Douglas");
    expect(snapshot.status).toBe(AccountStatus.ACTIVE);
    expect(snapshot.version).toBe(1);
  });

  // R-172: a conta é de plataforma. Se voltasse a ter mundo, não caberia no
  // UserAccount do Postgres, que não tem gameWorldId.
  it("não carrega mundo nenhum", () => {
    expect(register().snapshot()).not.toHaveProperty("gameWorldId");
  });

  it("exige e-mail e recusa formato sem @", () => {
    expect(UserAccount.register({ ...base, email: "  " }).ok).toBe(false);
    expect(UserAccount.register({ ...base, email: "douglas" }).ok).toBe(false);
  });

  it("exige locale", () => {
    expect(UserAccount.register({ ...base, locale: " " }).ok).toBe(false);
  });

  // Determinismo: sem Date.now()/Math.random() no domínio, reprocessar o mesmo
  // cadastro tem de produzir o mesmo id.
  it("mesmo e-mail e semente geram o mesmo id", () => {
    expect(register().snapshot().id).toBe(register().snapshot().id);
  });

  it("e-mails diferentes geram ids diferentes", () => {
    expect(register().snapshot().id).not.toBe(
      register({ email: "outro@exemplo.com" }).snapshot().id,
    );
  });

  it("guarda o subject do provedor quando vem (R-171)", () => {
    expect(register({ externalSubject: "user_clerk1" }).snapshot().externalSubject).toBe(
      "user_clerk1",
    );
  });

  it("sem subject a conta nasce desligada do provedor, não com string vazia", () => {
    expect(register().snapshot().externalSubject).toBeNull();
    expect(register({ externalSubject: "  " }).snapshot().externalSubject).toBeNull();
  });
});

describe("UserAccount.linkExternalSubject", () => {
  it("liga a conta ao provedor no primeiro acesso", () => {
    const account = register();
    const linked = account.linkExternalSubject("user_clerk1");
    expect(linked.ok).toBe(true);
    expect(account.snapshot().externalSubject).toBe("user_clerk1");
    expect(account.snapshot().version).toBe(2);
  });

  it("religar o mesmo subject é idempotente — não incha a versão", () => {
    const account = register({ externalSubject: "user_clerk1" });
    account.linkExternalSubject("user_clerk1");
    expect(account.snapshot().version).toBe(1);
  });

  // Sequestro de conta: trocar o `sub` em silêncio daria a conta a outra
  // identidade externa.
  it("recusa trocar o vínculo por outro subject", () => {
    const account = register({ externalSubject: "user_clerk1" });
    const result = account.linkExternalSubject("user_invasor");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("ACCOUNT_ALREADY_LINKED");
    expect(account.snapshot().externalSubject).toBe("user_clerk1");
  });

  it("exige subject não-vazio", () => {
    expect(register().linkExternalSubject("  ").ok).toBe(false);
  });
});

describe("UserAccount.fromSnapshot", () => {
  it("aceita snapshot válido", () => {
    expect(UserAccount.fromSnapshot(register().snapshot()).ok).toBe(true);
  });

  // Invariante do modelo físico: o e-mail é a chave única. Um snapshot com
  // e-mail não normalizado criaria duas contas para a mesma pessoa.
  it("recusa e-mail não normalizado — a unicidade dependeria da sorte", () => {
    const snapshot = { ...register().snapshot(), email: "Douglas@Exemplo.com" };
    const result = UserAccount.fromSnapshot(snapshot);
    expect(result.ok).toBe(false);
  });

  it("recusa versão inválida", () => {
    const snapshot = { ...register().snapshot(), version: 0 };
    expect(UserAccount.fromSnapshot(snapshot).ok).toBe(false);
  });
});

describe("UserAccount.suspend", () => {
  it("suspende e sobe a versão", () => {
    const account = register();
    account.suspend();
    expect(account.snapshot().status).toBe(AccountStatus.SUSPENDED);
    expect(account.snapshot().version).toBe(2);
  });

  it("suspender de novo é idempotente", () => {
    const account = register();
    account.suspend();
    account.suspend();
    expect(account.snapshot().version).toBe(2);
  });
});
