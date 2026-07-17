import type { ClubReadModel, WorldReadModel } from "@grinta/core";
import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Query,
  Req,
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import {
  InspectWorld,
  type IdentityReadModel,
  type WorldRepository,
} from "@grinta/core";
import { parseGameWorldId } from "@grinta/shared";
import type { Request } from "express";

import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { ApiException } from "../common/standard-error.js";
import {
  GAME_WORLD_REPOSITORY,
  IDENTITY_READ_MODEL,
  CLUB_READ_MODEL,
  OBJECT_STORAGE,
  WORLD_READ_MODEL,
} from "../core/tokens.js";
import { R2Storage } from "../uploads/r2-storage.js";
import { registeredQueryNames, resolveQueryHandler } from "./query-registry.js";
import {
  enforceWorldScope,
  paginate,
  type Pagination,
} from "./query-support.js";

/** Envelope de query do X-003 (contracts/README): dado + asOf + versão + escopo. */
export interface QueryEnvelope<T> {
  readonly data: T;
  readonly asOf: string;
  readonly projectionVersion: number;
  readonly pagination: Pagination;
  readonly scope: Record<string, string>;
}

function invalidWorldId(messageKey: string): ApiException {
  return new ApiException({
    code: "INVALID_WORLD_ID",
    messageKey,
    correlationId: "unknown",
    retryable: false,
    fieldErrors: [{ field: "worldId", messageKey: "invalid" }],
    blockingReason: "INVALID_WORLD_ID",
    recoveryAction: null,
  });
}

@ApiTags("queries")
@Controller("worlds")
export class QueriesController {
  constructor(
    @Inject(CLUB_READ_MODEL) private readonly clubReadModel: ClubReadModel,
    // C1 lê do Postgres (R-173/R-175); os outros quinze, do JSON. Transitório.
    @Inject(IDENTITY_READ_MODEL)
    private readonly identityReadModel: IdentityReadModel,
    // O mundo é tabela, sempre (R-173/R-182).
    @Inject(GAME_WORLD_REPOSITORY) private readonly worlds: WorldRepository,
    @Inject(WORLD_READ_MODEL) private readonly worldReadModel: WorldReadModel,
    // Só para compor a URL pública das imagens do mundo a partir da chave. Não
    // grava nada: quem grava é o UploadsController.
    @Inject(OBJECT_STORAGE) private readonly storage: R2Storage,
  ) {}

  /**
   * A lista dos mundos que EXISTEM.
   *
   * Faltava, e a falta era invisível: o admin listava os mundos do
   * `localStorage` do navegador. O efeito só apareceu quando o banco foi
   * recriado — o console seguiu mostrando mundos apagados, e clicar num deles
   * dava tela vazia sem erro. E a tela de Usuários, que varre os mundos
   * conhecidos, vinha vazia em qualquer navegador que não tivesse criado os
   * mundos ele mesmo.
   *
   * Vem ANTES de `@Get(":worldId")` de propósito: o Nest casa na ordem de
   * declaração, e depois dela "worlds" seria lido como um `worldId` inválido.
   */
  @ApiOperation({ summary: "Lista os mundos existentes" })
  @Get()
  async list(
    @Req() request: Request & AuthenticatedRequest,
  ): Promise<QueryEnvelope<unknown>> {
    // O `accountId` sai da SESSÃO, nunca de um parâmetro: "minha participação"
    // só faz sentido para quem o token identifica. Admin não tem conta de jogo
    // e recebe a lista sem o campo.
    const worlds = await this.worldReadModel.listWorlds(
      request.session?.accountId ?? null,
    );
    return {
      data: worlds,
      asOf: new Date().toISOString().slice(0, 10),
      projectionVersion: 1,
      pagination: {
        limit: worlds.length,
        offset: 0,
        returned: worlds.length,
        total: worlds.length,
        hasMore: false,
      },
      // Sem `worldId` no escopo: esta query não tem mundo — ela é a que os
      // descobre. O `scope` é `Record<string, string>`, e enfiar um `null` ali
      // com um cast seria mentir para o tipo em vez de dizer o que é verdade.
      scope: { queryType: "worlds" },
    };
  }

  @ApiOperation({ summary: "Snapshot do mundo (envelope de query)" })
  @ApiParam({ name: "worldId", description: "UUID do mundo" })
  @Get(":worldId")
  async world(
    @Param("worldId") worldIdRaw: string,
    @Req() request: Request & AuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ): Promise<QueryEnvelope<unknown>> {
    const worldId = parseGameWorldId(worldIdRaw);
    if (!worldId.ok) throw invalidWorldId(worldId.error.message);
    enforceWorldScope(request.session, worldId.value);

    const result = await new InspectWorld(this.worlds).execute(
      worldId.value,
    );
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
    // O agregado guarda a CHAVE do objeto; a URL pública é composta aqui, que é
    // onde o `R2_CDN_URL` é conhecido. Sem isto a tela receberia
    // `grinta/worlds/…/banner-abc.png` e teria que montar a URL sozinha —
    // colando o domínio do CDN dentro do cliente.
    const paged = paginate(
      {
        ...snapshot,
        bannerUrl:
          snapshot.bannerKey === null
            ? null
            : this.storage.publicUrl(snapshot.bannerKey),
        squarePhotoUrl:
          snapshot.squarePhotoKey === null
            ? null
            : this.storage.publicUrl(snapshot.squarePhotoKey),
      },
      query,
    );
    return {
      data: paged.data,
      asOf: snapshot.currentDate,
      projectionVersion: snapshot.version,
      pagination: paged.pagination,
      scope: { worldId: worldId.value },
    };
  }

  @ApiOperation({
    summary: "Query versionada por contexto",
    description:
      "queryType: club, competitions, matches, market, ledger, players, " +
      "player-roster, staff, narrative, inbox, admin, automation, eventing, " +
      "identity, identity-detail, scheduler.",
  })
  @ApiParam({ name: "worldId", description: "UUID do mundo" })
  @ApiParam({ name: "queryType", description: "Contexto a consultar" })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  @Get(":worldId/:queryType")
  async query(
    @Param("worldId") worldIdRaw: string,
    @Param("queryType") queryType: string,
    @Req() request: Request & AuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ): Promise<QueryEnvelope<unknown>> {
    const worldId = parseGameWorldId(worldIdRaw);
    if (!worldId.ok) throw invalidWorldId(worldId.error.message);
    enforceWorldScope(request.session, worldId.value);

    const handler = resolveQueryHandler(queryType);
    if (!handler) {
      throw new ApiException({
        code: "QUERY_UNKNOWN",
        messageKey: "error.query.unknown",
        correlationId: "unknown",
        retryable: false,
        fieldErrors: [
          { field: "queryType", messageKey: registeredQueryNames().join(",") },
        ],
        blockingReason: "QUERY_UNKNOWN",
        recoveryAction: null,
      });
    }
    const world = await new InspectWorld(this.worlds).execute(
      worldId.value,
    );
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
    const result = await handler(
      { identityReadModel: this.identityReadModel, clubReadModel: this.clubReadModel },
      worldId.value,
    );
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
    const paged = paginate(result.value, query);
    return {
      data: paged.data,
      asOf: world.value.currentDate,
      projectionVersion: world.value.version,
      pagination: paged.pagination,
      scope: { worldId: worldId.value, queryType },
    };
  }
}
