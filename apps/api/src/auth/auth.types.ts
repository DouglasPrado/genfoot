export const Role = {
  USER: "user",
  ADMIN: "admin",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export interface Session {
  readonly token: string;
  readonly subject: string;
  /**
   * A conta do JOGO (R-172), resolvida no `/auth/session` a partir do subject
   * verificado. `null` em sessão admin, que não tem conta de jogo.
   *
   * Fica NA SESSÃO, e não vem do cliente: uma query que responde "qual a MINHA
   * participação" tem de saber quem é "eu" pelo token. Aceitar `accountId` por
   * parâmetro deixaria qualquer um ler a situação de qualquer outro.
   */
  readonly accountId: string | null;
  readonly role: Role;
  readonly worldScope: readonly string[];
  readonly expiresAtMs: number;
}

/** Anexado ao request pelo AuthGuard após validar o Bearer token. */
export interface AuthenticatedRequest {
  session?: Session;
}
