import { describe, expect, it } from "vitest";

import {
  MAX_UPLOAD_BYTES,
  objectKey,
  validateImage,
  type ImageKind,
} from "./upload-rules.js";

function square(size: number) {
  return { format: "png" as const, width: size, height: size };
}

describe("validateImage", () => {
  describe("tamanho do arquivo", () => {
    it("aceita dentro do limite", () => {
      expect(
        validateImage("squarePhoto", square(512), MAX_UPLOAD_BYTES),
      ).toBeNull();
    });

    it("recusa acima do limite, e diz o limite", () => {
      const error = validateImage("squarePhoto", square(512), MAX_UPLOAD_BYTES + 1);

      expect(error?.code).toBe("UPLOAD_TOO_LARGE");
      expect(error?.message).toContain("5");
    });

    it("recusa arquivo vazio", () => {
      expect(validateImage("squarePhoto", square(512), 0)?.code).toBe(
        "UPLOAD_EMPTY",
      );
    });
  });

  describe("formato", () => {
    it("recusa o que o probe não reconheceu", () => {
      // `null` = os bytes não são png/jpeg/webp. Um .png que na verdade é PDF
      // cai aqui — a extensão mente, o conteúdo não.
      const error = validateImage("squarePhoto", null, 1000);

      expect(error?.code).toBe("UPLOAD_NOT_AN_IMAGE");
    });
  });

  describe("foto quadrada", () => {
    it("aceita quadrada", () => {
      expect(validateImage("squarePhoto", square(512), 1000)).toBeNull();
    });

    it("recusa retangular, e diz as dimensões que recebeu", () => {
      const error = validateImage(
        "squarePhoto",
        { format: "png", width: 800, height: 400 },
        1000,
      );

      expect(error?.code).toBe("UPLOAD_NOT_SQUARE");
      expect(error?.message).toContain("800");
      expect(error?.message).toContain("400");
    });

    it("tolera 1px de diferença: 512x513 é quadrada o suficiente", () => {
      // Exatidão aqui é pedantismo que só irrita: quem recorta um logo a mão
      // erra um pixel, e a imagem é quadrada para qualquer olho.
      expect(
        validateImage("squarePhoto", { format: "png", width: 512, height: 513 }, 1000),
      ).toBeNull();
    });

    it("não tolera desvio grande disfarçado de arredondamento", () => {
      expect(
        validateImage("squarePhoto", { format: "png", width: 512, height: 560 }, 1000),
      ).not.toBeNull();
    });

    it("recusa pequena demais para servir de foto", () => {
      expect(validateImage("squarePhoto", square(64), 1000)?.code).toBe(
        "UPLOAD_TOO_SMALL",
      );
    });
  });

  describe("banner", () => {
    it("aceita paisagem", () => {
      expect(
        validateImage("banner", { format: "png", width: 1200, height: 400 }, 1000),
      ).toBeNull();
    });

    it("recusa retrato: banner é faixa, não pôster", () => {
      const error = validateImage(
        "banner",
        { format: "png", width: 400, height: 1200 },
        1000,
      );

      expect(error?.code).toBe("UPLOAD_NOT_LANDSCAPE");
    });

    it("recusa quadrada como banner", () => {
      expect(validateImage("banner", square(800), 1000)?.code).toBe(
        "UPLOAD_NOT_LANDSCAPE",
      );
    });

    it("recusa estreita demais", () => {
      expect(
        validateImage("banner", { format: "png", width: 300, height: 100 }, 1000)
          ?.code,
      ).toBe("UPLOAD_TOO_SMALL");
    });
  });

  it("as regras de cada tipo são independentes: quadrada só vale para a foto", () => {
    const quadrada = square(800);

    expect(validateImage("squarePhoto", quadrada, 1000)).toBeNull();
    expect(validateImage("banner", quadrada, 1000)).not.toBeNull();
  });
});

describe("objectKey", () => {
  const WORLD = "019f6da3-63a0-701c-b2a3-5763917a6c1b";

  it("namespaceia sob grinta/: o bucket é compartilhado com outro projeto", () => {
    // O bucket `images` é servido por cdn.oggiadmin.com.br e não é do Grinta.
    // Sem prefixo, um mundo poderia sobrescrever objeto alheio.
    expect(objectKey(WORLD, "banner", "png", "abc123")).toMatch(/^grinta\//);
  });

  it("separa por mundo e por tipo", () => {
    const key = objectKey(WORLD, "banner", "png", "abc123");

    expect(key).toContain(WORLD);
    expect(key).toContain("banner");
  });

  it("a extensão vem do formato SNIFADO, não do nome do arquivo", () => {
    // O `.png` que era JPEG existe de verdade neste repo (um protótipo em
    // docs/04-ui-ux). Confiar no nome gravaria a extensão errada no CDN.
    expect(objectKey(WORLD, "banner", "jpeg", "abc123")).toMatch(/\.jpeg$/);
  });

  it("o digest entra na chave: conteúdo novo, objeto novo", () => {
    const a = objectKey(WORLD, "banner", "png", "aaa");
    const b = objectKey(WORLD, "banner", "png", "bbb");

    expect(a).not.toBe(b);
  });

  it("mesmo conteúdo gera a mesma chave: reenviar não polui o bucket", () => {
    expect(objectKey(WORLD, "banner", "png", "abc")).toBe(
      objectKey(WORLD, "banner", "png", "abc"),
    );
  });

  it("tipos diferentes não colidem", () => {
    const kinds: readonly ImageKind[] = ["banner", "squarePhoto"];
    const keys = kinds.map((k) => objectKey(WORLD, k, "png", "mesmo-digest"));

    expect(new Set(keys).size).toBe(2);
  });
});
