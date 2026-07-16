import { createHash } from "node:crypto";

import {
  CHAIN_GENESIS_HASH,
  computeEventHash,
  type ChainableEvent,
  type DomainEventLogRepository,
  type NewDomainEvent,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";
import type { PrismaClient } from "./prisma-connection.js";

/**
 * `H` da R-133: "a `hashAlgorithm` do replay (ex.: `sha256`)".
 *
 * Vive aqui, e não no core, porque `node:crypto` não existe no React Native —
 * e `apps/mobile` importa `@grinta/core`. A regra de encadeamento é pura e mora
 * no core; o algoritmo entra por injeção, que é o que R-133 já previa ao tratar
 * `hashAlgorithm` como dado.
 *
 * NÃO use o `stableHash` do domínio (`match-kernel.ts:151`): é FNV-1a de 64
 * bits, um hash NÃO-criptográfico, trivialmente colidível. Serve para detectar
 * divergência acidental de replay; não serve para prova de adulteração.
 */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Evento DEPOIS de encadeado. Em `ChainableEvent` os hashes são opcionais —
 * porque na leitura uma linha pode (corrompida) não tê-los, e o verificador
 * precisa enxergar isso. Já aqui, no caminho da gravação, eles acabaram de ser
 * calculados: são obrigatórios, e o tipo diz.
 */
type ChainedEvent = ChainableEvent & {
  readonly sequence: bigint;
  readonly prevEventHash: string;
  readonly eventHash: string;
};

/**
 * Adapter do log de eventos (R-176). Append-only: sem update, sem delete — é o
 * "banco INSERT-only na auditoria" que R-133 exige e que a implementação
 * anterior violava, reescrevendo a cadeia inteira a cada `saveAdmin`.
 *
 * O append faz três coisas numa transação só:
 *
 *  1. **incrementa `GameWorld.worldSequence`** e pega o valor — o `UPDATE`
 *     segura o lock da linha até o commit, e é ISSO que dá ordem total por
 *     mundo sem gap nem duplicata (CA-REG-01). Uma sequence do Postgres não
 *     serviria: teria buracos.
 *  2. **lê o último hash do mundo** — seguro porque já seguramos o lock;
 *  3. **encadeia e insere**.
 *
 * O preço é o ponto de serialização por mundo que R-175 aceita: comandos do
 * mesmo mundo que emitem evento serializam no commit. É barato perto do que
 * havia antes (reescrever o blob inteiro do contexto a cada comando), e é o que
 * sustenta replay, fencing (INV-31) e o stream de tempo real (doc 08).
 */
export class PrismaDomainEventLogRepository implements DomainEventLogRepository {
  public constructor(private readonly client: PrismaClient) {}

  public async append(
    events: readonly NewDomainEvent[],
  ): Promise<readonly ChainableEvent[]> {
    if (events.length === 0) return [];

    const gameWorldId = events[0]!.gameWorldId;
    if (events.some((event) => event.gameWorldId !== gameWorldId)) {
      // A sequência e a cadeia são POR mundo: um lote misturado precisaria de
      // dois locks e produziria duas ordens. Falhar alto é melhor que gravar
      // uma cadeia que não fecha.
      throw new MixedWorldBatch();
    }

    return this.client.$transaction(async (tx) => {
      const bumped = await tx.$queryRawUnsafe<{ worldSequence: bigint }[]>(
        `UPDATE "GameWorld" SET "worldSequence" = "worldSequence" + $1
           WHERE "id" = $2::uuid
         RETURNING "worldSequence"`,
        events.length,
        gameWorldId,
      );
      if (bumped.length === 0) throw new WorldNotFound(gameWorldId);

      // Sequência do primeiro do lote: o UPDATE devolve a do último.
      const first = bumped[0]!.worldSequence - BigInt(events.length) + 1n;

      const last = await tx.domainEventLog.findFirst({
        where: { gameWorldId },
        orderBy: { sequence: "desc" },
        select: { eventHash: true },
      });

      const chained: ChainedEvent[] = [];
      let prev = last?.eventHash ?? CHAIN_GENESIS_HASH;

      for (const [index, event] of events.entries()) {
        const withSequence = { ...event, sequence: first + BigInt(index) };
        const eventHash = computeEventHash({
          event: withSequence,
          prevEventHash: prev,
          hash: sha256,
        });
        chained.push({ ...withSequence, prevEventHash: prev, eventHash });
        prev = eventHash;
      }

      await tx.domainEventLog.createMany({ data: chained.map(toRow) });
      return chained;
    });
  }

  public async readWorldChain(gameWorldId: string): Promise<readonly ChainableEvent[]> {
    const rows = await this.client.domainEventLog.findMany({
      where: { gameWorldId },
      orderBy: { sequence: "asc" },
    });
    return rows.map(toEvent);
  }

  public async readAggregateChain(
    gameWorldId: string,
    aggregateType: string,
    aggregateId: string,
  ): Promise<readonly ChainableEvent[]> {
    const rows = await this.client.domainEventLog.findMany({
      where: { gameWorldId, aggregateType, aggregateId },
      orderBy: { aggregateVersion: "asc" },
    });
    return rows.map(toEvent);
  }
}

export class MixedWorldBatch extends Error {
  public readonly code = "LOTE_DE_MUNDOS_MISTURADOS";
  public constructor() {
    super("Um lote de eventos tem de ser de um mundo só: a sequência é por mundo.");
  }
}

export class WorldNotFound extends Error {
  public readonly code = "MUNDO_INEXISTENTE";
  public constructor(gameWorldId: string) {
    super(`Mundo ${gameWorldId} não existe: não há sequência para atribuir.`);
  }
}

interface DomainEventLogRow {
  readonly id: string;
  readonly gameWorldId: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly aggregateVersion: bigint;
  readonly sequence: bigint;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly payloadJson: unknown;
  readonly actorType: string | null;
  readonly actorId: string | null;
  readonly correlationId: string | null;
  readonly causationId: string | null;
  readonly prevEventHash: string | null;
  readonly eventHash: string | null;
  readonly occurredAt: Date;
}

function toRow(event: ChainedEvent) {
  return {
    id: event.eventId,
    gameWorldId: event.gameWorldId,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    aggregateVersion: event.aggregateVersion,
    sequence: event.sequence,
    eventType: event.eventType,
    eventVersion: event.eventVersion,
    // O payload é `unknown` no domínio (cada evento tem o seu) e `Json` na
    // coluna. `canonicalJson` já provou, no cálculo do hash, que ele é
    // serializável — um payload que não fosse nem teria chegado aqui.
    payloadJson: event.payload as Prisma.InputJsonValue,
    actorType: event.actorType,
    actorId: event.actorId,
    correlationId: event.correlationId,
    causationId: event.causationId,
    prevEventHash: event.prevEventHash,
    eventHash: event.eventHash,
    // `occurredAt` guarda a data do MUNDO (R-177) à meia-noite UTC. O
    // `@default(now())` da coluna é relógio de máquina e nunca deve valer aqui:
    // o evento aconteceu no tempo do jogo, não no do servidor.
    occurredAt: new Date(`${event.occurredOn}T00:00:00.000Z`),
  };
}

function toEvent(row: DomainEventLogRow): ChainableEvent {
  return {
    eventId: row.id,
    gameWorldId: row.gameWorldId,
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    aggregateVersion: row.aggregateVersion,
    sequence: row.sequence,
    eventType: row.eventType,
    eventVersion: row.eventVersion,
    payload: row.payloadJson,
    actorType: row.actorType,
    actorId: row.actorId,
    correlationId: row.correlationId,
    causationId: row.causationId,
    // Spread condicional, e não `?? undefined`: com `exactOptionalPropertyTypes`
    // a propriedade opcional ou existe com valor, ou não existe. E a diferença
    // importa aqui — uma linha SEM hash é corrupção, não "hash indefinido", e o
    // `verifyEventChain` tem de acusá-la em vez de recebê-la já normalizada.
    ...(row.prevEventHash !== null ? { prevEventHash: row.prevEventHash } : {}),
    ...(row.eventHash !== null ? { eventHash: row.eventHash } : {}),
    occurredOn: row.occurredAt.toISOString().slice(0, 10),
  };
}
