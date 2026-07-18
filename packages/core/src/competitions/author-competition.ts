import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import { Competition, type ConfigureCompetitionPatch } from "./competition.js";
import {
  defaultKnockoutConfig,
  defaultLeagueConfig,
  type CompetitionConfig,
} from "./competition-config.js";
import {
  CompetitionFormat,
  type CompetitionType,
} from "./competition-types.js";
import type { CompetitionAggregateSnapshot } from "./competition.js";

/**
 * Casos de uso da competição autorada (C7, R-202). Cada um carrega UM agregado,
 * muta e salva com concorrência otimista (`expectedVersion`). A criação salva
 * com `expectedVersion = 0` (linha nova). O UnitOfWork envolve tudo numa
 * transação; falha de domínio faz rollback.
 */
export interface CompetitionAggregateRepository {
  findCompetitionById(
    gameWorldId: string,
    competitionId: string,
  ): Promise<CompetitionAggregateSnapshot | null>;
  /** `expectedVersion === 0` insere; caso contrário atualiza onde version bate. */
  saveCompetition(
    snapshot: CompetitionAggregateSnapshot,
    expectedVersion: number,
  ): Promise<void>;
}

export interface CompetitionRepositories {
  readonly competitions: CompetitionAggregateRepository;
}

export interface CompetitionUnitOfWork {
  run<T>(work: (repositories: CompetitionRepositories) => Promise<T>): Promise<T>;
}

/** A config padrão de um formato — o rascunho nasce sensato, o admin ajusta. */
export function defaultConfigForFormat(
  format: CompetitionFormat,
): CompetitionConfig {
  return format === CompetitionFormat.ROUND_ROBIN ||
    format === CompetitionFormat.DOUBLE_ROUND_ROBIN
    ? defaultLeagueConfig()
    : defaultKnockoutConfig();
}

export interface CreateCompetitionInput {
  readonly id: string;
  readonly gameWorldId: string;
  readonly name: string;
  readonly type: CompetitionType;
  readonly format: CompetitionFormat;
  readonly tier: number | null;
  readonly reputation?: number;
  readonly config?: CompetitionConfig;
}

export class CreateCompetition {
  public constructor(private readonly unitOfWork: CompetitionUnitOfWork) {}

  public execute(
    input: CreateCompetitionInput,
  ): Promise<Result<{ competitionId: string }, DomainError>> {
    return run(this.unitOfWork, async (repos) => {
      const existing = await repos.competitions.findCompetitionById(
        input.gameWorldId,
        input.id,
      );
      if (existing !== null) {
        return fail(
          new DomainError("COMPETITION_EXISTS", "Essa competição já existe."),
        );
      }
      const created = Competition.create(
        {
          id: input.id,
          gameWorldId: input.gameWorldId,
          name: input.name,
          type: input.type,
          format: input.format,
          tier: input.tier,
          reputation: input.reputation ?? 50,
        },
        input.config ?? defaultConfigForFormat(input.format),
      );
      if (!created.ok) return created;
      await repos.competitions.saveCompetition(created.value.snapshot(), 0);
      return succeed({ competitionId: input.id });
    });
  }
}

export interface ConfigureCompetitionInput {
  readonly gameWorldId: string;
  readonly competitionId: string;
  readonly patch: ConfigureCompetitionPatch;
}

export class ConfigureCompetition {
  public constructor(private readonly unitOfWork: CompetitionUnitOfWork) {}

  public execute(
    input: ConfigureCompetitionInput,
  ): Promise<Result<{ competitionId: string }, DomainError>> {
    return run(this.unitOfWork, async (repos) => {
      const snap = await repos.competitions.findCompetitionById(
        input.gameWorldId,
        input.competitionId,
      );
      if (snap === null) {
        return fail(
          new DomainError("COMPETITION_NOT_FOUND", "Competição não encontrada."),
        );
      }
      const agg = Competition.fromSnapshot(snap);
      if (!agg.ok) return agg;
      const configured = agg.value.configure(input.patch);
      if (!configured.ok) return configured;
      await repos.competitions.saveCompetition(agg.value.snapshot(), snap.version);
      return succeed({ competitionId: input.competitionId });
    });
  }
}

/** Uma transição sem payload (lock/start/finish). */
type Transition = "lock" | "start" | "finish";

export interface CompetitionTransitionInput {
  readonly gameWorldId: string;
  readonly competitionId: string;
}

/** Carrega, aplica a transição do agregado e salva com concorrência otimista. */
function applyTransition(
  unitOfWork: CompetitionUnitOfWork,
  input: CompetitionTransitionInput,
  transition: Transition,
): Promise<Result<{ competitionId: string }, DomainError>> {
  return run(unitOfWork, async (repos) => {
    const snap = await repos.competitions.findCompetitionById(
      input.gameWorldId,
      input.competitionId,
    );
    if (snap === null) {
      return fail(
        new DomainError("COMPETITION_NOT_FOUND", "Competição não encontrada."),
      );
    }
    const agg = Competition.fromSnapshot(snap);
    if (!agg.ok) return agg;
    const moved = agg.value[transition]();
    if (!moved.ok) return moved;
    await repos.competitions.saveCompetition(agg.value.snapshot(), snap.version);
    return succeed({ competitionId: input.competitionId });
  });
}

/** Trava a competição (RASCUNHO→AGENDADA), congelando a config (R-202). */
export class LockCompetition {
  public constructor(private readonly unitOfWork: CompetitionUnitOfWork) {}
  public execute(input: CompetitionTransitionInput) {
    return applyTransition(this.unitOfWork, input, "lock");
  }
}

/** Começa (AGENDADA→EM_ANDAMENTO). */
export class StartCompetition {
  public constructor(private readonly unitOfWork: CompetitionUnitOfWork) {}
  public execute(input: CompetitionTransitionInput) {
    return applyTransition(this.unitOfWork, input, "start");
  }
}

/** Homologa (EM_ANDAMENTO→ENCERRADA). */
export class FinishCompetition {
  public constructor(private readonly unitOfWork: CompetitionUnitOfWork) {}
  public execute(input: CompetitionTransitionInput) {
    return applyTransition(this.unitOfWork, input, "finish");
  }
}

class Rollback extends Error {
  public constructor(public readonly domainError: DomainError) {
    super(domainError.message);
  }
}

async function run<T>(
  unitOfWork: CompetitionUnitOfWork,
  work: (
    repositories: CompetitionRepositories,
  ) => Promise<Result<T, DomainError>>,
): Promise<Result<T, DomainError>> {
  try {
    return await unitOfWork.run(async (repositories) => {
      const result = await work(repositories);
      if (!result.ok) throw new Rollback(result.error);
      return result;
    });
  } catch (error) {
    if (error instanceof Rollback) return fail(error.domainError);
    throw error;
  }
}
