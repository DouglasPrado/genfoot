import { describe, expect, it } from "vitest";

import {
  canSubmitSignup,
  deriveSignupStep,
  mapClerkError,
  validateSignupForm,
  type SignupForm,
} from "./signup-model";

const valid: SignupForm = {
  name: "Douglas",
  email: "douglas@exemplo.com",
  password: "uma-senha-decente-42",
  acceptedTerms: true,
};

describe("validateSignupForm", () => {
  it("aceita um formulário completo", () => {
    expect(validateSignupForm(valid)).toEqual([]);
  });

  it("exige e-mail", () => {
    expect(validateSignupForm({ ...valid, email: "  " })).toEqual([
      { field: "email", messageKey: "E-mail é obrigatório." },
    ]);
  });

  it("recusa e-mail sem formato de e-mail", () => {
    expect(validateSignupForm({ ...valid, email: "douglas" })).toEqual([
      { field: "email", messageKey: "E-mail inválido." },
    ]);
  });

  it("exige senha", () => {
    expect(validateSignupForm({ ...valid, password: "" })).toEqual([
      { field: "password", messageKey: "Senha é obrigatória." },
    ]);
  });

  // A instância exige zxcvbn força 2; barramos o óbvio localmente e deixamos o
  // veredito final com o Clerk (mapClerkError cobre a recusa dele).
  it("recusa senha curta demais antes de ir à rede", () => {
    expect(validateSignupForm({ ...valid, password: "abc" })).toEqual([
      { field: "password", messageKey: "Use ao menos 8 caracteres." },
    ]);
  });

  it("exige o aceite dos termos", () => {
    expect(validateSignupForm({ ...valid, acceptedTerms: false })).toEqual([
      { field: "acceptedTerms", messageKey: "É preciso aceitar os termos." },
    ]);
  });

  it("acumula erros de campos diferentes", () => {
    const errors = validateSignupForm({
      name: "",
      email: "",
      password: "",
      acceptedTerms: false,
    });
    expect(errors.map((e) => e.field)).toEqual([
      "email",
      "password",
      "acceptedTerms",
    ]);
  });

  it("nome é opcional — first_name não é required na instância", () => {
    expect(validateSignupForm({ ...valid, name: "" })).toEqual([]);
  });
});

describe("canSubmitSignup", () => {
  it("libera quando o formulário é válido e nada está em voo", () => {
    expect(canSubmitSignup(valid, "idle")).toBe(true);
  });

  it("bloqueia enquanto uma requisição está em voo", () => {
    expect(canSubmitSignup(valid, "fetching")).toBe(false);
  });

  it("bloqueia formulário inválido", () => {
    expect(canSubmitSignup({ ...valid, acceptedTerms: false }, "idle")).toBe(
      false,
    );
  });
});

describe("deriveSignupStep", () => {
  it("começa no formulário quando não há cadastro em curso", () => {
    expect(deriveSignupStep(null)).toBe("form");
  });

  // Regressão: um signUp novo já nasce `missing_requirements` — significa
  // "falta algo", e no início o que falta é o próprio e-mail. Tratar isso como
  // "verifique seu e-mail" abria a tela no passo do código, com e-mail vazio.
  it("cadastro recém-criado fica no formulário, não no código", () => {
    expect(
      deriveSignupStep({
        status: "missing_requirements",
        unverifiedFields: [],
        emailAddress: null,
      }),
    ).toBe("form");
  });

  // Regressão: a instância exige verificar e-mail, então `email_address` já
  // consta como não-verificado ANTES de existir e-mail. Só `unverifiedFields`
  // abria a tela no código, com "Enviamos um código para ." em branco.
  it("e-mail não-verificado sem e-mail registrado ainda é formulário", () => {
    expect(
      deriveSignupStep({
        status: "missing_requirements",
        unverifiedFields: ["email_address"],
        emailAddress: null,
      }),
    ).toBe("form");
  });

  it("pede o código só quando o e-mail está pendente de verificação", () => {
    expect(
      deriveSignupStep({
        status: "missing_requirements",
        unverifiedFields: ["email_address"],
        emailAddress: "douglas@exemplo.com",
      }),
    ).toBe("verify-email");
  });

  it("finaliza quando o cadastro está completo", () => {
    expect(
      deriveSignupStep({
        status: "complete",
        unverifiedFields: [],
        emailAddress: "douglas@exemplo.com",
      }),
    ).toBe("complete");
  });

  it("completo vence e-mail pendente — não volta a pedir código", () => {
    expect(
      deriveSignupStep({
        status: "complete",
        unverifiedFields: ["email_address"],
        emailAddress: "douglas@exemplo.com",
      }),
    ).toBe("complete");
  });

  it("cadastro abandonado volta ao formulário em vez de travar", () => {
    expect(
      deriveSignupStep({
        status: "abandoned",
        unverifiedFields: ["email_address"],
        emailAddress: "douglas@exemplo.com",
      }),
    ).toBe("form");
  });
});

describe("mapClerkError", () => {
  it("traduz e-mail já usado para o campo certo", () => {
    expect(
      mapClerkError({ code: "form_identifier_exists" }),
    ).toEqual([
      { field: "email", messageKey: "Este e-mail já tem conta. Entre em vez de cadastrar." },
    ]);
  });

  it("traduz senha vazada/fraca para o campo senha", () => {
    expect(
      mapClerkError({ code: "form_password_pwned" }),
    ).toEqual([
      {
        field: "password",
        messageKey: "Esta senha apareceu em vazamentos. Escolha outra.",
      },
    ]);
  });

  it("traduz código de verificação incorreto", () => {
    expect(
      mapClerkError({ code: "form_code_incorrect" }),
    ).toEqual([{ field: "code", messageKey: "Código incorreto." }]);
  });

  it("erro desconhecido vira mensagem de formulário, nunca silêncio", () => {
    const mapped = mapClerkError({ code: "algo_que_nao_conhecemos" });
    expect(mapped).toHaveLength(1);
    expect(mapped[0].field).toBe("form");
    expect(mapped[0].messageKey.length).toBeGreaterThan(0);
  });

  it("sem erro devolve lista vazia", () => {
    expect(mapClerkError(null)).toEqual([]);
    expect(mapClerkError({})).toEqual([]);
  });
});
