import { describe, expect, it } from "vitest";

import {
  buildWorldParameters,
  mutableParameters,
  type WorldParametersInput,
} from "./world-parameters-model";

const SNAPSHOT = {
  seed: "grinta-demo",
  startDate: "2026-01-01",
  currentDate: "2026-03-14",
  rulesetVersion: "1.0.0",
  status: "ACTIVE",
  worldSequence: 42,
  version: 7,
};

function input(over: Partial<WorldParametersInput> = {}): WorldParametersInput {
  return { snapshot: SNAPSHOT, observedClubCount: 16, ...over };
}

function row(over: Partial<WorldParametersInput>, key: string) {
  const found = buildWorldParameters(input(over)).find((r) => r.key === key);
  if (found === undefined) throw new Error(`sem linha para ${key}`);
  return found;
}

describe("buildWorldParameters", () => {
  it("lê os valores do snapshot, sem reescrevê-los", () => {
    expect(row({}, "seed").value).toBe("grinta-demo");
    expect(row({}, "startDate").value).toBe("2026-01-01");
    expect(row({}, "currentDate").value).toBe("2026-03-14");
    expect(row({}, "rulesetVersion").value).toBe("1.0.0");
    expect(row({}, "status").value).toBe("ACTIVE");
  });

  describe("sem snapshot, o valor é desconhecido — nunca inventado", () => {
    it("não afirma valor quando a query ainda não voltou", () => {
      const rows = buildWorldParameters(input({ snapshot: null }));
      const fromSnapshot = rows.filter((r) => r.origin === "snapshot");

      expect(fromSnapshot.length).toBeGreaterThan(0);
      for (const r of fromSnapshot) expect(r.value).toBeNull();
    });

    it("mantém a linha e o motivo mesmo sem valor: a tabela não encolhe", () => {
      const semSnapshot = buildWorldParameters(input({ snapshot: null }));
      const comSnapshot = buildWorldParameters(input());

      expect(semSnapshot).toHaveLength(comSnapshot.length);
      expect(semSnapshot.every((r) => r.mutability.kind !== undefined)).toBe(
        true,
      );
    });
  });

  describe("clubes: dado observado, não constante", () => {
    it("usa a contagem real vinda da query club-detail", () => {
      expect(row({ observedClubCount: 16 }, "clubCount").value).toBe("16");
      expect(row({ observedClubCount: 16 }, "clubCount").origin).toBe("query");
    });

    it("um mundo com outra contagem mostra a contagem dele", () => {
      // A tabela relata o que o mundo TEM. Se algum dia a gênese variar, esta
      // linha acompanha sozinha — ela não repete o `16` do core.
      expect(row({ observedClubCount: 20 }, "clubCount").value).toBe("20");
    });

    it("contagem desconhecida não vira zero — zero é uma afirmação", () => {
      expect(row({ observedClubCount: null }, "clubCount").value).toBeNull();
    });
  });

  describe("mutabilidade: cada linha diz a verdade sobre si", () => {
    it("seed e startDate são imutáveis por construção (readonly no agregado)", () => {
      expect(row({}, "seed").mutability.kind).toBe("immutable");
      expect(row({}, "startDate").mutability.kind).toBe("immutable");
    });

    it("status é o ÚNICO parâmetro com command real", () => {
      const status = row({}, "status").mutability;

      expect(status.kind).toBe("command");
      if (status.kind !== "command") throw new Error("esperava command");
      expect(status.commandTypes).toContain("world:activate");
      expect(status.commandTypes).toContain("world:delete");
    });

    it("currentDate está travado: `world:advance-day` NÃO existe no registry", () => {
      // O use case AdvanceWorldDays existe no core e morreu com o WorldScheduler
      // (R-175) — nenhum command o expõe. Anunciar um command inexistente aqui
      // seria a tela mentindo sobre a API.
      const currentDate = row({}, "currentDate").mutability;

      expect(currentDate.kind).toBe("blocked");
      if (currentDate.kind !== "blocked") throw new Error("esperava blocked");
      expect(currentDate.reason).toMatch(/command/i);
    });

    it("rulesetVersion está travado — PublishRuleSetVersion não foi implementado", () => {
      const ruleset = row({}, "rulesetVersion").mutability;

      expect(ruleset.kind).toBe("blocked");
      if (ruleset.kind !== "blocked") throw new Error("esperava blocked");
      expect(ruleset.reason).toMatch(/PublishRuleSetVersion/);
    });

    it("as constantes da gênese estão travadas por R-182, e citam a decisão", () => {
      for (const key of ["squadSize", "rounds", "leagueName"]) {
        const m = row({}, key).mutability;

        expect(m.kind).toBe("blocked");
        if (m.kind !== "blocked") throw new Error(`esperava blocked em ${key}`);
        expect(m.decision).toBe("R-182");
      }
    });

    it("nenhuma linha promete um command que o registry não tem", () => {
      // O registry real, verificado em apps/api/src/commands/command-registry.ts.
      const REGISTRY = [
        "world:create",
        "world:genesis",
        "world:activate",
        "world:delete",
        "identity:join-world",
        "identity:reserve-club",
        "identity:confirm-onboarding",
        "identity:release-club-reservation",
        "identity:end-club-control",
        "identity:request-switch",
      ];

      for (const r of buildWorldParameters(input())) {
        if (r.mutability.kind !== "command") continue;
        for (const c of r.mutability.commandTypes) expect(REGISTRY).toContain(c);
      }
    });
  });

  describe("origem: a tabela separa o que observou do que espelha do código", () => {
    it("as constantes da gênese se declaram código, com arquivo:linha", () => {
      const rounds = row({}, "rounds");

      expect(rounds.origin).toBe("code");
      expect(rounds.source).toMatch(/genesis-types\.ts:\d+/);
    });

    it("o que veio da API não se disfarça de constante", () => {
      expect(row({}, "seed").origin).toBe("snapshot");
      expect(row({}, "clubCount").origin).toBe("query");
    });
  });

  it("mutableParameters isola o que dá para mexer hoje: só o status", () => {
    expect(mutableParameters(buildWorldParameters(input())).map((r) => r.key)).toEqual(
      ["status"],
    );
  });
});
