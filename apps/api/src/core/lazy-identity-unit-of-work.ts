import type { IdentityRepositories, IdentityUnitOfWork } from "@grinta/core";
import { createPrismaClient, PrismaIdentityUnitOfWork } from "@grinta/persistence";

/**
 * O `IdentityUnitOfWork` do C1, construído na PRIMEIRA escrita — não no boot.
 *
 * Por que preguiçoso: a migração é contexto a contexto (R-173), e hoje só C1
 * está no Postgres. Construir o client no boot faria a API inteira exigir
 * `DATABASE_URL` — inclusive para comandos de clube, mercado e partida, que
 * ainda são JSON e não têm nada com isso.
 *
 * O que ele NÃO faz é esconder a falta do banco: quem chama um comando de
 * identidade sem `DATABASE_URL` recebe o erro de `createPrismaClient`, alto e
 * claro. O que se adia é a exigência, não o aviso.
 *
 * Some quando o último contexto migrar: aí o boot exige o banco, e isto vira
 * um `new PrismaIdentityUnitOfWork(client)` direto no módulo.
 */
export class LazyIdentityUnitOfWork implements IdentityUnitOfWork {
  private delegate: IdentityUnitOfWork | null = null;

  public run<T>(work: (repositories: IdentityRepositories) => Promise<T>): Promise<T> {
    const delegate =
      this.delegate ?? new PrismaIdentityUnitOfWork(createPrismaClient());
    this.delegate = delegate;
    return delegate.run(work);
  }
}
