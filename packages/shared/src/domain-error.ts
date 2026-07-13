export class DomainError extends Error {
  public readonly code: string;
  public readonly details: Readonly<Record<string, unknown>> | undefined;

  public constructor(
    code: string,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }

  public toJSON(): Readonly<{
    code: string;
    message: string;
    details?: Readonly<Record<string, unknown>>;
  }> {
    return this.details === undefined
      ? { code: this.code, message: this.message }
      : { code: this.code, message: this.message, details: this.details };
  }
}
