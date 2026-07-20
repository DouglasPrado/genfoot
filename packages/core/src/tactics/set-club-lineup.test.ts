import { describe, expect, it } from "vitest";

import { PlayerPosition } from "../genesis/genesis-types.js";

import { CANONICAL_FORMATIONS } from "./formation.js";
import { SetClubLineup } from "./set-club-lineup.js";
import type {
  LineupContextReader,
  LineupRepository,
  LineupSnapshot,
  SquadPlayerContext,
} from "./lineup-types.js";

const WORLD = "11111111-1111-7111-8111-111111111111";
const CLUB = "22222222-2222-7222-8222-222222222222";
const SEED = "seed-x";
const DATE = "2026-01-01";

// Um elenco de 16: 11 nas posições exatas do 4-4-2 + 5 reservas.
const F442 = CANONICAL_FORMATIONS["4-4-2"];
function squadOf(extra: SquadPlayerContext[] = []): SquadPlayerContext[] {
  const starters = F442.map((pos, i) => ({
    playerId: `p-${i}`,
    primaryPosition: pos,
  }));
  return [...starters, ...extra];
}

class MemoryReader implements LineupContextReader {
  public constructor(private readonly players: readonly SquadPlayerContext[]) {}
  public squadPlayers(): Promise<readonly SquadPlayerContext[]> {
    return Promise.resolve(this.players);
  }
}

class MemoryRepo implements LineupRepository {
  public saved: LineupSnapshot | null = null;
  public lastExpected: number | null | undefined;
  public findByClub(): Promise<LineupSnapshot | null> {
    return Promise.resolve(this.saved);
  }
  public save(lineup: LineupSnapshot, expectedVersion: number | null): Promise<void> {
    this.lastExpected = expectedVersion;
    this.saved = lineup;
    return Promise.resolve();
  }
}

const base = {
  gameWorldId: WORLD,
  clubId: CLUB,
  worldSeed: SEED,
  occurredOn: DATE,
  formation: "4-4-2",
  starters: F442.map((_, i) => `p-${i}`),
  bench: ["p-11", "p-12"],
  expectedVersion: null as number | null,
};

const bench = [
  { playerId: "p-11", primaryPosition: PlayerPosition.ST },
  { playerId: "p-12", primaryPosition: PlayerPosition.CM },
];

describe("SetClubLineup", () => {
  it("escala 11 nas posições exatas → sem avisos, versão 1", async () => {
    const repo = new MemoryRepo();
    const uc = new SetClubLineup(repo, new MemoryReader(squadOf(bench)));
    const r = await uc.execute(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lineup.starters).toHaveLength(11);
    expect(r.value.lineup.version).toBe(1);
    expect(r.value.warnings).toHaveLength(0);
    expect(repo.saved?.formation).toBe("4-4-2");
  });

  it("recusa formação desconhecida", async () => {
    const repo = new MemoryRepo();
    const uc = new SetClubLineup(repo, new MemoryReader(squadOf(bench)));
    const r = await uc.execute({ ...base, formation: "6-0-4" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("LINEUP_INVALID");
  });

  it("recusa se não tiver exatamente 11 titulares", async () => {
    const repo = new MemoryRepo();
    const uc = new SetClubLineup(repo, new MemoryReader(squadOf(bench)));
    const r = await uc.execute({ ...base, starters: base.starters.slice(0, 10) });
    expect(r.ok).toBe(false);
  });

  it("recusa jogador repetido entre titulares/banco", async () => {
    const repo = new MemoryRepo();
    const uc = new SetClubLineup(repo, new MemoryReader(squadOf(bench)));
    const r = await uc.execute({ ...base, bench: ["p-0"] });
    expect(r.ok).toBe(false);
  });

  it("recusa titular fora do elenco", async () => {
    const repo = new MemoryRepo();
    const uc = new SetClubLineup(repo, new MemoryReader(squadOf(bench)));
    const starters = [...base.starters];
    starters[10] = "estranho";
    const r = await uc.execute({ ...base, starters, bench: [] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("PLAYER_NOT_IN_SQUAD");
  });

  it("AVISA (não bloqueia) quando escala fora de posição", async () => {
    const repo = new MemoryRepo();
    // Troca o ST do slot 9 por um zagueiro (p-12 vira CB): fora de posição.
    const squad = squadOf([
      { playerId: "p-11", primaryPosition: PlayerPosition.ST },
      { playerId: "p-12", primaryPosition: PlayerPosition.CB },
    ]);
    const uc = new SetClubLineup(repo, new MemoryReader(squad));
    const starters = [...base.starters];
    starters[9] = "p-12"; // slot 9 do 4-4-2 é ST; p-12 é CB → aviso
    const r = await uc.execute({ ...base, starters, bench: ["p-9"] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.warnings.length).toBeGreaterThan(0);
    expect(r.value.warnings.some((w) => w.playerId === "p-12")).toBe(true);
  });

  it("concorrência otimista: expectedVersion errado → conflito", async () => {
    const repo = new MemoryRepo();
    repo.saved = {
      id: "x", gameWorldId: WORLD, clubId: CLUB, formation: "4-4-2",
      starters: [], bench: [], version: 3,
    };
    const uc = new SetClubLineup(repo, new MemoryReader(squadOf(bench)));
    const r = await uc.execute({ ...base, expectedVersion: 1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("AGGREGATE_VERSION_CONFLICT");
  });

  it("determinístico: mesmo mundo/clube → mesmo id de escalação", async () => {
    const uc1 = new SetClubLineup(new MemoryRepo(), new MemoryReader(squadOf(bench)));
    const uc2 = new SetClubLineup(new MemoryRepo(), new MemoryReader(squadOf(bench)));
    const a = await uc1.execute(base);
    const b = await uc2.execute(base);
    if (!a.ok || !b.ok) throw new Error("esperava ok");
    expect(a.value.lineup.id).toBe(b.value.lineup.id);
  });
});
