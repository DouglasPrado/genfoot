import { describe, expect, it } from "vitest";

import { SquadCategory, type SquadSnapshot } from "../clubs/club-types.js";
import type { SquadRepository } from "../clubs/squad-repository.js";

import {
  PromoteYouthPlayer,
  type PromoteYouthRepositories,
  type PromoteYouthUnitOfWork,
} from "./promote-youth.js";

const WORLD = "019f0000-0000-7000-8000-000000000001";
const CLUB = "019f0000-0000-7000-8000-0000000000a1";
const JOVEM = "019f0000-0000-7000-8000-0000000000c3";

function squad(
  id: string,
  category: SquadCategory,
  playerIds: readonly string[],
): SquadSnapshot {
  return {
    id: id as never,
    gameWorldId: WORLD as never,
    clubId: CLUB as never,
    name: `Elenco ${category}`,
    category,
    seasonNumber: 1,
    version: 1,
    memberships: playerIds.map((playerId, index) => ({
      playerId: playerId as never,
      shirtNumber: index + 1,
      role: null,
      effectiveFrom: "2026-01-01",
    })),
  };
}

class FakeWorld {
  public squads = new Map<SquadCategory, SquadSnapshot>();
  public checkpoint(): () => void {
    const snapshot = new Map(this.squads);
    return () => {
      this.squads = snapshot;
    };
  }
}

function fakeUnitOfWork(world: FakeWorld): PromoteYouthUnitOfWork {
  const repos: PromoteYouthRepositories = {
    squads: {
      findFirstTeamSquad: () =>
        Promise.resolve(world.squads.get(SquadCategory.FIRST_TEAM) ?? null),
      findYouthSquad: () =>
        Promise.resolve(world.squads.get(SquadCategory.YOUTH_ACADEMY) ?? null),
      findSquadById: () => Promise.resolve(null),
      saveSquad: (snapshot) => {
        world.squads.set(snapshot.category, snapshot);
        return Promise.resolve();
      },
    } satisfies SquadRepository,
  };
  return {
    run: async (work) => {
      const rollback = world.checkpoint();
      try {
        return await work(repos);
      } catch (error) {
        rollback();
        throw error;
      }
    },
  };
}

function arrange() {
  const world = new FakeWorld();
  world.squads.set(
    SquadCategory.YOUTH_ACADEMY,
    squad("youth-1", SquadCategory.YOUTH_ACADEMY, [JOVEM, "j2", "j3"]),
  );
  world.squads.set(
    SquadCategory.FIRST_TEAM,
    squad("first-1", SquadCategory.FIRST_TEAM, ["p1", "p2"]),
  );
  return world;
}

const input = {
  gameWorldId: WORLD,
  clubId: CLUB,
  playerId: JOVEM,
  occurredOn: "2026-01-01",
};

describe("PromoteYouthPlayer — subir da base ao profissional (C8)", () => {
  it("move o jovem da base para o profissional, num só commit", async () => {
    const world = arrange();
    const result = await new PromoteYouthPlayer(fakeUnitOfWork(world)).execute(
      input,
    );
    expect(result.ok).toBe(true);

    const youth = world.squads.get(SquadCategory.YOUTH_ACADEMY)!;
    const first = world.squads.get(SquadCategory.FIRST_TEAM)!;
    expect(youth.memberships.some((m) => m.playerId === JOVEM)).toBe(false);
    expect(first.memberships.some((m) => m.playerId === JOVEM)).toBe(true);
    expect(first.memberships).toHaveLength(3);
  });

  it("recusa quem não está na base — sem mexer em nada", async () => {
    const world = arrange();
    const result = await new PromoteYouthPlayer(fakeUnitOfWork(world)).execute({
      ...input,
      playerId: "estranho",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PLAYER_NOT_IN_YOUTH");
    expect(
      world.squads.get(SquadCategory.FIRST_TEAM)!.memberships,
    ).toHaveLength(2);
  });

  it("recusa com SQUAD_SIZE_LIMIT_EXCEEDED quando o profissional está cheio (§30)", () => {
    // O código específico da rastreabilidade §30, não o genérico do agregado:
    // a tela precisa distinguir "elenco cheio" de outras recusas para orientar
    // o gestor (vender/emprestar antes de promover).
    const world = new FakeWorld();
    // Enche até o teto DEFINIDO (MAX_SQUAD_SIZE=250, R-193). Um limite de elenco
    // PRINCIPAL menor não existe no código — é decisão pendente (ver relatório).
    const cheio = Array.from({ length: 250 }, (_, i) => `p${i}`);
    world.squads.set(
      SquadCategory.YOUTH_ACADEMY,
      squad("youth-1", SquadCategory.YOUTH_ACADEMY, [JOVEM]),
    );
    world.squads.set(
      SquadCategory.FIRST_TEAM,
      squad("first-1", SquadCategory.FIRST_TEAM, cheio),
    );
    return new PromoteYouthPlayer(fakeUnitOfWork(world))
      .execute(input)
      .then((result) => {
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("SQUAD_SIZE_LIMIT_EXCEEDED");
        // a base não perdeu o jovem — recusa é atômica
        expect(
          world.squads.get(SquadCategory.YOUTH_ACADEMY)!.memberships,
        ).toHaveLength(1);
      });
  });

  it("emite YouthPromoted com a chave de idempotência (§30, INV-37)", async () => {
    const world = arrange();
    const result = await new PromoteYouthPlayer(fakeUnitOfWork(world)).execute({
      ...input,
      rulesetVersion: "1.0.0" as never,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.event.type).toBe("YouthPromoted");
    expect(result.value.event.playerId).toBe(JOVEM);
    // idempotência por (jogador, data): repetir a promoção no mesmo dia dá a
    // mesma chave — o efeito oficial não duplica.
    expect(result.value.event.idempotencyKey).toContain(JOVEM);
  });
});
