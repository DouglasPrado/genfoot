import { createHash } from "node:crypto";

import {
  Controller,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { parseGameWorldId } from "@grinta/shared";
import type { Request } from "express";

import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { ApiException } from "../common/standard-error.js";
import { enforceWorldScope } from "../queries/query-support.js";
import { probeImage } from "./image-probe.js";
import { OBJECT_STORAGE } from "../core/tokens.js";
import { R2Storage } from "./r2-storage.js";
import {
  MAX_UPLOAD_BYTES,
  objectKey,
  validateImage,
  type ImageKind,
} from "./upload-rules.js";

/**
 * `Express.Multer.File` exige o @types/multer no escopo global do tsconfig, e
 * ele não está lá. O tipo estrutural é o que este controller usa de fato —
 * buffer e tamanho — e não vale arrastar config global por dois campos.
 */
interface UploadedImage {
  readonly buffer: Buffer;
  readonly size: number;
}

/** Upload de imagem do mundo: banner e foto quadrada.
 *
 * **O arquivo passa pela API de propósito.** O padrão canônico dos docs
 * (`01-arquitetura-de-dados.md:453`) é o pré-commit com URL assinada e upload
 * direto do browser — e ele não é viável aqui por duas razões concretas: o
 * bucket `images` não tem CORS (o preflight leva 403) e pertence a outro projeto
 * (`cdn.oggiadmin.com.br`), então liberá-lo é decisão de infraestrutura alheia a
 * este código.
 *
 * O proxy paga isso com bytes passando pelo processo — aceitável para um admin
 * subindo um banner — e devolve uma vantagem real: a validação roda ANTES de o
 * objeto existir. No fluxo com URL assinada, "a foto é quadrada?" só pode ser
 * respondido depois do upload, e uma foto reprovada vira lixo que alguém precisa
 * varrer. Aqui, imagem reprovada simplesmente não é gravada.
 */

const KINDS: Record<string, ImageKind> = {
  banner: "banner",
  "square-photo": "squarePhoto",
};

function uploadError(code: string, message: string): ApiException {
  return new ApiException(
    {
      code,
      messageKey: message,
      correlationId: "unknown",
      retryable: false,
      fieldErrors: [{ field: "file", messageKey: code }],
      blockingReason: code,
      recoveryAction: null,
    },
    HttpStatus.BAD_REQUEST,
  );
}

export interface UploadResponse {
  /** O que vai no `world:set-identity`. */
  readonly key: string;
  /** Onde a imagem é servida — para a tela mostrar o preview na hora. */
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly format: string;
  readonly bytes: number;
}

@ApiTags("uploads")
@Controller("worlds")
export class UploadsController {
  constructor(
    @Inject(OBJECT_STORAGE) private readonly storage: R2Storage,
  ) {}

  @ApiOperation({
    summary: "Sobe uma imagem do mundo (banner | square-photo)",
    description:
      "Valida tipo, tamanho e dimensão ANTES de gravar. A foto quadrada é " +
      "recusada se não for quadrada; o banner, se não for paisagem. Devolve a " +
      "chave do objeto, que vai no payload de world:set-identity.",
  })
  @ApiParam({ name: "worldId", description: "UUID do mundo" })
  @ApiParam({ name: "kind", enum: ["banner", "square-photo"] })
  @Post(":worldId/images/:kind")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  public async upload(
    @Param("worldId") worldIdRaw: string,
    @Param("kind") kindRaw: string,
    @UploadedFile() file: UploadedImage | undefined,
    @Req() request: Request & AuthenticatedRequest,
  ): Promise<UploadResponse> {
    const worldId = parseGameWorldId(worldIdRaw);
    if (!worldId.ok) {
      throw uploadError("INVALID_WORLD_ID", worldId.error.message);
    }
    enforceWorldScope(request.session, worldId.value);

    const kind = KINDS[kindRaw];
    if (kind === undefined) {
      throw uploadError(
        "UPLOAD_UNKNOWN_KIND",
        `Tipo desconhecido: ${kindRaw}. Use banner ou square-photo.`,
      );
    }

    // R2 desligado é 503 com nome, não 500: o operador precisa saber que falta
    // configuração, e não que "algo deu errado".
    if (!this.storage.available) {
      throw new ApiException(
        {
          code: "UPLOAD_STORAGE_UNAVAILABLE",
          messageKey:
            "O armazenamento de objetos não está configurado (R2_*). Upload indisponível.",
          correlationId: "unknown",
          retryable: true,
          fieldErrors: [],
          blockingReason: "UPLOAD_STORAGE_UNAVAILABLE",
          recoveryAction: null,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (file === undefined) {
      throw uploadError("UPLOAD_EMPTY", "Nenhum arquivo no campo `file`.");
    }

    // A dimensão sai dos BYTES, nunca do nome nem do content-type declarado:
    // existe neste repo um `.png` que é JPEG, e o `Content-Type` do multipart é
    // o que o cliente afirma, não o que o arquivo é.
    const probed = probeImage(file.buffer);
    const invalid = validateImage(kind, probed, file.size);
    if (invalid !== null || probed === null) {
      throw uploadError(
        invalid?.code ?? "UPLOAD_NOT_AN_IMAGE",
        invalid?.message ?? "Arquivo inválido.",
      );
    }

    const digest = createHash("sha256").update(file.buffer).digest("hex");
    const key = objectKey(worldId.value, kind, probed.format, digest);
    const url = await this.storage.put(
      key,
      file.buffer,
      `image/${probed.format}`,
    );

    return {
      key,
      url,
      width: probed.width,
      height: probed.height,
      format: probed.format,
      bytes: file.size,
    };
  }
}
