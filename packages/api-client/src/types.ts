export type Role = "user" | "admin";

export interface SessionResponse {
  readonly token: string;
  readonly subject: string;
  readonly role: Role;
  readonly expiresAtMs: number;
  readonly worldScope: readonly string[];
  /**
   * A conta do JOGO (R-172), resolvida a partir do subject verificado do
   * provedor. É o que vai em `identity:join-world` e `reserve-club`.
   *
   * `null` em sessão admin de dev — ela não tem conta de jogo, e inventar uma
   * poria um jogador fantasma no mundo.
   */
  readonly accountId: string | null;
}

export interface CommandEnvelope {
  readonly contractVersion?: string;
  readonly commandType: string;
  readonly payload?: Record<string, unknown>;
  readonly worldId?: string;
  readonly expectedVersion?: number;
  readonly idempotencyKey: string;
  readonly correlationId?: string;
}

export type CommandStatus = "ACCEPTED" | "ALREADY_APPLIED" | "REJECTED";

export interface CommandResponse {
  readonly commandId: string;
  readonly status: CommandStatus;
  readonly correlationId: string;
  readonly resource?: string | null;
  readonly error?: { readonly code: string; readonly messageKey: string };
}

export interface Pagination {
  readonly limit: number;
  readonly offset: number;
  readonly returned: number;
  readonly total: number;
  readonly hasMore: boolean;
}

export interface QueryEnvelope<T = unknown> {
  readonly data: T;
  readonly asOf: string;
  readonly projectionVersion: number;
  readonly pagination: Pagination;
  readonly scope: Record<string, string>;
}

/** Uma linha da lista de mundos (`GET /api/v1/worlds`). */
export interface WorldListItem {
  readonly id: string;
  readonly seed: string;
  readonly status: string;
  readonly currentDate: string;
  readonly startDate: string;
  readonly rulesetVersion: string;
  readonly clubCount: number;
}

export interface Catalog {
  readonly commands: readonly string[];
  readonly queries: readonly string[];
  readonly commandCount: number;
}

export interface BandEvaluation {
  readonly bandId: string;
  readonly metric: string;
  readonly observed: number;
  readonly lo: number;
  readonly hi: number;
  readonly result: "PASS" | "FAIL";
  readonly oracleVersion: string;
}

export interface ValidationReport {
  readonly rulesetVersion: string;
  readonly runsExecuted: number;
  readonly matchesExecuted: number;
  readonly bandEvaluations: readonly BandEvaluation[];
  readonly invariantViolationCount: number;
  readonly gateResult: "PASS" | "FAIL";
  readonly reportHash: string;
  readonly metrics: readonly { metricId: string; value: number }[];
}

export interface StandardError {
  readonly code: string;
  readonly messageKey: string;
  readonly correlationId: string;
  readonly retryable: boolean;
  readonly fieldErrors: readonly { field: string; messageKey: string }[];
  readonly blockingReason: string | null;
  readonly recoveryAction: string | null;
}

/** Erro HTTP não-2xx com o envelope de erro-padrão do X-003. */
export class GrintaApiError extends Error {
  constructor(
    readonly status: number,
    readonly standard: StandardError,
  ) {
    super(`${standard.code}: ${standard.messageKey}`);
    this.name = "GrintaApiError";
  }
}
