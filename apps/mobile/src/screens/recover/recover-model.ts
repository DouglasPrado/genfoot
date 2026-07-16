/**
 * Lógica pura do M-RECOVER (docs/04-ui-ux/03-mobile-telas-onboarding-e-conta.md).
 * O Clerk envia o código e detém a credencial (R-171).
 *
 * Regra de privacidade do doc: "confirma envio (mensagem neutra, sem revelar se
 * o e-mail existe)". Por isso o erro de identificador inexistente é engolido de
 * propósito e a tela segue igual — quem tem conta recebe o código, quem não tem
 * vê a mesma confirmação. Mostrar esse erro faria da tela um oráculo de quais
 * e-mails estão cadastrados.
 */

export interface FieldError {
  readonly field: "email" | "code" | "password" | "form";
  readonly messageKey: string;
}

export type RecoverStep = "request" | "reset" | "complete" | "signed-in";

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRecoverEmail(email: string): readonly FieldError[] {
  const value = email.trim();
  if (value === "") {
    return [{ field: "email", messageKey: "E-mail é obrigatório." }];
  }
  if (!EMAIL_PATTERN.test(value)) {
    return [{ field: "email", messageKey: "E-mail inválido." }];
  }
  return [];
}

export function validateNewPassword(
  code: string,
  password: string,
): readonly FieldError[] {
  const errors: FieldError[] = [];
  if (code.trim() === "") {
    errors.push({ field: "code", messageKey: "Código é obrigatório." });
  }
  if (password === "") {
    errors.push({ field: "password", messageKey: "Senha é obrigatória." });
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push({
      field: "password",
      messageKey: `Use ao menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    });
  }
  return errors;
}

interface ClerkErrorShape {
  readonly errors?: readonly {
    readonly code?: string;
    readonly message?: string;
  }[];
}

const IDENTIFIER_NOT_FOUND = "form_identifier_not_found";

/** O e-mail não tem conta. Nunca vira mensagem visível (ver nota do módulo). */
export function isIdentifierNotFound(error: unknown): boolean {
  const shape = error as ClerkErrorShape | null;
  return (shape?.errors ?? []).some(({ code }) => code === IDENTIFIER_NOT_FOUND);
}

/**
 * Passo da tela. `sent` é nosso, não do Clerk: com e-mail inexistente não há
 * sign-in nenhum, e mesmo assim precisamos seguir para o passo do código para
 * não denunciar a ausência da conta.
 *
 * `signedIn` guarda a entrada: recuperar senha é fluxo de quem está fora, e o
 * Clerk recusa `signIn.create()` com sessão ativa ("Session already exists").
 * Vem depois de `complete` porque o próprio reset termina criando sessão.
 */
export function deriveRecoverStep(
  status: string | null,
  sent: boolean,
  signedIn = false,
): RecoverStep {
  if (status === "complete") return "complete";
  if (signedIn) return "signed-in";
  if (sent || status === "needs_new_password") return "reset";
  return "request";
}

const BY_CODE: Record<string, FieldError> = {
  form_code_incorrect: { field: "code", messageKey: "Código incorreto." },
  verification_expired: {
    field: "code",
    messageKey: "O código expirou. Peça outro.",
  },
  form_password_pwned: {
    field: "password",
    messageKey: "Esta senha apareceu em vazamentos. Escolha outra.",
  },
  form_password_length_too_short: {
    field: "password",
    messageKey: "Senha curta demais.",
  },
  form_password_not_strong_enough: {
    field: "password",
    messageKey: "Senha fraca demais. Misture palavras e símbolos.",
  },
  form_param_format_invalid: { field: "email", messageKey: "E-mail inválido." },
};

export function mapRecoverError(error: unknown): readonly FieldError[] {
  const shape = error as ClerkErrorShape | null;
  const list = shape?.errors ?? [];
  if (list.length === 0) return [];

  return list
    // Silencioso por desenho, não por descuido: ver nota do módulo.
    .filter(({ code }) => code !== IDENTIFIER_NOT_FOUND)
    .map((item) => {
      const known = item.code === undefined ? undefined : BY_CODE[item.code];
      if (known !== undefined) return known;
      return {
        field: "form" as const,
        messageKey:
          item.message ?? "Não foi possível redefinir agora. Tente de novo.",
      };
    });
}
