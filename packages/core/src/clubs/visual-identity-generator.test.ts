import { describe, expect, it } from "vitest";

import {
  CLUB_PALETTE,
  generateClubVisualIdentity,
} from "./visual-identity-generator.js";
import {
  CREST_TEMPLATES,
  KIT_TEMPLATES,
  isHexColor,
} from "./visual-identity-catalog.js";

const SEED = "seed-alfa";

describe("generateClubVisualIdentity", () => {
  it("é determinístico: mesmo seed e índice, mesma identidade", () => {
    // É a propriedade que justifica gerar no domínio em vez do cliente: replay
    // do mundo reproduz o mesmo escudo, e dois aparelhos veem o mesmo clube.
    const primeira = generateClubVisualIdentity(SEED, 3);
    const segunda = generateClubVisualIdentity(SEED, 3);
    expect(primeira).toEqual(segunda);
  });

  it("muda com o índice do clube", () => {
    const a = generateClubVisualIdentity(SEED, 0);
    const b = generateClubVisualIdentity(SEED, 1);
    expect(a).not.toEqual(b);
  });

  it("muda com o seed do mundo", () => {
    const a = generateClubVisualIdentity("seed-alfa", 0);
    const b = generateClubVisualIdentity("seed-beta", 0);
    expect(a).not.toEqual(b);
  });

  it("só emite template do catálogo canônico", () => {
    const ids = CREST_TEMPLATES.map((template) => template.id);
    for (let index = 0; index < 40; index += 1) {
      const identity = generateClubVisualIdentity(SEED, index);
      expect(ids).toContain(identity.crestTemplateId);
    }
  });

  it("emite sempre cores hex válidas", () => {
    for (let index = 0; index < 40; index += 1) {
      const identity = generateClubVisualIdentity(SEED, index);
      expect(isHexColor(identity.primaryColor)).toBe(true);
      expect(isHexColor(identity.secondaryColor)).toBe(true);
      expect(isHexColor(identity.tertiaryColor)).toBe(true);
    }
  });

  it("nunca repete a mesma cor nos três slots", () => {
    // Escudo de uma cor só é escudo invisível: o desenho depende do contraste
    // entre os slots.
    for (let index = 0; index < 40; index += 1) {
      const { primaryColor, secondaryColor, tertiaryColor } =
        generateClubVisualIdentity(SEED, index);
      expect(new Set([primaryColor, secondaryColor, tertiaryColor]).size).toBe(
        3,
      );
    }
  });

  it("usa só cores da paleta canônica", () => {
    for (let index = 0; index < 40; index += 1) {
      const identity = generateClubVisualIdentity(SEED, index);
      expect(CLUB_PALETTE).toContain(identity.primaryColor);
      expect(CLUB_PALETTE).toContain(identity.secondaryColor);
      expect(CLUB_PALETTE).toContain(identity.tertiaryColor);
    }
  });

  it("distribui: 20 clubes não saem todos iguais", () => {
    // Um gerador que colapsa numa combinação só passaria em todos os testes
    // acima e entregaria 20 escudos idênticos na tela.
    const identidades = Array.from({ length: 20 }, (_, index) =>
      generateClubVisualIdentity(SEED, index),
    );
    const distintas = new Set(
      identidades.map(
        (i) => `${i.crestTemplateId}|${i.primaryColor}|${i.secondaryColor}`,
      ),
    );
    expect(distintas.size).toBeGreaterThanOrEqual(15);
  });

  it("só emite kits do catálogo canônico", () => {
    const ids = KIT_TEMPLATES.map((template) => template.id);
    for (let index = 0; index < 40; index += 1) {
      const identity = generateClubVisualIdentity(SEED, index);
      expect(ids).toContain(identity.homeKitTemplateId);
      expect(ids).toContain(identity.awayKitTemplateId);
    }
  });

  it("dá kits diferentes para casa e fora", () => {
    // Dois kits iguais tornam o jogo ilegível quando os dois times se enfrentam.
    for (let index = 0; index < 40; index += 1) {
      const identity = generateClubVisualIdentity(SEED, index);
      expect(identity.homeKitTemplateId).not.toBe(identity.awayKitTemplateId);
    }
  });

  it("rejeita índice negativo", () => {
    expect(() => generateClubVisualIdentity(SEED, -1)).toThrow();
  });

  it("rejeita seed vazio", () => {
    expect(() => generateClubVisualIdentity("", 0)).toThrow();
  });
});
