import type {
  IdempotencyClaim,
  IdempotencyOutcome,
  IdempotencyRecord,
  IdempotencyRepository,
  IdempotencyStatus,
} from "@grinta/core";

import type { PrismaClient } from "./prisma-connection.js";

/**
 * Adapter de idempotência de command (R-176).
 *
 * `tryClaim` é um INSERT que aposta na violação de unicidade: quem consegue
 * inserir ganhou a chave; quem colide lê o registro do vencedor. É o índice
 * único que arbitra, não uma checagem prévia — entre o `SELECT` e o `INSERT`
 * caberia outra requisição, e o comando rodaria duas vezes.
 */
export class PrismaIdempotencyRepository implements IdempotencyRepository {
  public constructor(private readonly client: PrismaClient) {}

  public async tryClaim(claim: IdempotencyClaim): Promise<IdempotencyOutcome> {
    try {
      await this.client.idempotencyKey.create({
        data: {
          actorId: claim.actorId,
          idempotencyKey: claim.idempotencyKey,
          gameWorldId: claim.gameWorldId,
          commandType: claim.commandType,
          status: "PENDING",
        },
      });
      return { claimed: true, existing: null };
    } catch {
      // Colidiu no índice único: ou o comando já rodou, ou já falhou.
      //
      // FAILED é reabrível: o jogador tem de poder tentar de novo depois de
      // "clube já tomado", e travar a chave transformaria erro recuperável em
      // bloqueio permanente. A linha permanece — é ela que registra o último
      // erro; o que muda é o status.
      //
      // O update é CONDICIONAL (`status: "FAILED"` no where) e conta as linhas:
      // duas retentativas simultâneas disputam a mesma linha, e só uma vê
      // `count === 1`. Ler-e-decidir aqui deixaria as duas reabrirem.
      const { count } = await this.client.idempotencyKey.updateMany({
        where: {
          actorId: claim.actorId,
          idempotencyKey: claim.idempotencyKey,
          status: "FAILED",
        },
        data: { status: "PENDING", errorCode: null, completedAt: null },
      });
      if (count === 1) return { claimed: true, existing: null };

      const existing = await this.find(claim.actorId, claim.idempotencyKey);
      if (existing === null) throw new Error("Colisão sem registro correspondente.");
      return { claimed: false, existing };
    }
  }

  public async complete(
    actorId: string | null,
    idempotencyKey: string,
    resultHash: string,
  ): Promise<void> {
    await this.update(actorId, idempotencyKey, {
      status: "COMPLETED",
      resultHash,
      completedAt: new Date(),
    });
  }

  /**
   * Marca a chave como falha, guardando o `errorCode`. A linha FICA: é ela que
   * registra o último erro. Quem libera para nova tentativa é o `tryClaim`, que
   * reabre FAILED → PENDING.
   */
  public async fail(
    actorId: string | null,
    idempotencyKey: string,
    errorCode: string,
  ): Promise<void> {
    await this.update(actorId, idempotencyKey, {
      status: "FAILED",
      errorCode,
      completedAt: new Date(),
    });
  }

  public async find(
    actorId: string | null,
    idempotencyKey: string,
  ): Promise<IdempotencyRecord | null> {
    // `findFirst` e não `findUnique`: o unique casa NULL com NULL
    // (NULLS NOT DISTINCT), mas o `where` do Prisma não expressa isso.
    const row = await this.client.idempotencyKey.findFirst({
      where: { actorId, idempotencyKey },
    });
    return row === null ? null : toRecord(row);
  }

  private async update(
    actorId: string | null,
    idempotencyKey: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await this.client.idempotencyKey.updateMany({
      where: { actorId, idempotencyKey },
      data,
    });
  }
}

interface IdempotencyKeyRow {
  readonly actorId: string | null;
  readonly idempotencyKey: string;
  readonly gameWorldId: string | null;
  readonly commandType: string | null;
  readonly status: string;
  readonly resultHash: string | null;
  readonly errorCode: string | null;
}

function toRecord(row: IdempotencyKeyRow): IdempotencyRecord {
  return {
    actorId: row.actorId,
    idempotencyKey: row.idempotencyKey,
    gameWorldId: row.gameWorldId,
    commandType: row.commandType ?? "",
    status: row.status as IdempotencyStatus,
    resultHash: row.resultHash,
    errorCode: row.errorCode,
  };
}
