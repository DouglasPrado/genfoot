import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import { ApiException } from "../common/standard-error.js";
import { SESSION_STORE } from "../core/tokens.js";
import type { AuthenticatedRequest } from "./auth.types.js";
import { PUBLIC_KEY } from "./public.decorator.js";
import { SessionStore } from "./session-store.js";

function unauthorized(messageKey: string): ApiException {
  return new ApiException(
    {
      code: "UNAUTHENTICATED",
      messageKey,
      correlationId: "unknown",
      retryable: false,
      fieldErrors: [],
      blockingReason: "UNAUTHENTICATED",
      recoveryAction: "AUTHENTICATE",
    },
    HttpStatus.UNAUTHORIZED,
  );
}

/**
 * Guard global: toda rota exige um Bearer token válido, exceto as marcadas
 * com @Public (health, auth, docs). A sessão validada é anexada ao request.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SESSION_STORE) private readonly store: SessionStore,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & AuthenticatedRequest>();
    const header = request.header("authorization");
    const token =
      typeof header === "string" && header.startsWith("Bearer ")
        ? header.slice("Bearer ".length)
        : undefined;
    if (token === undefined || token.length === 0) {
      // Conveniência DEV/TEST explícita (default OFF): sessão admin anônima.
      // NUNCA habilitar em produção.
      if (process.env.GRINTA_API_ALLOW_ANONYMOUS === "1") {
        request.session = {
          token: "anonymous",
          subject: "anonymous",
          // Sessão anônima é ADMIN e não tem conta de jogo — igual à admin de
          // verdade. Dar-lhe uma poria um jogador fantasma no mundo.
          accountId: null,
          role: "admin",
          worldScope: [],
          expiresAtMs: Number.MAX_SAFE_INTEGER,
        };
        return true;
      }
      throw unauthorized("error.auth.missingToken");
    }
    const session = this.store.validate(token, Date.now());
    if (session === undefined) {
      throw unauthorized("error.auth.invalidToken");
    }
    request.session = session;
    return true;
  }
}
