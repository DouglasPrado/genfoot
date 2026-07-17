import { describe, expect, it } from "vitest";

import { PlayerPosition } from "../genesis/genesis-types.js";

import {
  GOALKEEPING_ATTRIBUTES,
  MENTAL_ATTRIBUTES,
  OVERALL_WEIGHTS,
  PHYSICAL_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
  derivePlayerOverall,
  rollupAttributes,
  type PlayerAttributes,
} from "./player-attributes.js";

/** Um jogador de linha com todo atributo no mesmo valor — facilita a álgebra. */
function flat(value: number, goalkeeping: number | null = null): PlayerAttributes {
  const grid = Object.fromEntries(
    [...TECHNICAL_ATTRIBUTES, ...PHYSICAL_ATTRIBUTES, ...MENTAL_ATTRIBUTES].map(
      (code) => [code, value],
    ),
  );
  const gk = Object.fromEntries(
    GOALKEEPING_ATTRIBUTES.map((code) => [code, goalkeeping]),
  );
  return { ...grid, ...gk } as PlayerAttributes;
}

describe("o grid canônico (R-188 · GDD §2)", () => {
  /**
   * A §2 do GDD é a fonte única, e a contagem é dela: 12 técnicos, 9 físicos,
   * 10 mentais, 8 de goleiro. Este teste é o que impede o grid do Football
   * Manager de voltar por descuido.
   */
  it("tem 12 técnicos, 9 físicos, 10 mentais e 8 de goleiro", () => {
    expect(TECHNICAL_ATTRIBUTES).toHaveLength(12);
    expect(PHYSICAL_ATTRIBUTES).toHaveLength(9);
    expect(MENTAL_ATTRIBUTES).toHaveLength(10);
    expect(GOALKEEPING_ATTRIBUTES).toHaveLength(8);
  });

  it("não tem nenhum atributo do Football Manager", () => {
    const todos: readonly string[] = [
      ...TECHNICAL_ATTRIBUTES,
      ...PHYSICAL_ATTRIBUTES,
      ...MENTAL_ATTRIBUTES,
    ];
    // `aggression` é traço no GDD ("temperamento"), não atributo: tem
    // visibilidade e não sobe com treino. Os outros são nomes do FM sem
    // contraparte na §2.
    for (const fm of ["technique", "flair", "teamwork", "workRate", "aggression"]) {
      expect(todos).not.toContain(fm);
    }
  });

  it("tem os que o GDD define e o schema não tinha", () => {
    expect(TECHNICAL_ATTRIBUTES).toContain("setPieces"); // bola parada
    expect(TECHNICAL_ATTRIBUTES).toContain("vision"); // visão de jogo
    expect(TECHNICAL_ATTRIBUTES).toContain("shortPassing"); // passe curto…
    expect(TECHNICAL_ATTRIBUTES).toContain("longPassing"); // …e lançamento
    expect(PHYSICAL_ATTRIBUTES).toContain("explosiveness"); // explosão
    expect(PHYSICAL_ATTRIBUTES).toContain("recovery"); // recuperação física
    expect(MENTAL_ATTRIBUTES).toContain("consistency"); // regularidade
    expect(MENTAL_ATTRIBUTES).toContain("resilience"); // resiliência
  });

  /** "inteligência tática (leitura de jogo / posicionamento)" — ler o jogo não é gesto técnico. */
  it("põe posicionamento entre os mentais, não entre os técnicos", () => {
    expect(MENTAL_ATTRIBUTES).toContain("positioning");
    expect(TECHNICAL_ATTRIBUTES).not.toContain("positioning");
  });
});

describe("rollup dos 4 grupos (R-179)", () => {
  it("é a média do bloco, não a fonte", () => {
    const rollup = rollupAttributes(flat(70, 40));
    expect(rollup.technical).toBe(70);
    expect(rollup.physical).toBe(70);
    expect(rollup.mental).toBe(70);
    expect(rollup.goalkeeping).toBe(40);
  });

  /** Jogador de linha não tem grid de goleiro — e `0` mentiria, seria "péssimo goleiro". */
  it("goleiro é null em quem não é goleiro", () => {
    expect(rollupAttributes(flat(70)).goalkeeping).toBeNull();
  });
});

describe("overall por posição (R-09)", () => {
  /** R-09: "atacante = 0,45 técnico + 0,20 físico + 0,20 mental + 0,15 finalização-específica". */
  it("o atacante é o da R-09, ao pé da letra", () => {
    const pesos = OVERALL_WEIGHTS[PlayerPosition.ST];
    expect(pesos.technical).toBe(0.45);
    expect(pesos.physical).toBe(0.2);
    expect(pesos.mental).toBe(0.2);
    expect(pesos.specific).toBe(0.15);
    expect(pesos.specificAttribute).toBe("finishing");
  });

  /** R-09: "goleiro = 0,60 grid de goleiro + 0,25 mental + 0,15 físico". */
  it("o goleiro é o da R-09, ao pé da letra", () => {
    const pesos = OVERALL_WEIGHTS[PlayerPosition.GK];
    expect(pesos.goalkeeping).toBe(0.6);
    expect(pesos.mental).toBe(0.25);
    expect(pesos.physical).toBe(0.15);
    expect(pesos.technical).toBe(0);
  });

  /**
   * A invariante que vale para as 15 posições, não só para as duas que a R-09
   * ancora: peso que não soma 1 não é média ponderada — é escala arbitrária, e
   * uma posição sairia sistematicamente mais forte que a outra.
   */
  it("todo peso soma exatamente 1", () => {
    for (const position of Object.values(PlayerPosition)) {
      const w = OVERALL_WEIGHTS[position];
      const soma = w.technical + w.physical + w.mental + w.goalkeeping + w.specific;
      expect(`${position}: ${soma.toFixed(4)}`).toBe(`${position}: 1.0000`);
    }
  });

  it("todo grid no mesmo valor devolve esse valor, em qualquer posição", () => {
    for (const position of Object.values(PlayerPosition)) {
      expect(derivePlayerOverall(position, flat(70, 70))).toBe(70);
    }
  });

  /** Um zagueiro com marcação alta vale mais que um com marcação baixa, tudo o mais igual. */
  it("o atributo específico da posição move a nota", () => {
    const base = flat(60);
    const marcador = { ...base, marking: 90 };
    expect(derivePlayerOverall(PlayerPosition.CB, marcador)).toBeGreaterThan(
      derivePlayerOverall(PlayerPosition.CB, base),
    );
  });

  /**
   * O ponto da R-09: "ancorar os pesos na posição impede que um atributo
   * irrelevante para a função infle a nota".
   *
   * **Impede não é zera**, e a diferença é a forma que a R-09 ratificou: o peso
   * é sobre os GRUPOS mais um específico, então finalização entra na nota do
   * zagueiro pelo rollup técnico — ela só não pesa como marcação pesa. Eu tinha
   * escrito este teste exigindo nota IDÊNTICA, que é mais forte do que o canon
   * promete; ele falhou, e o errado era a asserção.
   *
   * O mesmo salto de +30: em marcação move ~5 pontos (0,15 específico + rollup),
   * em finalização move ~0,75 (só rollup, diluído por 12 técnicos).
   */
  it("o específico da posição pesa muito mais que um atributo alheio à função", () => {
    const base = flat(60);
    const zagueiroQueMarca = derivePlayerOverall(PlayerPosition.CB, {
      ...base,
      marking: 90,
    });
    const zagueiroQueChuta = derivePlayerOverall(PlayerPosition.CB, {
      ...base,
      finishing: 90,
    });
    const nota = derivePlayerOverall(PlayerPosition.CB, base);

    expect(zagueiroQueMarca - nota).toBeGreaterThan(4);
    expect(zagueiroQueChuta - nota).toBeLessThanOrEqual(1);
  });

  /**
   * O grid de goleiro pesa 0,60 no goleiro (R-09) e ZERO em todo o resto. Um
   * atacante com reflexos de goleiro não é melhor atacante.
   */
  it("o grid de goleiro não conta para quem não é goleiro", () => {
    const atacante = flat(60);
    const comReflexos = flat(60, 99);
    expect(derivePlayerOverall(PlayerPosition.ST, comReflexos)).toBe(
      derivePlayerOverall(PlayerPosition.ST, atacante),
    );
  });

  /** Goleiro sem grid de goleiro é dado incoerente — não uma nota baixa. */
  it("goleiro sem grid de goleiro é recusado, não vira nota", () => {
    expect(() => derivePlayerOverall(PlayerPosition.GK, flat(70))).toThrow(
      /goleiro/iu,
    );
  });
});
