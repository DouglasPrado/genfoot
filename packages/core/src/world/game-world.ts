import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
} from "@grinta/shared";

import {
  WorldStatus,
  type CreateGameWorldInput,
  type GameWorldSnapshot,
  type WorldDomainEvent,
  type WorldProvisioningEvidence,
} from "./world-types.js";

export class GameWorld {
  readonly #events: WorldDomainEvent[] = [];
  readonly #id: GameWorldSnapshot["id"];
  readonly #seed: string;
  readonly #startDate: WorldDate;
  readonly #rulesetVersion: GameWorldSnapshot["rulesetVersion"];
  #currentDate: WorldDate;
  #status: GameWorldSnapshot["status"];
  #worldSequence: number;
  #version: number;

  private constructor(
    input: Readonly<{
      id: GameWorldSnapshot["id"];
      seed: string;
      startDate: WorldDate;
      currentDate: WorldDate;
      rulesetVersion: GameWorldSnapshot["rulesetVersion"];
      status: GameWorldSnapshot["status"];
      worldSequence: number;
      version: number;
    }>,
  ) {
    this.#id = input.id;
    this.#seed = input.seed;
    this.#startDate = input.startDate;
    this.#currentDate = input.currentDate;
    this.#rulesetVersion = input.rulesetVersion;
    this.#status = input.status;
    this.#worldSequence = input.worldSequence;
    this.#version = input.version;
  }

  public static create(
    input: CreateGameWorldInput,
  ): Result<GameWorld, DomainError> {
    const seed = input.seed.trim();
    if (seed === "") {
      return fail(
        new DomainError("INVALID_WORLD_SEED", "A seed do mundo é obrigatória."),
      );
    }

    return succeed(
      new GameWorld({
        id: input.id,
        seed,
        startDate: input.startDate,
        currentDate: input.startDate,
        rulesetVersion: input.rulesetVersion,
        status: WorldStatus.CREATING,
        worldSequence: 0,
        version: 1,
      }),
    );
  }

  public static fromSnapshot(
    snapshot: GameWorldSnapshot,
  ): Result<GameWorld, DomainError> {
    const startDate = WorldDate.parse(snapshot.startDate);
    if (!startDate.ok) return startDate;

    const currentDate = WorldDate.parse(snapshot.currentDate);
    if (!currentDate.ok) return currentDate;

    if (
      !Number.isSafeInteger(snapshot.worldSequence) ||
      snapshot.worldSequence < 0 ||
      !Number.isSafeInteger(snapshot.version) ||
      snapshot.version < 1
    ) {
      return fail(
        new DomainError(
          "INVALID_WORLD_SNAPSHOT",
          "Sequência ou versão inválida no snapshot.",
        ),
      );
    }

    return succeed(
      new GameWorld({
        id: snapshot.id,
        seed: snapshot.seed,
        startDate: startDate.value,
        currentDate: currentDate.value,
        rulesetVersion: snapshot.rulesetVersion,
        status: snapshot.status,
        worldSequence: snapshot.worldSequence,
        version: snapshot.version,
      }),
    );
  }

  public activate(
    evidence: WorldProvisioningEvidence,
  ): Result<void, DomainError> {
    if (this.#status !== WorldStatus.CREATING) {
      return fail(
        new DomainError(
          "INVALID_WORLD_TRANSITION",
          "Somente mundos CREATING podem ser ativados.",
          {
            status: this.#status,
          },
        ),
      );
    }

    if (evidence.rulesetVersion !== this.#rulesetVersion) {
      return fail(
        new DomainError(
          "RULESET_VERSION_MISMATCH",
          "A gênese foi produzida com uma versão de ruleset diferente do mundo.",
        ),
      );
    }

    if (
      evidence.generatedClubCount !== 16 ||
      evidence.clubsWithValidSquads !== 16 ||
      evidence.generatedPlayerCount !== 368 ||
      evidence.playersPerSquad !== 23 ||
      evidence.calendarValidated !== true
    ) {
      return fail(
        new DomainError(
          "WORLD_PROVISIONING_INCOMPLETE",
          "O mundo exige 16 clubes, 16 elencos válidos de 23 atletas e calendário validado.",
        ),
      );
    }

    this.#status = WorldStatus.ACTIVE;
    this.record("WorldCreated", {
      gameWorldId: this.#id,
      seed: this.#seed,
      rulesetVersion: this.#rulesetVersion,
    });
    this.record("WorldActivated", {
      gameWorldId: this.#id,
      rulesetVersion: this.#rulesetVersion,
    });

    return succeed(undefined);
  }

  public advanceDays(days: number): Result<void, DomainError> {
    if (this.#status !== WorldStatus.ACTIVE) {
      return fail(
        new DomainError(
          "WORLD_NOT_ACTIVE",
          "Somente mundos ACTIVE podem avançar o relógio.",
          {
            status: this.#status,
          },
        ),
      );
    }

    if (!Number.isSafeInteger(days) || days < 1) {
      return fail(
        new DomainError(
          "INVALID_DAY_COUNT",
          "days deve ser um inteiro positivo.",
          { days },
        ),
      );
    }

    for (let index = 0; index < days; index += 1) {
      this.#currentDate = this.#currentDate.addDays(1);
      this.record("WorldDayAdvanced", {
        gameWorldId: this.#id,
        gameDate: this.#currentDate.toString(),
        worldSequence: this.#worldSequence + 1,
      });
    }

    return succeed(undefined);
  }

  public snapshot(): GameWorldSnapshot {
    return {
      id: this.#id,
      seed: this.#seed,
      startDate: this.#startDate.toString(),
      currentDate: this.#currentDate.toString(),
      rulesetVersion: this.#rulesetVersion,
      status: this.#status,
      worldSequence: this.#worldSequence,
      version: this.#version,
    };
  }

  public pullDomainEvents(): readonly WorldDomainEvent[] {
    return this.#events.splice(0, this.#events.length);
  }

  private record<TType extends WorldDomainEvent["type"]>(
    type: TType,
    payload: Extract<WorldDomainEvent, { type: TType }>["payload"],
  ): void {
    this.#version += 1;
    this.#worldSequence += 1;
    this.#events.push({
      type,
      eventVersion: 1,
      gameWorldId: this.#id,
      aggregateType: "GameWorld",
      aggregateVersion: this.#version,
      worldSequence: this.#worldSequence,
      worldDate: this.#currentDate.toString(),
      rulesetVersion: this.#rulesetVersion,
      payload,
    } as Extract<WorldDomainEvent, { type: TType }>);
  }
}
