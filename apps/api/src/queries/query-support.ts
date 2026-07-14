import { HttpStatus } from "@nestjs/common";
import { z } from "zod";

import type { Session } from "../auth/auth.types.js";
import { ApiException } from "../common/standard-error.js";

export interface Pagination {
  readonly limit: number;
  readonly offset: number;
  readonly returned: number;
  readonly total: number;
  readonly hasMore: boolean;
}

const paginationQuery = z.object({
  limit: z.coerce.number().int().positive().max(500).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

const DEFAULT_LIMIT = 50;

/**
 * Aplica paginação ao dado da query. Quando `data` é um array, fatia por
 * limit/offset e reporta total/hasMore reais; quando é um objeto (summary),
 * mantém o objeto inteiro e reporta total=1. O envelope sempre carrega a
 * paginação, cumprindo o contrato mesmo para dados não-lista.
 */
export function paginate(
  data: unknown,
  rawQuery: Record<string, unknown>,
): { data: unknown; pagination: Pagination } {
  const parsed = paginationQuery.safeParse(rawQuery);
  const limit = parsed.success ? parsed.data.limit ?? DEFAULT_LIMIT : DEFAULT_LIMIT;
  const offset = parsed.success ? parsed.data.offset ?? 0 : 0;

  if (Array.isArray(data)) {
    const total = data.length;
    const page = data.slice(offset, offset + limit);
    return {
      data: page,
      pagination: {
        limit,
        offset,
        returned: page.length,
        total,
        hasMore: offset + page.length < total,
      },
    };
  }
  return {
    data,
    pagination: { limit, offset, returned: 1, total: 1, hasMore: false },
  };
}

/**
 * Impõe o escopo de mundo da sessão (autorização). Sessão sem escopo (dev/usuário
 * genérico) ou papel admin acessa qualquer mundo; sessão com escopo restrito só
 * acessa mundos listados — caso contrário 403.
 */
export function enforceWorldScope(
  session: Session | undefined,
  worldId: string,
): void {
  if (session === undefined) return; // guard já garantiu autenticação
  if (session.role === "admin") return;
  if (session.worldScope.length === 0) return;
  if (!session.worldScope.includes(worldId)) {
    throw new ApiException(
      {
        code: "FORBIDDEN",
        messageKey: "error.auth.worldScope",
        correlationId: "unknown",
        retryable: false,
        fieldErrors: [{ field: "worldId", messageKey: "out-of-scope" }],
        blockingReason: "FORBIDDEN",
        recoveryAction: null,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
