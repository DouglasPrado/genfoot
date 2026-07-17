import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Injectable } from "@nestjs/common";

/**
 * O R2, atrás de uma porta estreita: gravar um objeto e dizer a URL pública.
 *
 * **A ausência de configuração NÃO derruba o boot.** O R2 é dependência
 * não-crítica por decisão de arquitetura — "Falha do R2: uploads/downloads
 * indisponíveis, mas partidas, contratos e finanças continuam"
 * (`00-arquitetura-geral.md:277`). Derrubar a API inteira porque falta
 * `R2_BUCKET` transformaria um recurso opcional em pré-requisito de tudo. Então
 * o serviço nasce desligado e diz isso a quem tentar usá-lo, em vez de mentir
 * com um erro genérico no meio do upload.
 *
 * Isto contrasta de propósito com `DATABASE_URL`, que derruba o boot
 * (`core.module.ts:50`): sem Postgres não há mundo nenhum, e falhar cedo é o
 * certo. A diferença entre as duas é o que cada dependência sustenta.
 */
@Injectable()
export class R2Storage {
  readonly #client: S3Client | null;
  readonly #bucket: string;
  readonly #cdnUrl: string;

  public constructor() {
    const endpoint = process.env.R2_ENDPOINT ?? "";
    const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? "";
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? "";
    this.#bucket = process.env.R2_BUCKET ?? "";
    // Sem CDN o objeto seria gravado e inalcançável — pior que não gravar.
    this.#cdnUrl = (process.env.R2_CDN_URL ?? "").replace(/\/+$/, "");

    const configured =
      endpoint !== "" &&
      accessKeyId !== "" &&
      secretAccessKey !== "" &&
      this.#bucket !== "" &&
      this.#cdnUrl !== "";

    this.#client = configured
      ? new S3Client({
          // R2 ignora região, mas o SDK exige uma.
          region: "auto",
          endpoint,
          credentials: { accessKeyId, secretAccessKey },
        })
      : null;
  }

  public get available(): boolean {
    return this.#client !== null;
  }

  /**
   * Grava e devolve a URL pública. Só é chamado depois de a imagem passar em
   * `validateImage` — nenhum objeto reprovado chega ao bucket, e por isso não há
   * órfão para uma rotina de retenção limpar.
   */
  public async put(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    const client = this.#client;
    if (client === null) {
      throw new Error("R2 não configurado.");
    }
    await client.send(
      new PutObjectCommand({
        Bucket: this.#bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // O digest do conteúdo está na chave, então o objeto é imutável: conteúdo
        // novo ganha chave nova. Cache longo é seguro e evita ida ao origin.
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return this.publicUrl(key);
  }

  /**
   * A URL de leitura. Só a borda faz isso: o agregado guarda a chave, e é o que
   * o mantém livre do CDN de outro projeto.
   */
  public publicUrl(key: string): string {
    return `${this.#cdnUrl}/${key}`;
  }
}
