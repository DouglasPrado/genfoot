import { describe, expect, it } from "vitest";

import { probeImage } from "./image-probe.js";

/** PNG mínimo válido: assinatura + IHDR com largura/altura. */
function png(width: number, height: number): Buffer {
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // length do chunk
  ihdr.write("IHDR", 4);
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ihdr,
  ]);
}

/**
 * JPEG mínimo: SOI + um segmento qualquer (para provar que o parser PULA o que
 * não interessa) + SOF0 com as dimensões.
 */
function jpeg(width: number, height: number): Buffer {
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x04, 0x00, 0x00]);
  const sof = Buffer.alloc(11);
  sof.writeUInt16BE(0xffc0, 0);
  sof.writeUInt16BE(9, 2); // length do segmento
  sof.writeUInt8(8, 4); // precisão
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof]);
}

/** WebP (VP8X, o que carrega dimensão explícita em 24 bits menos 1). */
function webp(width: number, height: number): Buffer {
  const b = Buffer.alloc(30);
  b.write("RIFF", 0);
  b.writeUInt32LE(22, 4);
  b.write("WEBP", 8);
  b.write("VP8X", 12);
  b.writeUInt32LE(10, 16);
  b.writeUInt8(0, 20);
  b.writeUIntLE(width - 1, 24, 3);
  b.writeUIntLE(height - 1, 27, 3);
  return b;
}

describe("probeImage", () => {
  describe("PNG", () => {
    it("lê largura e altura do IHDR", () => {
      expect(probeImage(png(1200, 400))).toEqual({
        format: "png",
        width: 1200,
        height: 400,
      });
    });

    it("lê imagem quadrada", () => {
      expect(probeImage(png(512, 512))).toMatchObject({
        width: 512,
        height: 512,
      });
    });
  });

  describe("JPEG", () => {
    it("pula segmentos até achar o SOF", () => {
      expect(probeImage(jpeg(800, 600))).toEqual({
        format: "jpeg",
        width: 800,
        height: 600,
      });
    });

    it("altura vem ANTES da largura no SOF — a ordem é fácil de trocar", () => {
      const probed = probeImage(jpeg(1920, 1080));

      expect(probed?.width).toBe(1920);
      expect(probed?.height).toBe(1080);
    });
  });

  describe("WebP", () => {
    it("lê VP8X, onde a dimensão é o valor guardado + 1", () => {
      expect(probeImage(webp(640, 640))).toEqual({
        format: "webp",
        width: 640,
        height: 640,
      });
    });
  });

  describe("recusa o que não sabe ler", () => {
    it("bytes que não são imagem viram null, não crash", () => {
      expect(probeImage(Buffer.from("isto é um pdf, prometo"))).toBeNull();
    });

    it("buffer vazio", () => {
      expect(probeImage(Buffer.alloc(0))).toBeNull();
    });

    it("PNG truncado no meio do IHDR não inventa dimensão", () => {
      // Um parser desatento leria além do buffer e devolveria lixo — e a
      // validação de "quadrada" passaria por acidente.
      expect(probeImage(png(100, 100).subarray(0, 12))).toBeNull();
    });

    it("JPEG que acaba sem SOF", () => {
      expect(probeImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00]))).toBeNull();
    });

    it("assinatura PNG com dimensão zero é inválida", () => {
      expect(probeImage(png(0, 100))).toBeNull();
    });
  });

  it("não confunde formatos: cada assinatura tem seu leitor", () => {
    expect(probeImage(png(10, 20))?.format).toBe("png");
    expect(probeImage(jpeg(10, 20))?.format).toBe("jpeg");
    expect(probeImage(webp(10, 20))?.format).toBe("webp");
  });
});
