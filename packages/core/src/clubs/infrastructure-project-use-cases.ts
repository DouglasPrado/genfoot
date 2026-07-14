import {
  DomainError,
  fail,
  succeed,
  type GameWorldId,
  type Result,
} from "@grinta/shared";

import type { ClubPortfolioRepository } from "./club-repository.js";
import { InfrastructureProject } from "./infrastructure-project.js";
import {
  InfrastructureMilestoneStatus,
  InfrastructureProjectStatus,
  type CreateInfrastructureProjectInput,
  type InfrastructureFinancingPort,
  type InfrastructureLicensingPort,
  type InfrastructureProjectSnapshot,
} from "./infrastructure-project-types.js";
import { WorldClubPortfolio } from "./world-club-portfolio.js";

export type StartInfrastructureProjectInput = CreateInfrastructureProjectInput &
  Readonly<{ expectedClubVersion: number }>;

export class StartInfrastructureProject {
  public constructor(private readonly repository: ClubPortfolioRepository) {}

  public async execute(
    input: StartInfrastructureProjectInput,
  ): Promise<Result<InfrastructureProjectSnapshot, DomainError>> {
    const loaded = await loadPortfolio(this.repository, input.gameWorldId);
    if (!loaded.ok) return loaded;
    const expectedRevision = loaded.value.snapshot().revision;
    const { expectedClubVersion, ...project } = input;
    const started = loaded.value.startInfrastructureProject(
      project,
      expectedClubVersion,
    );
    if (!started.ok) return started;
    await this.repository.saveClubPortfolio(
      loaded.value.snapshot(),
      expectedRevision,
    );
    return started;
  }
}

export class InspectInfrastructureProject {
  public constructor(private readonly repository: ClubPortfolioRepository) {}

  public async execute(gameWorldId: GameWorldId, projectId: string) {
    const loaded = await loadPortfolio(this.repository, gameWorldId);
    if (!loaded.ok) return loaded;
    const project = loaded.value
      .snapshot()
      .projects.find(({ id }) => id === projectId);
    return project === undefined
      ? fail(new DomainError("PROJECT_NOT_FOUND", "Projeto não encontrado."))
      : succeed(project);
  }
}

export class ResumeInfrastructureProject {
  public constructor(
    private readonly repository: ClubPortfolioRepository,
    private readonly financing: InfrastructureFinancingPort,
    private readonly licensing: InfrastructureLicensingPort,
    private readonly workerId: string,
    private readonly now: () => number = Date.now,
  ) {}

  public async execute(
    gameWorldId: GameWorldId,
    projectId: string,
    worldDate: string,
  ): Promise<Result<InfrastructureProjectSnapshot, DomainError>> {
    const loaded = await loadPortfolio(this.repository, gameWorldId);
    if (!loaded.ok) return loaded;
    const projectSnapshot = loaded.value
      .snapshot()
      .projects.find(({ id }) => id === projectId);
    if (projectSnapshot === undefined) {
      return fail(
        new DomainError("PROJECT_NOT_FOUND", "Projeto não encontrado."),
      );
    }
    const project = InfrastructureProject.fromSnapshot(projectSnapshot);
    if (!project.ok) return project;
    const lease = project.value.acquireLease(this.workerId, this.now(), 30_000);
    if (!lease.ok) return lease;
    let persisted = await persistProject(
      this.repository,
      loaded.value,
      project.value.snapshot(),
    );
    if (!persisted.ok) return persisted;

    while (
      project.value.snapshot().status !== InfrastructureProjectStatus.COMPLETED
    ) {
      const claimed = project.value.claimCurrentStep(lease.value);
      if (!claimed.ok) return claimed;
      persisted = await persistProject(
        this.repository,
        loaded.value,
        project.value.snapshot(),
      );
      if (!persisted.ok) return persisted;
      try {
        const context = claimed.value;
        if (context.stepId === "FINANCE") {
          const evidence = await this.financing.reserve(context);
          const completed = project.value.completeCurrentStep(
            lease.value,
            evidence,
            worldDate,
          );
          if (!completed.ok) return completed;
        } else if (context.stepId === "EXECUTE_MILESTONES") {
          for (const milestone of project.value.snapshot().milestones) {
            if (
              milestone.status === InfrastructureMilestoneStatus.PENDING &&
              milestone.dueOn <= worldDate
            ) {
              const milestoneContext = project.value.contextForMilestone(
                lease.value,
                milestone.id,
              );
              if (milestoneContext === null) {
                return fail(
                  new DomainError(
                    "PROJECT_INVALID_TRANSITION",
                    "Marco inválido.",
                  ),
                );
              }
              const fact =
                await this.financing.disburseMilestone(milestoneContext);
              const reference = fact.disbursementRef ?? Object.values(fact)[0];
              const completed = project.value.completeMilestone(
                lease.value,
                milestone.id,
                reference ?? "",
                worldDate,
              );
              if (!completed.ok) return completed;
              persisted = await persistProject(
                this.repository,
                loaded.value,
                project.value.snapshot(),
              );
              if (!persisted.ok) return persisted;
            }
          }
          const pending = project.value
            .snapshot()
            .milestones.find(
              ({ status }) => status === InfrastructureMilestoneStatus.PENDING,
            );
          if (pending !== undefined) {
            const waiting = project.value.waitCurrentStep(lease.value, {
              nextDueOn: pending.dueOn,
            });
            if (!waiting.ok) return waiting;
            await persistProject(
              this.repository,
              loaded.value,
              project.value.snapshot(),
            );
            return succeed(project.value.snapshot());
          }
          const completed = project.value.completeCurrentStep(
            lease.value,
            { milestones: project.value.snapshot().milestones.length },
            worldDate,
          );
          if (!completed.ok) return completed;
        } else if (context.stepId === "LICENSE") {
          const inspection = await this.licensing.inspect(context);
          if (!inspection.approved) {
            const waiting = project.value.waitCurrentStep(
              lease.value,
              inspection,
            );
            if (!waiting.ok) return waiting;
            await persistProject(
              this.repository,
              loaded.value,
              project.value.snapshot(),
            );
            return succeed(project.value.snapshot());
          }
          const completed = project.value.completeCurrentStep(
            lease.value,
            inspection,
            worldDate,
          );
          if (!completed.ok) return completed;
        } else {
          const completed = project.value.completeCurrentStep(
            lease.value,
            { owner: "C3" },
            worldDate,
          );
          if (!completed.ok) return completed;
        }
      } catch (error: unknown) {
        const failed = project.value.failCurrentStep(
          lease.value,
          error instanceof Error ? error.message : String(error),
        );
        if (!failed.ok) return failed;
        await persistProject(
          this.repository,
          loaded.value,
          project.value.snapshot(),
        );
        return fail(
          new DomainError(
            "PROJECT_STEP_FAILED",
            "Falha ao executar passo da obra.",
          ),
        );
      }

      if (
        project.value.snapshot().status ===
        InfrastructureProjectStatus.COMPLETED
      ) {
        const expectedRevision = loaded.value.snapshot().revision;
        const operated = loaded.value.operateInfrastructureProject(
          project.value.snapshot(),
        );
        if (!operated.ok) return operated;
        await this.repository.saveClubPortfolio(
          loaded.value.snapshot(),
          expectedRevision,
        );
      } else {
        persisted = await persistProject(
          this.repository,
          loaded.value,
          project.value.snapshot(),
        );
        if (!persisted.ok) return persisted;
      }
    }
    return succeed(project.value.snapshot());
  }
}

export class AbortInfrastructureProject {
  public constructor(
    private readonly repository: ClubPortfolioRepository,
    private readonly financing: InfrastructureFinancingPort,
    private readonly workerId: string,
    private readonly now: () => number = Date.now,
  ) {}

  public async execute(
    gameWorldId: GameWorldId,
    projectId: string,
    reason: string,
  ): Promise<Result<InfrastructureProjectSnapshot, DomainError>> {
    const loaded = await loadPortfolio(this.repository, gameWorldId);
    if (!loaded.ok) return loaded;
    const snapshot = loaded.value
      .snapshot()
      .projects.find(({ id }) => id === projectId);
    if (snapshot === undefined) {
      return fail(
        new DomainError("PROJECT_NOT_FOUND", "Projeto não encontrado."),
      );
    }
    const project = InfrastructureProject.fromSnapshot(snapshot);
    if (!project.ok) return project;
    const lease = project.value.acquireLease(this.workerId, this.now(), 30_000);
    if (!lease.ok) return lease;
    const started = project.value.beginCompensation(lease.value, reason);
    if (!started.ok) return started;
    await persistProject(
      this.repository,
      loaded.value,
      project.value.snapshot(),
    );
    const context = project.value.stepContext("FINANCE", lease.value);
    const evidence = await this.financing.releaseRemainder({
      ...context,
      idempotencyKey: `saga:${projectId}:step:2:COMPENSATE`,
    });
    const completed = project.value.completeCompensation(lease.value, evidence);
    if (!completed.ok) return completed;
    await persistProject(
      this.repository,
      loaded.value,
      project.value.snapshot(),
    );
    return succeed(project.value.snapshot());
  }
}

async function loadPortfolio(
  repository: ClubPortfolioRepository,
  gameWorldId: GameWorldId,
): Promise<Result<WorldClubPortfolio, DomainError>> {
  const snapshot = await repository.findClubPortfolioByWorldId(gameWorldId);
  return snapshot === null
    ? fail(
        new DomainError(
          "CLUB_PORTFOLIO_NOT_FOUND",
          "Portfólio não encontrado.",
        ),
      )
    : WorldClubPortfolio.fromSnapshot(snapshot);
}

async function persistProject(
  repository: ClubPortfolioRepository,
  portfolio: WorldClubPortfolio,
  project: InfrastructureProjectSnapshot,
): Promise<Result<void, DomainError>> {
  const expectedRevision = portfolio.snapshot().revision;
  const replaced = portfolio.replaceInfrastructureProject(project);
  if (!replaced.ok) return replaced;
  await repository.saveClubPortfolio(portfolio.snapshot(), expectedRevision);
  return succeed(undefined);
}
