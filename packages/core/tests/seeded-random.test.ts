import { describe, expect, it } from "vitest";

import { SeededRandom } from "../src/index.js";

describe("SeededRandom", () => {
  it("reproduz a mesma sequência para a mesma seed e contexto", () => {
    const first = new SeededRandom({
      worldSeed: "grinta-001",
      context: "world:generation",
    });
    const second = new SeededRandom({
      worldSeed: "grinta-001",
      context: "world:generation",
    });

    expect(Array.from({ length: 8 }, () => first.nextUint32())).toEqual(
      Array.from({ length: 8 }, () => second.nextUint32()),
    );
  });

  it("mantém um golden vector para detectar quebras de replay", () => {
    const random = new SeededRandom({
      worldSeed: "grinta-001",
      context: "golden",
    });

    expect(Array.from({ length: 5 }, () => random.nextUint32())).toEqual([
      4_120_210_218, 1_204_088_772, 1_763_543_957, 329_853_887, 3_418_236_283,
    ]);
  });

  it("isola streams de contextos diferentes", () => {
    const match = new SeededRandom({
      worldSeed: "grinta-001",
      context: "match:1",
    });
    const injury = new SeededRandom({
      worldSeed: "grinta-001",
      context: "injury:1",
    });

    expect(match.nextUint32()).not.toBe(injury.nextUint32());
  });

  it("gera inteiros apenas dentro do intervalo solicitado", () => {
    const random = new SeededRandom({
      worldSeed: "grinta-001",
      context: "range",
    });
    const values = Array.from({ length: 100 }, () => random.nextInt(10, 15));

    expect(values.every((value) => value >= 10 && value < 15)).toBe(true);
  });
});
