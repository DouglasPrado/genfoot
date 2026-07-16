import type { GameWorldSnapshot, WorldRepository } from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";
import { createPrismaClient, PrismaWorldRepository } from "@grinta/persistence";

/**
 * O mundo no Postgres (R-173/R-182), construído na primeira leitura.
 *
 * Preguiçoso pelo mesmo motivo dos outros: a migração é contexto a contexto, e
 * exigir `DATABASE_URL` no boot derrubaria a API inteira por causa de um
 * contexto. Some quando o último migrar — aí o boot exige o banco e isto vira
 * um `new PrismaWorldRepository(client)` direto no módulo.
 */
export class LazyWorldRepository implements WorldRepository {
  private delegate: WorldRepository | null = null;

  public findById(id: GameWorldId): Promise<GameWorldSnapshot | null> {
    return this.resolve().findById(id);
  }

  public save(
    snapshot: GameWorldSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    return this.resolve().save(snapshot, expectedVersion);
  }

  private resolve(): WorldRepository {
    const delegate = this.delegate ?? new PrismaWorldRepository(createPrismaClient());
    this.delegate = delegate;
    return delegate;
  }
}
