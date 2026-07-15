import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
} from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import { Club } from "./club.js";
import { InfrastructureProject } from "./infrastructure-project.js";
import {
  InfrastructureProjectStatus,
  type CreateInfrastructureProjectInput,
  type InfrastructureProjectSnapshot,
} from "./infrastructure-project-types.js";
import { Squad } from "./squad.js";
import type {
  ClubCommand,
  ClubCommandReceipt,
  ClubDomainEvent,
  ClubPortfolioSummary,
  ClubSnapshot,
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
    for (const project of snapshot.projects) {
      if (
        project.gameWorldId !== snapshot.gameWorldId ||
        !clubIds.has(project.clubId) ||
        !InfrastructureProject.fromSnapshot(project).ok
      ) {
        return fail(
          invalidPortfolio("Projeto inválido ou fora do mundo/clube."),
        );
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
      aggregateVersion = squads[squadIndex].version;
      eventType = "SquadChanged";
      result = { squadId: command.squadId, playerId: command.playerId };
    } else {
      const current = clubs[clubIndex]!;
      if (current.version !== command.expectedVersion) {
        return fail(versionConflict(command.expectedVersion, current.version));
      }
      if (
        command.type === "UpdateClubIdentity" ||
        command.type === "UpdateClubVisualIdentity"
      ) {
        const taken = this.state.clubs.some(
          (other) =>
            other.id !== command.clubId &&
            normalizeClubName(other.identity.name) ===
              normalizeClubName(command.name),
        );
        if (taken) {
          return fail(
            new DomainError(
              "CLUB_NAME_ALREADY_TAKEN",
              "Já existe um clube com esse nome neste mundo.",
            ),
          );
        }
      }
      const loaded = Club.fromSnapshot(current);
      if (!loaded.ok) return loaded;
      const identifiers = this.commandIdentifiers(command);
      const mutation = mutateClub(loaded.value, command, identifiers);
      if (!mutation.ok) return mutation;
      clubs[clubIndex] = loaded.value.snapshot();
      aggregateVersion = clubs[clubIndex].version;
      eventType = eventFor(command.type);
      result =
        command.type === "UpdateClubVisualIdentity"
          ? {
              clubId: command.clubId,
              type: command.type,
              previousName: current.identity.name,
              newName: command.name.trim(),
              previousShortCode: current.identity.shortCode,
              newShortCode: command.shortCode,
              visualIdentity: command.visualIdentity,
              changedFields: rebrandChangedFields(current, command),
            }
          : { clubId: command.clubId, type: command.type };
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

  public startInfrastructureProject(
    input: CreateInfrastructureProjectInput,
    expectedClubVersion: number,
  ): Result<InfrastructureProjectSnapshot, DomainError> {
    const previous = this.state.projects.find(
      ({ idempotencyKey }) => idempotencyKey === input.idempotencyKey,
    );
    if (previous !== undefined) {
      return previous.id === input.id &&
        previous.commandId === input.commandId &&
        JSON.stringify(previous.target) === JSON.stringify(input.target) &&
        previous.fundingRequestRef === input.fundingRequestRef
        ? succeed(previous)
        : fail(
            new DomainError(
              "IDEMPOTENCY_KEY_CONFLICT",
              "A chave da obra já foi usada com outro payload.",
            ),
          );
    }
    if (
      input.gameWorldId !== this.state.gameWorldId ||
      input.rulesetVersion !== this.state.rulesetVersion
    ) {
      return fail(
        new DomainError(
          "CLUB_WORLD_MISMATCH",
          "Projeto fora do mundo/ruleset.",
        ),
      );
    }
    const clubIndex = this.state.clubs.findIndex(
      ({ id }) => id === input.clubId,
    );
    const club = this.state.clubs[clubIndex];
    if (club === undefined) {
      return fail(new DomainError("CLUB_NOT_FOUND", "Clube não encontrado."));
    }
    if (club.version !== expectedClubVersion) {
      return fail(versionConflict(expectedClubVersion, club.version));
    }
    if (
      this.state.projects.some(
        (project) =>
          project.clubId === input.clubId &&
          project.target.reference === input.target.reference &&
          project.status !== InfrastructureProjectStatus.COMPLETED &&
          project.status !== InfrastructureProjectStatus.FAILED,
      )
    ) {
      return fail(
        new DomainError("INFRASTRUCTURE_CONFLICT", "Já existe obra no ativo."),
      );
    }
    const created = InfrastructureProject.create(input);
    if (!created.ok) return created;
    const clubs = [...this.state.clubs];
    clubs[clubIndex] = { ...club, version: club.version + 1 };
    const projectSnapshot = created.value.snapshot();
    const proposed = this.infraEvent(
      "InfrastructureProjectProposed",
      projectSnapshot,
      {
        clubId: input.clubId,
        target: projectSnapshot.target,
        fundingRequestRef: projectSnapshot.fundingRequestRef,
      },
      projectSnapshot.proposedAt,
    );
    this.state = {
      ...this.state,
      clubs,
      projects: [...this.state.projects, projectSnapshot],
      events: [...this.state.events, proposed],
      revision: this.state.revision + 1,
    };
    return succeed(projectSnapshot);
  }

  public replaceInfrastructureProject(
    project: InfrastructureProjectSnapshot,
  ): Result<void, DomainError> {
    const index = this.state.projects.findIndex(({ id }) => id === project.id);
    if (index < 0 || project.gameWorldId !== this.state.gameWorldId) {
      return fail(
        new DomainError("PROJECT_NOT_FOUND", "Projeto não encontrado."),
      );
    }
    const previous = this.state.projects[index]!;
    const projects = [...this.state.projects];
    projects[index] = project;
    this.state = {
      ...this.state,
      projects,
      events: [...this.state.events, ...this.infraDiffEvents(previous, project)],
      revision: this.state.revision + 1,
    };
    return succeed(undefined);
  }

  private infraEvent(
    type: string,
    project: InfrastructureProjectSnapshot,
    payload: Readonly<Record<string, unknown>>,
    occurredAt: string,
    contextKey = "",
  ): ClubDomainEvent {
    return {
      id: deterministicUuidV7<"ClubDomainEvent">({
        worldSeed: this.state.gameWorldId,
        context: `infra-event:${project.id}:${type}:${contextKey}`,
        timestampMilliseconds: Date.parse(`${occurredAt}T00:00:00.000Z`),
      }),
      type,
      eventVersion: 1,
      gameWorldId: this.state.gameWorldId,
      aggregateId: project.id,
      aggregateVersion: project.version,
      occurredAt,
      rulesetVersion: this.state.rulesetVersion,
      correlationId: project.commandId,
      causationId: project.commandId,
      payload,
    };
  }

  private infraDiffEvents(
    previous: InfrastructureProjectSnapshot,
    next: InfrastructureProjectSnapshot,
  ): ClubDomainEvent[] {
    const events: ClubDomainEvent[] = [];
    const stepEventFor: Record<string, string> = {
      APPROVE: "StadiumWorksApproved",
      FINANCE: "FinancialReservationAcknowledged",
      LICENSE: "FacilityLicensed",
    };
    for (const step of next.steps) {
      const before = previous.steps.find((s) => s.stepId === step.stepId);
      const justCompleted =
        step.status === "COMPLETED" && before?.status !== "COMPLETED";
      const mapped = stepEventFor[step.stepId];
      if (justCompleted && mapped !== undefined) {
        events.push(
          this.infraEvent(
            mapped,
            next,
            {
              stepId: step.stepId,
              fundingRequestRef: next.fundingRequestRef,
              evidence: step.evidence,
            },
            step.completedAt ?? next.proposedAt,
            step.stepId,
          ),
        );
      }
    }
    for (const milestone of next.milestones) {
      const before = previous.milestones.find((m) => m.id === milestone.id);
      if (
        milestone.status === "COMPLETED" &&
        before?.status !== "COMPLETED"
      ) {
        events.push(
          this.infraEvent(
            "ConstructionMilestoneReached",
            next,
            {
              milestoneId: milestone.id,
              amountMinor: milestone.amountMinor,
              disbursementFactRef: milestone.disbursementFactRef,
            },
            milestone.completedAt ?? next.proposedAt,
            milestone.id,
          ),
        );
      }
    }
    if (next.status === "COMPLETED" && previous.status !== "COMPLETED") {
      events.push(
        this.infraEvent(
          "StadiumWorksCompleted",
          next,
          { clubId: next.clubId, target: next.target },
          next.steps.at(-1)?.completedAt ?? next.proposedAt,
        ),
      );
    }
    if (next.status === "FAILED" && previous.status !== "FAILED") {
      events.push(
        this.infraEvent(
          "ProjectCancelled",
          next,
          { clubId: next.clubId, compensationEvidence: next.compensationEvidence },
          next.proposedAt,
        ),
      );
    }
    return events;
  }

  public operateInfrastructureProject(
    project: InfrastructureProjectSnapshot,
  ): Result<void, DomainError> {
    if (project.status !== InfrastructureProjectStatus.COMPLETED) {
      return fail(
        new DomainError("PROJECT_INVALID_TRANSITION", "Projeto não concluído."),
      );
    }
    const clubIndex = this.state.clubs.findIndex(
      ({ id }) => id === project.clubId,
    );
    const club = this.state.clubs[clubIndex];
    const projectIndex = this.state.projects.findIndex(
      ({ id }) => id === project.id,
    );
    if (club === undefined || projectIndex < 0) {
      return fail(
        new DomainError("PROJECT_NOT_FOUND", "Projeto/clube não encontrado."),
      );
    }
    let updated = club;
    if (
      project.target.kind === "STADIUM_CAPACITY" &&
      project.target.reference === club.stadium.id
    ) {
      updated = {
        ...club,
        stadium: {
          ...club.stadium,
          capacity: project.target.targetValue,
          version: club.stadium.version + 1,
        },
        version: club.version + 1,
      };
    } else if (project.target.kind === "DEPARTMENT_LEVEL") {
      const departmentIndex = club.departments.findIndex(
        ({ kind }) => kind === project.target.reference,
      );
      if (departmentIndex < 0) {
        return fail(
          new DomainError(
            "PROJECT_TARGET_NOT_FOUND",
            "Departamento não encontrado.",
          ),
        );
      }
      const departments = [...club.departments];
      departments[departmentIndex] = {
        ...departments[departmentIndex]!,
        level: project.target.targetValue,
        targetLevel: project.target.targetValue,
        version: departments[departmentIndex]!.version + 1,
      };
      updated = { ...club, departments, version: club.version + 1 };
    } else {
      return fail(
        new DomainError("PROJECT_TARGET_NOT_FOUND", "Ativo não encontrado."),
      );
    }
    const clubs = [...this.state.clubs];
    clubs[clubIndex] = updated;
    const projects = [...this.state.projects];
    const previous = projects[projectIndex]!;
    projects[projectIndex] = project;
    this.state = {
      ...this.state,
      clubs,
      projects,
      events: [...this.state.events, ...this.infraDiffEvents(previous, project)],
      revision: this.state.revision + 1,
    };
    return succeed(undefined);
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
    case "UpdateClubVisualIdentity": {
      const date = WorldDate.parse(command.occurredAt);
      return date.ok
        ? club.updateIdentity({
            name: command.name,
            shortCode: command.shortCode,
            effectiveOn: date.value,
            rulesetVersion: command.rulesetVersion,
            identityId: ids.identity,
            visualIdentity: command.visualIdentity,
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
    UpdateClubVisualIdentity: "ClubRebranded",
    AssignSquadSlot: "SquadChanged",
    RemoveSquadMember: "SquadChanged",
    SetDepartmentPlan: "DepartmentPlanChanged",
    SetTicketPrices: "TicketPricePolicyChanged",
    SignCommercialDeal: "CommercialDealSigned",
    RecordBoardDecision: "BoardDecisionRecorded",
  }[type];
}

/** Normaliza o nome do clube para checagem de unicidade no mundo. */
function normalizeClubName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/gu, " ");
}

/** Lista quais campos da identidade mudaram no rebranding (auditoria / C10). */
function rebrandChangedFields(
  current: ClubSnapshot,
  command: Extract<ClubCommand, { type: "UpdateClubVisualIdentity" }>,
): readonly string[] {
  const changed: string[] = [];
  if (current.identity.name !== command.name.trim()) changed.push("name");
  if (current.identity.shortCode !== command.shortCode) {
    changed.push("shortCode");
  }
  const previous = current.identity.visualIdentity;
  const next = command.visualIdentity;
  if (previous?.primaryColor !== next.primaryColor) changed.push("primaryColor");
  if (previous?.secondaryColor !== next.secondaryColor) {
    changed.push("secondaryColor");
  }
  if ((previous?.tertiaryColor ?? null) !== next.tertiaryColor) {
    changed.push("tertiaryColor");
  }
  if (previous?.homeKitTemplateId !== next.homeKitTemplateId) {
    changed.push("homeKitTemplateId");
  }
  if (previous?.awayKitTemplateId !== next.awayKitTemplateId) {
    changed.push("awayKitTemplateId");
  }
  if (previous?.crestTemplateId !== next.crestTemplateId) {
    changed.push("crestTemplateId");
  }
  return changed;
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
