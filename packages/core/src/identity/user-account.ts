import { DomainError, WorldDate, fail, succeed, type Result } from "@grinta/shared";

import { deterministicUuidV7, timestampOf } from "../foundation/deterministic-uuid.js";

import { AccountStatus, type IdentityAccountRef } from "./identity-types.js";

/**
 * Conta de plataforma (R-172). Global: não pertence a mundo nenhum — o vínculo
 * por mundo é `WorldParticipant`. O modelo físico (`UserAccount` em
 * prisma/schema.prisma, sem `gameWorldId`, com e-mail único) sempre disse isso;
 * era `packages/core` que divergia, guardando contas dentro do agregado do
 * mundo. Isso impedia "1 conta por e-mail" e não cabia no Postgres.
 *
 * O provedor externo (Clerk, R-171) autentica; a conta segue sendo a fonte de
 * verdade do jogo (R-85). A ligação é `externalSubject` = `sub` do token
 * verificado — chave estável, ao contrário do e-mail, que muda.
 */
export interface UserAccountSnapshot {
  readonly id: IdentityAccountRef;
  readonly status: AccountStatus;
  readonly name: string;
  /** Normalizado (minúsculas, sem espaços): é a chave única do modelo físico. */
  readonly email: string;
  readonly externalSubject: string | null;
  readonly locale: string;
  readonly createdOn: string;
  readonly version: number;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface RegisterUserAccountInput {
  readonly email: string;
  readonly name: string;
  readonly locale: string;
  readonly externalSubject?: string;
  /** Data do mundo de origem; a conta é global, mas o id é determinístico. */
  readonly occurredOn: string;
  readonly idempotencySeed: string;
}

/**
 * Agregado de conta. Um por usuário — não uma coleção. Assim o Postgres
 * escreve uma linha por conta em vez de reescrever o mundo inteiro a cada
 * cadastro, e duas contas nunca disputam a mesma revisão.
 */
export class UserAccount {
  private constructor(private state: UserAccountSnapshot) {}

  public static register(
    input: RegisterUserAccountInput,
  ): Result<UserAccount, DomainError> {
    const email = normalizeEmail(input.email);
    if (email === "") {
      return fail(new DomainError("INVALID_ACCOUNT", "e-mail é obrigatório."));
    }
    if (!email.includes("@")) {
      return fail(new DomainError("INVALID_ACCOUNT", "e-mail inválido."));
    }
    if (input.locale.trim() === "") {
      return fail(new DomainError("INVALID_ACCOUNT", "locale é obrigatório."));
    }
    const date = WorldDate.parse(input.occurredOn);
    if (!date.ok) return date;

    const subject = input.externalSubject?.trim();
    return succeed(
      new UserAccount({
        // Determinístico pelo e-mail: reprocessar o mesmo cadastro produz o
        // mesmo id, e o domínio segue sem Date.now()/Math.random().
        id: deterministicUuidV7<"Account">({
          worldSeed: input.idempotencySeed,
          context: `user-account:${email}`,
          timestampMilliseconds: timestampOf(date.value.toString()),
        }),
        status: AccountStatus.ACTIVE,
        name: input.name.trim(),
        email,
        externalSubject: subject === undefined || subject === "" ? null : subject,
        locale: input.locale.trim(),
        createdOn: date.value.toString(),
        version: 1,
      }),
    );
  }

  public static fromSnapshot(
    snapshot: UserAccountSnapshot,
  ): Result<UserAccount, DomainError> {
    if (normalizeEmail(snapshot.email) !== snapshot.email) {
      return fail(
        new DomainError("INVALID_ACCOUNT", "e-mail precisa estar normalizado."),
      );
    }
    if (snapshot.version < 1) {
      return fail(new DomainError("INVALID_ACCOUNT", "versão inválida."));
    }
    return succeed(new UserAccount(snapshot));
  }

  /**
   * Liga a conta ao provedor no primeiro acesso. Não repõe um vínculo já
   * existente: trocar o `sub` de uma conta em silêncio seria sequestro de conta.
   */
  public linkExternalSubject(subject: string): Result<UserAccountSnapshot, DomainError> {
    const value = subject.trim();
    if (value === "") {
      return fail(new DomainError("INVALID_ACCOUNT", "subject é obrigatório."));
    }
    if (this.state.externalSubject === value) return succeed(this.state);
    if (this.state.externalSubject !== null) {
      return fail(
        new DomainError(
          "ACCOUNT_ALREADY_LINKED",
          "Esta conta já está ligada a outra identidade externa.",
        ),
      );
    }
    this.state = {
      ...this.state,
      externalSubject: value,
      version: this.state.version + 1,
    };
    return succeed(this.state);
  }

  public suspend(): Result<UserAccountSnapshot, DomainError> {
    if (this.state.status === AccountStatus.SUSPENDED) return succeed(this.state);
    this.state = {
      ...this.state,
      status: AccountStatus.SUSPENDED,
      version: this.state.version + 1,
    };
    return succeed(this.state);
  }

  public snapshot(): UserAccountSnapshot {
    return this.state;
  }
}
