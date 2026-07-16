import { describe, expect, it } from "vitest";

import {
  connectionLabel,
  deriveSplashDecision,
  isContractCompatible,
  contractMajor,
} from "./splash-model";

describe("contractMajor", () => {
  it("extrai o major de uma versão de contrato", () => {
    expect(contractMajor("v1")).toBe(1);
    expect(contractMajor("v2")).toBe(2);
    expect(contractMajor("v10")).toBe(10);
  });

  it("devolve null para versão irreconhecível", () => {
    expect(contractMajor("")).toBeNull();
    expect(contractMajor("beta")).toBeNull();
    expect(contractMajor("1")).toBeNull();
  });
});

describe("isContractCompatible", () => {
  it("aceita major igual", () => {
    expect(isContractCompatible("v1", "v1")).toBe(true);
  });

  it("recusa major diferente — BREAKING", () => {
    expect(isContractCompatible("v1", "v2")).toBe(false);
    expect(isContractCompatible("v2", "v1")).toBe(false);
  });

  it("recusa quando não dá para reconhecer a versão (falha fechado)", () => {
    expect(isContractCompatible("v1", "beta")).toBe(false);
    expect(isContractCompatible("nada", "v1")).toBe(false);
  });
});

describe("deriveSplashDecision", () => {
  const base = {
    status: "online" as const,
    serverContractVersion: "v1",
    clientContractVersion: "v1",
    hasActiveControl: true as boolean | null,
  };

  it("carrega enquanto a sessão está conectando", () => {
    expect(deriveSplashDecision({ ...base, status: "connecting" })).toEqual({
      kind: "loading",
    });
  });

  it("mostra erro de rede quando a sessão não abriu", () => {
    expect(deriveSplashDecision({ ...base, status: "offline" })).toEqual({
      kind: "network-error",
    });
  });

  it("carrega enquanto o /health ainda não respondeu a versão", () => {
    expect(
      deriveSplashDecision({ ...base, serverContractVersion: null }),
    ).toEqual({ kind: "loading" });
  });

  it("bloqueia com upgrade-required quando o contrato é BREAKING", () => {
    expect(
      deriveSplashDecision({ ...base, serverContractVersion: "v2" }),
    ).toEqual({ kind: "upgrade-required", client: "v1", server: "v2" });
  });

  it("bloqueio de contrato vence o roteamento — não entra no app incompatível", () => {
    const decision = deriveSplashDecision({
      ...base,
      serverContractVersion: "v2",
      hasActiveControl: true,
    });
    expect(decision.kind).toBe("upgrade-required");
  });

  it("carrega enquanto a identidade ainda não resolveu", () => {
    expect(deriveSplashDecision({ ...base, hasActiveControl: null })).toEqual({
      kind: "loading",
    });
  });

  it("roteia para o onboarding quando não há clube ativo", () => {
    expect(deriveSplashDecision({ ...base, hasActiveControl: false })).toEqual({
      kind: "route",
      to: "/onboarding",
    });
  });

  it("roteia para a home quando há clube ativo", () => {
    expect(deriveSplashDecision({ ...base, hasActiveControl: true })).toEqual({
      kind: "route",
      to: "/inicio",
    });
  });

  it("erro de rede vence a identidade pendente — não roteia às cegas", () => {
    expect(
      deriveSplashDecision({
        ...base,
        status: "offline",
        hasActiveControl: null,
      }),
    ).toEqual({ kind: "network-error" });
  });

  it("mostra erro de rede quando a identidade falhou, mesmo com sessão online", () => {
    expect(
      deriveSplashDecision({
        ...base,
        identityFailed: true,
        hasActiveControl: null,
      }),
    ).toEqual({ kind: "network-error" });
  });

  it("nunca roteia com contrato incompatível, mesmo com clube ativo", () => {
    const decision = deriveSplashDecision({
      ...base,
      serverContractVersion: "v3",
      hasActiveControl: true,
    });
    expect(decision.kind).not.toBe("route");
  });

  it("upgrade-required vence a falha de identidade — a causa provável é o contrato", () => {
    expect(
      deriveSplashDecision({
        ...base,
        serverContractVersion: "v2",
        identityFailed: true,
      }),
    ).toEqual({ kind: "upgrade-required", client: "v1", server: "v2" });
  });
});

describe("connectionLabel", () => {
  it("mostra CONECTANDO enquanto a sessão abre", () => {
    expect(connectionLabel("connecting", { kind: "loading" })).toBe(
      "CONECTANDO",
    );
  });

  it("mostra CONECTADO quando a sessão está online e nada falhou", () => {
    expect(connectionLabel("online", { kind: "route", to: "/inicio" })).toBe(
      "CONECTADO",
    );
  });

  it("mostra SEM CONEXÃO quando a sessão está offline", () => {
    expect(connectionLabel("offline", { kind: "network-error" })).toBe(
      "SEM CONEXÃO",
    );
  });

  // Regressão: a sessão abriu e a rede caiu depois. O rodapé dizia CONECTADO
  // enquanto o painel dizia SEM CONEXÃO — a tela se contradizia.
  it("mostra SEM CONEXÃO quando a rede caiu com a sessão já aberta", () => {
    expect(connectionLabel("online", { kind: "network-error" })).toBe(
      "SEM CONEXÃO",
    );
  });
});
