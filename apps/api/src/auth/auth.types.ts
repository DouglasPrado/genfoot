export const Role = {
  USER: "user",
  ADMIN: "admin",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export interface Session {
  readonly token: string;
  readonly subject: string;
  readonly role: Role;
  readonly worldScope: readonly string[];
  readonly expiresAtMs: number;
}

/** Anexado ao request pelo AuthGuard após validar o Bearer token. */
export interface AuthenticatedRequest {
  session?: Session;
}
