import { Body, Controller, HttpStatus, Inject, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { ApiException } from "../common/standard-error.js";
import {
  ResolveAccountForSubject,
  type UserAccountRepository,
} from "@grinta/core";

import { SESSION_STORE, USER_ACCOUNT_REPOSITORY } from "../core/tokens.js";
import { Role } from "./auth.types.js";
import { Public } from "./public.decorator.js";
import { SessionStore } from "./session-store.js";
import {
  createClerkVerifier,
  type VerifiedIdentity,
} from "./clerk-identity.js";
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

/**
 * A conta é GLOBAL (R-172): não vive em mundo nenhum, logo não tem data de
 * mundo. Este valor existe só para semear o id determinístico da conta — o
 * instante de plataforma real quem grava é o `@default(now())` da coluna.
 *
 * Está declarado como pendência em `reescrita-do-core-2026-07-16.md`: decidir se
 * o `createdOn` sai do snapshot (é só semente) ou ganha coluna própria.
 */
const PLATFORM_EPOCH = "1970-01-01";

/**
 * A identidade do caminho de DEV (`GRINTA_API_ALLOW_DEV_SESSIONS=1`), onde não
 * há token para verificar.
 *
 * O e-mail é derivado do subject e fica num domínio reservado (`.invalid`, RFC
 * 2606): ele nunca colide com e-mail real, então uma sessão de dev não consegue
 * — nem por acidente — ligar-se à conta de alguém pelo casamento de e-mail que o
 * `ResolveAccountForSubject` faz.
 */
function devIdentity(subject: string): VerifiedIdentity {
  return {
    subject,
    email: `${subject}@dev.invalid`,
    name: subject,
  };
}

/** Chave de bootstrap para emitir tokens admin (dev). Produção usa credencial C1. */
const ADMIN_KEY = process.env.GRINTA_API_ADMIN_KEY ?? "grinta-dev-admin";

const clerk = createClerkVerifier();

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(SESSION_STORE) private readonly store: SessionStore,
    // A conta do jogo (R-172, global). É aqui que o subject do Clerk vira uma
    // linha em `UserAccount` — a ponte que faltava.
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly accounts: UserAccountRepository,
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
    /** A conta do JOGO (R-172). `null` em sessão admin de dev, que não tem uma. */
    accountId: string | null;
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
    let identity: VerifiedIdentity | null = null;

    if (grant.kind === "verify-clerk") {
      try {
        identity = await clerk.verify(grant.token);
        subject = identity.subject;
      } catch (error) {
        if (error instanceof ApiException) throw error;
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

    /**
     * A CONTA NASCE AQUI, e é a ponte que faltava.
     *
     * O Clerk autenticava e ninguém criava a linha em `UserAccount` — o app
     * ficava preso num `identity:register-account` que não existe mais (a conta
     * virou global, R-172). O doc do caso de uso já dizia onde ele mora: "Todo
     * acesso passa por aqui (R-171/R-172), então o caminho comum — conta já
     * existente — não escreve nada."
     *
     * **Vale para os DOIS caminhos de usuário**, e é por isso que está aqui fora
     * e não dentro do `verify-clerk`. O que muda entre eles é DE ONDE vem a
     * identidade — do token verificado, ou do subject de dev —, não SE a conta
     * precisa existir. Resolver só no caminho do Clerk deixava o dev sem conta,
     * e o app travava em "autenticar" com sessão válida na mão.
     *
     * Admin NÃO tem conta de jogo: `accountId` fica `null`. Criar uma poria um
     * jogador fantasma no mundo, com clube e tudo.
     */
    let accountId: string | null = null;
    if (!wantsAdmin) {
      const claim = identity ?? devIdentity(subject);
      const resolved = await new ResolveAccountForSubject(this.accounts).execute({
        subject: claim.subject,
        email: claim.email,
        name: claim.name,
        occurredOn: PLATFORM_EPOCH,
        idempotencySeed: claim.subject,
      });
      if (!resolved.ok) {
        throw new ApiException(
          {
            code: resolved.error.code,
            messageKey: resolved.error.message,
            correlationId: "unknown",
            retryable: false,
            fieldErrors: [],
            blockingReason: resolved.error.code,
            recoveryAction: null,
          },
          HttpStatus.CONFLICT,
        );
      }
      accountId = resolved.value.id;
    }

    const session = this.store.issue({
      subject,
      accountId,
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
      /**
       * O id da conta do JOGO, não o subject do provedor.
       *
       * É o que o cliente usa em `identity:join-world` e `reserve-club`. Antes o
       * app tentava descobri-lo varrendo `identity-detail.accounts[]` — campo
       * que o read model de C1 nunca teve. Quem sabe a conta é quem a resolveu.
       *
       * `null` em sessão admin de dev: ela não tem conta de jogo, e inventar uma
       * daria ao operador um jogador fantasma no mundo.
       */
      accountId,
    };
  }
}
