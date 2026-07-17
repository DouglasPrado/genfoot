import { describe, expect, it } from "vitest";

import { buildUserDirectory, type WorldSlice } from "./user-directory";

const identity: WorldSlice["identity"] = {
  participations: [
    { accountId: "acc-1", status: "ACTIVE" },
    { accountId: "acc-2", status: "ACTIVE" },
    { accountId: "acc-3", status: "ENDED" },
  ],
  controls: [
    { id: "ctl-1", accountId: "acc-1", clubId: "club-1", status: "ACTIVE" },
    // Encerrado: o dono saiu, e o clube não é mais dele.
    { id: "ctl-2", accountId: "acc-2", clubId: "club-2", status: "ENDED" },
  ],
};

const clubs: WorldSlice["clubs"] = {
  clubs: [
    { id: "club-1", name: "Real do Vale", shortCode: "RDV" },
    { id: "club-2", name: "Horizonte", shortCode: "HRZ" },
  ],
};

function slice(over: Partial<WorldSlice> = {}): WorldSlice {
  return {
    worldId: "world-1",
    worldSeed: "grinta-demo",
    identity,
    clubs,
    ...over,
  };
}

describe("buildUserDirectory", () => {
  /**
   * O teste que faltava, e que teria pego a tela vazia.
   *
   * O modelo antigo lia `identity.accounts[]`, campo que o read model de C1
   * (R-175) não tem — e o `?? []` engolia isso em silêncio: zero linha, zero
   * erro. O teste antigo passava porque a FIXTURE tinha `accounts`. Ele
   * concordava consigo mesmo, não com a API.
   */
  it("lista uma linha por PARTICIPAÇÃO — é o que o read model entrega", () => {
    expect(buildUserDirectory([slice()])).toHaveLength(3);
  });

  it("junta participação → controle ativo → clube", () => {
    const row = buildUserDirectory([slice()])[0];
    expect(row).toMatchObject({
      accountId: "acc-1",
      clubId: "club-1",
      clubName: "Real do Vale",
      worldSeed: "grinta-demo",
    });
  });

  it("controle encerrado não conta como clube do usuário", () => {
    const row = buildUserDirectory([slice()]).find(
      (r) => r.accountId === "acc-2",
    );
    expect(row?.clubId).toBeNull();
    expect(row?.clubName).toBeNull();
  });

  it("participação sem clube aparece com clube nulo — não some da lista", () => {
    const rows = buildUserDirectory([slice()]);
    expect(rows.map((r) => r.accountId)).toContain("acc-2");
  });

  it("participação encerrada aparece com o status real", () => {
    const row = buildUserDirectory([slice()]).find(
      (r) => r.accountId === "acc-3",
    );
    expect(row?.accountStatus).toBe("ENDED");
  });

  /** Clube que a query não trouxe é null, não string inventada. */
  it("controle apontando clube desconhecido fica com nome nulo", () => {
    const rows = buildUserDirectory([slice({ clubs: { clubs: [] } })]);
    expect(rows[0]?.clubId).toBe("club-1");
    expect(rows[0]?.clubName).toBeNull();
  });

  it("mundos sem identidade não derrubam os demais", () => {
    const rows = buildUserDirectory([
      slice({ worldId: "world-vazio", identity: null }),
      slice(),
    ]);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.worldId === "world-1")).toBe(true);
  });

  it("mundo sem clubes ainda lista os usuários", () => {
    const rows = buildUserDirectory([slice({ clubs: null })]);
    expect(rows).toHaveLength(3);
    expect(rows[0]?.clubName).toBeNull();
  });
});
