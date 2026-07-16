import type { QueryEnvelope } from "./types.js";

/** Chave canônica de isolamento do cache derivado entre clientes. */
export function clientScopeKey(
  accountId: string,
  worldId: string,
  controlId: string | null,
): string {
  return [accountId, worldId, controlId ?? "no-control"]
    .map(encodeURIComponent)
    .join(":");
}

export interface CachedQuery<T = unknown> {
  readonly scopeKey: string;
  readonly queryType: string;
  readonly projectionVersion: number;
  readonly asOf: string;
  readonly data: T;
}

/**
 * Cache de query segregado por escopo (account/world/control) e imutável por
 * versão (FR-009 do X-003): entradas são chaveadas por (scopeKey, queryType);
 * nunca mistura escopos; só substitui por uma projectionVersion >= a cacheada
 * (monotônica — nunca regride). Trocar de escopo limpa o escopo antigo.
 */
export class QueryCache {
  private readonly entries = new Map<string, CachedQuery>();

  private keyOf(scopeKey: string, queryType: string): string {
    return `${scopeKey}::${queryType}`;
  }

  get<T = unknown>(
    scopeKey: string,
    queryType: string,
  ): CachedQuery<T> | undefined {
    return this.entries.get(this.keyOf(scopeKey, queryType)) as
      CachedQuery<T> | undefined;
  }

  /** Grava a partir de um envelope; ignora versões mais antigas (imutabilidade). */
  put<T>(
    scopeKey: string,
    queryType: string,
    envelope: QueryEnvelope<T>,
  ): CachedQuery<T> {
    const key = this.keyOf(scopeKey, queryType);
    const existing = this.entries.get(key);
    if (
      existing !== undefined &&
      existing.projectionVersion > envelope.projectionVersion
    ) {
      return existing as CachedQuery<T>;
    }
    const entry: CachedQuery<T> = {
      scopeKey,
      queryType,
      projectionVersion: envelope.projectionVersion,
      asOf: envelope.asOf,
      data: envelope.data,
    };
    this.entries.set(key, entry);
    return entry;
  }

  /** Limpa todas as entradas de um escopo — chamado na troca de account/world/control. */
  clearScope(scopeKey: string): void {
    for (const key of [...this.entries.keys()]) {
      if (key.startsWith(`${scopeKey}::`)) this.entries.delete(key);
    }
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
