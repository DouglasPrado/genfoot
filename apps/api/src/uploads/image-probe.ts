/**
 * Dimensão e formato de uma imagem, lidos dos bytes.
 *
 * Existe porque "foto quadrada" é uma regra que só o servidor pode impor: o
 * `accept` do input e qualquer checagem no browser são cortesia, e quem manda um
 * `curl` passa por cima delas.
 *
 * **Sem dependência**: são três cabeçalhos e um laço. Um pacote de terceiros
 * aqui traria superfície (e às vezes binário nativo) para ler 8 bytes. O que
 * este módulo NÃO faz é decodificar a imagem — ele lê o cabeçalho e confia nele.
 * Um arquivo com cabeçalho válido e corpo corrompido passa daqui; o R2 guarda, e
 * o browser é quem não renderiza. Para o caso de uso — admin subindo banner — o
 * cabeçalho é a fronteira certa.
 */

export type ImageFormat = "png" | "jpeg" | "webp";

export interface ProbedImage {
  readonly format: ImageFormat;
  readonly width: number;
  readonly height: number;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function probePng(buffer: Buffer): ProbedImage | null {
  // 8 (assinatura) + 4 (length) + 4 ("IHDR") + 4 (largura) + 4 (altura) = 24.
  // Sem esta guarda, um PNG truncado leria além do buffer e devolveria lixo — e
  // "quadrada" passaria por acidente.
  if (buffer.length < 24) return null;
  if (buffer.subarray(12, 16).toString("ascii") !== "IHDR") return null;
  return finite("png", buffer.readUInt32BE(16), buffer.readUInt32BE(20));
}

function probeJpeg(buffer: Buffer): ProbedImage | null {
  // O JPEG é uma corrente de segmentos: cada um tem marcador (0xFF??) e tamanho.
  // A dimensão mora no SOF, que pode estar depois de vários outros. Daí o laço.
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1] ?? 0;
    const length = buffer.readUInt16BE(offset + 2);

    // SOF0..SOF15, exceto DHT (0xC4), JPG (0xC8) e DAC (0xCC), que não são SOF.
    const isStartOfFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;

    if (isStartOfFrame) {
      // Altura ANTES da largura. Trocar as duas é o erro clássico aqui, e passa
      // despercebido em qualquer imagem quadrada — inclusive na que a tela pede.
      return finite(
        "jpeg",
        buffer.readUInt16BE(offset + 7),
        buffer.readUInt16BE(offset + 5),
      );
    }
    offset += 2 + length;
  }
  return null;
}

function probeWebp(buffer: Buffer): ProbedImage | null {
  if (buffer.length < 30) return null;
  if (buffer.subarray(12, 16).toString("ascii") !== "VP8X") return null;
  // VP8X guarda "dimensão menos 1" em 24 bits little-endian.
  return finite(
    "webp",
    buffer.readUIntLE(24, 3) + 1,
    buffer.readUIntLE(27, 3) + 1,
  );
}

/** Dimensão zero é arquivo inválido, não imagem de 0px. */
function finite(
  format: ImageFormat,
  width: number,
  height: number,
): ProbedImage | null {
  if (width <= 0 || height <= 0) return null;
  return { format, width, height };
}

export function probeImage(buffer: Buffer): ProbedImage | null {
  if (buffer.length < 12) return null;

  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return probePng(buffer);
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return probeJpeg(buffer);
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return probeWebp(buffer);
  }
  return null;
}
