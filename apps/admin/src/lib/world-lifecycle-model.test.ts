import { describe, expect, it } from "vitest";

import {
  lifecycleActions,
  lifecycleState,
  type LifecycleActionKey,
} from "./world-lifecycle-model";

function keys(status: string): readonly LifecycleActionKey[] {
  return lifecycleActions(status).map((a) => a.key);
}

describe("lifecycleState", () => {
  it("traduz o status do domínio para o vocabulário do operador", () => {
    expect(lifecycleState("CREATING").label).toBe("Em breve");
    expect(lifecycleState("ACTIVE").label).toBe("Ativo");
    expect(lifecycleState("PAUSED").label).toBe("Congelado");
    expect(lifecycleState("ARCHIVED").label).toBe("Inativo");
  });

  it("diz se o relógio anda — é o que distingue os estados na prática", () => {
    expect(lifecycleState("ACTIVE").clockRunning).toBe(true);
    expect(lifecycleState("PAUSED").clockRunning).toBe(false);
    expect(lifecycleState("ARCHIVED").clockRunning).toBe(false);
    expect(lifecycleState("CREATING").clockRunning).toBe(false);
  });

  it("status desconhecido não quebra a tela nem finge conhecer", () => {
    // O domínio tem FINISHED, que nenhuma transição produz hoje. A tela mostra o
    // código cru em vez de inventar rótulo ou renderizar vazio.
    const state = lifecycleState("FINISHED");

    expect(state.label).toBe("FINISHED");
    expect(state.clockRunning).toBe(false);
    expect(state.known).toBe(false);
  });
});

describe("lifecycleActions", () => {
  it("EM BREVE só oferece ativar", () => {
    expect(keys("CREATING")).toEqual(["activate"]);
  });

  it("ATIVO oferece congelar e inativar — nunca voltar para em breve", () => {
    expect(keys("ACTIVE")).toEqual(["pause", "archive"]);
    expect(keys("ACTIVE")).not.toContain("activate");
  });

  it("CONGELADO oferece descongelar e inativar", () => {
    expect(keys("PAUSED")).toEqual(["resume", "archive"]);
  });

  it("INATIVO oferece reabrir — R-56: arquivar é reversível", () => {
    expect(keys("ARCHIVED")).toEqual(["resume"]);
  });

  it("status desconhecido não oferece ação: não se opera o que não se entende", () => {
    expect(keys("FINISHED")).toEqual([]);
  });

  it("nenhum estado oferece uma transição que o domínio recusaria", () => {
    // O espelho do agregado: activate só de CREATING, pause só de ACTIVE,
    // resume de PAUSED|ARCHIVED, archive de ACTIVE|PAUSED. Se a tela oferecer
    // um botão fora disto, o operador clica e leva INVALID_WORLD_TRANSITION.
    const PERMITIDO: Record<string, readonly LifecycleActionKey[]> = {
      CREATING: ["activate"],
      ACTIVE: ["pause", "archive"],
      PAUSED: ["resume", "archive"],
      ARCHIVED: ["resume"],
    };

    for (const [status, permitido] of Object.entries(PERMITIDO)) {
      for (const key of keys(status)) expect(permitido).toContain(key);
    }
  });

  describe("o command de cada ação é o que a API tem", () => {
    it("mapeia cada ação ao seu commandType", () => {
      const REGISTRY = [
        "world:activate",
        "world:pause",
        "world:resume",
        "world:archive",
      ];

      for (const status of ["CREATING", "ACTIVE", "PAUSED", "ARCHIVED"]) {
        for (const action of lifecycleActions(status)) {
          expect(REGISTRY).toContain(action.commandType);
        }
      }
    });
  });

  describe("proporcionalidade: o atrito acompanha o alcance", () => {
    it("inativar confirma e pede motivo — para o mundo inteiro", () => {
      const archive = lifecycleActions("ACTIVE").find((a) => a.key === "archive");

      expect(archive?.confirm).toBe(true);
      expect(archive?.reason).toBe(true);
    });

    it("congelar pede motivo mas não confirma: reversível na hora", () => {
      const pause = lifecycleActions("ACTIVE").find((a) => a.key === "pause");

      expect(pause?.confirm).toBe(false);
      expect(pause?.reason).toBe(true);
    });

    it("descongelar não pede nada: é o caminho de volta", () => {
      const resume = lifecycleActions("PAUSED").find((a) => a.key === "resume");

      expect(resume?.confirm).toBe(false);
      expect(resume?.reason).toBe(false);
    });
  });
});
