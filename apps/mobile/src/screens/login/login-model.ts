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

export type LoginStep = "form" | "complete" | "needs-mfa";

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
 * Passo da tela. Quem já tem sessão nem chega aqui: o guard de
 * `(auth)/_layout` redireciona antes de renderizar.
 */
export function deriveLoginStep(status: string | null): LoginStep {
  if (status === "complete") return "complete";
  if (status === "needs_second_factor") return "needs-mfa";
  return "form";
}

/**
 * Erro da API Signal do Clerk. É uma CLASSE que estende Error, com `code`,
 * `message` e `longMessage` diretos — não `{ errors: [...] }`, que é o formato
 * legado. `message` é texto para desenvolvedor e não deve ir para a tela; o
 * campo humano é `longMessage` (doc do próprio tipo).
 */
interface ClerkErrorShape {
  readonly code?: string;
  readonly message?: string;
  readonly longMessage?: string;
}

/** Aceita o erro solto ou uma lista, e nunca confia em `.errors`. */
function asClerkErrors(error: unknown): readonly ClerkErrorShape[] {
  if (error === null || error === undefined) return [];
  if (Array.isArray(error)) return error as ClerkErrorShape[];
  const shape = error as ClerkErrorShape & {
    readonly errors?: readonly ClerkErrorShape[];
  };
  // Tolera o formato legado se algum caminho ainda o produzir.
  if (Array.isArray(shape.errors)) return shape.errors;
  if (shape.code !== undefined || shape.longMessage !== undefined) return [shape];
  return [];
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
  const list = asClerkErrors(error);
  if (list.length === 0) return [];

  return list.map((item) => {
    const known = item.code === undefined ? undefined : BY_CODE[item.code];
    if (known !== undefined) return known;
    return {
      field: "form" as const,
      messageKey: item.longMessage ?? "Não foi possível entrar agora. Tente de novo.",
    };
  });
}
