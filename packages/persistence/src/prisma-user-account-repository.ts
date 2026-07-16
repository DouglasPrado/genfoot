import type {
  UserAccountRepository,
  UserAccountSnapshot,
} from "@grinta/core";
import { AccountStatus } from "@grinta/core";

import type { PrismaClient } from "./prisma-connection.js";

/**
 * Primeiro adapter Prisma (R-173). A conta é global (R-172), então esta porta
 * não tem `gameWorldId` — e o `JsonWorldRepository`, indexado por mundo, não
 * conseguiria implementá-la nem se quisesse. Por isso ela é a primeira.
 *
 * `createdAt` NÃO é escrito daqui: é instante de plataforma, e quem o grava é o
 * `@default(now())` do banco. O domínio não tem relógio — e a conta, sendo
 * global, não tem data de mundo para pôr no lugar. Antes escrevíamos aqui a
 * semente do id determinístico, o que perdia quando a conta de fato nasceu.
 */
export class PrismaUserAccountRepository implements UserAccountRepository {
  public constructor(private readonly client: PrismaClient) {}

  public async findAccountById(id: string): Promise<UserAccountSnapshot | null> {
    return toSnapshot(await this.client.userAccount.findUnique({ where: { id } }));
  }

  public async findAccountByEmail(
    email: string,
  ): Promise<UserAccountSnapshot | null> {
    return toSnapshot(await this.client.userAccount.findUnique({ where: { email } }));
  }

  public async findAccountByExternalSubject(
    subject: string,
  ): Promise<UserAccountSnapshot | null> {
    return toSnapshot(
      await this.client.userAccount.findUnique({ where: { externalSubject: subject } }),
    );
  }

  /**
   * Concorrência otimista pela `version`. `expectedVersion === null` significa
   * "esta conta não existe": um `create` puro, que o índice único do Postgres
   * arbitra se dois primeiros acessos correrem juntos.
   */
  public async saveAccount(
    snapshot: UserAccountSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    const data = {
      status: toDbStatus(snapshot.status),
      name: snapshot.name,
      email: snapshot.email,
      externalSubject: snapshot.externalSubject,
      version: snapshot.version,
    };

    if (expectedVersion === null) {
      await this.client.userAccount.create({ data: { id: snapshot.id, ...data } });
      return;
    }

    // updateMany + count: o `where` casa id E versão, então uma escrita
    // concorrente que já subiu a versão não é sobrescrita em silêncio —
    // afeta 0 linhas e vira conflito.
    const { count } = await this.client.userAccount.updateMany({
      where: { id: snapshot.id, version: expectedVersion },
      data,
    });
    if (count === 0) {
      throw new AccountRevisionConflict(snapshot.id, expectedVersion);
    }
  }
}

export class AccountRevisionConflict extends Error {
  public readonly code = "ACCOUNT_REVISION_CONFLICT";
  public constructor(id: string, expectedVersion: number) {
    super(`Conta ${id} mudou: versão esperada ${expectedVersion} não confere.`);
  }
}

interface UserAccountRow {
  readonly id: string;
  readonly status: string;
  readonly name: string;
  readonly email: string;
  readonly externalSubject: string | null;
  readonly version: number;
}

function toSnapshot(row: UserAccountRow | null): UserAccountSnapshot | null {
  if (row === null) return null;
  return {
    id: row.id as UserAccountSnapshot["id"],
    status: toDomainStatus(row.status),
    name: row.name,
    email: row.email,
    externalSubject: row.externalSubject,
    version: row.version,
  };
}

function toDbStatus(status: AccountStatus): "ACTIVE" | "SUSPENDED" {
  return status === AccountStatus.SUSPENDED ? "SUSPENDED" : "ACTIVE";
}

function toDomainStatus(value: string): AccountStatus {
  return value === "SUSPENDED" ? AccountStatus.SUSPENDED : AccountStatus.ACTIVE;
}
