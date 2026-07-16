import type {
  IdentityReadModel,
  IdentitySummaryView,
  IdentityWorldView,
} from "@grinta/core";
import { createPrismaClient, PrismaIdentityReadModel } from "@grinta/persistence";

/**
 * O read model de C1, construído na PRIMEIRA leitura — não no boot, pelo mesmo
 * motivo do `LazyIdentityUnitOfWork`: só C1 está no Postgres, e exigir
 * `DATABASE_URL` no boot faria as queries de clube, mercado e partida — que
 * ainda são JSON — deixarem de subir.
 *
 * Some quando o último contexto migrar.
 */
export class LazyIdentityReadModel implements IdentityReadModel {
  private delegate: IdentityReadModel | null = null;

  public worldView(gameWorldId: string): Promise<IdentityWorldView> {
    return this.resolve().worldView(gameWorldId);
  }

  public summary(gameWorldId: string): Promise<IdentitySummaryView> {
    return this.resolve().summary(gameWorldId);
  }

  private resolve(): IdentityReadModel {
    const delegate = this.delegate ?? new PrismaIdentityReadModel(createPrismaClient());
    this.delegate = delegate;
    return delegate;
  }
}
