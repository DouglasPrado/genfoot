import { randomUUID } from "node:crypto";

import { Role, type Session } from "./auth.types.js";

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1h

/**
 * Store de sessões da API (tokens opacos). Em memória na fundação (processo
 * único); a evolução persiste/compartilha via Redis + valida credencial contra
 * o contexto de identidade (C1). O guard exige um token válido em toda rota
 * protegida — a propriedade de segurança (sem token → sem acesso; admin exige
 * papel admin) é real.
 */
export class SessionStore {
  private readonly sessions = new Map<string, Session>();

  issue(
    input: Readonly<{
      subject: string;
      role?: Role;
      worldScope?: readonly string[];
      ttlMs?: number;
      nowMs: number;
    }>,
  ): Session {
    const session: Session = {
      token: randomUUID(),
      subject: input.subject,
      role: input.role ?? Role.USER,
      worldScope: input.worldScope ?? [],
      expiresAtMs: input.nowMs + (input.ttlMs ?? DEFAULT_TTL_MS),
    };
    this.sessions.set(session.token, session);
    return session;
  }

  validate(token: string, nowMs: number): Session | undefined {
    const session = this.sessions.get(token);
    if (session === undefined) return undefined;
    if (session.expiresAtMs <= nowMs) {
      this.sessions.delete(token);
      return undefined;
    }
    return session;
  }

  revoke(token: string): void {
    this.sessions.delete(token);
  }
}
