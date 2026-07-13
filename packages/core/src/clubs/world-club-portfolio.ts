import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
} from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import { Club } from "./club.js";
import { Squad } from "./squad.js";
import type {
  ClubCommand,
  ClubCommandReceipt,
  ClubDomainEvent,
  ClubPortfolioSummary,
  WorldClubPortfolioSnapshot,
} from "./club-types.js";

export class WorldClubPortfolio {
  private constructor(private state: WorldClubPortfolioSnapshot) {}

  public static fromSnapshot(
    snapshot: WorldClubPortfolioSnapshot,
  ): Result<WorldClubPortfolio, DomainError> {
    if (snapshot.schemaVersion !== 1 || snapshot.revision < 1) {
      return fail(invalidPortfolio("Schema ou revisão inválida."));
    }
    const clubIds = new Set<string>();
    for (const club of snapshot.clubs) {
      if (
        club.gameWorldId !== snapshot.gameWorldId ||
        clubIds.has(club.id) ||
        !Club.fromSnapshot(club).ok
      ) {
        return fail(invalidPortfolio("Clube duplicado ou fora do mundo."));
      }
      clubIds.add(club.id);
    }
    for (const squad of snapshot.squads) {
      if (
        squad.gameWorldId !== snapshot.gameWorldId ||
        !clubIds.has(squad.clubId) ||
        !Squad.fromSnapshot(squad).ok
      ) {
        return fail(invalidPortfolio("Elenco inválido ou fora do mundo."));
      }
    }
    return succeed(new WorldClubPortfolio(snapshot));
  }

  public execute(
    command: ClubCommand,
  ): Result<ClubCommandReceipt, DomainError> {
    if (command.gameWorldId !== this.state.gameWorldId) {
      return fail(
        new DomainError("CLUB_WORLD_MISMATCH", "Command fora do mundo."),
      );
    }
    const fingerprint = JSON.stringify(command);
    const previous = this.state.commandReceipts.find(
      ({ idempotencyKey }) => idempotencyKey === command.idempotencyKey,
    );
    if (previous !== undefined) {
      return previous.fingerprint === fingerprint
        ? succeed(previous)
        : fail(
            new DomainError(
              "IDEMPOTENCY_KEY_CONFLICT",
              "A chave já foi usada com outro command.",
            ),
          );
    }
    if (command.rulesetVersion !== this.state.rulesetVersion) {
      return fail(
        new DomainError(
          "RULESET_VERSION_MISMATCH",
          "O command usa outro ruleset.",
        ),
      );
    }
    const occurredAt = WorldDate.parse(command.occurredAt);
    if (!occurredAt.ok) return occurredAt;

    const clubIndex = this.state.clubs.findIndex(
      ({ id }) => id === command.clubId,
    );
    if (clubIndex < 0) {
      return fail(new DomainError("CLUB_NOT_FOUND", "Clube não encontrado."));
    }
    const clubs = [...this.state.clubs];
    const squads = [...this.state.squads];
    let aggregateVersion: number;
    let eventType: string;
    let result: Readonly<Record<string, unknown>>;

    if (
      command.type === "AssignSquadSlot" ||
      command.type === "RemoveSquadMember"
    ) {
      const squadIndex = squads.findIndex(
        ({ id, clubId }) => id === command.squadId && clubId === command.clubId,
      );
      if (squadIndex < 0) {
        return fail(
          new DomainError("SQUAD_NOT_FOUND", "Elenco não encontrado."),
        );
      }
      if (squads[squadIndex]!.version !== command.expectedVersion) {
        return fail(
          versionConflict(command.expectedVersion, squads[squadIndex]!.version),
        );
      }
      const loaded = Squad.fromSnapshot(squads[squadIndex]!);
      if (!loaded.ok) return loaded;
      const mutation =
        command.type === "AssignSquadSlot"
          ? loaded.value.assign({
              playerId: command.playerId,
              slot: command.slot,
              category: command.category,
              effectiveFrom: command.occurredAt,
            })
          : loaded.value.remove(command.playerId);
      if (!mutation.ok) return mutation;
      squads[squadIndex] = loaded.value.snapshot();
      aggregateVersion = squads[squadIndex]!.version;
      eventType = "SquadChanged";
      result = { squadId: command.squadId, playerId: command.playerId };
    } else {
      const current = clubs[clubIndex]!;
      if (current.version !== command.expectedVersion) {
        return fail(versionConflict(command.expectedVersion, current.version));
      }
      const loaded = Club.fromSnapshot(current);
      if (!loaded.ok) return loaded;
      const identifiers = this.commandIdentifiers(command);
      const mutation = mutateClub(loaded.value, command, identifiers);
      if (!mutation.ok) return mutation;
      clubs[clubIndex] = loaded.value.snapshot();
      aggregateVersion = clubs[clubIndex]!.version;
      eventType = eventFor(command.type);
      result = { clubId: command.clubId, type: command.type };
    }

    const portfolioRevision = this.state.revision + 1;
    const event: ClubDomainEvent = {
      id: deterministicUuidV7<"ClubDomainEvent">({
        worldSeed: this.state.gameWorldId,
        context: `club-event:${command.commandId}:${eventType}`,
        timestampMilliseconds: Date.parse(
          `${command.occurredAt}T00:00:00.000Z`,
        ),
      }),
      type: eventType,
      eventVersion: 1,
      gameWorldId: command.gameWorldId,
      aggregateId: command.clubId,
      aggregateVersion,
      occurredAt: command.occurredAt,
      rulesetVersion: command.rulesetVersion,
      correlationId: command.commandId,
      causationId: command.commandId,
      payload: result,
    };
    const receipt: ClubCommandReceipt = {
      commandId: command.commandId,
      idempotencyKey: command.idempotencyKey,
      fingerprint,
      gameWorldId: command.gameWorldId,
      clubId: command.clubId,
      aggregateVersion,
      portfolioRevision,
      resultType: eventType,
      result,
    };
    this.state = {
      ...this.state,
      clubs,
      squads,
      commandReceipts: [...this.state.commandReceipts, receipt],
      events: [...this.state.events, event],
      revision: portfolioRevision,
    };
    return succeed(receipt);
  }

  public summary(): ClubPortfolioSummary {
    return {
      clubCount: this.state.clubs.length,
      squadCount: this.state.squads.length,
      projectCount: this.state.projects.length,
      activeProjectCount: this.state.projects.filter(
        ({ status }) => !["COMPLETED", "FAILED"].includes(status),
      ).length,
      revision: this.state.revision,
    };
  }

  public snapshot(): WorldClubPortfolioSnapshot {
    return this.state;
  }

  private commandIdentifiers(command: ClubCommand) {
    const timestampMilliseconds = Date.parse(
      `${command.occurredAt}T00:00:00.000Z`,
    );
    const create = <TKind extends string>(suffix: string) =>
      deterministicUuidV7<TKind>({
        worldSeed: this.state.gameWorldId,
        context: `club-command:${command.commandId}:${suffix}`,
        timestampMilliseconds,
      });
    return {
      identity: create<"ClubIdentityPeriod">("identity"),
      ticket: create<"TicketPricePolicy">("ticket"),
      commercial: create<"CommercialAgreement">("commercial"),
      board: create<"BoardDecision">("board"),
    };
  }
}

function mutateClub(
  club: Club,
  command: Exclude<
    ClubCommand,
    { type: "AssignSquadSlot" | "RemoveSquadMember" }
  >,
  ids: ReturnType<WorldClubPortfolio["commandIdentifiers"]>,
): Result<void, DomainError> {
  switch (command.type) {
    case "UpdateClubIdentity": {
      const date = WorldDate.parse(command.occurredAt);
      return date.ok
        ? club.updateIdentity({
            name: command.name,
            shortCode: command.shortCode,
            effectiveOn: date.value,
            rulesetVersion: command.rulesetVersion,
            identityId: ids.identity,
          })
        : date;
    }
    case "SetDepartmentPlan":
      return club.setDepartmentPlan(command);
    case "SetTicketPrices":
      return club.setTicketPrice({
        id: ids.ticket,
        priceMinor: command.priceMinor,
        effectiveOn: command.effectiveOn,
        rulesetVersion: command.rulesetVersion,
      });
    case "SignCommercialDeal":
      return club.signCommercialAgreement({
        id: ids.commercial,
        asset: command.asset,
        exclusive: command.exclusive,
        startsOn: command.startsOn,
        endsOn: command.endsOn,
        externalAgreementRef: command.externalAgreementRef,
        rulesetVersion: command.rulesetVersion,
      });
    case "RecordBoardDecision":
      return club.recordBoardDecision({
        id: ids.board,
        decisionType: command.decisionType,
        authorId: command.actorId,
        justification: command.justification,
        effectiveFrom: command.effectiveFrom,
        effectiveThrough: command.effectiveThrough,
        recordedAt: command.occurredAt,
        rulesetVersion: command.rulesetVersion,
      });
  }
}

function eventFor(type: ClubCommand["type"]): string {
  return {
    UpdateClubIdentity: "ClubUpdated",
    AssignSquadSlot: "SquadChanged",
    RemoveSquadMember: "SquadChanged",
    SetDepartmentPlan: "DepartmentPlanChanged",
    SetTicketPrices: "TicketPricePolicyChanged",
    SignCommercialDeal: "CommercialDealSigned",
    RecordBoardDecision: "BoardDecisionRecorded",
  }[type];
}

function versionConflict(expectedVersion: number, actualVersion: number) {
  return new DomainError("CLUB_VERSION_CONFLICT", "Versão concorrente.", {
    expectedVersion,
    actualVersion,
  });
}

function invalidPortfolio(message: string) {
  return new DomainError("INVALID_CLUB_PORTFOLIO", message);
}
