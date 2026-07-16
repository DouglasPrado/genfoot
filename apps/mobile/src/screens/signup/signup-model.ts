/**
 * Lógica pura do M-SIGNUP (docs/04-ui-ux/03-mobile-telas-onboarding-e-conta.md).
 * O Clerk é a autoridade da credencial (R-171): validamos localmente só o que
 * evita ida à rede à toa; o veredito final (força, vazamento, e-mail em uso) é
 * dele e chega por `mapClerkError`. O cliente nunca simula sucesso.
 */

export interface SignupForm {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly acceptedTerms: boolean;
}

/** `field` casa com o input da tela; "form" é erro sem campo próprio. */
export interface FieldError {
  readonly field: "name" | "email" | "password" | "acceptedTerms" | "code" | "form";
  readonly messageKey: string;
}

export type SignupStep = "form" | "verify-email" | "complete";

/** Mínimo local. A instância exige zxcvbn ≥ 2 — quem julga isso é o Clerk. */
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignupForm(form: SignupForm): readonly FieldError[] {
  const errors: FieldError[] = [];

  const email = form.email.trim();
  if (email === "") {
    errors.push({ field: "email", messageKey: "E-mail é obrigatório." });
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.push({ field: "email", messageKey: "E-mail inválido." });
  }

  if (form.password === "") {
    errors.push({ field: "password", messageKey: "Senha é obrigatória." });
  } else if (form.password.length < MIN_PASSWORD_LENGTH) {
    errors.push({
      field: "password",
      messageKey: `Use ao menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    });
  }

  if (!form.acceptedTerms) {
    errors.push({
      field: "acceptedTerms",
      messageKey: "É preciso aceitar os termos.",
    });
  }

  return errors;
}

export function canSubmitSignup(
  form: SignupForm,
  fetchStatus: "idle" | "fetching",
): boolean {
  return fetchStatus === "idle" && validateSignupForm(form).length === 0;
}

export interface SignupProgress {
  /** `SignUpStatus`: 'missing_requirements' | 'complete' | 'abandoned'. */
  readonly status: string;
  readonly unverifiedFields: readonly string[];
  /** E-mail já registrado no cadastro; null antes de submeter. */
  readonly emailAddress: string | null;
}

/**
 * Passo da tela a partir do SignUp do Clerk. Nem `status` nem
 * `unverifiedFields` servem sozinhos: todo cadastro nasce
 * `missing_requirements`, e a instância exige verificar e-mail, então
 * `email_address` já aparece como não-verificado antes de existir e-mail.
 * Só é hora do código quando falta verificar **e** já há e-mail registrado.
 */
export function deriveSignupStep(progress: SignupProgress | null): SignupStep {
  if (progress === null) return "form";
  if (progress.status === "complete") return "complete";
  if (
    progress.status === "missing_requirements" &&
    progress.emailAddress !== null &&
    progress.unverifiedFields.includes("email_address")
  ) {
    return "verify-email";
  }
  return "form";
}

interface ClerkErrorShape {
  readonly errors?: readonly {
    readonly code?: string;
    readonly message?: string;
    readonly meta?: { readonly paramName?: string };
  }[];
}

const BY_CODE: Record<string, FieldError> = {
  form_identifier_exists: {
    field: "email",
    messageKey: "Este e-mail já tem conta. Entre em vez de cadastrar.",
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
  form_code_incorrect: { field: "code", messageKey: "Código incorreto." },
  verification_expired: {
    field: "code",
    messageKey: "O código expirou. Peça outro.",
  },
  form_param_format_invalid: {
    field: "email",
    messageKey: "E-mail inválido.",
  },
};

/**
 * Traduz o erro do Clerk em erros de campo. Código desconhecido nunca some em
 * silêncio: vira erro de formulário com a mensagem do provedor.
 */
export function mapClerkError(error: unknown): readonly FieldError[] {
  const shape = error as ClerkErrorShape | null;
  const list = shape?.errors ?? [];
  if (list.length === 0) return [];

  return list.map((item) => {
    const known = item.code === undefined ? undefined : BY_CODE[item.code];
    if (known !== undefined) return known;
    return {
      field: "form" as const,
      messageKey:
        item.message ?? "Não foi possível concluir o cadastro. Tente de novo.",
    };
  });
}
