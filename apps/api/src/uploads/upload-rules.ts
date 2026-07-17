import type { ImageFormat, ProbedImage } from "./image-probe.js";

/**
 * As regras do que entra no bucket. Puras: recebem o que o probe leu e devolvem
 * o erro, ou `null`.
 *
 * Rodam ANTES de o objeto existir no R2. É a vantagem de o upload passar pela
 * API em vez de ir direto do browser com presigned: imagem reprovada não vira
 * lixo para uma rotina de retenção limpar depois — ela simplesmente não é
 * gravada.
 */

export type ImageKind = "banner" | "squarePhoto";

export interface UploadError {
  readonly code: string;
  readonly message: string;
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Mínimos por tipo: abaixo disso a imagem não serve para o lugar que ocupa. */
const MIN_SIZE: Record<ImageKind, { width: number; height: number }> = {
  banner: { width: 600, height: 200 },
  squarePhoto: { width: 128, height: 128 },
};

/**
 * Quanto os lados podem divergir e ainda ser "quadrada".
 *
 * Exatidão seria pedantismo: quem recorta um logo à mão erra um pixel, e a
 * imagem é quadrada para qualquer olho. 2% recusa 512×560 e aceita 512×513.
 */
const SQUARE_TOLERANCE = 0.02;

export function validateImage(
  kind: ImageKind,
  probed: ProbedImage | null,
  byteLength: number,
): UploadError | null {
  if (byteLength === 0) {
    return { code: "UPLOAD_EMPTY", message: "O arquivo está vazio." };
  }
  if (byteLength > MAX_UPLOAD_BYTES) {
    return {
      code: "UPLOAD_TOO_LARGE",
      message: `A imagem passa de ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
    };
  }
  if (probed === null) {
    return {
      code: "UPLOAD_NOT_AN_IMAGE",
      message: "O arquivo não é um PNG, JPEG ou WebP válido.",
    };
  }

  // A FORMA vem antes do tamanho, e a ordem importa para quem lê o erro: um
  // banner 400×1200 é estreito E retrato, mas dizer "mínimo 600×200" para quem
  // mandou uma imagem de 1200px de altura confunde. O problema real é a forma.
  if (kind === "squarePhoto") {
    const ratio =
      Math.abs(probed.width - probed.height) /
      Math.max(probed.width, probed.height);
    if (ratio > SQUARE_TOLERANCE) {
      return {
        code: "UPLOAD_NOT_SQUARE",
        message: `A foto tem que ser quadrada; recebi ${probed.width}×${probed.height}.`,
      };
    }
  }

  if (kind === "banner" && probed.width <= probed.height) {
    return {
      code: "UPLOAD_NOT_LANDSCAPE",
      message: `O banner tem que ser mais largo que alto; recebi ${probed.width}×${probed.height}.`,
    };
  }

  const min = MIN_SIZE[kind];
  if (probed.width < min.width || probed.height < min.height) {
    return {
      code: "UPLOAD_TOO_SMALL",
      message: `Mínimo ${min.width}×${min.height}; recebi ${probed.width}×${probed.height}.`,
    };
  }

  return null;
}

/**
 * A chave do objeto no bucket.
 *
 * **Prefixo `grinta/` obrigatório**: o bucket `images` é servido por
 * `cdn.oggiadmin.com.br` e pertence a outro projeto. Sem namespace, um mundo
 * poderia sobrescrever objeto alheio.
 *
 * A extensão sai do formato SNIFADO, nunca do nome do arquivo — existe neste
 * repo um `.png` que é JPEG (`docs/04-ui-ux/Prototipo`), e confiar no nome
 * gravaria a extensão errada no CDN.
 *
 * O digest do conteúdo entra na chave: conteúdo igual reaproveita o objeto (não
 * polui o bucket), conteúdo novo gera chave nova (e o CDN não serve cache velho).
 */
export function objectKey(
  worldId: string,
  kind: ImageKind,
  format: ImageFormat,
  contentDigest: string,
): string {
  return `grinta/worlds/${worldId}/${kind}-${contentDigest.slice(0, 16)}.${format}`;
}
