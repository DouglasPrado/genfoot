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
import {
  CompetitionStatus,
  FixtureStatus,
  type CompetitionClubRef,
  type CompetitionCreatedEvent,
  type CompetitionDomainEvent,
  type CompetitionEditionSnapshot,
  type CompetitionFixtureSnapshot,
  type CompetitionParticipantSnapshot,
  type CompetitionSeasonRef,
  type CompetitionSummary,
  type FixturesPublishedEvent,
  type RegistrationAcceptedEvent,
  type WorldCompetitionsSnapshot,
} from "./competition-types.js";

const LEAGUE_PHASE = "LEAGUE";

export class WorldCompetitions {
  private constructor(private state: WorldCompetitionsSnapshot) {}

  public static initialize(
    world: GameWorldSnapshot,
  ): Result<WorldCompetitions, DomainError> {
    return WorldCompetitions.fromSnapshot({
      gameWorldId: world.id,
      rulesetVersion: world.rulesetVersion,
      editions: [],
      participants: [],
      fixtures: [],
      events: [],
      revision: 1,
    });
  }

  public static fromSnapshot(
    snapshot: WorldCompetitionsSnapshot,
  ): Result<WorldCompetitions, DomainError> {
    if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) {
      return fail(invalidCompetitions("A revisão de competições é inválida."));
    }
    const editionIds = new Set<string>();
    for (const edition of snapshot.editions) {
      if (
        edition.gameWorldId !== snapshot.gameWorldId ||
        edition.name.trim() === "" ||
        edition.formatVersion.trim() === "" ||
        edition.maxParticipants < 2 ||
        edition.maxParticipants % 2 !== 0 ||
        edition.roundIntervalDays < 1 ||
        editionIds.has(edition.id) ||
        !Number.isSafeInteger(edition.version) ||
        edition.version < 1
      ) {
        return fail(invalidCompetitions("Edição de competição inválida."));
      }
      editionIds.add(edition.id);
    }
    for (const participant of snapshot.participants) {
      if (!editionIds.has(participant.editionId)) {
        return fail(invalidCompetitions("Participante sem edição válida."));
      }
    }
    const fixtureIds = new Set<string>();
    for (const fixture of snapshot.fixtures) {
      if (
        fixture.gameWorldId !== snapshot.gameWorldId ||
        !editionIds.has(fixture.editionId) ||
        fixture.homeClubId === fixture.awayClubId ||
        fixtureIds.has(fixture.id)
      ) {
        return fail(invalidCompetitions("Fixture inválida."));
      }
      fixtureIds.add(fixture.id);
    }
    for (const event of snapshot.events) {
      if (event.gameWorldId !== snapshot.gameWorldId) {
        return fail(invalidCompetitions("Evento de competição inválido."));
      }
    }
    return succeed(new WorldCompetitions(snapshot));
  }

  public createCompetitionEdition(
    input: Readonly<{
      seasonRef: CompetitionSeasonRef;
      name: string;
      formatVersion: string;
      maxParticipants: number;
      startOn: string;
      roundIntervalDays: number;
      worldDate: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
  ): Result<CompetitionEditionSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("CompetitionCreated", input.idempotencyKey);
    if (replay !== undefined) {
      const edition = this.state.editions.find(
        ({ id }) => id === replay.editionId,
      );
      if (edition !== undefined) return succeed(edition);
    }
    if (
      input.name.trim() === "" ||
      input.formatVersion.trim() === "" ||
      !Number.isSafeInteger(input.maxParticipants) ||
      input.maxParticipants < 2 ||
      input.maxParticipants % 2 !== 0 ||
      !Number.isSafeInteger(input.roundIntervalDays) ||
      input.roundIntervalDays < 1
    ) {
      return fail(
        new DomainError(
          "INVALID_COMPETITION_FORMAT",
          "Nome, formato, participantes (par >= 2) e intervalo devem ser válidos.",
        ),
      );
    }
    const startOn = WorldDate.parse(input.startOn);
    if (!startOn.ok) return startOn;
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const timestampMilliseconds = timestampOf(startOn.value.toString());
    const editionId = deterministicUuidV7<"CompetitionEdition">({
      worldSeed: input.worldSeed,
      context: `competition-edition:${input.idempotencyKey}`,
      timestampMilliseconds,
    });
    const eventId = deterministicUuidV7<"CompetitionEvent">({
      worldSeed: input.worldSeed,
      context: `competition-created:${input.idempotencyKey}`,
      timestampMilliseconds,
    });
    const edition: CompetitionEditionSnapshot = {
      id: editionId,
      gameWorldId: this.state.gameWorldId,
      seasonRef: input.seasonRef,
      name: input.name.trim(),
      formatVersion: input.formatVersion.trim(),
      status: CompetitionStatus.REGISTRATION,
      maxParticipants: input.maxParticipants,
      startOn: startOn.value.toString(),
      roundIntervalDays: input.roundIntervalDays,
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    const event: CompetitionCreatedEvent = {
      id: eventId,
      type: "CompetitionCreated",
      gameWorldId: this.state.gameWorldId,
      editionId,
      formatVersion: edition.formatVersion,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      editions: [...this.state.editions, edition],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(edition);
  }

  public registerParticipant(
    input: Readonly<{
      editionId: string;
      clubId: CompetitionClubRef;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<CompetitionParticipantSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("RegistrationAccepted", input.idempotencyKey);
    if (replay !== undefined) {
      const participant = this.state.participants.find(
        (candidate) =>
          candidate.editionId === replay.editionId &&
          candidate.clubId === replay.clubId,
      );
      if (participant !== undefined) return succeed(participant);
    }
    const edition = this.state.editions.find(
      ({ id }) => id === input.editionId,
    );
    if (edition === undefined) return fail(editionNotFound(input.editionId));
    if (edition.status !== CompetitionStatus.REGISTRATION) {
      return fail(
        new DomainError(
          "COMPETITION_REGISTRATION_CLOSED",
          "As inscrições da edição não estão abertas.",
          { editionId: edition.id },
        ),
      );
    }
    const editionParticipants = this.state.participants.filter(
      (candidate) => candidate.editionId === edition.id,
    );
    if (
      editionParticipants.some((candidate) => candidate.clubId === input.clubId)
    ) {
      return fail(
        new DomainError(
          "PARTICIPANT_ALREADY_REGISTERED",
          "O clube já está inscrito nesta edição.",
          { editionId: edition.id, clubId: input.clubId },
        ),
      );
    }
    if (editionParticipants.length >= edition.maxParticipants) {
      return fail(
        new DomainError(
          "COMPETITION_CAPACITY_EXCEEDED",
          "A edição já atingiu o número máximo de participantes.",
          { editionId: edition.id },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const seedNumber = editionParticipants.length + 1;
    const eventId = deterministicUuidV7<"CompetitionEvent">({
      worldSeed: input.worldSeed,
      context: `registration-accepted:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const participant: CompetitionParticipantSnapshot = {
      editionId: edition.id,
      clubId: input.clubId,
      seedNumber,
      registeredOn: date.value.toString(),
      idempotencyKey: input.idempotencyKey,
    };
    const event: RegistrationAcceptedEvent = {
      id: eventId,
      type: "RegistrationAccepted",
      gameWorldId: this.state.gameWorldId,
      editionId: edition.id,
      clubId: input.clubId,
      seedNumber,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      participants: [...this.state.participants, participant],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(participant);
  }

  public generateFixtures(
    input: Readonly<{
      editionId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<readonly CompetitionFixtureSnapshot[], DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("FixturesPublished", input.idempotencyKey);
    if (replay !== undefined) {
      return succeed(this.fixturesOf(replay.editionId));
    }
    const index = this.state.editions.findIndex(
      ({ id }) => id === input.editionId,
    );
    if (index < 0) return fail(editionNotFound(input.editionId));
    const edition = this.state.editions[index]!;
    if (edition.status !== CompetitionStatus.REGISTRATION) {
      return fail(
        new DomainError(
          "COMPETITION_ALREADY_SCHEDULED",
          "As fixtures da edição já foram geradas.",
          { editionId: edition.id },
        ),
      );
    }
    const clubs = this.state.participants
      .filter((participant) => participant.editionId === edition.id)
      .slice()
      .sort((left, right) => left.seedNumber - right.seedNumber)
      .map((participant) => participant.clubId);
    if (clubs.length < 2 || clubs.length % 2 !== 0) {
      return fail(
        new DomainError(
          "COMPETITION_INVALID_PARTICIPANTS",
          "É necessário um número par (>= 2) de participantes para gerar fixtures.",
          { editionId: edition.id, participantCount: clubs.length },
        ),
      );
    }
    const startOn = WorldDate.parse(edition.startOn);
    if (!startOn.ok) return startOn;
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const pairings = doubleRoundRobin(clubs);
    const fixtures: CompetitionFixtureSnapshot[] = pairings.map((pairing) => {
      const kickoffOn = startOn.value
        .addDays(pairing.round * edition.roundIntervalDays)
        .toString();
      return {
        id: deterministicUuidV7<"CompetitionFixture">({
          worldSeed: input.worldSeed,
          context: `fixture:${edition.id}:${pairing.round}:${pairing.homeClubId}:${pairing.awayClubId}`,
          timestampMilliseconds: timestampOf(kickoffOn),
        }),
        gameWorldId: this.state.gameWorldId,
        editionId: edition.id,
        phase: LEAGUE_PHASE,
        round: pairing.round + 1,
        homeClubId: pairing.homeClubId,
        awayClubId: pairing.awayClubId,
        kickoffOn,
        status: FixtureStatus.SCHEDULED,
        homeGoals: null,
        awayGoals: null,
      };
    });
    const roundCount = clubs.length === 0 ? 0 : (clubs.length - 1) * 2;
    const eventId = deterministicUuidV7<"CompetitionEvent">({
      worldSeed: input.worldSeed,
      context: `fixtures-published:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const editions = [...this.state.editions];
    editions[index] = {
      ...edition,
      status: CompetitionStatus.SCHEDULED,
      version: edition.version + 1,
    };
    const event: FixturesPublishedEvent = {
      id: eventId,
      type: "FixturesPublished",
      gameWorldId: this.state.gameWorldId,
      editionId: edition.id,
      fixtureCount: fixtures.length,
      roundCount,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      editions,
      fixtures: [...this.state.fixtures, ...fixtures],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(fixtures);
  }

  public fixturesOf(
    editionId: string,
  ): readonly CompetitionFixtureSnapshot[] {
    return this.state.fixtures.filter(
      (fixture) => fixture.editionId === editionId,
    );
  }

  public findEdition(editionId: string): CompetitionEditionSnapshot | null {
    return this.state.editions.find(({ id }) => id === editionId) ?? null;
  }

  public summary(): CompetitionSummary {
    return {
      editionCount: this.state.editions.length,
      participantCount: this.state.participants.length,
      fixtureCount: this.state.fixtures.length,
      eventCount: this.state.events.length,
    };
  }

  public snapshot(): WorldCompetitionsSnapshot {
    return this.state;
  }

  private findEvent<T extends CompetitionDomainEvent["type"]>(
    type: T,
    idempotencyKey: string,
  ): Extract<CompetitionDomainEvent, { type: T }> | undefined {
    return this.state.events.find(
      (event): event is Extract<CompetitionDomainEvent, { type: T }> =>
        event.type === type && event.idempotencyKey === idempotencyKey,
    );
  }
}

interface Pairing {
  readonly round: number;
  readonly homeClubId: CompetitionClubRef;
  readonly awayClubId: CompetitionClubRef;
}

function doubleRoundRobin(clubs: readonly CompetitionClubRef[]): Pairing[] {
  const n = clubs.length;
  const rounds = n - 1;
  const half = n / 2;
  const rotation = [...clubs];
  const pairings: Pairing[] = [];
  for (let round = 0; round < rounds; round += 1) {
    for (let match = 0; match < half; match += 1) {
      const a = rotation[match]!;
      const b = rotation[n - 1 - match]!;
      const homeIsA = (round + match) % 2 === 0;
      const home = homeIsA ? a : b;
      const away = homeIsA ? b : a;
      pairings.push({ round, homeClubId: home, awayClubId: away });
      pairings.push({
        round: round + rounds,
        homeClubId: away,
        awayClubId: home,
      });
    }
    rotation.splice(1, 0, rotation.pop()!);
  }
  return pairings.sort((left, right) => left.round - right.round);
}

function invalidCompetitions(message: string): DomainError {
  return new DomainError("INVALID_COMPETITION_STATE", message);
}

function rulesetMismatch(): DomainError {
  return new DomainError(
    "RULESET_VERSION_MISMATCH",
    "O command usa um ruleset diferente das competições.",
  );
}

function editionNotFound(editionId: string): DomainError {
  return new DomainError(
    "COMPETITION_EDITION_NOT_FOUND",
    "Edição de competição não encontrada.",
    { editionId },
  );
}

function timestampOf(worldDate: string): number {
  return Date.parse(`${worldDate}T00:00:00.000Z`);
}
