import { Controller, Get, Inject, Param } from "@nestjs/common";
import { HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { InspectWorld } from "@grinta/core";
import type { JsonWorldRepository } from "@grinta/persistence";
import { parseGameWorldId } from "@grinta/shared";

import { ApiException } from "../common/standard-error.js";
import { WORLD_REPOSITORY } from "../core/tokens.js";
import {
  registeredQueryTypes,
  resolveQueryHandler,
} from "./query-registry.js";

/** Envelope de query do X-003 (contracts/README): dado + asOf + versão + escopo. */
export interface QueryEnvelope<T> {
  readonly data: T;
  readonly asOf: string;
  readonly projectionVersion: number;
  readonly pagination: null;
  readonly scope: Record<string, string>;
}

@ApiTags("queries")
@Controller("worlds")
export class QueriesController {
  constructor(
    @Inject(WORLD_REPOSITORY) private readonly repository: JsonWorldRepository,
  ) {}

  @ApiOperation({ summary: "Snapshot do mundo (envelope de query)" })
  @ApiParam({ name: "worldId", description: "UUID do mundo" })
  @Get(":worldId")
  async world(
    @Param("worldId") worldIdRaw: string,
  ): Promise<QueryEnvelope<unknown>> {
    const worldId = parseGameWorldId(worldIdRaw);
    if (!worldId.ok) {
      throw new ApiException({
        code: "INVALID_WORLD_ID",
        messageKey: worldId.error.message,
        correlationId: "unknown",
        retryable: false,
        fieldErrors: [{ field: "worldId", messageKey: "invalid" }],
        blockingReason: "INVALID_WORLD_ID",
        recoveryAction: null,
      });
    }
    const result = await new InspectWorld(this.repository).execute(worldId.value);
    if (!result.ok) {
      throw new ApiException(
        {
          code: result.error.code,
          messageKey: result.error.message,
          correlationId: "unknown",
          retryable: false,
          fieldErrors: [],
          blockingReason: result.error.code,
          recoveryAction: null,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    const snapshot = result.value;
    return {
      data: snapshot,
      asOf: snapshot.currentDate,
      projectionVersion: snapshot.version,
      pagination: null,
      scope: { worldId: worldId.value },
    };
  }

  @ApiOperation({
    summary: "Query versionada por contexto",
    description:
      "queryType: club, competitions, matches, market, ledger, players, " +
      "staff, narrative, inbox, admin, automation, eventing, identity, scheduler.",
  })
  @ApiParam({ name: "worldId", description: "UUID do mundo" })
  @ApiParam({ name: "queryType", description: "Contexto a consultar" })
  @Get(":worldId/:queryType")
  async query(
    @Param("worldId") worldIdRaw: string,
    @Param("queryType") queryType: string,
  ): Promise<QueryEnvelope<unknown>> {
    const worldId = parseGameWorldId(worldIdRaw);
    if (!worldId.ok) {
      throw new ApiException({
        code: "INVALID_WORLD_ID",
        messageKey: worldId.error.message,
        correlationId: "unknown",
        retryable: false,
        fieldErrors: [{ field: "worldId", messageKey: "invalid" }],
        blockingReason: "INVALID_WORLD_ID",
        recoveryAction: null,
      });
    }
    const handler = resolveQueryHandler(queryType);
    if (!handler) {
      throw new ApiException({
        code: "QUERY_UNKNOWN",
        messageKey: "error.query.unknown",
        correlationId: "unknown",
        retryable: false,
        fieldErrors: [
          {
            field: "queryType",
            messageKey: registeredQueryTypes().join(","),
          },
        ],
        blockingReason: "QUERY_UNKNOWN",
        recoveryAction: null,
      });
    }
    const world = await new InspectWorld(this.repository).execute(worldId.value);
    if (!world.ok) {
      throw new ApiException(
        {
          code: world.error.code,
          messageKey: world.error.message,
          correlationId: "unknown",
          retryable: false,
          fieldErrors: [],
          blockingReason: world.error.code,
          recoveryAction: null,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    const result = await handler(this.repository, worldId.value);
    if (!result.ok) {
      throw new ApiException(
        {
          code: result.error.code,
          messageKey: result.error.message,
          correlationId: "unknown",
          retryable: false,
          fieldErrors: [],
          blockingReason: result.error.code,
          recoveryAction: null,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      data: result.value,
      asOf: world.value.currentDate,
      projectionVersion: world.value.version,
      pagination: null,
      scope: { worldId: worldId.value, queryType },
    };
  }
}
