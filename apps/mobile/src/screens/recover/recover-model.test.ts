import { describe, expect, it } from "vitest";

import {
  deriveRecoverStep,
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

describe("validateNewPassword", () => {
  it("aceita código e senha novos", () => {
    expect(validateNewPassword("123456", "uma-senha-nova-42")).toEqual([]);
  });

  it("exige o código", () => {
    expect(validateNewPassword("", "uma-senha-nova-42")).toEqual([
      { field: "code", messageKey: "Código é obrigatório." },
    ]);
  });

  it("exige a senha nova", () => {
    expect(validateNewPassword("123456", "")).toEqual([
      { field: "password", messageKey: "Senha é obrigatória." },
    ]);
  });

  it("recusa senha curta antes de ir à rede", () => {
    expect(validateNewPassword("123456", "abc")).toEqual([
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
      isIdentifierNotFound({ errors: [{ code: "form_identifier_not_found" }] }),
    ).toBe(true);
  });

  it("não confunde com outros erros", () => {
    expect(
      isIdentifierNotFound({ errors: [{ code: "form_code_incorrect" }] }),
    ).toBe(false);
    expect(isIdentifierNotFound(null)).toBe(false);
  });
});

describe("deriveRecoverStep", () => {
  it("começa pedindo o e-mail", () => {
    expect(deriveRecoverStep(null, false)).toBe("request");
  });

  // Regressão: com sessão do Clerk ativa, signIn.create() falha com
  // "Session already exists" e o erro cru vazava para a tela. Recuperação é
  // fluxo de quem está fora (o doc alcança M-RECOVER por M-LOGIN).
  it("com sessão ativa a tela não tenta recuperar — pede sair antes", () => {
    expect(deriveRecoverStep(null, false, true)).toBe("signed-in");
  });

  it("sessão ativa vence até o envio já feito", () => {
    expect(deriveRecoverStep(null, true, true)).toBe("signed-in");
  });

  it("mas não atrapalha a conclusão do próprio reset", () => {
    // Ao redefinir, o finalize cria sessão: `complete` tem de vencer.
    expect(deriveRecoverStep("complete", true, true)).toBe("complete");
  });

  it("vai ao código assim que o envio é confirmado, mesmo sem sign-in", () => {
    // E-mail inexistente não cria sign-in; ainda assim seguimos ao passo do
    // código, senão a tela revelaria que a conta não existe.
    expect(deriveRecoverStep(null, true)).toBe("reset");
  });

  it("pede a senha nova quando o código foi aceito", () => {
    expect(deriveRecoverStep("needs_new_password", true)).toBe("reset");
  });

  it("conclui quando o sign-in completa", () => {
    expect(deriveRecoverStep("complete", true)).toBe("complete");
  });

  it("completo vence o envio pendente", () => {
    expect(deriveRecoverStep("complete", false)).toBe("complete");
  });
});

describe("mapRecoverError", () => {
  it("traduz código incorreto", () => {
    expect(
      mapRecoverError({ errors: [{ code: "form_code_incorrect" }] }),
    ).toEqual([{ field: "code", messageKey: "Código incorreto." }]);
  });

  it("traduz senha vazada", () => {
    expect(
      mapRecoverError({ errors: [{ code: "form_password_pwned" }] }),
    ).toEqual([
      {
        field: "password",
        messageKey: "Esta senha apareceu em vazamentos. Escolha outra.",
      },
    ]);
  });

  it("nunca vaza identificador inexistente como erro de campo", () => {
    expect(
      mapRecoverError({ errors: [{ code: "form_identifier_not_found" }] }),
    ).toEqual([]);
  });

  it("erro desconhecido vira mensagem genérica, sem silêncio", () => {
    const mapped = mapRecoverError({ errors: [{ code: "coisa_nova" }] });
    expect(mapped).toHaveLength(1);
    expect(mapped[0].field).toBe("form");
    expect(mapped[0].messageKey.length).toBeGreaterThan(0);
  });

  it("sem erro devolve vazio", () => {
    expect(mapRecoverError(null)).toEqual([]);
  });
});
