import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Request, Response } from "express";

import { ApiException, type StandardError } from "./standard-error.js";

function correlationOf(request: Request): string {
  const header = request.header("x-correlation-id");
  return typeof header === "string" && header.length > 0 ? header : "unknown";
}

/**
 * Filtro global: converte qualquer exceção no envelope de erro-padrão do X-003,
 * preservando `correlationId`. Nunca vaza stack/PII (FR-013).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = correlationOf(request);

    if (exception instanceof ApiException) {
      response.status(exception.getStatus()).json(exception.standard);
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body: StandardError = {
        code: status === HttpStatus.NOT_FOUND ? "NOT_FOUND" : "REQUEST_INVALID",
        messageKey: exception.message,
        correlationId,
        retryable: false,
        fieldErrors: [],
        blockingReason: null,
        recoveryAction: null,
      };
      response.status(status).json(body);
      return;
    }
    const body: StandardError = {
      code: "INTERNAL_ERROR",
      messageKey: "error.internal",
      correlationId,
      retryable: false,
      fieldErrors: [],
      blockingReason: null,
      recoveryAction: null,
    };
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
