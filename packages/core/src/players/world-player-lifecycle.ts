import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import { deterministicUuidV7, timestampOf } from "../foundation/deterministic-uuid.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import type {
  DominantFoot,
  PlayerPosition,
  WorldGenesisSnapshot,
} from "../genesis/genesis-types.js";
import { Player } from "./player.js";
import {
  MedicalCaseStatus,
  PlayerAvailability,
  PlayerCareerStatus,
  PlayerGenerationSource,
  type MedicalCaseSeverity,
  type MedicalCaseSnapshot,
  type PersonLifecycleSnapshot,
  type PlayerAttributeCode,
  type PlayerAttributeGroups,
  type PlayerClearedEvent,
  type PlayerDevelopedEvent,
  type PlayerDevelopmentHistoryEntry,
  type PlayerGeneratedEvent,
  type PlayerInjuredEvent,
  type PlayerLifecycleSummary,
  type PlayerInspection,
  type PlayerLifecycleSnapshot,
  type PlayerRetiredEvent,
  type WorldPlayerLifecycleSnapshot,
  type YouthPromotedEvent,
} from "./player-lifecycle-types.js";

export interface ProspectSpec {
  readonly firstName: string;
  readonly lastName: string;
  readonly birthDate: string;
  readonly nationality: string;
  readonly primaryPosition: PlayerPosition;
  readonly secondaryPosition?: PlayerPosition;
  readonly dominantFoot: DominantFoot;
  readonly attributes: PlayerAttributeGroups;
  readonly potentialAbility: number;
  readonly seasonNumber: number;
}

const VALID_FOCUS: readonly PlayerAttributeCode[] = [
  "technical",
  "physical",
  "mental",
  "goalkeeping",
];

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
      medicalCases: [],
      lifecycleEvents: [],
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
    const caseIds = new Set<string>();
    for (const medicalCase of snapshot.medicalCases ?? []) {
      if (
        medicalCase.gameWorldId !== snapshot.gameWorldId ||
        !playerIds.has(medicalCase.playerId) ||
        medicalCase.diagnosis.trim() === "" ||
        caseIds.has(medicalCase.id) ||
        !Number.isSafeInteger(medicalCase.version) ||
        medicalCase.version < 1
      ) {
        return fail(invalidLifecycle("Caso médico inválido."));
      }
      caseIds.add(medicalCase.id);
    }
    for (const event of snapshot.lifecycleEvents ?? []) {
      if (
        event.gameWorldId !== snapshot.gameWorldId ||
        !playerIds.has(event.playerId)
      ) {
        return fail(invalidLifecycle("Evento de ciclo de vida inválido."));
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

  public openMedicalCase(
    input: Readonly<{
      playerId: string;
      diagnosis: string;
      severity: MedicalCaseSeverity;
      expectedReturnOn: string;
      worldDate: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
  ): Result<MedicalCaseSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const cases = this.state.medicalCases ?? [];
    const existing = cases.find(
      (medicalCase) => medicalCase.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    if (input.diagnosis.trim() === "") {
      return fail(
        new DomainError("INVALID_MEDICAL_CASE", "Diagnóstico obrigatório."),
      );
    }
    const openedDate = WorldDate.parse(input.worldDate);
    if (!openedDate.ok) return openedDate;
    const returnDate = WorldDate.parse(input.expectedReturnOn);
    if (!returnDate.ok) return returnDate;
    if (returnDate.value.toString() < openedDate.value.toString()) {
      return fail(
        new DomainError(
          "INVALID_MEDICAL_CASE",
          "O retorno não pode ser anterior à abertura.",
        ),
      );
    }
    const index = this.state.players.findIndex(
      ({ id }) => id === input.playerId,
    );
    if (index < 0) return fail(playerNotFound(input.playerId));
    const current = this.state.players[index]!;
    if (current.careerStatus === PlayerCareerStatus.RETIRED) {
      return fail(
        new DomainError(
          "PLAYER_RETIRED",
          "Jogador aposentado não abre caso médico.",
          { playerId: input.playerId },
        ),
      );
    }
    if (current.availability === PlayerAvailability.INJURED) {
      return fail(
        new DomainError(
          "PLAYER_ALREADY_INJURED",
          "Jogador já possui um caso médico aberto.",
          { playerId: input.playerId },
        ),
      );
    }
    const timestampMilliseconds = Date.parse(
      `${openedDate.value.toString()}T00:00:00.000Z`,
    );
    const caseId = deterministicUuidV7<"MedicalCase">({
      worldSeed: input.worldSeed,
      context: `medical:${input.idempotencyKey}`,
      timestampMilliseconds,
    });
    const eventId = deterministicUuidV7<"PlayerLifecycleEvent">({
      worldSeed: input.worldSeed,
      context: `injured:${input.idempotencyKey}`,
      timestampMilliseconds,
    });
    const medicalCase: MedicalCaseSnapshot = {
      id: caseId,
      gameWorldId: this.state.gameWorldId,
      playerId: current.id,
      diagnosis: input.diagnosis.trim(),
      severity: input.severity,
      status: MedicalCaseStatus.OPEN,
      openedOn: openedDate.value.toString(),
      expectedReturnOn: returnDate.value.toString(),
      clearedOn: null,
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    const event: PlayerInjuredEvent = {
      id: eventId,
      type: "PlayerInjured",
      gameWorldId: this.state.gameWorldId,
      playerId: current.id,
      medicalCaseId: caseId,
      severity: input.severity,
      diagnosis: medicalCase.diagnosis,
      worldDate: openedDate.value.toString(),
      expectedReturnOn: returnDate.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    const players = [...this.state.players];
    players[index] = {
      ...current,
      availability: PlayerAvailability.INJURED,
      version: current.version + 1,
    };
    this.state = {
      ...this.state,
      players,
      medicalCases: [...cases, medicalCase],
      lifecycleEvents: [...(this.state.lifecycleEvents ?? []), event],
      revision: this.state.revision + 1,
    };
    return succeed(medicalCase);
  }

  public reassessMedicalCase(
    input: Readonly<{
      medicalCaseId: string;
      outcome: "CLEAR" | "EXTEND";
      worldDate: string;
      newExpectedReturnOn?: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
  ): Result<MedicalCaseSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const cases = this.state.medicalCases ?? [];
    const index = cases.findIndex(({ id }) => id === input.medicalCaseId);
    if (index < 0) {
      return fail(
        new DomainError(
          "MEDICAL_CASE_NOT_FOUND",
          "Caso médico não encontrado.",
          { medicalCaseId: input.medicalCaseId },
        ),
      );
    }
    const current = cases[index]!;
    if (current.lastReassessmentKey === input.idempotencyKey) {
      return succeed(current);
    }
    if (current.status === MedicalCaseStatus.CLEARED) {
      return fail(
        new DomainError(
          "MEDICAL_CASE_TERMINAL",
          "Caso médico já encerrado não aceita reavaliação.",
          { medicalCaseId: current.id },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    if (input.outcome === "EXTEND") {
      if (input.newExpectedReturnOn === undefined) {
        return fail(
          new DomainError(
            "INVALID_MEDICAL_CASE",
            "A extensão exige uma nova data de retorno.",
          ),
        );
      }
      const newReturn = WorldDate.parse(input.newExpectedReturnOn);
      if (!newReturn.ok) return newReturn;
      if (newReturn.value.toString() < date.value.toString()) {
        return fail(
          new DomainError(
            "INVALID_MEDICAL_CASE",
            "O novo retorno não pode ser anterior à reavaliação.",
          ),
        );
      }
      const updated: MedicalCaseSnapshot = {
        ...current,
        status: MedicalCaseStatus.RECOVERING,
        expectedReturnOn: newReturn.value.toString(),
        lastReassessmentKey: input.idempotencyKey,
        version: current.version + 1,
      };
      const nextCases = [...cases];
      nextCases[index] = updated;
      this.state = {
        ...this.state,
        medicalCases: nextCases,
        revision: this.state.revision + 1,
      };
      return succeed(updated);
    }
    const playerIndex = this.state.players.findIndex(
      ({ id }) => id === current.playerId,
    );
    if (playerIndex < 0) return fail(playerNotFound(current.playerId));
    const player = this.state.players[playerIndex]!;
    const eventId = deterministicUuidV7<"PlayerLifecycleEvent">({
      worldSeed: input.worldSeed,
      context: `cleared:${input.idempotencyKey}`,
      timestampMilliseconds: Date.parse(
        `${date.value.toString()}T00:00:00.000Z`,
      ),
    });
    const updated: MedicalCaseSnapshot = {
      ...current,
      status: MedicalCaseStatus.CLEARED,
      clearedOn: date.value.toString(),
      lastReassessmentKey: input.idempotencyKey,
      version: current.version + 1,
    };
    const nextCases = [...cases];
    nextCases[index] = updated;
    const players = [...this.state.players];
    players[playerIndex] =
      player.careerStatus === PlayerCareerStatus.RETIRED
        ? player
        : {
            ...player,
            availability: PlayerAvailability.AVAILABLE,
            version: player.version + 1,
          };
    const event: PlayerClearedEvent = {
      id: eventId,
      type: "PlayerCleared",
      gameWorldId: this.state.gameWorldId,
      playerId: current.playerId,
      medicalCaseId: current.id,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      players,
      medicalCases: nextCases,
      lifecycleEvents: [...(this.state.lifecycleEvents ?? []), event],
      revision: this.state.revision + 1,
    };
    return succeed(updated);
  }

  public retirePlayer(
    input: Readonly<{
      playerId: string;
      reason: string;
      worldDate: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
  ): Result<PlayerLifecycleSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const events = this.state.lifecycleEvents ?? [];
    const existing = events.find(
      (event): event is PlayerRetiredEvent =>
        event.type === "PlayerRetired" &&
        event.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) {
      const retired = this.findPlayer(existing.playerId);
      if (retired !== null) return succeed(retired);
    }
    if (input.reason.trim() === "") {
      return fail(
        new DomainError("INVALID_RETIREMENT", "O motivo é obrigatório."),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const index = this.state.players.findIndex(
      ({ id }) => id === input.playerId,
    );
    if (index < 0) return fail(playerNotFound(input.playerId));
    const current = this.state.players[index]!;
    if (current.careerStatus === PlayerCareerStatus.RETIRED) {
      return fail(
        new DomainError("PLAYER_ALREADY_RETIRED", "Jogador já aposentado.", {
          playerId: input.playerId,
        }),
      );
    }
    const eventId = deterministicUuidV7<"PlayerLifecycleEvent">({
      worldSeed: input.worldSeed,
      context: `retired:${input.idempotencyKey}`,
      timestampMilliseconds: Date.parse(
        `${date.value.toString()}T00:00:00.000Z`,
      ),
    });
    const retired: PlayerLifecycleSnapshot = {
      ...current,
      careerStatus: PlayerCareerStatus.RETIRED,
      availability: PlayerAvailability.UNAVAILABLE,
      version: current.version + 1,
    };
    const players = [...this.state.players];
    players[index] = retired;
    const event: PlayerRetiredEvent = {
      id: eventId,
      type: "PlayerRetired",
      gameWorldId: this.state.gameWorldId,
      playerId: current.id,
      reason: input.reason.trim(),
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      players,
      lifecycleEvents: [...events, event],
      revision: this.state.revision + 1,
    };
    return succeed(retired);
  }

  public generatePlayer(
    input: Readonly<{
      prospect: ProspectSpec;
      source: PlayerGenerationSource;
      worldDate: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
  ): Result<PlayerLifecycleSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const existing = this.state.generationEvents.find(
      (event) => event.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) {
      const player = this.findPlayer(existing.playerId);
      if (player !== null) return succeed(player);
    }
    const built = this.buildGeneratedPlayer({
      prospect: input.prospect,
      source: input.source,
      youthProspect: false,
      worldDate: input.worldDate,
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
      worldSeed: input.worldSeed,
    });
    if (!built.ok) return built;
    this.state = {
      ...this.state,
      persons: [...this.state.persons, built.value.person],
      players: [...this.state.players, built.value.player],
      generationEvents: [...this.state.generationEvents, built.value.event],
      revision: this.state.revision + 1,
    };
    return succeed(built.value.player);
  }

  public setTrainingDirection(
    input: Readonly<{
      playerId: string;
      focus: PlayerAttributeCode;
      rulesetVersion: RulesetVersion;
    }>,
  ): Result<PlayerLifecycleSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const index = this.state.players.findIndex(
      ({ id }) => id === input.playerId,
    );
    if (index < 0) return fail(playerNotFound(input.playerId));
    const current = this.state.players[index]!;
    if (current.careerStatus === PlayerCareerStatus.RETIRED) {
      return fail(
        new DomainError("PLAYER_ALREADY_RETIRED", "Jogador já aposentado.", {
          playerId: current.id,
        }),
      );
    }
    if (!VALID_FOCUS.includes(input.focus)) {
      return fail(new DomainError("INVALID_TRAINING_FOCUS", "Foco inválido."));
    }
    if (current.trainingFocus === input.focus) return succeed(current);
    const updated: PlayerLifecycleSnapshot = {
      ...current,
      trainingFocus: input.focus,
      version: current.version + 1,
    };
    const players = [...this.state.players];
    players[index] = updated;
    this.state = { ...this.state, players, revision: this.state.revision + 1 };
    return succeed(updated);
  }

  public applyDailyDevelopment(
    input: Readonly<{
      playerId: string;
      worldDate: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
  ): Result<PlayerLifecycleSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const events = this.state.lifecycleEvents ?? [];
    const replay = events.find(
      (event): event is PlayerDevelopedEvent =>
        event.type === "PlayerDeveloped" &&
        event.idempotencyKey === input.idempotencyKey,
    );
    if (replay !== undefined) {
      const player = this.findPlayer(replay.playerId);
      if (player !== null) return succeed(player);
    }
    const index = this.state.players.findIndex(
      ({ id }) => id === input.playerId,
    );
    if (index < 0) return fail(playerNotFound(input.playerId));
    const current = this.state.players[index]!;
    if (current.careerStatus === PlayerCareerStatus.RETIRED) {
      return fail(
        new DomainError("PLAYER_ALREADY_RETIRED", "Jogador já aposentado.", {
          playerId: current.id,
        }),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const attributeCode =
      current.trainingFocus ?? defaultFocus(current.primaryPosition);
    const previousValue = current.attributes[attributeCode];
    const historyId = deterministicUuidV7<"PlayerDevelopmentHistory">({
      worldSeed: input.worldSeed,
      context: `develop:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    if (this.state.developmentHistory.some(({ id }) => id === historyId)) {
      return succeed(current);
    }
    const player = Player.fromSnapshot(current);
    if (!player.ok) return player;
    const changed = player.value.applyAttributeChange({
      historyId,
      attributeCode,
      requestedValue: previousValue + 2,
      cause: "DAILY_TRAINING",
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
    });
    if (!changed.ok) return changed;
    if (changed.value === null) {
      // no potencial esgotado o desenvolvimento é um no-op silencioso
      return succeed(current);
    }
    const updated = player.value.snapshot();
    const players = [...this.state.players];
    players[index] = updated;
    const event: PlayerDevelopedEvent = {
      id: deterministicUuidV7<"PlayerLifecycleEvent">({
        worldSeed: input.worldSeed,
        context: `developed:${input.idempotencyKey}`,
        timestampMilliseconds: timestampOf(date.value.toString()),
      }),
      type: "PlayerDeveloped",
      gameWorldId: this.state.gameWorldId,
      playerId: current.id,
      attributeCode,
      previousValue: changed.value.previousValue,
      nextValue: changed.value.nextValue,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      players,
      developmentHistory: [...this.state.developmentHistory, changed.value],
      lifecycleEvents: [...events, event],
      revision: this.state.revision + 1,
    };
    return succeed(updated);
  }

  public generateYouthCohort(
    input: Readonly<{
      prospects: readonly ProspectSpec[];
      seasonNumber: number;
      worldDate: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
  ): Result<readonly PlayerLifecycleSnapshot[], DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    if (input.prospects.length === 0) {
      return fail(
        new DomainError(
          "INVALID_YOUTH_COHORT",
          "A coorte precisa de prospectos.",
        ),
      );
    }
    const cohortKeys = input.prospects.map(
      (_, position) => `${input.idempotencyKey}:${position}`,
    );
    const already = this.state.generationEvents.filter((event) =>
      cohortKeys.includes(event.idempotencyKey),
    );
    if (already.length === input.prospects.length) {
      return succeed(
        already
          .map((event) => this.findPlayer(event.playerId))
          .filter(
            (player): player is PlayerLifecycleSnapshot => player !== null,
          ),
      );
    }
    const persons = [...this.state.persons];
    const players = [...this.state.players];
    const generationEvents = [...this.state.generationEvents];
    const created: PlayerLifecycleSnapshot[] = [];
    for (let position = 0; position < input.prospects.length; position += 1) {
      const built = this.buildGeneratedPlayer({
        prospect: input.prospects[position]!,
        source: PlayerGenerationSource.YOUTH_ACADEMY,
        youthProspect: true,
        worldDate: input.worldDate,
        rulesetVersion: input.rulesetVersion,
        idempotencyKey: cohortKeys[position]!,
        worldSeed: input.worldSeed,
      });
      if (!built.ok) return built;
      persons.push(built.value.person);
      players.push(built.value.player);
      generationEvents.push(built.value.event);
      created.push(built.value.player);
    }
    this.state = {
      ...this.state,
      persons,
      players,
      generationEvents,
      revision: this.state.revision + 1,
    };
    return succeed(created);
  }

  public promoteYouth(
    input: Readonly<{
      playerId: string;
      worldDate: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
  ): Result<PlayerLifecycleSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const events = this.state.lifecycleEvents ?? [];
    const replay = events.find(
      (event): event is YouthPromotedEvent =>
        event.type === "YouthPromoted" &&
        event.idempotencyKey === input.idempotencyKey,
    );
    if (replay !== undefined) {
      const player = this.findPlayer(replay.playerId);
      if (player !== null) return succeed(player);
    }
    const index = this.state.players.findIndex(
      ({ id }) => id === input.playerId,
    );
    if (index < 0) return fail(playerNotFound(input.playerId));
    const current = this.state.players[index]!;
    if (current.youthProspect !== true) {
      return fail(
        new DomainError(
          "PLAYER_NOT_YOUTH",
          "Somente prospectos da base podem ser promovidos.",
          { playerId: current.id },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const promoted: PlayerLifecycleSnapshot = {
      ...current,
      youthProspect: false,
      careerStatus: PlayerCareerStatus.ACTIVE,
      availability: PlayerAvailability.AVAILABLE,
      version: current.version + 1,
    };
    const players = [...this.state.players];
    players[index] = promoted;
    const event: YouthPromotedEvent = {
      id: deterministicUuidV7<"PlayerLifecycleEvent">({
        worldSeed: input.worldSeed,
        context: `youth-promoted:${input.idempotencyKey}`,
        timestampMilliseconds: timestampOf(date.value.toString()),
      }),
      type: "YouthPromoted",
      gameWorldId: this.state.gameWorldId,
      playerId: current.id,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      players,
      lifecycleEvents: [...events, event],
      revision: this.state.revision + 1,
    };
    return succeed(promoted);
  }

  private buildGeneratedPlayer(
    input: Readonly<{
      prospect: ProspectSpec;
      source: PlayerGenerationSource;
      youthProspect: boolean;
      worldDate: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
  ): Result<
    {
      person: PersonLifecycleSnapshot;
      player: PlayerLifecycleSnapshot;
      event: PlayerGeneratedEvent;
    },
    DomainError
  > {
    const prospect = input.prospect;
    if (
      prospect.firstName.trim() === "" ||
      prospect.lastName.trim() === "" ||
      !validGenScore(prospect.potentialAbility) ||
      !Object.values(prospect.attributes).every(validGenScore)
    ) {
      return fail(
        new DomainError(
          "INVALID_PLAYER_GENERATION",
          "Dados do prospecto inválidos.",
        ),
      );
    }
    const birthDate = WorldDate.parse(prospect.birthDate);
    if (!birthDate.ok) return birthDate;
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const timestampMilliseconds = timestampOf(date.value.toString());
    const personId = deterministicUuidV7<"Person">({
      worldSeed: input.worldSeed,
      context: `person:${input.idempotencyKey}`,
      timestampMilliseconds,
    });
    const playerId = deterministicUuidV7<"Player">({
      worldSeed: input.worldSeed,
      context: `player:${input.idempotencyKey}`,
      timestampMilliseconds,
    });
    const attrs = prospect.attributes;
    const mean = Math.round(
      (attrs.technical + attrs.physical + attrs.mental + attrs.goalkeeping) / 4,
    );
    const currentAbility = Math.max(
      0,
      Math.min(prospect.potentialAbility, mean),
    );
    const person: PersonLifecycleSnapshot = {
      id: personId,
      gameWorldId: this.state.gameWorldId,
      firstName: prospect.firstName.trim(),
      lastName: prospect.lastName.trim(),
      birthDate: birthDate.value.toString(),
      nationality: prospect.nationality,
      version: 1,
    };
    const playerSnapshot: PlayerLifecycleSnapshot = {
      id: playerId,
      gameWorldId: this.state.gameWorldId,
      personId,
      primaryPosition: prospect.primaryPosition,
      ...(prospect.secondaryPosition !== undefined
        ? { secondaryPosition: prospect.secondaryPosition }
        : {}),
      dominantFoot: prospect.dominantFoot,
      careerStatus:
        input.source === PlayerGenerationSource.MARKET_BALANCE
          ? PlayerCareerStatus.FREE_AGENT
          : PlayerCareerStatus.ACTIVE,
      availability: PlayerAvailability.AVAILABLE,
      generationSource: input.source,
      generatedAtSeasonNumber: prospect.seasonNumber,
      attributes: attrs,
      currentAbility,
      potentialAbility: prospect.potentialAbility,
      dynamicState: {
        morale: 50,
        confidence: 50,
        happiness: 50,
        fatigue: 0,
        matchSharpness: 0,
      },
      ...(input.youthProspect ? { youthProspect: true } : {}),
      lastProcessedOn: date.value.toString(),
      version: 1,
    };
    const validated = Player.fromSnapshot(playerSnapshot);
    if (!validated.ok) return validated;
    const event: PlayerGeneratedEvent = {
      id: deterministicUuidV7<"PlayerGenerationEvent">({
        worldSeed: input.worldSeed,
        context: `player-generated:${input.idempotencyKey}`,
        timestampMilliseconds,
      }),
      type: "PlayerGenerated",
      gameWorldId: this.state.gameWorldId,
      playerId,
      personId,
      source: input.source,
      seasonNumber: prospect.seasonNumber,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    return succeed({ person, player: playerSnapshot, event });
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
      openMedicalCaseCount: (this.state.medicalCases ?? []).filter(
        ({ status }) => status !== MedicalCaseStatus.CLEARED,
      ).length,
      retiredPlayerCount: this.state.players.filter(
        ({ careerStatus }) => careerStatus === PlayerCareerStatus.RETIRED,
      ).length,
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

function rulesetMismatch(): DomainError {
  return new DomainError(
    "RULESET_VERSION_MISMATCH",
    "O command usa um ruleset diferente do lifecycle.",
  );
}


function validGenScore(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= 100;
}

function defaultFocus(position: PlayerPosition): PlayerAttributeCode {
  return position === "GK" ? "goalkeeping" : "technical";
}

function playerNotFound(playerId: string): DomainError {
  return new DomainError("PLAYER_NOT_FOUND", "Jogador não encontrado.", {
    playerId,
  });
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
