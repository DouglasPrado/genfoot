import { describe, expect, it } from "vitest";

import { bootProgress, bootSteps, type BootInput } from "./boot-model";

const nothing: BootInput = {
  status: "connecting",
  serverContractVersion: null,
  clientContractVersion: "v1",
  accountLoaded: false,
  signedIn: false,
  identityResolved: false,
};

const everything: BootInput = {
  status: "online",
  serverContractVersion: "v1",
  clientContractVersion: "v1",
  accountLoaded: true,
  signedIn: true,
  identityResolved: true,
};

describe("bootSteps", () => {
  it("descreve as quatro etapas reais do boot, em ordem", () => {
    expect(bootSteps(nothing).map((s) => s.key)).toEqual([
      "server",
      "contract",
      "account",
      "world",
    ]);
  });

  it("nada pronto: nenhuma etapa concluída", () => {
    expect(bootSteps(nothing).every((s) => !s.done)).toBe(true);
  });

  it("tudo pronto: todas concluídas", () => {
    expect(bootSteps(everything).every((s) => s.done)).toBe(true);
  });

  it("servidor conclui quando a sessão abre", () => {
    const steps = bootSteps({ ...nothing, status: "online" });
    expect(steps[0].done).toBe(true);
    expect(steps[1].done).toBe(false);
  });

  it("contrato só conclui se for compatível", () => {
    const compat = bootSteps({
      ...nothing,
      status: "online",
      serverContractVersion: "v1",
    });
    expect(compat[1].done).toBe(true);

    // BREAKING não é progresso: a etapa não pode passar.
    const breaking = bootSteps({
      ...nothing,
      status: "online",
      serverContractVersion: "v2",
    });
    expect(breaking[1].done).toBe(false);
  });

  it("conta conclui só com o Clerk carregado E sessão", () => {
    expect(
      bootSteps({ ...everything, accountLoaded: true, signedIn: false })[2].done,
    ).toBe(false);
    expect(
      bootSteps({ ...everything, accountLoaded: false, signedIn: true })[2].done,
    ).toBe(false);
  });

  it("mundo conclui quando a identidade resolve", () => {
    expect(bootSteps({ ...everything, identityResolved: false })[3].done).toBe(
      false,
    );
  });

  it("cada etapa tem rótulo legível", () => {
    for (const step of bootSteps(nothing)) {
      expect(step.label.length).toBeGreaterThan(0);
    }
  });
});

describe("bootProgress", () => {
  // A barra mede trabalho concluído, não tempo decorrido: nada de animação
  // fingindo avanço enquanto o app não sabe de nada.
  it("é 0 quando nada terminou", () => {
    expect(bootProgress(bootSteps(nothing))).toBe(0);
  });

  it("é 1 quando tudo terminou", () => {
    expect(bootProgress(bootSteps(everything))).toBe(1);
  });

  it("é a fração das etapas concluídas", () => {
    const steps = bootSteps({
      ...nothing,
      status: "online",
      serverContractVersion: "v1",
    });
    expect(bootProgress(steps)).toBe(0.5);
  });

  it("não avança com contrato incompatível", () => {
    const steps = bootSteps({
      ...everything,
      serverContractVersion: "v2",
    });
    // Servidor e conta passam; contrato e mundo não podem.
    expect(bootProgress(steps)).toBeLessThan(1);
  });
});
