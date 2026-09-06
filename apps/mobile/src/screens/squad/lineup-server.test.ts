import { describe, expect, it } from "vitest";

import {
  hydrateFromServerLineup,
  nextLineupVersion,
  reconcileLineupVersion,
  selectionDiffers,
  serverLineupDiffers,
  shouldRetryAfterConflict,
  setLineupPayload,
  type ServerLineup,
} from "./lineup-server";

const ids = (n: number, prefix = "p") =>
  Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`);

const lineupOf = (
  starters: readonly string[],
  bench: readonly string[] = [],
  formation = "4-2-1-3",
  version = 3,
): ServerLineup => ({
  formation,
  version,
  starters: starters.map((playerId, slotIndex) => ({ playerId, slotIndex })),
  bench,
});

describe("hydrateFromServerLineup — a escalação oficial vira o campo da tela", () => {
  const squad = new Set(ids(18));

  it("devolve formação, campo e banco na ordem dos slots", () => {
    const lineup = lineupOf(ids(11), ["p12", "p13"], "4-3-3");
    expect(hydrateFromServerLineup(lineup, squad)).toEqual({
      formation: "4-3-3",
      onPitchIds: ids(11),
      benchIds: ids(18).slice(11), // p12..p18, o resto do elenco atrás
    });
  });

  it("ordena os titulares por slotIndex, não pela ordem de chegada", () => {
    const lineup: ServerLineup = {
      formation: "4-2-1-3",
      version: 1,
      starters: [
        { playerId: "p3", slotIndex: 2 },
        { playerId: "p1", slotIndex: 0 },
        ...ids(11).slice(3).map((playerId, i) => ({ playerId, slotIndex: i + 3 })),
        { playerId: "p2", slotIndex: 1 },
      ],
      bench: [],
    };
    expect(hydrateFromServerLineup(lineup, squad)?.onPitchIds).toEqual(ids(11));
  });

  it("completa o banco com quem o elenco tem e a escalação não cita", () => {
    // Sem isto, um reforço comprado depois da última escalação sumiria da tela.
    const hydrated = hydrateFromServerLineup(lineupOf(ids(11), ["p12"]), squad);
    expect(hydrated?.benchIds).toEqual(["p12", ...ids(18).slice(12)]);
  });

  it("descarta quem não está mais no elenco (vendido)", () => {
    const semP12 = new Set(ids(18).filter((id) => id !== "p12"));
    const hydrated = hydrateFromServerLineup(
      lineupOf(ids(11), ["p12", "p13"]),
      semP12,
    );
    expect(hydrated?.benchIds).not.toContain("p12");
    expect(hydrated?.benchIds).toContain("p13");
  });

  it("recusa (null) quando não há escalação", () => {
    expect(hydrateFromServerLineup(null, squad)).toBeNull();
  });

  it("recusa quando um titular saiu do elenco — o campo ficaria com buraco", () => {
    const semP5 = new Set(ids(18).filter((id) => id !== "p5"));
    expect(hydrateFromServerLineup(lineupOf(ids(11)), semP5)).toBeNull();
  });

  it("recusa quando não são 11 titulares", () => {
    expect(hydrateFromServerLineup(lineupOf(ids(10)), squad)).toBeNull();
  });

  it("recusa formação que o campo do mobile não sabe desenhar", () => {
    expect(hydrateFromServerLineup(lineupOf(ids(11), [], "5-3-2"), squad)).toBeNull();
  });
});

describe("serverLineupDiffers — o que decide se há o que salvar", () => {
  const selection = {
    formation: "4-2-1-3" as const,
    onPitchIds: ids(11),
    benchIds: ["p12", "p13"],
  };

  it("sem escalação no servidor, sempre há o que salvar", () => {
    expect(serverLineupDiffers(null, selection)).toBe(true);
  });

  it("idêntica = nada a salvar", () => {
    expect(
      serverLineupDiffers(lineupOf(ids(11), ["p12", "p13"]), selection),
    ).toBe(false);
  });

  it("só a FORMAÇÃO mudou = há o que salvar", () => {
    // Era o bug: a tela só olhava as memberships (S01..S23), que não mudam
    // quando o técnico troca 4-3-3 por 4-2-1-3 com os mesmos 11.
    expect(
      serverLineupDiffers(
        lineupOf(ids(11), ["p12", "p13"], "4-3-3"),
        selection,
      ),
    ).toBe(true);
  });

  it("a ORDEM dos titulares importa — é quem ocupa cada slot", () => {
    const trocado = [...ids(11)];
    [trocado[9], trocado[10]] = [trocado[10]!, trocado[9]!];
    expect(
      serverLineupDiffers(lineupOf(trocado, ["p12", "p13"]), selection),
    ).toBe(true);
  });

  it("mudança no banco também conta", () => {
    expect(serverLineupDiffers(lineupOf(ids(11), ["p13"]), selection)).toBe(true);
  });
});

describe("nextLineupVersion — o que o autosave assume após um save aceito", () => {
  it("a primeira escalação nasce na versão 1", () => {
    expect(nextLineupVersion(null)).toBe(1);
  });

  it("cada save aceito soma 1 — sem isto, a 2ª edição seguida conflitaria", () => {
    expect(nextLineupVersion(1)).toBe(2);
    expect(nextLineupVersion(nextLineupVersion(1))).toBe(3);
  });
});

describe("reconcileLineupVersion — a versão só anda para frente", () => {
  it("adota a do servidor quando ela é maior (outro aparelho, tela de treino)", () => {
    expect(reconcileLineupVersion(2, 5)).toBe(5);
  });

  it("IGNORA resposta atrasada que traria a versão para trás", () => {
    // Sem isto, o refetch que chega depois de um save aceito devolvia o cliente
    // ao conflito que ele acabou de resolver — e o erro se repetia sem fim.
    expect(reconcileLineupVersion(2, 1)).toBe(2);
  });

  it("servidor sem escalação não apaga a versão que já temos", () => {
    expect(reconcileLineupVersion(3, null)).toBe(3);
  });

  it("sem versão local, a do servidor é a verdade", () => {
    expect(reconcileLineupVersion(null, 4)).toBe(4);
    expect(reconcileLineupVersion(null, null)).toBeNull();
  });
});

describe("shouldRetryAfterConflict — quando reenviar vale a pena", () => {
  it("conflito de versão na 1ª tentativa: reenvia", () => {
    expect(shouldRetryAfterConflict("AGGREGATE_VERSION_CONFLICT", 0)).toBe(true);
  });

  it("nunca reenvia duas vezes — senão vira laço infinito", () => {
    expect(shouldRetryAfterConflict("AGGREGATE_VERSION_CONFLICT", 1)).toBe(false);
  });

  it("erro de CONTEÚDO não se resolve reenviando", () => {
    expect(shouldRetryAfterConflict("PLAYER_NOT_IN_SQUAD", 0)).toBe(false);
    expect(shouldRetryAfterConflict("LINEUP_INVALID", 0)).toBe(false);
    expect(shouldRetryAfterConflict(null, 0)).toBe(false);
  });
});

describe("setLineupPayload — o envelope do command tactics:set-lineup", () => {
  it("leva formação, 11 titulares em ordem, banco e a versão esperada", () => {
    expect(
      setLineupPayload("club-1", 3, {
        formation: "4-3-3",
        onPitchIds: ids(11),
        benchIds: ["p12"],
      }),
    ).toEqual({
      clubId: "club-1",
      formation: "4-3-3",
      starters: ids(11),
      bench: ["p12"],
      expectedVersion: 3,
    });
  });

  it("sem escalação prévia, expectedVersion é null (cria a primeira)", () => {
    expect(
      setLineupPayload("club-1", null, {
        formation: "4-3-3",
        onPitchIds: ids(11),
        benchIds: [],
      }).expectedVersion,
    ).toBeNull();
  });
});

describe("selectionDiffers — o gatilho do autosave", () => {
  const base = {
    formation: "4-2-1-3" as const,
    onPitchIds: ids(11),
    benchIds: ["p12", "p13"],
  };

  it("nada mudou = não salva de novo", () => {
    expect(selectionDiffers({ ...base }, base)).toBe(false);
  });

  it("sem estado persistido conhecido, salva", () => {
    expect(selectionDiffers(null, base)).toBe(true);
  });

  it("trocar o esquema dispara", () => {
    expect(selectionDiffers({ ...base, formation: "4-3-3" }, base)).toBe(true);
  });

  it("SUBSTITUIR um jogador dispara — era a queixa: o time não mudava", () => {
    const antes = { ...base, onPitchIds: [...ids(10), "p14"] };
    expect(selectionDiffers(antes, base)).toBe(true);
  });

  it("trocar dois titulares de slot (mesma gente, outra ordem) dispara", () => {
    const trocado = [...ids(11)];
    [trocado[5], trocado[6]] = [trocado[6]!, trocado[5]!];
    expect(selectionDiffers({ ...base, onPitchIds: trocado }, base)).toBe(true);
  });

  it("reordenar o banco dispara", () => {
    expect(selectionDiffers({ ...base, benchIds: ["p13", "p12"] }, base)).toBe(
      true,
    );
  });
});
