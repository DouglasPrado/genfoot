import { describe, expect, it } from "vitest";

import {
  canSubmitLogin,
  deriveLoginStep,
  mapLoginError,
  validateLoginForm,
  type LoginForm,
} from "./login-model";

const valid: LoginForm = {
  email: "douglas@exemplo.com",
  password: "uma-senha-qualquer",
};

describe("validateLoginForm", () => {
  it("aceita formulário completo", () => {
    expect(validateLoginForm(valid)).toEqual([]);
  });

  it("exige e-mail", () => {
    expect(validateLoginForm({ ...valid, email: " " })).toEqual([
      { field: "email", messageKey: "E-mail é obrigatório." },
    ]);
  });

  it("recusa e-mail malformado", () => {
    expect(validateLoginForm({ ...valid, email: "douglas" })).toEqual([
      { field: "email", messageKey: "E-mail inválido." },
    ]);
  });

  it("exige senha", () => {
    expect(validateLoginForm({ ...valid, password: "" })).toEqual([
      { field: "password", messageKey: "Senha é obrigatória." },
    ]);
  });

  // Entrar não valida força: quem julga é o servidor. Exigir 8 caracteres aqui
  // recusaria localmente uma senha antiga legítima e mais curta.
  it("não impõe tamanho mínimo ao entrar", () => {
    expect(validateLoginForm({ ...valid, password: "abc" })).toEqual([]);
  });
});

describe("canSubmitLogin", () => {
  it("libera com formulário válido, online e ocioso", () => {
    expect(canSubmitLogin(valid, "idle", true)).toBe(true);
  });

  it("bloqueia em voo", () => {
    expect(canSubmitLogin(valid, "fetching", true)).toBe(false);
  });

  it("bloqueia offline — o doc manda desabilitar com aviso", () => {
    expect(canSubmitLogin(valid, "idle", false)).toBe(false);
  });

  it("bloqueia formulário inválido", () => {
    expect(canSubmitLogin({ ...valid, password: "" }, "idle", true)).toBe(false);
  });
});

describe("deriveLoginStep", () => {
  it("começa no formulário", () => {
    expect(deriveLoginStep(null)).toBe("form");
  });

  it("conclui quando o sign-in completa", () => {
    expect(deriveLoginStep("complete")).toBe("complete");
  });

  // needs_first_factor é o estado normal após create(); não é erro nem 2FA.
  it("primeiro fator pendente ainda é formulário", () => {
    expect(deriveLoginStep("needs_first_factor")).toBe("form");
  });

  it("segundo fator pede MFA em vez de fingir sucesso", () => {
    expect(deriveLoginStep("needs_second_factor")).toBe("needs-mfa");
  });
});

describe("mapLoginError", () => {
  it("credencial errada não diz qual campo falhou", () => {
    // Não revelamos se o e-mail existe: senha errada e conta inexistente dão a
    // mesma mensagem, no formulário.
    expect(
      mapLoginError({ code: "form_password_incorrect" }),
    ).toEqual([{ field: "form", messageKey: "E-mail ou senha incorretos." }]);
  });

  it("identificador inexistente dá a MESMA mensagem que senha errada", () => {
    expect(
      mapLoginError({ code: "form_identifier_not_found" }),
    ).toEqual([{ field: "form", messageKey: "E-mail ou senha incorretos." }]);
  });

  it("conta bloqueada é dita com clareza", () => {
    const mapped = mapLoginError({ code: "user_locked" });
    expect(mapped[0].field).toBe("form");
    expect(mapped[0].messageKey).toMatch(/bloquead/i);
  });

  it("erro desconhecido não some", () => {
    const mapped = mapLoginError({ code: "novidade" });
    expect(mapped).toHaveLength(1);
    expect(mapped[0].messageKey.length).toBeGreaterThan(0);
  });

  it("sem erro devolve vazio", () => {
    expect(mapLoginError(null)).toEqual([]);
  });
});
