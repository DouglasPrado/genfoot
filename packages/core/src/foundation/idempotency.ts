/**
 * Idempotência de command (R-176).
 *
 * Substitui `idempotencyKey: string` espalhado por quase todo tipo do domínio,
 * com dedup por varredura de array (`world-eventing.ts:133`, O(n) por comando).
 * O modelo físico sempre teve a tabela `IdempotencyKey` com
 * `@@unique([actorId, idempotencyKey])`; o domínio é que a ignorava.
 */
export const IdempotencyStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type IdempotencyStatus =
  (typeof IdempotencyStatus)[keyof typeof IdempotencyStatus];

export interface IdempotencyClaim {
  /** `null` = comando de sistema (scheduler, saga), sem ator humano. */
  readonly actorId: string | null;
  readonly idempotencyKey: string;
  readonly gameWorldId: string | null;
  readonly commandType: string;
}

export interface IdempotencyRecord extends IdempotencyClaim {
  readonly status: IdempotencyStatus;
  readonly resultHash: string | null;
  readonly errorCode: string | null;
}

export interface IdempotencyOutcome {
  /** `true` = a chave é sua, pode executar. `false` = alguém chegou antes. */
  readonly claimed: boolean;
  /** O registro que já existia, quando `claimed` é `false`. */
  readonly existing: IdempotencyRecord | null;
}

/**
 * Porta de idempotência. O protocolo é:
 *
 *  1. `tryClaim` — insere PENDING. Quem perde a corrida recebe `claimed: false`
 *     e o registro do vencedor, e devolve o desfecho dele em vez de executar.
 *  2. executa o comando;
 *  3. `complete` com o hash do resultado, ou `fail` com o errorCode.
 *
 * `fail` LIBERA a chave: o jogador tem de poder tentar de novo depois de "clube
 * já tomado". Travar transformaria erro recuperável em bloqueio permanente.
 */
export interface IdempotencyRepository {
  tryClaim(claim: IdempotencyClaim): Promise<IdempotencyOutcome>;
  complete(
    actorId: string | null,
    idempotencyKey: string,
    resultHash: string,
  ): Promise<void>;
  fail(
    actorId: string | null,
    idempotencyKey: string,
    errorCode: string,
  ): Promise<void>;
  find(
    actorId: string | null,
    idempotencyKey: string,
  ): Promise<IdempotencyRecord | null>;
}
