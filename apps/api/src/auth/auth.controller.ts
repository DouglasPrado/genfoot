import { Body, Controller, HttpStatus, Inject, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { ApiException } from "../common/standard-error.js";
import { SESSION_STORE } from "../core/tokens.js";
import { Role } from "./auth.types.js";
import { Public } from "./public.decorator.js";
import { SessionStore } from "./session-store.js";
import { createClerkVerifier } from "./clerk-identity.js";
import { decideSessionGrant } from "./session-policy.js";

const sessionRequest = z.object({
  // Só é usado quando a política manda confiar (admin com chave, ou porta de
  // dev). Em sessão de usuário o subject vem do `sub` verificado, não daqui.
  subject: z.string().min(1),
  role: z.enum(["user", "admin"]).optional(),
  worldScope: z.array(z.string()).optional(),
  adminKey: z.string().optional(),
  /** Token do provedor de identidade (R-171). */
  clerkToken: z.string().optional(),
});

/** Chave de bootstrap para emitir tokens admin (dev). Produção usa credencial C1. */
const ADMIN_KEY = process.env.GRINTA_API_ADMIN_KEY ?? "grinta-dev-admin";

const clerk = createClerkVerifier();

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(SESSION_STORE) private readonly store: SessionStore,
  ) {}

  @ApiOperation({
    summary: "Emite um token de sessão (Bearer)",
    description:
      "Sessão de usuário é aberta; papel admin exige adminKey (bootstrap). " +
      "A verificação de credencial contra o contexto de identidade (C1) é " +
      "evolução — a propriedade token-obrigatório + RBAC já é imposta.",
  })
  @Public()
  @Post("session")
  async session(@Body() body: unknown): Promise<{
    token: string;
    subject: string;
    role: Role;
    expiresAtMs: number;
    worldScope: readonly string[];
  }> {
    const parsed = sessionRequest.safeParse(body);
    if (!parsed.success) {
      throw new ApiException({
        code: "REQUEST_INVALID",
        messageKey: "error.auth.session",
        correlationId: "unknown",
        retryable: false,
        fieldErrors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          messageKey: issue.message,
        })),
        blockingReason: "REQUEST_INVALID",
        recoveryAction: null,
      });
    }
    const wantsAdmin = parsed.data.role === "admin";
    const grant = decideSessionGrant({
      wantsAdmin,
      adminKeyMatches: parsed.data.adminKey === ADMIN_KEY,
      clerkToken: parsed.data.clerkToken,
      devSessionsAllowed: process.env.GRINTA_API_ALLOW_DEV_SESSIONS === "1",
    });

    if (grant.kind === "deny") {
      throw new ApiException({
        code:
          grant.reason === "ADMIN_KEY_REQUIRED"
            ? "ADMIN_KEY_INVALID"
            : "UNAUTHENTICATED",
        messageKey:
          grant.reason === "ADMIN_KEY_REQUIRED"
            ? "error.auth.adminKey"
            : "error.auth.proofRequired",
        correlationId: "unknown",
        retryable: false,
        fieldErrors:
          grant.reason === "ADMIN_KEY_REQUIRED"
            ? [{ field: "adminKey", messageKey: "invalid" }]
            : [{ field: "clerkToken", messageKey: "required" }],
        blockingReason:
          grant.reason === "ADMIN_KEY_REQUIRED"
            ? "ADMIN_KEY_INVALID"
            : "UNAUTHENTICATED",
        recoveryAction:
          grant.reason === "ADMIN_KEY_REQUIRED" ? null : "AUTHENTICATE",
      },
      grant.reason === "ADMIN_KEY_REQUIRED"
        ? HttpStatus.BAD_REQUEST
        : HttpStatus.UNAUTHORIZED,
      );
    }

    // Sessão de usuário: o subject sai do `sub` verificado pelo provedor, e
    // não do corpo da requisição.
    let subject = parsed.data.subject;
    if (grant.kind === "verify-clerk") {
      try {
        subject = await clerk.verify(grant.token);
      } catch (error) {
        throw new ApiException({
          code: "UNAUTHENTICATED",
          messageKey:
            error instanceof Error ? error.message : "error.auth.clerk",
          correlationId: "unknown",
          retryable: false,
          fieldErrors: [{ field: "clerkToken", messageKey: "invalid" }],
          blockingReason: "UNAUTHENTICATED",
          recoveryAction: "AUTHENTICATE",
        }, HttpStatus.UNAUTHORIZED);
      }
    }

    const session = this.store.issue({
      subject,
      role: wantsAdmin ? Role.ADMIN : Role.USER,
      ...(parsed.data.worldScope ? { worldScope: parsed.data.worldScope } : {}),
      nowMs: Date.now(),
    });
    return {
      token: session.token,
      subject: session.subject,
      role: session.role,
      expiresAtMs: session.expiresAtMs,
      worldScope: session.worldScope,
    };
  }
}
