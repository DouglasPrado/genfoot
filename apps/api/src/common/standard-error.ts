import { HttpException, HttpStatus } from "@nestjs/common";
import { DomainError } from "@grinta/shared";

export interface FieldError {
  readonly field: string;
  readonly messageKey: string;
}

/** Envelope de erro-padrão do X-003 (contracts/README). */
export interface StandardError {
  readonly code: string;
  readonly messageKey: string;
  readonly correlationId: string;
  readonly retryable: boolean;
  readonly fieldErrors: readonly FieldError[];
  readonly blockingReason: string | null;
  readonly recoveryAction: string | null;
}

const RETRYABLE_CODES = new Set<string>([
  "AGGREGATE_VERSION_CONFLICT",
  "SCHEDULER_REVISION_CONFLICT",
  "WORLD_CLOCK_LEASE_HELD",
  "ROLLOVER_LEASE_HELD",
]);

export function standardErrorFromDomain(
  error: DomainError,
  correlationId: string,
  fieldErrors: readonly FieldError[] = [],
): StandardError {
  return {
    code: error.code,
    messageKey: error.message,
    correlationId,
    retryable: RETRYABLE_CODES.has(error.code),
    fieldErrors,
    blockingReason: RETRYABLE_CODES.has(error.code) ? null : error.code,
    recoveryAction: RETRYABLE_CODES.has(error.code) ? "RETRY" : null,
  };
}

/** Exceção HTTP que transporta o envelope de erro-padrão. */
export class ApiException extends HttpException {
  constructor(
    readonly standard: StandardError,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(standard, status);
  }
}
