import {
  WorldDate,
  newGameWorldId,
  parseRulesetVersion,
  type GameWorldId,
  type RulesetVersion,
} from "@grinta/shared";
import { beforeEach, describe, expect, it } from "vitest";

import {
  ArchiveWorld,
  CreateWorld,
  GameWorld,
  PauseWorld,
  ResumeWorld,
  WorldStatus,
  type GameWorldSnapshot,
  type WorldProvisioningEvidence,
  type WorldRepository,
} from "../src/index.js";

function ruleset(): RulesetVersion {
  const parsed = parseRulesetVersion("1.0.0");
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function date(value = "2026-01-01"): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function evidence(): WorldProvisioningEvidence {
  return {
    generatedClubCount: 20,
    clubsWithValidSquads: 20,
    generatedPlayerCount: 460,
    playersPerSquad: 23,
    calendarValidated: true,
    rulesetVersion: ruleset(),
  };
}

/**
 * Repositório em memória com a MESMA trava do adapter real: `save` recusa quando
 * a revisão esperada não bate. Sem isso o teste de concorrência não prova nada —
 * ele passaria contra um repositório que aceita qualquer coisa.
 */
class MemoryWorldRepository implements WorldRepository {
  readonly #worlds = new Map<string, GameWorldSnapshot>();
  public saves = 0;
  /**
   * Roda logo DEPOIS de cada leitura, no ponto exato onde a corrida acontece.
   * É o que permite simular "outro operador gravou entre o teu findById e o teu
   * save" — sem isto, forçar a versão antes da chamada só produz um mundo numa
   * revisão diferente, que o caso de uso lê e usa. Não é corrida nenhuma.
   */
  public afterFind: (() => void) | null = null;

  // `async` sem `await`: o repositório de memória é síncrono, mas a PORTA é
  // assíncrona — e é a porta que o caso de uso enxerga. Devolver a Promise
  // manualmente mantém o teste honesto com o contrato sem fingir I/O.
  public findById(id: GameWorldId): Promise<GameWorldSnapshot | null> {
    const snapshot = this.#worlds.get(id) ?? null;
    this.afterFind?.();
    return Promise.resolve(snapshot);
  }

  public save(
    snapshot: GameWorldSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    const current = this.#worlds.get(snapshot.id);
    if (
      expectedVersion !== null &&
      current !== undefined &&
      current.version !== expectedVersion
    ) {
      throw new Error(
        `conflito de revisão: esperava ${expectedVersion}, banco tem ${current.version}`,
      );
    }
    this.saves += 1;
    this.#worlds.set(snapshot.id, snapshot);
    return Promise.resolve();
  }

  public delete(id: GameWorldId): Promise<void> {
    this.#worlds.delete(id);
    return Promise.resolve();
  }

  /** Escrita por fora, para simular o outro operador que gravou primeiro. */
  public force(snapshot: GameWorldSnapshot): void {
    this.#worlds.set(snapshot.id, snapshot);
  }
}

describe("ciclo de vida do mundo (casos de uso)", () => {
  let repository: MemoryWorldRepository;
  let worldId: GameWorldId;

  async function seedActiveWorld(): Promise<void> {
    const created = await new CreateWorld(repository, () => worldId).execute({
      seed: "grinta-001",
      startDate: date(),
      rulesetVersion: ruleset(),
    });
    if (!created.ok) throw created.error;

    const snapshot = await repository.findById(worldId);
    if (snapshot === null) throw new Error("mundo não semeado");
    const world = GameWorld.fromSnapshot(snapshot);
    if (!world.ok) throw world.error;
    const activated = world.value.activate(evidence());
    if (!activated.ok) throw activated.error;
    repository.force(world.value.snapshot());
  }

  beforeEach(async () => {
    repository = new MemoryWorldRepository();
    worldId = newGameWorldId();
    await seedActiveWorld();
  });

  it("congela e persiste o estado", async () => {
    const result = await new PauseWorld(repository).execute(worldId);

    expect(result.ok).toBe(true);
    expect((await repository.findById(worldId))?.status).toBe(
      WorldStatus.PAUSED,
    );
  });

  it("carrega o motivo até o evento", async () => {
    const result = await new PauseWorld(repository).execute(
      worldId,
      "manutenção do banco",
    );

    if (!result.ok) throw result.error;
    expect(result.value.events).toHaveLength(1);
    expect(result.value.events[0]).toMatchObject({
      type: "WorldPaused",
      payload: { reason: "manutenção do banco" },
    });
  });

  it("descongela de volta para ativo", async () => {
    await new PauseWorld(repository).execute(worldId);

    const result = await new ResumeWorld(repository).execute(worldId);

    expect(result.ok).toBe(true);
    expect((await repository.findById(worldId))?.status).toBe(
      WorldStatus.ACTIVE,
    );
  });

  it("inativa e reabre — R-56: arquivar é reversível", async () => {
    await new ArchiveWorld(repository).execute(worldId, "2 temporadas ociosas");
    expect((await repository.findById(worldId))?.status).toBe(
      WorldStatus.ARCHIVED,
    );

    const reopened = await new ResumeWorld(repository).execute(worldId);

    expect(reopened.ok).toBe(true);
    expect((await repository.findById(worldId))?.status).toBe(
      WorldStatus.ACTIVE,
    );
  });

  describe("transição recusada não grava", () => {
    it("descongelar um mundo ATIVO não consome revisão", async () => {
      // O caso de uso devolve o erro ANTES do save. Se um dia alguém salvar
      // primeiro e validar depois, a revisão andaria sem nada ter mudado — e o
      // lock otimista de todo mundo passaria a errar por um.
      const before = await repository.findById(worldId);
      const savesBefore = repository.saves;

      const result = await new ResumeWorld(repository).execute(worldId);

      expect(result.ok).toBe(false);
      expect(repository.saves).toBe(savesBefore);
      expect((await repository.findById(worldId))?.version).toBe(
        before?.version,
      );
    });
  });

  it("mundo inexistente é WORLD_NOT_FOUND, não crash", async () => {
    const result = await new PauseWorld(repository).execute(newGameWorldId());

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("esperava falha");
    expect(result.error.code).toBe("WORLD_NOT_FOUND");
  });

  it("salva com a revisão LIDA: quem gravou no meio do caminho ganha", async () => {
    // Concorrência de verdade: o outro operador grava DEPOIS que este caso de uso
    // leu e ANTES que ele salve. O caso de uso segue com o snapshot velho, salva
    // com a revisão que leu, e o repositório recusa — em vez de sobrescrever
    // calado o trabalho do outro.
    const stored = await repository.findById(worldId);
    if (stored === null) throw new Error("sem mundo");
    repository.afterFind = () => {
      repository.afterFind = null; // só a primeira leitura corre
      repository.force({ ...stored, version: stored.version + 5 });
    };

    await expect(new PauseWorld(repository).execute(worldId)).rejects.toThrow(
      /conflito de revisão/,
    );
    expect((await repository.findById(worldId))?.status).toBe(
      WorldStatus.ACTIVE,
    );
  });
});
