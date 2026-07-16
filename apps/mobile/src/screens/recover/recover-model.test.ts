import { describe, expect, it } from "vitest";

import {
  deriveRecoverStep,
  validateCode,
  isIdentifierNotFound,
  mapRecoverError,
  validateNewPassword,
  validateRecoverEmail,
} from "./recover-model";

describe("validateRecoverEmail", () => {
  it("aceita e-mail válido", () => {
    expect(validateRecoverEmail("douglas@exemplo.com")).toEqual([]);
  });

  it("exige e-mail", () => {
    expect(validateRecoverEmail("   ")).toEqual([
      { field: "email", messageKey: "E-mail é obrigatório." },
    ]);
  });

  it("recusa formato inválido", () => {
    expect(validateRecoverEmail("douglas")).toEqual([
      { field: "email", messageKey: "E-mail inválido." },
    ]);
  });
});

describe("validateCode", () => {
  it("aceita código preenchido", () => {
    expect(validateCode("123456")).toEqual([]);
  });

  it("exige o código", () => {
    expect(validateCode(" ")).toEqual([
      { field: "code", messageKey: "Código é obrigatório." },
    ]);
  });
});

describe("validateNewPassword", () => {
  it("aceita senha nova", () => {
    expect(validateNewPassword("uma-senha-nova-42")).toEqual([]);
  });

  it("exige a senha nova", () => {
    expect(validateNewPassword("")).toEqual([
      { field: "password", messageKey: "Senha é obrigatória." },
    ]);
  });

  it("recusa senha curta antes de ir à rede", () => {
    expect(validateNewPassword("abc")).toEqual([
      { field: "password", messageKey: "Use ao menos 8 caracteres." },
    ]);
  });
});

describe("isIdentifierNotFound", () => {
  // Privacidade (doc M-RECOVER): a confirmação é neutra e não revela se o
  // e-mail tem conta. Este erro é engolido de propósito — mostrá-lo
  // transformaria a tela num oráculo de quais e-mails existem.
  it("reconhece o erro de identificador inexistente", () => {
    expect(
      isIdentifierNotFound({ code: "form_identifier_not_found" }),
    ).toBe(true);
  });

  it("não confunde com outros erros", () => {
    expect(
      isIdentifierNotFound({ code: "form_code_incorrect" }),
    ).toBe(false);
    expect(isIdentifierNotFound(null)).toBe(false);
  });
});

describe("deriveRecoverStep", () => {
  it("começa pedindo o e-mail", () => {
    expect(deriveRecoverStep(null, false)).toBe("request");
  });

  it("pede o código depois do envio", () => {
    expect(deriveRecoverStep("needs_first_factor", true)).toBe("code");
  });

  // Regressão: verificar e definir senha eram o MESMO passo, então o botão
  // chamava verifyCode de novo sobre um código já verificado. O Clerk devolve
  // "not sent" (não há verificação pendente) e a tela acusava falha depois de
  // ter dado certo.
  it("depois do código aceito, pede só a senha nova", () => {
    expect(deriveRecoverStep("needs_new_password", true)).toBe("new-password");
  });

  it("senha nova pendente vence o envio: nunca volta a pedir código", () => {
    expect(deriveRecoverStep("needs_new_password", false)).toBe("new-password");
  });

  it("conclui quando o sign-in completa", () => {
    expect(deriveRecoverStep("complete", true)).toBe("complete");
  });

  it("completo vence o envio pendente", () => {
    expect(deriveRecoverStep("complete", false)).toBe("complete");
  });

  // E-mail inexistente não cria sign-in; ainda assim vamos ao passo do código
  // para não denunciar a ausência da conta.
  it("sem sign-in mas com envio confirmado, segue ao código", () => {
    expect(deriveRecoverStep(null, true)).toBe("code");
  });
});

describe("mapRecoverError", () => {
  it("traduz código incorreto", () => {
    expect(
      mapRecoverError({ code: "form_code_incorrect" }),
    ).toEqual([{ field: "code", messageKey: "Código incorreto." }]);
  });

  it("traduz senha vazada", () => {
    expect(
      mapRecoverError({ code: "form_password_pwned" }),
    ).toEqual([
      {
        field: "password",
        messageKey: "Esta senha apareceu em vazamentos. Escolha outra.",
      },
    ]);
  });

  it("nunca vaza identificador inexistente como erro de campo", () => {
    expect(
      mapRecoverError({ code: "form_identifier_not_found" }),
    ).toEqual([]);
  });

  it("erro desconhecido vira mensagem genérica, sem silêncio", () => {
    const mapped = mapRecoverError({ code: "coisa_nova" });
    expect(mapped).toHaveLength(1);
    expect(mapped[0].field).toBe("form");
    expect(mapped[0].messageKey.length).toBeGreaterThan(0);
  });

  it("sem erro devolve vazio", () => {
    expect(mapRecoverError(null)).toEqual([]);
  });

  // Regressão: o ClerkError da API Signal é uma CLASSE que estende Error, com
  // code/message/longMessage diretos. Eu havia assumido `{ errors: [...] }` —
  // o formato legado — e por isso TODO erro do Clerk virava silêncio na tela.
  it("entende o erro como instância de Error, não só objeto literal", () => {
    class FakeClerkError extends Error {
      readonly code = "form_code_incorrect";
      readonly longMessage = "O código está incorreto.";
    }
    expect(mapRecoverError(new FakeClerkError("dev-facing text"))).toEqual([
      { field: "code", messageKey: "Código incorreto." },
    ]);
  });

  // `message` é texto para desenvolvedor e não deve ir para a tela (doc do
  // tipo); o campo humano é `longMessage`.
  it("erro desconhecido usa longMessage, nunca a mensagem de desenvolvedor", () => {
    const mapped = mapRecoverError({
      code: "coisa_nova",
      message: "internal: reset factor not prepared",
      longMessage: "Não foi possível enviar o código agora.",
    });
    expect(mapped).toEqual([
      { field: "form", messageKey: "Não foi possível enviar o código agora." },
    ]);
  });

  it("sem longMessage cai na nossa frase, não na do desenvolvedor", () => {
    const mapped = mapRecoverError({ code: "x", message: "not sent" });
    expect(mapped[0].messageKey).not.toBe("not sent");
    expect(mapped[0].messageKey).toMatch(/redefinir/i);
  });
});
