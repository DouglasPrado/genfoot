/**
 * Lógica pura do M-LOGIN (docs/04-ui-ux/03-mobile-telas-onboarding-e-conta.md).
 * O Clerk autentica (R-171); a tela só valida o óbvio e traduz o veredito.
 */

export interface LoginForm {
  readonly email: string;
  readonly password: string;
}

export interface FieldError {
  readonly field: "email" | "password" | "form";
  readonly messageKey: string;
}

export type LoginStep = "form" | "complete" | "signed-in" | "needs-mfa";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Entrar não valida força de senha: quem julga é o servidor. Impor mínimo aqui
 * recusaria localmente uma senha antiga legítima e mais curta que a regra atual.
 */
export function validateLoginForm(form: LoginForm): readonly FieldError[] {
  const errors: FieldError[] = [];
  const email = form.email.trim();

  if (email === "") {
    errors.push({ field: "email", messageKey: "E-mail é obrigatório." });
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.push({ field: "email", messageKey: "E-mail inválido." });
  }
  if (form.password === "") {
    errors.push({ field: "password", messageKey: "Senha é obrigatória." });
  }
  return errors;
}

export function canSubmitLogin(
  form: LoginForm,
  fetchStatus: "idle" | "fetching",
  online: boolean,
): boolean {
  return (
    online && fetchStatus === "idle" && validateLoginForm(form).length === 0
  );
}

/**
 * Passo da tela. `signedIn` vem depois de `complete` porque o próprio login
 * termina criando sessão — invertido, a tela nunca sairia do estado "já
 * conectado" ao entrar.
 */
export function deriveLoginStep(
  status: string | null,
  signedIn: boolean,
): LoginStep {
  if (status === "complete") return "complete";
  if (signedIn) return "signed-in";
  if (status === "needs_second_factor") return "needs-mfa";
  return "form";
}

interface ClerkErrorShape {
  readonly errors?: readonly {
    readonly code?: string;
    readonly message?: string;
  }[];
}

/**
 * Senha errada e conta inexistente dão a MESMA mensagem, no formulário: separar
 * as duas revelaria quais e-mails têm conta.
 */
const SAME_FOR_BOTH: FieldError = {
  field: "form",
  messageKey: "E-mail ou senha incorretos.",
};

const BY_CODE: Record<string, FieldError> = {
  form_password_incorrect: SAME_FOR_BOTH,
  form_identifier_not_found: SAME_FOR_BOTH,
  user_locked: {
    field: "form",
    messageKey: "Conta bloqueada por tentativas demais. Tente mais tarde.",
  },
  form_param_format_invalid: { field: "email", messageKey: "E-mail inválido." },
};

export function mapLoginError(error: unknown): readonly FieldError[] {
  const shape = error as ClerkErrorShape | null;
  const list = shape?.errors ?? [];
  if (list.length === 0) return [];

  return list.map((item) => {
    const known = item.code === undefined ? undefined : BY_CODE[item.code];
    if (known !== undefined) return known;
    return {
      field: "form" as const,
      messageKey: item.message ?? "Não foi possível entrar agora. Tente de novo.",
    };
  });
}
