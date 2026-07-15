import { describe, expect, it } from "vitest";

import { GrintaApiError, createClient } from "../src/index.js";

interface Recorded {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

function mockFetch(
  responder: (recorded: Recorded) => { status: number; body: unknown },
) {
  const calls: Recorded[] = [];
  const fetchImpl = (
    url: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string },
  ) => {
    const recorded: Recorded = { url, ...(init ?? {}) };
    calls.push(recorded);
    const { status, body } = responder(recorded);
    return Promise.resolve({ status, json: () => Promise.resolve(body) });
  };
  return { calls, fetchImpl };
}

describe("GrintaClient", () => {
  it("session() faz POST /auth/session e retorna o token", async () => {
    const { calls, fetchImpl } = mockFetch(() => ({
      status: 201,
      body: { token: "tok-1", subject: "u", role: "user", expiresAtMs: 1, worldScope: [] },
    }));
    const client = createClient({ baseUrl: "http://x", fetch: fetchImpl });
    const session = await client.session({ subject: "u" });
    expect(session.token).toBe("tok-1");
    expect(calls[0]?.url).toBe("http://x/api/v1/auth/session");
    expect(calls[0]?.method).toBe("POST");
    expect(JSON.parse(calls[0]!.body!)).toMatchObject({ subject: "u" });
  });

  it("command() injeta contractVersion v1 + correlationId e manda Bearer", async () => {
    const { calls, fetchImpl } = mockFetch(() => ({
      status: 201,
      body: { commandId: "c1", status: "ACCEPTED", correlationId: "sdk-1", resource: "world:1" },
    }));
    const client = createClient({ baseUrl: "http://x", token: "tok", fetch: fetchImpl });
    const res = await client.command({ commandType: "world:create", idempotencyKey: "k" });
    expect(res.status).toBe("ACCEPTED");
    const sent = JSON.parse(calls[0]!.body!) as {
      contractVersion: string;
      correlationId: string;
    };
    expect(sent.contractVersion).toBe("v1");
    expect(sent.correlationId).toMatch(/^sdk-/);
    expect(calls[0]?.headers?.authorization).toBe("Bearer tok");
  });

  it("query() monta URL com paginação", async () => {
    const { calls, fetchImpl } = mockFetch(() => ({
      status: 200,
      body: { data: {}, asOf: "2026-01-01", projectionVersion: 0, pagination: {}, scope: {} },
    }));
    const client = createClient({ baseUrl: "http://x", fetch: fetchImpl });
    await client.query("w1", "club", { limit: 10, offset: 5 });
    expect(calls[0]?.url).toBe("http://x/api/v1/worlds/w1/club?limit=10&offset=5");
  });

  it("resposta >= 400 lança GrintaApiError com o envelope de erro", async () => {
    const { fetchImpl } = mockFetch(() => ({
      status: 403,
      body: {
        code: "FORBIDDEN",
        messageKey: "error.auth.adminRequired",
        correlationId: "c",
        retryable: false,
        fieldErrors: [],
        blockingReason: "FORBIDDEN",
        recoveryAction: null,
      },
    }));
    const client = createClient({ baseUrl: "http://x", token: "u", fetch: fetchImpl });
    await expect(
      client.command({ commandType: "admin:open-case", idempotencyKey: "k" }),
    ).rejects.toBeInstanceOf(GrintaApiError);
  });

  it("emite telemetria segura por command (FR-013) — sem payload", async () => {
    const { fetchImpl } = mockFetch(() => ({
      status: 201,
      body: { commandId: "c1", status: "ACCEPTED", correlationId: "sdk-x", resource: null },
    }));
    const events: unknown[] = [];
    const client = createClient({
      baseUrl: "http://x",
      token: "t",
      fetch: fetchImpl,
      onTelemetry: (e) => events.push(e),
    });
    await client.command({
      commandType: "admin:place-quarantine",
      idempotencyKey: "k",
      payload: { subject: "user-secret" },
    });
    expect(events).toHaveLength(1);
    expect(events[0]).not.toHaveProperty("payload");
    expect(events[0]).toMatchObject({
      type: "command",
      commandType: "admin:place-quarantine",
      status: "ACCEPTED",
    });
  });

  it("withToken deriva client autenticado", () => {
    const { fetchImpl } = mockFetch(() => ({ status: 200, body: {} }));
    const anon = createClient({ baseUrl: "http://x", fetch: fetchImpl });
    const authed = anon.withToken("t2");
    expect(authed).not.toBe(anon);
  });
});
