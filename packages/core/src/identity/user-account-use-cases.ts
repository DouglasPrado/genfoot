import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import type { UserAccountRepository } from "./user-account-repository.js";
import {
  normalizeEmail,
  UserAccount,
  type UserAccountSnapshot,
} from "./user-account.js";

export interface ResolveAccountInput {
  /** `sub` do token JÁ verificado pelo provedor (R-171). */
  readonly subject: string;
  readonly email: string;
  readonly name: string;
  readonly occurredOn: string;
  readonly idempotencySeed: string;
}

/**
 * Resolve a conta de plataforma a partir do subject do provedor: acha ou cria.
 * Todo acesso passa por aqui (R-171/R-172), então o caminho comum — conta já
 * existente — não escreve nada.
 *
 * Três casos, nesta ordem:
 *  1. já ligada ao subject → devolve;
 *  2. e-mail já existe sem vínculo → liga (conta nascida por seed/admin que
 *     agora entra pelo provedor);
 *  3. nada existe → cria já ligada.
 *
 * O caso "e-mail existe, ligado a OUTRO subject" é recusado: seria entregar a
 * conta de alguém a outra identidade externa.
 */
export class ResolveAccountForSubject {
  public constructor(private readonly repository: UserAccountRepository) {}

  public async execute(
    input: ResolveAccountInput,
  ): Promise<Result<UserAccountSnapshot, DomainError>> {
    const subject = input.subject.trim();
    if (subject === "") {
      return fail(
        new DomainError("INVALID_ACCOUNT", "subject do provedor é obrigatório."),
      );
    }

    const bySubject = await this.repository.findAccountByExternalSubject(subject);
    if (bySubject !== null) return succeed(bySubject);

    const email = normalizeEmail(input.email);
    const byEmail = await this.repository.findAccountByEmail(email);
    if (byEmail !== null) {
      const loaded = UserAccount.fromSnapshot(byEmail);
      if (!loaded.ok) return loaded;
      const linked = loaded.value.linkExternalSubject(subject);
      if (!linked.ok) return linked;
      await this.repository.saveAccount(linked.value, byEmail.version);
      return succeed(linked.value);
    }

    const created = UserAccount.register({
      email: input.email,
      name: input.name,
      externalSubject: subject,
      occurredOn: input.occurredOn,
      idempotencySeed: input.idempotencySeed,
    });
    if (!created.ok) return created;

    const snapshot = created.value.snapshot();
    // expectedVersion null = "esta conta não existe": se existir, o repositório
    // recusa, e é o Postgres quem arbitra a corrida entre dois primeiros
    // acessos simultâneos.
    await this.repository.saveAccount(snapshot, null);
    return succeed(snapshot);
  }
}
