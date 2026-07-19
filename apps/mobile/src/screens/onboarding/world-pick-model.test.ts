import { describe, expect, it } from "vitest";

import {
  deriveEntry,
  deriveWorldCards,
  entryLabel,
  isSelectable,
  worldTitle,
  type WorldListSource,
} from "./world-pick-model";

const AUTH = { authenticated: true };
const ANON = { authenticated: false };

function world(overrides: Partial<WorldListSource> = {}): WorldListSource {
  return {
    id: "019f782c-3033-71fc-86d7-2820a7206070",
    seed: "abcdef1234567890",
    name: null,
    status: "ACTIVE",
    currentDate: "2026-07-19",
    startDate: "2026-01-01",
    clubCount: 20,
    openSlots: 5,
    myParticipation: null,
    ...overrides,
  };
}

describe("worldTitle", () => {
  it("usa o nome quando existe", () => {
    expect(worldTitle(world({ name: "Brasileirão Alfa" }))).toBe(
      "Brasileirão Alfa",
    );
  });

  it("usa o seed cru como nome, sem prefixo", () => {
    // "Mundo grinta-d" (corte fixo em 8) parecia nome truncado por bug.
    expect(worldTitle(world({ name: null, seed: "grinta-demo" }))).toBe("grinta-demo");
  });

  it("encurta só seed longo, e marca o corte", () => {
    expect(worldTitle(world({ name: null, seed: "a".repeat(40) }))).toBe("aaaaaaaa…");
  });

  it("trata nome só de espaços como ausente", () => {
    expect(worldTitle(world({ name: "   ", seed: "brasil" }))).toBe("brasil");
  });
});

describe("deriveEntry — deslogado (R-209)", () => {
  it("não revela nada derivado de identidade", () => {
    // Mesmo com participação no payload, deslogado não vira selo: a vitrine é
    // igual para todo mundo.
    const entry = deriveEntry(
      world({
        myParticipation: {
          status: "ACTIVE",
          hasActiveControl: true,
          cooldownUntilOn: null,
        },
      }),
      ANON,
    );
    expect(entry).toEqual({ kind: "unknown" });
    expect(entryLabel(entry)).toBeNull();
  });

  it("mundo sem vagas também não vaza estado deslogado", () => {
    expect(deriveEntry(world({ openSlots: 0 }), ANON)).toEqual({
      kind: "unknown",
    });
  });
});

describe("deriveEntry — autenticado (R-210)", () => {
  it("oferece entrada quando há vaga e nenhuma participação", () => {
    expect(deriveEntry(world(), AUTH)).toEqual({ kind: "enter" });
  });

  it("manda de volta ao clube quando já há controle ativo", () => {
    const entry = deriveEntry(
      world({
        myParticipation: {
          status: "ACTIVE",
          hasActiveControl: true,
          cooldownUntilOn: null,
        },
      }),
      AUTH,
    );
    expect(entry).toEqual({ kind: "resume" });
  });

  it("controle ativo vence mundo sem vagas", () => {
    // Quem já joga aqui não pode ver "sem vagas" — a vaga dele é o clube dele.
    const entry = deriveEntry(
      world({
        openSlots: 0,
        myParticipation: {
          status: "ACTIVE",
          hasActiveControl: true,
          cooldownUntilOn: null,
        },
      }),
      AUTH,
    );
    expect(entry).toEqual({ kind: "resume" });
  });

  it("bloqueia por cooldown ATÉ O FIM do dia untilOn", () => {
    // O mesmo `<=` de WorldParticipant.isInCooldownOn. Um `<` aqui ofereceria
    // um mundo que a API recusa com ACCOUNT_COOLDOWN_ACTIVE.
    const emEspera = deriveEntry(
      world({
        myParticipation: {
          status: "ENDED",
          hasActiveControl: false,
          cooldownUntilOn: "2026-07-19",
        },
      }),
      AUTH,
    );
    expect(emEspera).toEqual({ kind: "cooldown", untilOn: "2026-07-19" });
  });

  it("libera no dia seguinte ao fim do cooldown", () => {
    const liberado = deriveEntry(
      world({
        myParticipation: {
          status: "ENDED",
          hasActiveControl: false,
          cooldownUntilOn: "2026-07-19",
        },
        currentDate: "2026-07-20",
      }),
      AUTH,
    );
    expect(liberado).toEqual({ kind: "enter" });
  });

  it("cooldown vence falta de vaga", () => {
    const entry = deriveEntry(
      world({
        openSlots: 0,
        myParticipation: {
          status: "ENDED",
          hasActiveControl: false,
          cooldownUntilOn: "2026-07-25",
        },
      }),
      AUTH,
    );
    expect(entry).toEqual({ kind: "cooldown", untilOn: "2026-07-25" });
  });

  it("marca sem vagas quando openSlots zera", () => {
    expect(deriveEntry(world({ openSlots: 0 }), AUTH)).toEqual({ kind: "full" });
  });

  it("trata openSlots negativo como sem vagas", () => {
    // Defensivo: openSlots é subtração no read model; se algum dia der negativo
    // a tela não pode oferecer entrada.
    expect(deriveEntry(world({ openSlots: -1 }), AUTH)).toEqual({
      kind: "full",
    });
  });

  it("fecha mundo que não está ACTIVE, mesmo com vagas", () => {
    for (const status of ["CREATING", "PAUSED", "FINISHED", "ARCHIVED"]) {
      expect(deriveEntry(world({ status, openSlots: 9 }), AUTH)).toEqual({
        kind: "closed",
      });
    }
  });
});

describe("isSelectable", () => {
  it("permite tocar no que leva a algum lugar", () => {
    expect(isSelectable({ kind: "enter" })).toBe(true);
    expect(isSelectable({ kind: "resume" })).toBe(true);
    // Deslogado o toque leva ao login — é acionável.
    expect(isSelectable({ kind: "unknown" })).toBe(true);
  });

  it("bloqueia o que não tem ação", () => {
    expect(isSelectable({ kind: "full" })).toBe(false);
    expect(isSelectable({ kind: "closed" })).toBe(false);
    expect(isSelectable({ kind: "cooldown", untilOn: "2026-07-25" })).toBe(
      false,
    );
  });
});

describe("deriveWorldCards", () => {
  it("devolve lista vazia sem inventar mundo", () => {
    // O estado vazio do doc ("nenhum mundo disponível") é da TELA. O modelo não
    // fabrica um mundo demo para preencher — é o fallback silencioso do §5.
    expect(deriveWorldCards([], AUTH)).toEqual([]);
  });

  it("ordena: já joga > pode entrar > espera > cheio > fechado", () => {
    const cards = deriveWorldCards(
      [
        world({ id: "e-fechado", status: "FINISHED" }),
        world({ id: "d-cheio", openSlots: 0 }),
        world({ id: "b-entra", openSlots: 3 }),
        world({
          id: "c-espera",
          myParticipation: {
            status: "ENDED",
            hasActiveControl: false,
            cooldownUntilOn: "2026-07-30",
          },
        }),
        world({
          id: "a-joga",
          myParticipation: {
            status: "ACTIVE",
            hasActiveControl: true,
            cooldownUntilOn: null,
          },
        }),
      ],
      AUTH,
    );
    expect(cards.map((card) => card.id)).toEqual([
      "a-joga",
      "b-entra",
      "c-espera",
      "d-cheio",
      "e-fechado",
    ]);
  });

  it("desempata por mais vagas dentro do mesmo grupo", () => {
    const cards = deriveWorldCards(
      [
        world({ id: "poucas", openSlots: 2 }),
        world({ id: "muitas", openSlots: 9 }),
      ],
      AUTH,
    );
    expect(cards.map((card) => card.id)).toEqual(["muitas", "poucas"]);
  });

  it("desempata por id para a lista não dançar entre refetches", () => {
    const entrada = [
      world({ id: "zzz", openSlots: 4 }),
      world({ id: "aaa", openSlots: 4 }),
    ];
    const primeira = deriveWorldCards(entrada, AUTH).map((c) => c.id);
    const segunda = deriveWorldCards([...entrada].reverse(), AUTH).map(
      (c) => c.id,
    );
    expect(primeira).toEqual(["aaa", "zzz"]);
    expect(primeira).toEqual(segunda);
  });

  it("não muta o array recebido", () => {
    const entrada = [
      world({ id: "b", openSlots: 1 }),
      world({ id: "a", openSlots: 9 }),
    ];
    deriveWorldCards(entrada, AUTH);
    expect(entrada.map((w) => w.id)).toEqual(["b", "a"]);
  });

  it("mostra mundos fechados em vez de escondê-los", () => {
    const cards = deriveWorldCards([world({ status: "ARCHIVED" })], AUTH);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.selectable).toBe(false);
  });
});

describe("entryLabel", () => {
  it("rotula cada estado, menos o deslogado", () => {
    expect(entryLabel({ kind: "unknown" })).toBeNull();
    expect(entryLabel({ kind: "enter" })).toBe("Vagas abertas");
    expect(entryLabel({ kind: "resume" })).toBe("Você já joga aqui");
    expect(entryLabel({ kind: "cooldown", untilOn: "2026-07-25" })).toBe(
      "Em espera",
    );
    expect(entryLabel({ kind: "full" })).toBe("Sem vagas");
    expect(entryLabel({ kind: "closed" })).toBe("Fechado");
  });

  it("não revela a fórmula do anti-abuso no rótulo (R-210)", () => {
    // O motivo é GERAL. Nada de "conta relacionada", "3 dias restantes", etc.
    const label = entryLabel({ kind: "cooldown", untilOn: "2026-07-25" });
    expect(label).not.toContain("2026");
    expect(label?.toLowerCase()).not.toContain("relacionada");
  });
});
