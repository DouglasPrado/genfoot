import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import { stableHash } from "../matches/match-kernel.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import {
  CompetitionStatus,
  FixtureStatus,
  type CompetitionClubRef,
  type CompetitionCreatedEvent,
  type CompetitionDomainEvent,
  type CompetitionEditionSnapshot,
  type CompetitionFixtureSnapshot,
  type CompetitionHomologatedEvent,
  type CompetitionHomologationSnapshot,
  type CompetitionParticipantSnapshot,
  type CompetitionSeasonRef,
  type CompetitionSummary,
  type FixturesPublishedEvent,
  type RegistrationAcceptedEvent,
  type StandingChangedEvent,
  type StandingEntrySnapshot,
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
      standings: [],
      homologations: [],
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
    for (const standing of snapshot.standings ?? []) {
      if (
        !editionIds.has(standing.editionId) ||
        !Number.isSafeInteger(standing.points) ||
        standing.played < 0
      ) {
        return fail(invalidCompetitions("Standing inválido."));
      }
    }
    for (const homologation of snapshot.homologations ?? []) {
      if (
        homologation.gameWorldId !== snapshot.gameWorldId ||
        !editionIds.has(homologation.editionId) ||
        homologation.inputHash.trim() === ""
      ) {
        return fail(invalidCompetitions("Homologação inválida."));
      }
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

  public recordOfficialResult(
    input: Readonly<{
      fixtureId: string;
      matchRef: string;
      homeGoals: number;
      awayGoals: number;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<CompetitionFixtureSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const index = this.state.fixtures.findIndex(
      ({ id }) => id === input.fixtureId,
    );
    if (index < 0) return fail(fixtureNotFound(input.fixtureId));
    const fixture = this.state.fixtures[index]!;
    if (fixture.status === FixtureStatus.FINAL) {
      // FR-004: resultado oficial entra uma vez por matchId. Mesmo matchRef =
      // idempotente; matchRef diferente = conflito (não reescreve fato).
      if (fixture.resultRef === input.matchRef) return succeed(fixture);
      return fail(
        new DomainError(
          "RESULT_ALREADY_RECORDED",
          "A fixture já possui resultado oficial.",
          { fixtureId: fixture.id },
        ),
      );
    }
    if (
      !Number.isSafeInteger(input.homeGoals) ||
      input.homeGoals < 0 ||
      !Number.isSafeInteger(input.awayGoals) ||
      input.awayGoals < 0
    ) {
      return fail(new DomainError("INVALID_RESULT", "Placar inválido."));
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const finalized: CompetitionFixtureSnapshot = {
      ...fixture,
      status: FixtureStatus.FINAL,
      homeGoals: input.homeGoals,
      awayGoals: input.awayGoals,
      resultRef: input.matchRef,
    };
    const fixtures = [...this.state.fixtures];
    fixtures[index] = finalized;
    const standings = this.recomputeStandings(
      fixture.editionId,
      fixtures,
      this.state.standings ?? [],
    );
    const event: StandingChangedEvent = {
      id: this.eventId(input.worldSeed, `standing-changed:${input.idempotencyKey}`, date.value.toString()),
      type: "StandingChanged",
      gameWorldId: this.state.gameWorldId,
      editionId: fixture.editionId,
      fixtureId: fixture.id,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      fixtures,
      standings,
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(finalized);
  }

  public applyDiscipline(
    input: Readonly<{
      editionId: string;
      clubId: CompetitionClubRef;
      disciplinaryPoints: number;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<StandingEntrySnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("StandingChanged", input.idempotencyKey);
    if (replay !== undefined) {
      const standing = (this.state.standings ?? []).find(
        (entry) =>
          entry.editionId === input.editionId && entry.clubId === input.clubId,
      );
      if (standing !== undefined) return succeed(standing);
    }
    const edition = this.state.editions.find(({ id }) => id === input.editionId);
    if (edition === undefined) return fail(editionNotFound(input.editionId));
    const isParticipant = this.state.participants.some(
      (participant) =>
        participant.editionId === input.editionId &&
        participant.clubId === input.clubId,
    );
    if (!isParticipant) {
      return fail(
        new DomainError(
          "COMPETITION_PARTICIPANT_NOT_FOUND",
          "Clube não é participante da edição.",
          { editionId: input.editionId, clubId: input.clubId },
        ),
      );
    }
    if (
      !Number.isSafeInteger(input.disciplinaryPoints) ||
      input.disciplinaryPoints < 0
    ) {
      return fail(
        new DomainError("INVALID_DISCIPLINE", "Pontos disciplinares inválidos."),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const current = this.state.standings ?? [];
    const materialized = current.some((s) => s.editionId === input.editionId)
      ? current
      : this.recomputeStandings(input.editionId, this.state.fixtures, current);
    const bumped = materialized.map((entry) =>
      entry.editionId === input.editionId && entry.clubId === input.clubId
        ? {
            ...entry,
            disciplinaryPoints:
              entry.disciplinaryPoints + input.disciplinaryPoints,
          }
        : entry,
    );
    const standings = this.recomputeStandings(
      input.editionId,
      this.state.fixtures,
      bumped,
    );
    const event: StandingChangedEvent = {
      id: this.eventId(input.worldSeed, `discipline:${input.idempotencyKey}`, date.value.toString()),
      type: "StandingChanged",
      gameWorldId: this.state.gameWorldId,
      editionId: edition.id,
      fixtureId: null,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      standings,
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    const updated = standings.find(
      (entry) =>
        entry.editionId === input.editionId && entry.clubId === input.clubId,
    )!;
    return succeed(updated);
  }

  public homologateCompetition(
    input: Readonly<{
      editionId: string;
      decidedBy: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<CompetitionHomologationSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("CompetitionHomologated", input.idempotencyKey);
    if (replay !== undefined) {
      const homologation = (this.state.homologations ?? []).find(
        ({ id }) => id === replay.homologationId,
      );
      if (homologation !== undefined) return succeed(homologation);
    }
    const index = this.state.editions.findIndex(
      ({ id }) => id === input.editionId,
    );
    if (index < 0) return fail(editionNotFound(input.editionId));
    const edition = this.state.editions[index]!;
    if (edition.status === CompetitionStatus.HOMOLOGATED) {
      const homologation = (this.state.homologations ?? []).find(
        (h) => h.editionId === edition.id,
      );
      if (homologation !== undefined) return succeed(homologation);
    }
    const fixtures = this.fixturesOf(edition.id);
    if (
      fixtures.length === 0 ||
      fixtures.some((fixture) => fixture.status !== FixtureStatus.FINAL)
    ) {
      return fail(
        new DomainError(
          "HOMOLOGATION_PREMATURE",
          "Só uma edição com todas as fixtures finalizadas pode ser homologada.",
          { editionId: edition.id },
        ),
      );
    }
    if (input.decidedBy.trim() === "") {
      return fail(
        new DomainError("INVALID_HOMOLOGATION", "O decisor é obrigatório."),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const standings = this.recomputeStandings(
      edition.id,
      fixtures,
      this.state.standings ?? [],
    );
    const editionStandings = standings
      .filter((entry) => entry.editionId === edition.id)
      .slice()
      .sort((left, right) => left.provisionalRank - right.provisionalRank);
    const finalRanking = editionStandings.map((entry) => entry.clubId);
    const inputHash = stableHash(
      [
        edition.id,
        edition.formatVersion,
        ...fixtures
          .slice()
          .sort((a, b) => (a.id < b.id ? -1 : 1))
          .map((f) => `${f.id}:${f.homeGoals}-${f.awayGoals}`),
        ...finalRanking,
      ].join("|"),
    );
    const homologationId = deterministicUuidV7<"CompetitionHomologation">({
      worldSeed: input.worldSeed,
      context: `homologation:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const homologation: CompetitionHomologationSnapshot = {
      id: homologationId,
      gameWorldId: this.state.gameWorldId,
      editionId: edition.id,
      inputHash,
      decidedBy: input.decidedBy.trim(),
      decidedOn: date.value.toString(),
      finalRanking,
      idempotencyKey: input.idempotencyKey,
    };
    const editions = [...this.state.editions];
    editions[index] = {
      ...edition,
      status: CompetitionStatus.HOMOLOGATED,
      version: edition.version + 1,
    };
    const event: CompetitionHomologatedEvent = {
      id: this.eventId(input.worldSeed, `homologated:${input.idempotencyKey}`, date.value.toString()),
      type: "CompetitionHomologated",
      gameWorldId: this.state.gameWorldId,
      editionId: edition.id,
      homologationId,
      inputHash,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      editions,
      standings,
      homologations: [...(this.state.homologations ?? []), homologation],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(homologation);
  }

  public standingsFor(editionId: string): readonly StandingEntrySnapshot[] {
    return (this.state.standings ?? [])
      .filter((entry) => entry.editionId === editionId)
      .slice()
      .sort((left, right) => left.provisionalRank - right.provisionalRank);
  }

  public homologationFor(
    editionId: string,
  ): CompetitionHomologationSnapshot | null {
    return (
      (this.state.homologations ?? []).find(
        (homologation) => homologation.editionId === editionId,
      ) ?? null
    );
  }

  private recomputeStandings(
    editionId: string,
    fixtures: readonly CompetitionFixtureSnapshot[],
    currentStandings: readonly StandingEntrySnapshot[],
  ): StandingEntrySnapshot[] {
    const clubs = this.state.participants
      .filter((participant) => participant.editionId === editionId)
      .slice()
      .sort((left, right) => left.seedNumber - right.seedNumber);
    const priorDiscipline = new Map(
      currentStandings
        .filter((entry) => entry.editionId === editionId)
        .map((entry) => [entry.clubId, entry.disciplinaryPoints]),
    );
    interface Row {
      clubId: string;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      gf: number;
      ga: number;
      points: number;
      disc: number;
      seed: number;
    }
    const rows = new Map<string, Row>();
    for (const participant of clubs) {
      rows.set(participant.clubId, {
        clubId: participant.clubId,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        points: 0,
        disc: priorDiscipline.get(participant.clubId) ?? 0,
        seed: participant.seedNumber,
      });
    }
    for (const fixture of fixtures) {
      if (
        fixture.editionId !== editionId ||
        fixture.status !== FixtureStatus.FINAL ||
        fixture.homeGoals === null ||
        fixture.awayGoals === null
      ) {
        continue;
      }
      const home = rows.get(fixture.homeClubId);
      const away = rows.get(fixture.awayClubId);
      if (home === undefined || away === undefined) continue;
      home.played += 1;
      away.played += 1;
      home.gf += fixture.homeGoals;
      home.ga += fixture.awayGoals;
      away.gf += fixture.awayGoals;
      away.ga += fixture.homeGoals;
      if (fixture.homeGoals > fixture.awayGoals) {
        home.won += 1;
        home.points += 3;
        away.lost += 1;
      } else if (fixture.homeGoals < fixture.awayGoals) {
        away.won += 1;
        away.points += 3;
        home.lost += 1;
      } else {
        home.drawn += 1;
        away.drawn += 1;
        home.points += 1;
        away.points += 1;
      }
    }
    const ranked = [...rows.values()].sort(
      (a, b) =>
        b.points - a.points ||
        b.gf - b.ga - (a.gf - a.ga) ||
        b.gf - a.gf ||
        a.disc - b.disc ||
        a.seed - b.seed,
    );
    const recomputed: StandingEntrySnapshot[] = ranked.map((row, position) => ({
      editionId: editionId as CompetitionEditionSnapshot["id"],
      clubId: row.clubId as CompetitionClubRef,
      played: row.played,
      won: row.won,
      drawn: row.drawn,
      lost: row.lost,
      goalsFor: row.gf,
      goalsAgainst: row.ga,
      points: row.points,
      disciplinaryPoints: row.disc,
      provisionalRank: position + 1,
    }));
    const others = currentStandings.filter(
      (entry) => entry.editionId !== editionId,
    );
    return [...others, ...recomputed];
  }

  private eventId(
    worldSeed: string,
    context: string,
    worldDate: string,
  ): CompetitionDomainEvent["id"] {
    return deterministicUuidV7<"CompetitionEvent">({
      worldSeed,
      context,
      timestampMilliseconds: timestampOf(worldDate),
    });
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
      finalFixtureCount: this.state.fixtures.filter(
        ({ status }) => status === FixtureStatus.FINAL,
      ).length,
      homologatedEditionCount: this.state.editions.filter(
        ({ status }) => status === CompetitionStatus.HOMOLOGATED,
      ).length,
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

function fixtureNotFound(fixtureId: string): DomainError {
  return new DomainError(
    "COMPETITION_FIXTURE_NOT_FOUND",
    "Fixture não encontrada.",
    { fixtureId },
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
