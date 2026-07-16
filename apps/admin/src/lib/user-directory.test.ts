import { describe, expect, it } from "vitest";

import { buildUserDirectory, subjectFromIdempotencyKey } from "./user-directory";

const identity = {
  accounts: [
    {
      id: "acc-1",
      idempotencyKey: "mobile-account:user_clerk123",
      status: "ACTIVE",
    },
    { id: "acc-2", idempotencyKey: "mobile-account:user_sem_clube", status: "ACTIVE" },
    { id: "acc-3", idempotencyKey: "mobile-account:user_inativo", status: "SUSPENDED" },
  ],
  controls: [
    { id: "ctl-1", accountId: "acc-1", clubId: "club-pio", status: "ACTIVE" },
    { id: "ctl-old", accountId: "acc-1", clubId: "club-antigo", status: "ENDED" },
  ],
};

const clubs = {
  clubs: [
    { id: "club-pio", identity: { name: "Pioneiros" } },
    { id: "club-antigo", identity: { name: "Extintos" } },
  ],
};

const ledger = {
  clubBalances: [
    { clubId: "club-pio", balanceMinor: 500_000_000 },
    { clubId: "club-antigo", balanceMinor: 1 },
  ],
};

describe("subjectFromIdempotencyKey", () => {
  it("extrai o subject da chave do app", () => {
    expect(subjectFromIdempotencyKey("mobile-account:user_abc")).toBe("user_abc");
  });

  it("chave fora do padrão volta inteira, nunca vazia", () => {
    expect(subjectFromIdempotencyKey("outra-coisa")).toBe("outra-coisa");
  });
});

describe("buildUserDirectory", () => {
  const rows = buildUserDirectory([
    { worldId: "w1", worldSeed: "demo", identity, clubs, ledger },
  ]);

  it("junta conta → controle ativo → clube → saldo", () => {
    expect(rows[0]).toEqual({
      subject: "user_clerk123",
      accountId: "acc-1",
      accountStatus: "ACTIVE",
      worldId: "w1",
      worldSeed: "demo",
      clubId: "club-pio",
      clubName: "Pioneiros",
      balanceMinor: 500_000_000,
    });
  });

  it("controle encerrado não conta como clube do usuário", () => {
    expect(rows[0]?.clubId).not.toBe("club-antigo");
  });

  it("conta sem clube aparece com clube nulo — não some da lista", () => {
    const semClube = rows.find((r) => r.subject === "user_sem_clube");
    expect(semClube).toMatchObject({
      clubId: null,
      clubName: null,
      balanceMinor: null,
    });
  });

  it("conta suspensa aparece com o status real", () => {
    const suspensa = rows.find((r) => r.subject === "user_inativo");
    expect(suspensa?.accountStatus).toBe("SUSPENDED");
  });

  it("clube sem saldo no ledger fica com saldo nulo, não zero", () => {
    const rows2 = buildUserDirectory([
      {
        worldId: "w1",
        worldSeed: "demo",
        identity,
        clubs,
        ledger: { clubBalances: [] },
      },
    ]);
    // null = "não sabemos", 0 = "sabemos que é zero". A tabela não inventa.
    expect(rows2[0]?.balanceMinor).toBeNull();
  });

  it("mundos sem identidade inicializada não derrubam os demais", () => {
    const rows3 = buildUserDirectory([
      { worldId: "w0", worldSeed: "vazio", identity: null, clubs: null, ledger: null },
      { worldId: "w1", worldSeed: "demo", identity, clubs, ledger },
    ]);
    expect(rows3).toHaveLength(3);
    expect(rows3.every((r) => r.worldId === "w1")).toBe(true);
  });
});
