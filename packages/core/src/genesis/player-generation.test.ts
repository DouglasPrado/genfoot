import { describe, expect, it } from "vitest";

import {
  GOALKEEPING_ATTRIBUTES,
  MENTAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
  derivePlayerOverall,
} from "../players/player-attributes.js";

import { PlayerPosition } from "./genesis-types.js";
import {
  SQUAD_OVERALL_BUDGET,
  SQUAD_POSITION_TEMPLATE,
  generateSquadAttributes,
} from "./player-generation.js";

describe("geração do elenco inicial (GDD §1 · teto comum de pontos)", () => {
  const elenco = (seed: string, clubIndex = 0) =>
    generateSquadAttributes({ worldSeed: seed, clubIndex });

  it("o template é de 23 jogadores — o número do GDD", () => {
    expect(SQUAD_POSITION_TEMPLATE).toHaveLength(23);
    expect(SQUAD_OVERALL_BUDGET).toBe(1380);
  });

  /**
   * "todos os clubes partem de **1.380 pontos de overall para 23 jogadores**"
   * (`01-mundo-persistente-e-clubes.md:158`). É o teto COMUM: nenhum clube
   * começa mais forte que outro, só diferente.
   *
   * **Exatamente 1.380, não por volta de.** Eu tinha escrito este teste com
   * tolerância de ±23 achando que o arredondamento da nota vazaria; ele não
   * vaza, e a razão é a mesma que faz `shiftToTarget` funcionar: os pesos da
   * R-09 somam 1, então somar δ inteiro a todo atributo move a nota em
   * exatamente δ — `round(x + δ) = round(x) + δ`. Tolerância que não é
   * necessária é regressão que passa despercebida.
   */
  it("todo clube parte dos mesmos 1.380 pontos — exatos", () => {
    for (let clubIndex = 0; clubIndex < 16; clubIndex += 1) {
      const squad = elenco("grinta-demo", clubIndex);
      const total = squad.reduce(
        (sum, p) => sum + derivePlayerOverall(p.position, p.attributes),
        0,
      );
      expect(`clube ${clubIndex}: ${total}`).toBe(
        `clube ${clubIndex}: ${SQUAD_OVERALL_BUDGET}`,
      );
    }
  });

  /**
   * **E é 1.380 para QUALQUER seed, não só a `grinta-demo`.** O argumento do teto
   * exato ignorava o clamp: `shiftToTarget` prende cada atributo em [1, 99], e
   * quando um alvo alto empurra um atributo além de 99 o clamp come pontos e a
   * soma vaza ±1. Era raro (varrendo seeds, só `seed-v6b-alive` clube 1 dava
   * 1.381), mas raro não é nunca: `world:genesis` recusava esses seeds, e criar
   * um mundo com o nome "errado" falhava sem o dono entender por quê. O passo de
   * correção redistribui o resíduo do clamp para jogadores com folga.
   */
  it("é 1.380 para qualquer seed — o clamp não vaza mais", () => {
    const seeds = [
      "grinta-demo",
      "seed-v6b-alive",
      "outra-seed",
      "alpha",
      "zzz-9",
      "clube-forte",
      "beta-1",
      "world-42",
    ];
    for (const seed of seeds) {
      for (let clubIndex = 0; clubIndex < 20; clubIndex += 1) {
        const squad = elenco(seed, clubIndex);
        const total = squad.reduce(
          (sum, p) => sum + derivePlayerOverall(p.position, p.attributes),
          0,
        );
        expect(`${seed}#${clubIndex}: ${total}`).toBe(
          `${seed}#${clubIndex}: ${SQUAD_OVERALL_BUDGET}`,
        );
      }
    }
  });

  /**
   * R-57: "A média-alvo é 60 e a geração deve permanecer em **58–60**, jamais
   * acima de 62". A R-57 é mais estreita que o §1 do GDD, e é ela que vale.
   */
  it("a média fica na banda 58–60 da R-57", () => {
    for (let clubIndex = 0; clubIndex < 16; clubIndex += 1) {
      const squad = elenco("grinta-demo", clubIndex);
      const media =
        squad.reduce(
          (sum, p) => sum + derivePlayerOverall(p.position, p.attributes),
          0,
        ) / squad.length;
      expect(media).toBeGreaterThanOrEqual(58);
      expect(media).toBeLessThanOrEqual(60);
    }
  });

  /**
   * R-57: "predomínio **26–33 anos** (≈70% em 29–33 e ≈30% em 26–28)".
   *
   * O gerador do mundo sorteava idade UNIFORME em 26–33, o que dá ~62%/38% e
   * não é o que a R-57 pede. A curva importa: "o elenco inicial típico é
   * veterano" (§1) é o que força o valor a vir da gestão, não da largada.
   */
  it("a curva etária é a 70/30 da R-57, não um sorteio uniforme", () => {
    const idades = Array.from({ length: 16 }, (_, clubIndex) =>
      elenco("grinta-demo", clubIndex).map((p) => p.age),
    ).flat();

    expect(Math.min(...idades)).toBeGreaterThanOrEqual(26);
    expect(Math.max(...idades)).toBeLessThanOrEqual(33);

    const veteranos = idades.filter((age) => age >= 29 && age <= 33).length;
    const proporcao = veteranos / idades.length;
    expect(proporcao).toBeGreaterThan(0.6);
    expect(proporcao).toBeLessThan(0.8);
  });

  /** "potencial limitado" (R-57): não se compra craque na largada. */
  it("o potencial é limitado e nunca abaixo da nota atual", () => {
    for (const player of elenco("grinta-demo", 0)) {
      const nota = derivePlayerOverall(player.position, player.attributes);
      expect(player.potentialAbility).toBeGreaterThanOrEqual(nota);
      expect(player.potentialAbility).toBeLessThanOrEqual(85);
    }
  });

  /**
   * "variando apenas como esses pontos se dividem entre **defesa, meio, ataque
   * e goleiros**". Mesmo teto, perfis diferentes — senão os 16 clubes são o
   * mesmo clube com outro nome, e escolher clube não é escolha.
   */
  it("clubes diferentes distribuem os mesmos pontos de formas diferentes", () => {
    const perfil = (clubIndex: number) =>
      elenco("grinta-demo", clubIndex)
        .filter((p) => p.position === PlayerPosition.ST)
        .map((p) => derivePlayerOverall(p.position, p.attributes))
        .reduce((a, b) => a + b, 0);

    const perfis = new Set(
      Array.from({ length: 16 }, (_, index) => perfil(index)),
    );
    expect(perfis.size).toBeGreaterThan(1);
  });

  /**
   * O defeito que os testes do teto e da média NÃO pegavam: os dois fechavam
   * com 8 defensores de nota 60 idêntica. Elenco chapado não tem titular nem
   * reserva, e escalar o time deixa de ser decisão.
   */
  it("dentro do mesmo setor os jogadores têm notas diferentes", () => {
    const squad = elenco("grinta-demo", 0);
    const defesa: readonly PlayerPosition[] = [
      PlayerPosition.CB,
      PlayerPosition.LB,
      PlayerPosition.RB,
    ];
    const defensores = squad
      .filter((p) => defesa.includes(p.position))
      .map((p) => derivePlayerOverall(p.position, p.attributes));

    expect(defensores.length).toBeGreaterThan(4);
    expect(new Set(defensores).size).toBeGreaterThan(1);
  });

  /** "O elenco inicial típico é veterano e **equilibrado**" — não uma escada. */
  it("mas a diferença dentro do setor é de elenco, não de abismo", () => {
    const squad = elenco("grinta-demo", 0);
    const notas = squad.map((p) => derivePlayerOverall(p.position, p.attributes));
    expect(Math.max(...notas) - Math.min(...notas)).toBeLessThanOrEqual(25);
  });

  it("é determinístico: a mesma seed dá o mesmo elenco", () => {
    expect(elenco("grinta-demo", 3)).toEqual(elenco("grinta-demo", 3));
  });

  it("seeds diferentes dão elencos diferentes", () => {
    expect(elenco("grinta-demo", 0)).not.toEqual(elenco("outra-seed", 0));
  });

  describe("o grid de cada jogador", () => {
    const squad = generateSquadAttributes({
      worldSeed: "grinta-demo",
      clubIndex: 0,
    });

    it("tem os 31 atributos de linha em todo jogador, na escala 0–100", () => {
      for (const player of squad) {
        for (const code of [
          ...TECHNICAL_ATTRIBUTES,
          ...PHYSICAL_ATTRIBUTES,
          ...MENTAL_ATTRIBUTES,
        ]) {
          const value = player.attributes[code];
          expect(Number.isSafeInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
        }
      }
    });

    /** `null` não é `0`: zero diria "péssimo goleiro"; null diz "não se aplica". */
    it("só o goleiro tem grid de goleiro; nos outros é null", () => {
      for (const player of squad) {
        const isGK = player.position === PlayerPosition.GK;
        for (const code of GOALKEEPING_ATTRIBUTES) {
          if (isGK) expect(player.attributes[code]).not.toBeNull();
          else expect(player.attributes[code]).toBeNull();
        }
      }
    });

    it("tem os 2 goleiros do template", () => {
      expect(squad.filter((p) => p.position === PlayerPosition.GK)).toHaveLength(
        2,
      );
    });

    /**
     * O arquétipo tem de aparecer: um zagueiro marca melhor do que finaliza.
     * Sem isso o grid é ruído com 39 colunas — e a R-179 queria o oposto.
     */
    it("o zagueiro marca melhor do que finaliza", () => {
      const zagueiros = squad.filter((p) => p.position === PlayerPosition.CB);
      expect(zagueiros.length).toBeGreaterThan(0);
      for (const cb of zagueiros) {
        expect(cb.attributes.marking).toBeGreaterThan(cb.attributes.finishing);
      }
    });

    it("o atacante finaliza melhor do que marca", () => {
      for (const st of squad.filter((p) => p.position === PlayerPosition.ST)) {
        expect(st.attributes.finishing).toBeGreaterThan(st.attributes.marking);
      }
    });
  });
});
