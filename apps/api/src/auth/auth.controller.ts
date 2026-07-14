import { Body, Controller, Inject, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { ApiException } from "../common/standard-error.js";
import { SESSION_STORE } from "../core/tokens.js";
import { Role } from "./auth.types.js";
import { Public } from "./public.decorator.js";
import { SessionStore } from "./session-store.js";

const sessionRequest = z.object({
  subject: z.string().min(1),
  role: z.enum(["user", "admin"]).optional(),
  worldScope: z.array(z.string()).optional(),
  adminKey: z.string().optional(),
});

/** Chave de bootstrap para emitir tokens admin (dev). Produção usa credencial C1. */
const ADMIN_KEY = process.env.GRINTA_API_ADMIN_KEY ?? "grinta-dev-admin";

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
  session(@Body() body: unknown): {
    token: string;
    subject: string;
    role: Role;
    expiresAtMs: number;
    worldScope: readonly string[];
  } {
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
    if (wantsAdmin && parsed.data.adminKey !== ADMIN_KEY) {
      throw new ApiException({
        code: "ADMIN_KEY_INVALID",
        messageKey: "error.auth.adminKey",
        correlationId: "unknown",
        retryable: false,
        fieldErrors: [{ field: "adminKey", messageKey: "invalid" }],
        blockingReason: "ADMIN_KEY_INVALID",
        recoveryAction: null,
      });
    }
    const session = this.store.issue({
      subject: parsed.data.subject,
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
