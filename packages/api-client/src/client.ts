import { commandTelemetry, type CommandTelemetryEvent } from "./telemetry.js";
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
  type WorldListItem,
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
  /** Sink de telemetria segura (FR-013): recebe só IDs, nunca payload/PII. */
  readonly onTelemetry?: (event: CommandTelemetryEvent) => void;
}

/**
 * Versão do contrato que este SDK fala. Vai em todo command e é comparada com a
 * `contractVersion` do `/health` no bootstrap do cliente: major diferente é
 * `BREAKING` e exige atualizar o app (doc 08 §versionamento).
 */
export const CONTRACT_VERSION = "v1";

let correlationCounter = 0;

/**
 * SDK tipado da API oficial do Grinta (`/api/v1`). Não-autoritativo: só fala
 * command/query/auth versionados. Funciona em Next.js (server/client) e RN/Expo.
 */
export class GrintaClient {
  private readonly baseUrl: string;
  private readonly token: string | undefined;
  private readonly fetchImpl: FetchLike;
  private readonly onTelemetry: ((e: CommandTelemetryEvent) => void) | undefined;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.token = options.token;
    this.onTelemetry = options.onTelemetry;
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
      ...(this.onTelemetry ? { onTelemetry: this.onTelemetry } : {}),
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

  /**
   * Abre sessão na API. Sessão de usuário exige `clerkToken` (R-171): o
   * servidor verifica e deriva o subject do `sub`, ignorando o daqui. `subject`
   * só vale para bootstrap admin ou com a porta de desenvolvimento aberta.
   */
  async session(input: {
    subject: string;
    role?: Role;
    adminKey?: string;
    clerkToken?: string;
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

  /**
   * Os mundos que existem. É a única query sem `worldId` — ela é a que os
   * descobre. Sem ela, o admin listava mundos do `localStorage` do navegador e
   * seguia mostrando os que já tinham sido apagados.
   */
  async worlds(): Promise<readonly WorldListItem[]> {
    return (
      await this.request<QueryEnvelope<readonly WorldListItem[]>>(
        "GET",
        "/api/v1/worlds",
      )
    ).body.data;
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
      contractVersion: CONTRACT_VERSION,
      payload: {},
      correlationId: `sdk-${correlationCounter}`,
      ...envelope,
    };
    const response = (
      await this.request<CommandResponse>("POST", "/api/v1/commands", full)
    ).body;
    // Telemetria segura (FR-013): só IDs, nunca payload.
    this.onTelemetry?.(
      commandTelemetry({
        commandType: full.commandType,
        status: response.status,
        correlationId: response.correlationId,
        commandId: response.commandId,
        ...("error" in response && response.error
          ? { errorCode: response.error.code }
          : {}),
      }),
    );
    return response;
  }

  async query<T = unknown>(
    worldId: string,
    queryType?: string,
    page?: { limit?: number; offset?: number; params?: Record<string, string> },
  ): Promise<QueryEnvelope<T>> {
    const params = new URLSearchParams();
    if (page?.limit !== undefined) params.set("limit", String(page.limit));
    if (page?.offset !== undefined) params.set("offset", String(page.offset));
    // Recorte fino da query (ex.: `roster` precisa de `clubId`). É o que leva o
    // parâmetro de tela à borda sem alargar o caminho world-scoped.
    for (const [key, value] of Object.entries(page?.params ?? {})) {
      params.set(key, value);
    }
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
