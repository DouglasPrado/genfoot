import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import type { WorldGenesisSnapshot } from "../genesis/genesis-types.js";
import { Player } from "./player.js";
import type {
  PlayerAttributeCode,
  PlayerDevelopmentHistoryEntry,
  PlayerLifecycleSummary,
  PlayerInspection,
  PlayerLifecycleSnapshot,
  WorldPlayerLifecycleSnapshot,
} from "./player-lifecycle-types.js";

export class WorldPlayerLifecycle {
  private constructor(private state: WorldPlayerLifecycleSnapshot) {}

  public static fromGenesis(
    world: GameWorldSnapshot,
    genesis: WorldGenesisSnapshot,
  ): Result<WorldPlayerLifecycle, DomainError> {
    if (world.id !== genesis.gameWorldId) {
      return fail(
        new DomainError(
          "PLAYER_WORLD_MISMATCH",
          "A gênese e o lifecycle pertencem a mundos diferentes.",
        ),
      );
    }
    const timestampMilliseconds = Date.parse(
      `${world.startDate}T00:00:00.000Z`,
    );
    const players: PlayerLifecycleSnapshot[] = [];
    for (const generated of genesis.players) {
      const player = Player.fromGenesis(world.id, generated, world.startDate);
      if (!player.ok) return player;
      players.push(player.value.snapshot());
    }
    const snapshot: WorldPlayerLifecycleSnapshot = {
      gameWorldId: world.id,
      rulesetVersion: world.rulesetVersion,
      persons: genesis.persons.map((person) => ({
        id: person.id,
        gameWorldId: world.id,
        firstName: person.firstName,
        lastName: person.lastName,
        birthDate: person.birthDate,
        nationality: person.primaryNationality,
        version: 1,
      })),
      players,
      generationEvents: genesis.players.map((player) => ({
        id: deterministicUuidV7<"PlayerGenerationEvent">({
          worldSeed: world.seed,
          context: `player-generated:${player.id}`,
          timestampMilliseconds,
        }),
        type: "PlayerGenerated",
        gameWorldId: world.id,
        playerId: player.id,
        personId: player.personId,
        source: player.generationSource,
        seasonNumber: 1,
        worldDate: world.startDate,
        rulesetVersion: world.rulesetVersion,
        idempotencyKey: `player-generated:${player.id}`,
      })),
      developmentHistory: [],
      processedDayKeys: [],
      revision: 1,
    };
    return WorldPlayerLifecycle.fromSnapshot(snapshot);
  }

  public static fromSnapshot(
    snapshot: WorldPlayerLifecycleSnapshot,
  ): Result<WorldPlayerLifecycle, DomainError> {
    if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) {
      return fail(invalidLifecycle("A revisão do lifecycle é inválida."));
    }
    const personIds = new Set(snapshot.persons.map(({ id }) => id));
    for (const person of snapshot.persons) {
      const birthDate = WorldDate.parse(person.birthDate);
      if (!birthDate.ok || person.gameWorldId !== snapshot.gameWorldId) {
        return fail(invalidLifecycle("Pessoa inválida ou fora do mundo."));
      }
    }
    const playerIds = new Set<string>();
    const eventPlayers = new Set<string>();
    for (const player of snapshot.players) {
      if (
        player.gameWorldId !== snapshot.gameWorldId ||
        !personIds.has(player.personId)
      ) {
        return fail(
          invalidLifecycle("Jogador sem pessoa válida no mesmo mundo."),
        );
      }
      if (playerIds.has(player.id)) {
        return fail(invalidLifecycle("Há jogadores duplicados."));
      }
      const loaded = Player.fromSnapshot(player);
      if (!loaded.ok) return loaded;
      playerIds.add(player.id);
    }
    const eventKeys = new Set<string>();
    for (const event of snapshot.generationEvents) {
      if (
        event.type !== "PlayerGenerated" ||
        event.gameWorldId !== snapshot.gameWorldId ||
        !playerIds.has(event.playerId) ||
        eventPlayers.has(event.playerId) ||
        eventKeys.has(event.idempotencyKey)
      ) {
        return fail(
          invalidLifecycle(
            "Cada jogador deve possuir exatamente um PlayerGenerated.",
          ),
        );
      }
      eventPlayers.add(event.playerId);
      eventKeys.add(event.idempotencyKey);
    }
    if (eventPlayers.size !== playerIds.size) {
      return fail(
        invalidLifecycle(
          "Cada jogador deve possuir exatamente um PlayerGenerated.",
        ),
      );
    }
    for (const history of snapshot.developmentHistory) {
      if (
        history.gameWorldId !== snapshot.gameWorldId ||
        !playerIds.has(history.playerId) ||
        history.cause.trim() === "" ||
        history.previousValue === history.nextValue
      ) {
        return fail(invalidLifecycle("Histórico de evolução inválido."));
      }
    }
    return succeed(new WorldPlayerLifecycle(snapshot));
  }

  public processDay(on: WorldDate): Result<boolean, DomainError> {
    const key = `${this.state.gameWorldId}:${on.toString()}`;
    if (this.state.processedDayKeys.includes(key)) return succeed(false);
    const players: PlayerLifecycleSnapshot[] = [];
    for (const snapshot of this.state.players) {
      const player = Player.fromSnapshot(snapshot);
      if (!player.ok) return player;
      const processed = player.value.processUntil(on);
      if (!processed.ok) return processed;
      players.push(player.value.snapshot());
    }
    this.state = {
      ...this.state,
      players,
      processedDayKeys: [...this.state.processedDayKeys, key],
      revision: this.state.revision + 1,
    };
    return succeed(true);
  }

  public changeAttribute(
    input: Readonly<{
      playerId: string;
      attributeCode: PlayerAttributeCode;
      requestedValue: number;
      cause: string;
      worldDate: string;
      rulesetVersion: RulesetVersion;
      historyContext: string;
      worldSeed: string;
    }>,
  ): Result<PlayerDevelopmentHistoryEntry | null, DomainError> {
    const index = this.state.players.findIndex(
      ({ id }) => id === input.playerId,
    );
    if (index < 0) {
      return fail(
        new DomainError("PLAYER_NOT_FOUND", "Jogador não encontrado.", {
          playerId: input.playerId,
        }),
      );
    }
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(
        new DomainError(
          "RULESET_VERSION_MISMATCH",
          "A alteração usa um ruleset diferente do lifecycle.",
        ),
      );
    }
    const historyId = deterministicUuidV7<"PlayerDevelopmentHistory">({
      worldSeed: input.worldSeed,
      context: input.historyContext,
      timestampMilliseconds: Date.parse(`${input.worldDate}T00:00:00.000Z`),
    });
    const existing = this.state.developmentHistory.find(
      ({ id }) => id === historyId,
    );
    if (existing !== undefined) return succeed(existing);
    const player = Player.fromSnapshot(this.state.players[index]!);
    if (!player.ok) return player;
    const changed = player.value.applyAttributeChange({
      historyId,
      attributeCode: input.attributeCode,
      requestedValue: input.requestedValue,
      cause: input.cause,
      worldDate: input.worldDate,
      rulesetVersion: input.rulesetVersion,
    });
    if (!changed.ok || changed.value === null) return changed;
    const players = [...this.state.players];
    players[index] = player.value.snapshot();
    this.state = {
      ...this.state,
      players,
      developmentHistory: [...this.state.developmentHistory, changed.value],
      revision: this.state.revision + 1,
    };
    return changed;
  }

  public findPlayer(playerId: string): PlayerLifecycleSnapshot | null {
    return this.state.players.find(({ id }) => id === playerId) ?? null;
  }

  public inspectPlayer(
    playerId: string,
    on: WorldDate,
  ): PlayerInspection | null {
    const player = this.findPlayer(playerId);
    if (player === null) return null;
    const person = this.state.persons.find(({ id }) => id === player.personId);
    if (person === undefined) return null;
    return { player, person, age: ageOn(person.birthDate, on.toString()) };
  }

  public summary(): PlayerLifecycleSummary {
    const dates = this.state.players.map(
      ({ lastProcessedOn }) => lastProcessedOn,
    );
    return {
      personCount: this.state.persons.length,
      playerCount: this.state.players.length,
      generationEventCount: this.state.generationEvents.length,
      developmentHistoryCount: this.state.developmentHistory.length,
      lastProcessedOn:
        dates.length === 0
          ? null
          : dates.reduce((left, right) => (left < right ? left : right)),
    };
  }

  public snapshot(): WorldPlayerLifecycleSnapshot {
    return this.state;
  }
}

function invalidLifecycle(message: string): DomainError {
  return new DomainError("INVALID_PLAYER_LIFECYCLE", message);
}

function ageOn(birthDate: string, worldDate: string): number {
  const [birthYear, birthMonth, birthDay] = birthDate
    .split("-")
    .map(Number) as [number, number, number];
  const [year, month, day] = worldDate.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  let age = year - birthYear;
  if (month < birthMonth || (month === birthMonth && day < birthDay)) age -= 1;
  return age;
}
