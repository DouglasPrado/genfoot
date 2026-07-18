import { fail, succeed, type DomainError, type Result } from "@grinta/shared";

import { ClubAIProfile } from "./club-ai-profile.js";
import type { ClubAIProfileSnapshot, OfflinePlan } from "./automation-types.js";

/**
 * SetOfflinePlan (X-001) — o clube define o que a IA pode decidir na sua
 * ausência. Upsert por clube: se o perfil não existe, nasce com o padrão e
 * recebe o plano; se existe, atualiza. Todo clube é "IA por ausência" (R-180),
 * então o perfil é opcional até alguém autorar o plano.
 */
export interface ClubAIProfileRepository {
  findByClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<ClubAIProfileSnapshot | null>;
  saveProfile(snapshot: ClubAIProfileSnapshot): Promise<void>;
}

export interface AutomationRepositories {
  readonly profiles: ClubAIProfileRepository;
}

export interface AutomationUnitOfWork {
  run<T>(work: (repositories: AutomationRepositories) => Promise<T>): Promise<T>;
}

export interface SetOfflinePlanInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly plan: OfflinePlan;
}

export class SetOfflinePlan {
  public constructor(private readonly unitOfWork: AutomationUnitOfWork) {}

  public execute(
    input: SetOfflinePlanInput,
  ): Promise<Result<{ clubId: string }, DomainError>> {
    return run(this.unitOfWork, async (repos) => {
      const existing = await repos.profiles.findByClub(
        input.gameWorldId,
        input.clubId,
      );
      const profile =
        existing === null
          ? ClubAIProfile.default(input.gameWorldId, input.clubId)
          : (() => {
              const loaded = ClubAIProfile.fromSnapshot(existing);
              if (!loaded.ok) throw new Rollback(loaded.error);
              return loaded.value;
            })();

      const applied = profile.setOfflinePlan(input.plan);
      if (!applied.ok) return applied;

      await repos.profiles.saveProfile(profile.snapshot());
      return succeed({ clubId: input.clubId });
    });
  }
}

class Rollback extends Error {
  public constructor(public readonly domainError: DomainError) {
    super(domainError.message);
  }
}

async function run<T>(
  unitOfWork: AutomationUnitOfWork,
  work: (
    repositories: AutomationRepositories,
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
