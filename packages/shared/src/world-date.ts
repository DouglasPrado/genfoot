import { DomainError } from "./domain-error.js";
import { fail, succeed, type Result } from "./result.js";

const WORLD_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 86_400_000;

export class WorldDate {
  readonly #epochMilliseconds: number;

  private constructor(epochMilliseconds: number) {
    this.#epochMilliseconds = epochMilliseconds;
  }

  public static parse(value: string): Result<WorldDate, DomainError> {
    const match = WORLD_DATE_PATTERN.exec(value);

    if (match === null) {
      return fail(WorldDate.invalid(value));
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return fail(WorldDate.invalid(value));
    }

    return succeed(new WorldDate(date.getTime()));
  }

  public addDays(days: number): WorldDate {
    if (!Number.isSafeInteger(days)) {
      throw new DomainError(
        "INVALID_DAY_COUNT",
        "A quantidade de dias deve ser um inteiro seguro.",
        {
          days,
        },
      );
    }

    return new WorldDate(this.#epochMilliseconds + days * MILLISECONDS_PER_DAY);
  }

  public equals(other: WorldDate): boolean {
    return this.#epochMilliseconds === other.#epochMilliseconds;
  }

  public toString(): string {
    const date = new Date(this.#epochMilliseconds);
    const year = date.getUTCFullYear().toString().padStart(4, "0");
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const day = date.getUTCDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  public toJSON(): string {
    return this.toString();
  }

  private static invalid(value: string): DomainError {
    return new DomainError(
      "INVALID_WORLD_DATE",
      "A data do mundo deve existir e usar o formato YYYY-MM-DD.",
      { value },
    );
  }
}
