import { describe, expect, it } from "vitest";

import {
  availableTabs,
  formatLabel,
  groupMatchesByRound,
  lifecycleLabel,
  statAvailability,
  tableZone,
  type CompetitionDetailSource,
  type CompetitionMatchSource,
} from "./competition-model";

const detail = (
  over: Partial<CompetitionDetailSource> = {},
): CompetitionDetailSource => ({
  competitionId: "c1",
  name: "Liga Inicial",
  type: "LEAGUE",
  format: "ROUND_ROBIN",
  tier: 1,
  lifecycle: "RUNNING",
  seasonNumber: 1,
  startsOn: "2026-02-01",
  endsOn: "2026-06-01",
  clubCount: 16,
  totalMatches: 240,
  playedMatches: 30,
  currentRound: 4,
  totalRounds: 30,
  promotionSlots: 0,
  relegationSlots: 4,
  hasGroups: false,
  hasKnockout: false,
  ...over,
});

describe("availableTabs", () => {
  it("liga mostra tabela, jogos, estatísticas, prêmios e regulamento — sem grupos nem chave", () => {
    const tabs = availableTabs(detail()).map((t) => t.id);
    expect(tabs).toEqual([
      "table",
      "matches",
      "scorers",
      "assists",
      "awards",
      "rules",
    ]);
  });

  it("copa de grupos troca Tabela por Grupos e ganha Chaveamento quando ele existe", () => {
    const tabs = availableTabs(
      detail({ format: "GROUPS_AND_KNOCKOUT", hasGroups: true, hasKnockout: true }),
    ).map((t) => t.id);
    expect(tabs).toContain("groups");
    expect(tabs).toContain("bracket");
    expect(tabs).not.toContain("table");
  });

  it("mata-mata puro não tem tabela nem grupos", () => {
    const tabs = availableTabs(
      detail({ format: "KNOCKOUT", type: "CUP", hasGroups: false, hasKnockout: true }),
    ).map((t) => t.id);
    expect(tabs).toContain("bracket");
    expect(tabs).not.toContain("table");
    expect(tabs).not.toContain("groups");
  });

  /** "só mata-mata se existir" — a aba não aparece antes de haver confronto. */
  it("competição de grupos AINDA sem mata-mata não mostra a aba de chaveamento", () => {
    const tabs = availableTabs(
      detail({ format: "GROUPS_AND_KNOCKOUT", hasGroups: true, hasKnockout: false }),
    ).map((t) => t.id);
    expect(tabs).toContain("groups");
    expect(tabs).not.toContain("bracket");
  });

  it("a primeira aba é sempre navegável (nunca lista vazia)", () => {
    expect(availableTabs(detail({ format: "SWISS" })).length).toBeGreaterThan(0);
  });
});

describe("statAvailability", () => {
  const coverage = { goals: true, assists: false, cards: false };

  it("artilharia está disponível porque o motor registra gol", () => {
    expect(statAvailability(coverage, "scorers").kind).toBe("available");
  });

  it("assistência vem INDISPONÍVEL, não zerada", () => {
    const result = statAvailability(coverage, "assists");
    expect(result.kind).toBe("engine-missing");
    // A mensagem tem de dizer que é o motor que não registra — "0 assistências"
    // se leria como fato do jogo.
    expect(result.kind === "engine-missing" && result.reason).toContain(
      "não registra",
    );
  });

  it("passa a disponível sozinha quando o motor evoluir", () => {
    expect(
      statAvailability({ goals: true, assists: true, cards: true }, "assists").kind,
    ).toBe("available");
  });
});

describe("tableZone", () => {
  it("marca acesso no topo e rebaixamento no fim", () => {
    expect(tableZone(1, 20, { promotionSlots: 4, relegationSlots: 4 })).toBe(
      "promotion",
    );
    expect(tableZone(4, 20, { promotionSlots: 4, relegationSlots: 4 })).toBe(
      "promotion",
    );
    expect(tableZone(5, 20, { promotionSlots: 4, relegationSlots: 4 })).toBeNull();
    expect(tableZone(17, 20, { promotionSlots: 4, relegationSlots: 4 })).toBe(
      "relegation",
    );
    expect(tableZone(20, 20, { promotionSlots: 4, relegationSlots: 4 })).toBe(
      "relegation",
    );
  });

  it("divisão única (0/0) não pinta zona nenhuma", () => {
    expect(tableZone(1, 16, { promotionSlots: 0, relegationSlots: 0 })).toBeNull();
    expect(tableZone(16, 16, { promotionSlots: 0, relegationSlots: 0 })).toBeNull();
  });

  /** Vaga maior que a tabela não pode pintar o campeão de rebaixado. */
  it("zonas que se sobrepõem: acesso ganha do rebaixamento", () => {
    expect(tableZone(2, 4, { promotionSlots: 3, relegationSlots: 3 })).toBe(
      "promotion",
    );
  });
});

describe("groupMatchesByRound", () => {
  const match = (
    over: Partial<CompetitionMatchSource> = {},
  ): CompetitionMatchSource => ({
    matchId: "m1",
    roundNumber: 1,
    group: null,
    scheduledOn: "2026-02-10",
    finished: false,
    homeGoals: null,
    awayGoals: null,
    home: {
      clubId: "h",
      clubName: "Casa",
      shortCode: "CAS",
      primaryColor: null,
      secondaryColor: null,
      crestTemplateId: null,
    },
    away: {
      clubId: "a",
      clubName: "Fora",
      shortCode: "FOR",
      primaryColor: null,
      secondaryColor: null,
      crestTemplateId: null,
    },
    ...over,
  });

  it("agrupa por rodada em ordem crescente", () => {
    const rounds = groupMatchesByRound([
      match({ matchId: "b", roundNumber: 3 }),
      match({ matchId: "a", roundNumber: 1 }),
      match({ matchId: "c", roundNumber: 3 }),
    ]);
    expect(rounds.map((r) => r.roundNumber)).toEqual([1, 3]);
    expect(rounds[1]!.matches).toHaveLength(2);
  });

  it("diz se a rodada já foi disputada por inteiro", () => {
    const rounds = groupMatchesByRound([
      match({ matchId: "a", roundNumber: 1, finished: true, homeGoals: 1, awayGoals: 0 }),
      match({ matchId: "b", roundNumber: 1, finished: true, homeGoals: 2, awayGoals: 2 }),
      match({ matchId: "c", roundNumber: 2, finished: false }),
    ]);
    expect(rounds[0]!.played).toBe(true);
    expect(rounds[1]!.played).toBe(false);
  });

  it("rodada meio jogada NÃO conta como disputada", () => {
    const rounds = groupMatchesByRound([
      match({ matchId: "a", roundNumber: 1, finished: true, homeGoals: 1, awayGoals: 0 }),
      match({ matchId: "b", roundNumber: 1, finished: false }),
    ]);
    expect(rounds[0]!.played).toBe(false);
  });

  it("jogo sem rodada cai num balde próprio no fim, não some", () => {
    const rounds = groupMatchesByRound([
      match({ matchId: "a", roundNumber: null }),
      match({ matchId: "b", roundNumber: 1 }),
    ]);
    expect(rounds).toHaveLength(2);
    expect(rounds[1]!.roundNumber).toBeNull();
    expect(rounds[1]!.matches[0]!.matchId).toBe("a");
  });

  it("lista vazia devolve nenhuma rodada", () => {
    expect(groupMatchesByRound([])).toEqual([]);
  });
});

describe("rótulos", () => {
  it("traduz o formato para o jogador", () => {
    expect(formatLabel("ROUND_ROBIN")).toBe("Pontos corridos");
    expect(formatLabel("DOUBLE_ROUND_ROBIN")).toBe("Pontos corridos (ida e volta)");
    expect(formatLabel("KNOCKOUT")).toBe("Mata-mata");
    expect(formatLabel("GROUPS_AND_KNOCKOUT")).toBe("Grupos + mata-mata");
    // Formato desconhecido não pode virar tela em branco.
    expect(formatLabel("SWISS")).toBe("SWISS");
  });

  it("traduz o ciclo de vida da edição", () => {
    expect(lifecycleLabel("RUNNING")).toBe("Em disputa");
    expect(lifecycleLabel("FINISHED")).toBe("Encerrada");
    expect(lifecycleLabel("SCHEDULED")).toBe("A começar");
    expect(lifecycleLabel("DRAFT")).toBe("Em preparação");
  });
});
