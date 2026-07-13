import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
} from "@grinta/shared";

import {
  SeasonLifecycleState,
  SeasonStatus,
  type SeasonSnapshot,
} from "./scheduling-types.js";

export class Season {
  private constructor(private state: SeasonSnapshot) {}

  public static bootstrap(
    input: Omit<SeasonSnapshot, "lifecycleState" | "status" | "version">,
  ): Result<Season, DomainError> {
    const valid = validateBase(input);
    if (!valid.ok) return valid;

    return succeed(
      new Season({
        ...input,
        lifecycleState: SeasonLifecycleState.REGISTRATION,
        status: SeasonStatus.PLANNED,
        version: 1,
      }),
    );
  }

  public static fromSnapshot(
    snapshot: SeasonSnapshot,
  ): Result<Season, DomainError> {
    const valid = validateBase(snapshot);
    if (!valid.ok) return valid;
    if (!Number.isSafeInteger(snapshot.version) || snapshot.version < 1) {
      return fail(invalidSeason("A versão da temporada é inválida."));
    }
    if (projectStatus(snapshot.lifecycleState) !== snapshot.status) {
      return fail(
        invalidSeason("O status persistido diverge do estado da temporada."),
      );
    }
    return succeed(new Season(snapshot));
  }

  public start(on: WorldDate): Result<void, DomainError> {
    if (this.state.lifecycleState !== SeasonLifecycleState.REGISTRATION) {
      return fail(invalidTransition(this.state.lifecycleState, "start"));
    }
    if (on.toString() < this.state.startsOn) {
      return fail(
        new DomainError(
          "SEASON_NOT_DUE",
          "A temporada ainda não atingiu sua data inicial.",
        ),
      );
    }
    this.transition(SeasonLifecycleState.IN_PROGRESS);
    return succeed(undefined);
  }

  public beginFinalizing(on: WorldDate): Result<void, DomainError> {
    if (this.state.lifecycleState !== SeasonLifecycleState.IN_PROGRESS) {
      return fail(
        invalidTransition(this.state.lifecycleState, "beginFinalizing"),
      );
    }
    if (on.toString() < this.state.endsOn) {
      return fail(
        new DomainError(
          "SEASON_NOT_DUE",
          "A temporada ainda não atingiu sua data final.",
        ),
      );
    }
    this.transition(SeasonLifecycleState.FINALIZING);
    return succeed(undefined);
  }

  public finishSporting(): Result<void, DomainError> {
    if (this.state.lifecycleState !== SeasonLifecycleState.FINALIZING) {
      return fail(
        invalidTransition(this.state.lifecycleState, "finishSporting"),
      );
    }
    this.transition(SeasonLifecycleState.OFF_SEASON);
    return succeed(undefined);
  }

  public complete(): Result<void, DomainError> {
    if (this.state.lifecycleState !== SeasonLifecycleState.OFF_SEASON) {
      return fail(invalidTransition(this.state.lifecycleState, "complete"));
    }
    this.transition(SeasonLifecycleState.COMPLETED);
    return succeed(undefined);
  }

  public snapshot(): SeasonSnapshot {
    return this.state;
  }

  private transition(lifecycleState: SeasonLifecycleState): void {
    this.state = {
      ...this.state,
      lifecycleState,
      status: projectStatus(lifecycleState),
      version: this.state.version + 1,
    };
  }
}

function projectStatus(state: SeasonLifecycleState): SeasonStatus {
  if (
    state === SeasonLifecycleState.PLANNING ||
    state === SeasonLifecycleState.REGISTRATION
  ) {
    return SeasonStatus.PLANNED;
  }
  if (
    state === SeasonLifecycleState.IN_PROGRESS ||
    state === SeasonLifecycleState.FINALIZING
  ) {
    return SeasonStatus.ACTIVE;
  }
  if (state === SeasonLifecycleState.OFF_SEASON) return SeasonStatus.FINISHED;
  return SeasonStatus.ARCHIVED;
}

function validateBase(
  input: Pick<SeasonSnapshot, "number" | "name" | "startsOn" | "endsOn">,
): Result<void, DomainError> {
  if (!Number.isSafeInteger(input.number) || input.number < 1) {
    return fail(invalidSeason("O número da temporada deve ser positivo."));
  }
  if (input.name.trim() === "") {
    return fail(invalidSeason("O nome da temporada é obrigatório."));
  }
  const startsOn = WorldDate.parse(input.startsOn);
  if (!startsOn.ok) return startsOn;
  const endsOn = WorldDate.parse(input.endsOn);
  if (!endsOn.ok) return endsOn;
  if (input.endsOn < input.startsOn) {
    return fail(
      invalidSeason("A temporada não pode terminar antes de começar."),
    );
  }
  return succeed(undefined);
}

function invalidSeason(message: string): DomainError {
  return new DomainError("INVALID_SEASON", message);
}

function invalidTransition(from: string, command: string): DomainError {
  return new DomainError(
    "INVALID_SEASON_TRANSITION",
    "A transição solicitada não é válida para a temporada.",
    { from, command },
  );
}
