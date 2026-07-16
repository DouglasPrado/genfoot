import { canonicalJson } from "./canonical-json.js";

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
  /**
   * Identifica o PEDIDO — é o que distingue reenvio de reúso. Use
   * `commandFingerprint`: comparação exata exige serialização canônica.
   */
  readonly requestFingerprint: string;
}

export interface IdempotencyRecord extends IdempotencyClaim {
  readonly status: IdempotencyStatus;
  readonly resultHash: string | null;
  readonly errorCode: string | null;
}

/**
 * Os três desfechos de uma tentativa. União discriminada de propósito: com
 * `{ claimed: boolean }` o chamador podia ignorar o reúso sem o compilador
 * reclamar — e ignorá-lo é devolver ao cliente o resultado de um comando que ele
 * não pediu.
 */
export type IdempotencyOutcome =
  /** A chave é sua, pode executar. */
  | { readonly claimed: true }
  /** Alguém chegou antes com o MESMO pedido: devolva o desfecho dele, não reexecute. */
  | {
      readonly claimed: false;
      readonly reused: false;
      readonly existing: IdempotencyRecord;
    }
  /**
   * Mesma chave, pedido DIVERGENTE → `IDEMPOTENCY_KEY_REUSED`
   * (`10-catalogo-de-commands.md:61`, errorCode comum de toda mutação).
   */
  | {
      readonly claimed: false;
      readonly reused: true;
      readonly existing: IdempotencyRecord;
    };

/**
 * O fingerprint do pedido: serialização canônica do payload, não hash.
 *
 * Sem hash de propósito — comparação exata, zero superfície de colisão, e o core
 * roda no React Native, onde não há `node:crypto`. O custo é uma coluna TEXT
 * maior, que a esta escala não paga um dependência criptográfica.
 *
 * O que ele conserta: `world-club-portfolio.ts:78` usava `JSON.stringify(command)`,
 * cuja ordem de chaves segue a INSERÇÃO. O mesmo comando montado por outro
 * caminho produzia outro fingerprint, e um reenvio legítimo seria recusado como
 * reúso. `canonicalJson` ordena as chaves e recusa `undefined`.
 */
export function commandFingerprint(payload: unknown): string {
  return canonicalJson(payload);
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
