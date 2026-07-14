import "reflect-metadata";

import { describe, expect, it } from "vitest";

import { SessionStore } from "../src/auth/session-store.js";
import { RealtimeGateway } from "../src/realtime/realtime.gateway.js";

function gateway(): RealtimeGateway {
  return new RealtimeGateway(new SessionStore());
}

describe("RealtimeGateway sequence", () => {
  it("emite sequence monotônica por mundo e isolada entre mundos", () => {
    const gw = gateway();

    const first = gw.publish("w1", "corr", [
      { type: "WorldCreated" },
      { type: "WorldAdvanced" },
    ]);
    expect(first.map((event) => event.sequence)).toEqual([1, 2]);
    expect(first[0]?.streamId).toBe("world:w1");
    expect(first[0]?.eventType).toBe("WorldCreated");

    const more = gw.publish("w1", "corr", [{ type: "WorldPaused" }]);
    expect(more[0]?.sequence).toBe(3);

    const other = gw.publish("w2", "corr", [{ type: "WorldCreated" }]);
    expect(other[0]?.sequence).toBe(1);
  });
});

interface StubSocket {
  handshake: { auth: { token?: string }; headers: Record<string, string> };
  emitted: { event: string; payload: unknown }[];
  disconnected: boolean;
  emit(event: string, payload: unknown): void;
  disconnect(close?: boolean): void;
}

function stubSocket(token?: string): StubSocket {
  const socket: StubSocket = {
    handshake: {
      auth: token !== undefined ? { token } : {},
      headers: {},
    },
    emitted: [],
    disconnected: false,
    emit(event, payload) {
      this.emitted.push({ event, payload });
    },
    disconnect() {
      this.disconnected = true;
    },
  };
  return socket;
}

describe("RealtimeGateway handshake (auth na conexão)", () => {
  it("admite socket com token de sessão válido", () => {
    const store = new SessionStore();
    const session = store.issue({ subject: "u", nowMs: Date.now() });
    const gw = new RealtimeGateway(store);
    const socket = stubSocket(session.token);
    gw.handleConnection(socket as never);
    expect(socket.disconnected).toBe(false);
  });

  it("derruba socket com token inválido", () => {
    const gw = new RealtimeGateway(new SessionStore());
    const socket = stubSocket("token-invalido");
    gw.handleConnection(socket as never);
    expect(socket.disconnected).toBe(true);
    expect(socket.emitted[0]?.event).toBe("unauthorized");
  });

  it("derruba socket sem token (sem bypass anônimo)", () => {
    delete process.env.GRINTA_API_ALLOW_ANONYMOUS;
    const gw = new RealtimeGateway(new SessionStore());
    const socket = stubSocket();
    gw.handleConnection(socket as never);
    expect(socket.disconnected).toBe(true);
  });
});

describe("RealtimeGateway gap recovery (resync)", () => {
  it("delta: devolve eventos após fromSequence", () => {
    const gw = gateway();
    gw.publish("w1", "corr", [
      { type: "A" },
      { type: "B" },
      { type: "C" },
    ]);
    const outcome = gw.resync("w1", 1);
    expect(outcome.mode).toBe("delta");
    expect(outcome.events.map((event) => event.sequence)).toEqual([2, 3]);
  });

  it("delta vazio quando o cliente já está atualizado", () => {
    const gw = gateway();
    gw.publish("w1", "corr", [{ type: "A" }]);
    const outcome = gw.resync("w1", 1);
    expect(outcome.mode).toBe("delta");
    expect(outcome.events).toHaveLength(0);
  });

  it("snapshot quando o gap ultrapassa o buffer (re-consultar API)", () => {
    const gw = gateway();
    // gera > 500 eventos para expulsar os mais antigos do buffer
    for (let i = 0; i < 600; i += 1) {
      gw.publish("w1", "corr", [{ type: "E" }]);
    }
    const outcome = gw.resync("w1", 1); // fromSequence muito antigo
    expect(outcome.mode).toBe("snapshot");
    expect(outcome.reason).toContain("API oficial");
  });
});
