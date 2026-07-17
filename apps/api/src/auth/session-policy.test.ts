import { describe, expect, it } from "vitest";

import { decideSessionGrant } from "./session-policy.js";

const base = {
  wantsAdmin: false,
  adminKeyMatches: false,
  clerkToken: undefined as string | undefined,
  devSessionsAllowed: false,
};

describe("decideSessionGrant", () => {
  // O buraco que isto fecha: /auth/session emitia Bearer para qualquer
  // `subject` do corpo, sem prova nenhuma. Autenticar no Clerk não era
  // autenticar no jogo, e quem falasse direto com a API passava por cima.
  it("recusa sessão de usuário sem prova alguma", () => {
    expect(decideSessionGrant(base)).toEqual({
      kind: "deny",
      reason: "PROOF_REQUIRED",
    });
  });

  it("aceita sessão de usuário com token do provedor", () => {
    expect(decideSessionGrant({ ...base, clerkToken: "tok" })).toEqual({
      kind: "verify-clerk",
      token: "tok",
    });
  });

  it("token do provedor vence o modo de desenvolvimento", () => {
    expect(
      decideSessionGrant({
        ...base,
        clerkToken: "tok",
        devSessionsAllowed: true,
      }),
    ).toEqual({ kind: "verify-clerk", token: "tok" });
  });

  // A porta de desenvolvimento existe para seed e testes, e é explícita: fora
  // dela, o padrão é recusar.
  it("permite sessão de desenvolvimento só com a porta aberta", () => {
    expect(
      decideSessionGrant({ ...base, devSessionsAllowed: true }),
    ).toEqual({ kind: "trust-subject" });
  });

  describe("admin", () => {
    it("recusa admin sem a chave", () => {
      expect(decideSessionGrant({ ...base, wantsAdmin: true })).toEqual({
        kind: "deny",
        reason: "ADMIN_KEY_REQUIRED",
      });
    });

    it("aceita admin com a chave de bootstrap", () => {
      expect(
        decideSessionGrant({
          ...base,
          wantsAdmin: true,
          adminKeyMatches: true,
        }),
      ).toEqual({ kind: "trust-subject" });
    });

    it("chave errada não vira sessão de usuário por engano", () => {
      expect(
        decideSessionGrant({
          ...base,
          wantsAdmin: true,
          adminKeyMatches: false,
          devSessionsAllowed: true,
        }),
      ).toEqual({ kind: "deny", reason: "ADMIN_KEY_REQUIRED" });
    });

    // R-131 exige MFA para admin; enquanto o bootstrap por chave existir, ele
    // não passa por Clerk nenhum e não deve ser confundido com login real.
    it("token do provedor não concede admin sozinho", () => {
      expect(
        decideSessionGrant({
          ...base,
          wantsAdmin: true,
          clerkToken: "tok",
        }),
      ).toEqual({ kind: "deny", reason: "ADMIN_KEY_REQUIRED" });
    });
  });
});
