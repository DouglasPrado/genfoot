import { describe, expect, it } from "vitest";

import {
  identityPayload,
  identityViolations,
  NAME_MAX,
  DESCRIPTION_MAX,
} from "./world-identity-model";

const CURRENT = {
  name: "Série R",
  description: "Mundo de calibração.",
  bannerKey: "grinta/worlds/w1/banner-aaa.png",
  squarePhotoKey: null,
};

const DRAFT = {
  name: CURRENT.name,
  description: CURRENT.description,
  bannerKey: CURRENT.bannerKey,
  squarePhotoKey: CURRENT.squarePhotoKey,
};

describe("identityPayload", () => {
  it("nada mudou: não manda command", () => {
    expect(identityPayload(CURRENT, { ...DRAFT })).toBeNull();
  });

  it("manda SÓ o campo que mudou", () => {
    expect(identityPayload(CURRENT, { ...DRAFT, name: "Série R — Beta" })).toEqual(
      { name: "Série R — Beta" },
    );
  });

  it("os dois mudaram: manda os dois", () => {
    expect(identityPayload(CURRENT, { ...DRAFT, name: "A", description: "B" })).toEqual({
      name: "A",
      description: "B",
    });
  });

  describe("vazio: limpar é diferente de nunca ter tido", () => {
    it("apagar o texto de um campo preenchido manda null — o comando de limpar", () => {
      expect(identityPayload(CURRENT, { ...DRAFT, name: "" })).toEqual({
        name: null,
      });
    });

    it("campo já vazio que segue vazio não é mudança", () => {
      // Sem isto, abrir a tela de um mundo sem nome e salvar mandaria
      // `{name: null}` — um command que não muda nada e gasta uma revisão.
      const semNome = {
        name: null,
        description: null,
        bannerKey: null,
        squarePhotoKey: null,
      };

      expect(
        identityPayload(semNome, {
          name: "",
          description: "",
          bannerKey: null,
          squarePhotoKey: null,
        }),
      ).toBeNull();
    });

    it("só espaços conta como vazio: o domínio apara igual", () => {
      expect(identityPayload(CURRENT, { ...DRAFT, name: "   " })).toEqual({
        name: null,
      });
    });
  });

  describe("espaços nas pontas não são mudança", () => {
    it("o mesmo texto com espaço em volta não manda command", () => {
      // O domínio apara antes de comparar. Se a tela mandasse, o servidor
      // gravaria o mesmo valor e queimaria uma revisão à toa.
      expect(
        identityPayload(CURRENT, { ...DRAFT, name: "  Série R  " }),
      ).toBeNull();
    });

    it("manda o texto aparado, não o cru", () => {
      expect(
        identityPayload(CURRENT, { ...DRAFT, name: "  Novo  " }),
      ).toEqual({ name: "Novo" });
    });
  });
});

describe("identityViolations", () => {
  it("texto dentro do limite não viola", () => {
    expect(
      identityViolations({ name: "ok", description: "ok", bannerKey: null, squarePhotoKey: null }),
    ).toEqual([]);
  });

  it("nomeia o campo que passou do limite", () => {
    const violations = identityViolations({
      name: "x".repeat(NAME_MAX + 1),
      description: "",
      bannerKey: null,
      squarePhotoKey: null,
    });

    expect(violations).toHaveLength(1);
    expect(violations[0]?.field).toBe("name");
  });

  it("descrição longa demais também", () => {
    const violations = identityViolations({
      name: "",
      description: "x".repeat(DESCRIPTION_MAX + 1),
      bannerKey: null,
      squarePhotoKey: null,
    });

    expect(violations[0]?.field).toBe("description");
  });

  it("o limite exato passa: o erro é PASSAR, não alcançar", () => {
    expect(
      identityViolations({
        name: "x".repeat(NAME_MAX),
        description: "x".repeat(DESCRIPTION_MAX),
        bannerKey: null,
        squarePhotoKey: null,
      }),
    ).toEqual([]);
  });

  it("mede o texto APARADO — espaço na ponta não reprova", () => {
    // O domínio apara e só então mede. Se a tela medisse o cru, ela barraria um
    // nome que o servidor aceitaria.
    expect(
      identityViolations({
        name: `  ${"x".repeat(NAME_MAX)}  `,
        description: "",
        bannerKey: null,
        squarePhotoKey: null,
      }),
    ).toEqual([]);
  });

  it("imagem: trocar a chave do banner é mudança", () => {
    expect(
      identityPayload(CURRENT, { ...DRAFT, bannerKey: "grinta/worlds/w1/banner-bbb.png" }),
    ).toEqual({ bannerKey: "grinta/worlds/w1/banner-bbb.png" });
  });

  it("imagem: remover manda null — o comando de limpar", () => {
    expect(identityPayload(CURRENT, { ...DRAFT, bannerKey: null })).toEqual({
      bannerKey: null,
    });
  });

  it("imagem: a mesma chave não é mudança", () => {
    expect(identityPayload(CURRENT, { ...DRAFT })).toBeNull();
  });

  it("imagem: subir a foto que faltava manda só ela", () => {
    // `squarePhotoKey` era null no mundo; o banner não mudou. Um payload que
    // mandasse o banner junto reescreveria o mesmo valor à toa.
    expect(
      identityPayload(CURRENT, { ...DRAFT, squarePhotoKey: "grinta/worlds/w1/squarePhoto-ccc.png" }),
    ).toEqual({ squarePhotoKey: "grinta/worlds/w1/squarePhoto-ccc.png" });
  });

  it("os limites são os do domínio", () => {
    // WORLD_NAME_MAX_LENGTH / WORLD_DESCRIPTION_MAX_LENGTH em world-types.ts.
    // Divergir daqui faz a tela barrar o que o servidor aceita, ou pior: deixar
    // passar o que ele recusa, e o operador leva INVALID_WORLD_NAME sem saber.
    expect(NAME_MAX).toBe(60);
    expect(DESCRIPTION_MAX).toBe(500);
  });
});
