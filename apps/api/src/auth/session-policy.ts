/**
 * Quem pode receber um token da API, e mediante que prova.
 *
 * Antes, `/auth/session` emitia Bearer para qualquer `subject` do corpo — a
 * doc do endpoint admitia que a verificação contra C1 "era evolução". Isto
 * fecha esse buraco: sessão de usuário exige token do provedor verificado
 * (R-171), e o `subject` passa a sair do `sub` verificado.
 */
export interface SessionRequestFacts {
  readonly wantsAdmin: boolean;
  readonly adminKeyMatches: boolean;
  readonly clerkToken: string | undefined;
  /**
   * Porta explícita de desenvolvimento (`GRINTA_API_ALLOW_DEV_SESSIONS=1`),
   * para seed e testes. Fechada por padrão: sem ela, confiar no `subject` do
   * corpo é exatamente a falha que estamos consertando.
   */
  readonly devSessionsAllowed: boolean;
}

export type SessionGrant =
  /** Verifique o token do provedor e derive o subject do `sub`. */
  | { readonly kind: "verify-clerk"; readonly token: string }
  /** Aceite o subject do corpo — só admin com chave, ou porta de dev aberta. */
  | { readonly kind: "trust-subject" }
  | {
      readonly kind: "deny";
      readonly reason: "ADMIN_KEY_REQUIRED" | "PROOF_REQUIRED";
    };

export function decideSessionGrant(facts: SessionRequestFacts): SessionGrant {
  // Admin é bootstrap por chave e não passa por provedor: decidido primeiro
  // para que um token de usuário nunca escale para admin.
  if (facts.wantsAdmin) {
    return facts.adminKeyMatches
      ? { kind: "trust-subject" }
      : { kind: "deny", reason: "ADMIN_KEY_REQUIRED" };
  }

  const token = facts.clerkToken?.trim();
  if (token !== undefined && token !== "") {
    return { kind: "verify-clerk", token };
  }

  if (facts.devSessionsAllowed) return { kind: "trust-subject" };

  return { kind: "deny", reason: "PROOF_REQUIRED" };
}
