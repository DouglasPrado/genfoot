import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import { canonicalJson } from "./canonical-json.js";

/**
 * Cadeia de integridade da auditoria — R-133.
 *
 * `eventHash(n) = H(canonical(evento) ‖ prevEventHash(n))`, encadeada pela
 * sequência do `DomainEventLog` (`[gameWorldId, sequence]`). É UMA cadeia por
 * mundo, não uma por agregado: é a ordem total do mundo que dá o "anterior".
 *
 * Duas escolhas que valem explicar:
 *
 * 1. **`H` é injetado.** R-133 pede sha256, e sha256 vem do `node:crypto` —
 *    que não existe no React Native, onde `@grinta/core` também roda
 *    (`apps/mobile` importa este pacote). A REGRA de encadeamento é pura e
 *    mora aqui; o algoritmo entra pelo adapter, server-side. R-133 já trata o
 *    algoritmo como dado (`hashAlgorithm` do manifesto de replay).
 *
 * 2. **O hash cobre o registro inteiro, não só `payloadJson`.** A fórmula da
 *    R-133 diz `canonical(payload)`, o que, lido ao pé da letra, deixaria
 *    `eventType`, `aggregateId` e `actorId` fora — e trocar "suspendeu conta"
 *    por "criou conta" não quebraria a cadeia. Seria a mesma falha da
 *    implementação anterior (`world-admin.ts:1048` hasheava quatro escalares e
 *    ignorava o conteúdo). Prova de adulteração exige cobrir o que se pode
 *    adulterar.
 */
export interface ChainableEvent {
  readonly eventId: string;
  readonly gameWorldId: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly aggregateVersion: bigint;
  /** `worldSequence`: monotônico, sem gap nem duplicata (CA-REG-01). */
  readonly sequence: bigint;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly payload: unknown;
  readonly actorType: string | null;
  readonly actorId: string | null;
  readonly correlationId: string | null;
  readonly causationId: string | null;
  /** Data do mundo (R-177), nunca o relógio da máquina. */
  readonly occurredOn: string;
  /** Preenchidos pelo append; ignorados no cálculo do próprio hash. */
  readonly prevEventHash?: string;
  readonly eventHash?: string;
}

export type HashFunction = (value: string) => string;

/** Ancoragem do primeiro evento do mundo. Largura do sha256 em hexadecimal. */
export const CHAIN_GENESIS_HASH = "0".repeat(64);

export interface ComputeEventHashInput {
  readonly event: ChainableEvent;
  readonly prevEventHash: string;
  readonly hash: HashFunction;
}

export function computeEventHash(input: ComputeEventHashInput): string {
  if (input.prevEventHash.length !== CHAIN_GENESIS_HASH.length) {
    // Largura fixa é o que torna `(evento, prev) → texto` injetivo. Com largura
    // livre, dois pares diferentes poderiam produzir o mesmo texto — colisão
    // sem precisar quebrar o `H`.
    throw new DomainError(
      "HASH_ANTERIOR_INVALIDO",
      `prevEventHash deve ter ${CHAIN_GENESIS_HASH.length} caracteres.`,
      { length: input.prevEventHash.length },
    );
  }
  return input.hash(canonicalJson(subject(input.event)) + input.prevEventHash);
}

/**
 * O que entra no hash. `prevEventHash` e `eventHash` ficam de fora: o primeiro
 * já entra por concatenação, e o segundo é o resultado.
 */
function subject(event: ChainableEvent): Record<string, unknown> {
  return {
    eventId: event.eventId,
    gameWorldId: event.gameWorldId,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    aggregateVersion: event.aggregateVersion,
    sequence: event.sequence,
    eventType: event.eventType,
    eventVersion: event.eventVersion,
    payload: event.payload,
    actorType: event.actorType,
    actorId: event.actorId,
    correlationId: event.correlationId,
    causationId: event.causationId,
    occurredOn: event.occurredOn,
  };
}

/**
 * Verificador de cadeia (R-133 exige um, periódico). Recebe os elos de UM mundo
 * em ordem de `sequence` e reprova três ataques: conteúdo trocado, elo removido
 * e elo reordenado.
 */
export function verifyEventChain(
  links: readonly ChainableEvent[],
  hash: HashFunction,
): Result<true, DomainError> {
  let prev = CHAIN_GENESIS_HASH;
  let expectedSequence: bigint | null = null;

  for (const link of links) {
    // Sem gap nem duplicata (CA-REG-01). Um elo removido do meio deixa a
    // sequência com buraco mesmo que os hashes de quem sobrou fechem entre si.
    if (expectedSequence !== null && link.sequence !== expectedSequence) {
      return fail(
        new DomainError(
          "CADEIA_ADULTERADA",
          `Sequência esperada ${expectedSequence}, veio ${link.sequence}: elo removido ou reordenado.`,
          { eventId: link.eventId, sequence: link.sequence.toString() },
        ),
      );
    }

    if (link.prevEventHash !== prev) {
      return fail(
        new DomainError(
          "CADEIA_ADULTERADA",
          `Elo ${link.eventId} não aponta para o hash anterior.`,
          { eventId: link.eventId },
        ),
      );
    }

    const recomputed = computeEventHash({ event: link, prevEventHash: prev, hash });
    if (link.eventHash !== recomputed) {
      return fail(
        new DomainError(
          "CADEIA_ADULTERADA",
          `Elo ${link.eventId} não confere: o conteúdo mudou depois de gravado.`,
          { eventId: link.eventId },
        ),
      );
    }

    prev = recomputed;
    expectedSequence = link.sequence + 1n;
  }

  return succeed(true);
}
