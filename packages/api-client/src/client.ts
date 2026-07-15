import {
  GrintaApiError,
  type Catalog,
  type CommandEnvelope,
  type CommandResponse,
  type QueryEnvelope,
  type Role,
  type SessionResponse,
  type StandardError,
  type ValidationReport,
} from "./types.js";

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<{
  status: number;
  json: () => Promise<unknown>;
}>;

export interface ClientOptions {
  readonly baseUrl: string;
  readonly token?: string;
  /** Implementação de fetch (default: globalThis.fetch). */
  readonly fetch?: FetchLike;
}

let correlationCounter = 0;

/**
 * SDK tipado da API oficial do Grinta (`/api/v1`). Não-autoritativo: só fala
 * command/query/auth versionados. Funciona em Next.js (server/client) e RN/Expo.
 */
export class GrintaClient {
  private readonly baseUrl: string;
  private readonly token: string | undefined;
  private readonly fetchImpl: FetchLike;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.token = options.token;
    // Envolve o fetch global num wrapper: no browser, `window.fetch` precisa ser
    // chamado com `this === window` (senão "Illegal invocation"); guardá-lo
    // destacado e chamá-lo como `this.fetchImpl(...)` quebraria. O wrapper
    // preserva o contexto correto e funciona igual em Node.
    const boundGlobal: FetchLike | undefined =
      typeof globalThis.fetch === "function"
        ? (input, init) => globalThis.fetch(input, init)
        : undefined;
    const resolved = options.fetch ?? boundGlobal;
    if (resolved === undefined) {
      throw new Error("Nenhuma implementação de fetch disponível.");
    }
    this.fetchImpl = resolved;
  }

  /** Deriva um novo client autenticado com o token dado. */
  withToken(token: string): GrintaClient {
    return new GrintaClient({
      baseUrl: this.baseUrl,
      token,
      fetch: this.fetchImpl,
    });
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; body: T }> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.token !== undefined) {
      headers.authorization = `Bearer ${this.token}`;
    }
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const parsed = (await response.json()) as T;
    if (response.status >= 400) {
      throw new GrintaApiError(response.status, parsed as StandardError);
    }
    return { status: response.status, body: parsed };
  }

  async health(): Promise<{ status: string; contractVersion: string }> {
    return (
      await this.request<{ status: string; contractVersion: string }>(
        "GET",
        "/api/v1/health",
      )
    ).body;
  }

  async session(input: {
    subject: string;
    role?: Role;
    adminKey?: string;
    worldScope?: readonly string[];
  }): Promise<SessionResponse> {
    return (
      await this.request<SessionResponse>(
        "POST",
        "/api/v1/auth/session",
        input,
      )
    ).body;
  }

  async catalog(): Promise<Catalog> {
    return (await this.request<Catalog>("GET", "/api/v1/commands/catalog")).body;
  }

  /** Roda a calibração (VAL-001) e devolve o relatório com bandas e gate. */
  async validation(manifest?: unknown): Promise<ValidationReport> {
    return (
      await this.request<ValidationReport>(
        "POST",
        "/api/v1/validation/run",
        manifest ?? {},
      )
    ).body;
  }

  async command(envelope: CommandEnvelope): Promise<CommandResponse> {
    correlationCounter += 1;
    const full = {
      contractVersion: "v1",
      payload: {},
      correlationId: `sdk-${correlationCounter}`,
      ...envelope,
    };
    return (await this.request<CommandResponse>("POST", "/api/v1/commands", full))
      .body;
  }

  async query<T = unknown>(
    worldId: string,
    queryType?: string,
    page?: { limit?: number; offset?: number },
  ): Promise<QueryEnvelope<T>> {
    const params = new URLSearchParams();
    if (page?.limit !== undefined) params.set("limit", String(page.limit));
    if (page?.offset !== undefined) params.set("offset", String(page.offset));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const path = queryType
      ? `/api/v1/worlds/${worldId}/${queryType}${suffix}`
      : `/api/v1/worlds/${worldId}${suffix}`;
    return (await this.request<QueryEnvelope<T>>("GET", path)).body;
  }
}

export function createClient(options: ClientOptions): GrintaClient {
  return new GrintaClient(options);
}
