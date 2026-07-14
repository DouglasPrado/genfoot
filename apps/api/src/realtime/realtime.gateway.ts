import { randomUUID } from "node:crypto";

import { Inject } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";

import { SESSION_STORE } from "../core/tokens.js";
import { SessionStore } from "../auth/session-store.js";
import type {
  RealtimeEvent,
  RealtimePublisher,
} from "./realtime-publisher.js";

function roomOf(worldId: string): string {
  return `world:${worldId}`;
}

const BUFFER_LIMIT = 500;

export interface ResyncOutcome {
  readonly mode: "delta" | "snapshot";
  readonly events: readonly RealtimeEvent[];
  readonly reason?: string;
}

/**
 * Gateway de tempo real (Socket.IO). Handshake com credencial (token na conexão),
 * salas por mundo, `sequence` monotônica e recuperação de gap: `resync` devolve
 * um delta (eventos bufferizados após fromSequence) ou sinaliza snapshot quando o
 * gap ultrapassa o buffer — o cliente então re-consulta a API oficial (fonte de
 * verdade; o gateway apenas acelera a entrega, docs §08).
 */
@WebSocketGateway({ namespace: "/realtime", cors: true })
export class RealtimeGateway
  implements RealtimePublisher, OnGatewayConnection
{
  @WebSocketServer() private readonly server?: Server;

  private readonly sequences = new Map<string, number>();
  private readonly buffers = new Map<string, RealtimeEvent[]>();

  constructor(
    @Inject(SESSION_STORE) private readonly sessions: SessionStore,
  ) {}

  /** Handshake: admite o socket somente com token de sessão válido. */
  handleConnection(client: Socket): void {
    const token = this.tokenOf(client);
    if (token === undefined) {
      const allowAnonymous = process.env.GRINTA_API_ALLOW_ANONYMOUS === "1";
      if (!allowAnonymous) {
        client.emit("unauthorized", { reason: "missing token" });
        client.disconnect(true);
      }
      return;
    }
    const session = this.sessions.validate(token, Date.now());
    if (session === undefined) {
      client.emit("unauthorized", { reason: "invalid token" });
      client.disconnect(true);
    }
  }

  private tokenOf(client: Socket): string | undefined {
    const fromAuth = (client.handshake.auth as { token?: unknown } | undefined)
      ?.token;
    if (typeof fromAuth === "string" && fromAuth.length > 0) return fromAuth;
    const header = client.handshake.headers.authorization;
    if (typeof header === "string" && header.startsWith("Bearer ")) {
      return header.slice("Bearer ".length);
    }
    return undefined;
  }

  @SubscribeMessage("subscribe")
  onSubscribe(
    @MessageBody() body: { worldId?: unknown },
    @ConnectedSocket() client: Socket,
  ): { subscribed: string | null; lastSequence: number } {
    if (typeof body?.worldId !== "string") {
      return { subscribed: null, lastSequence: 0 };
    }
    void client.join(roomOf(body.worldId));
    return {
      subscribed: body.worldId,
      lastSequence: this.sequences.get(body.worldId) ?? 0,
    };
  }

  @SubscribeMessage("resync")
  onResync(@MessageBody() body: {
    worldId?: unknown;
    fromSequence?: unknown;
  }): ResyncOutcome {
    if (
      typeof body?.worldId !== "string" ||
      typeof body?.fromSequence !== "number"
    ) {
      return { mode: "snapshot", events: [], reason: "invalid resync request" };
    }
    return this.resync(body.worldId, body.fromSequence);
  }

  /** Decisão pura de recuperação de gap (delta vs snapshot). */
  resync(worldId: string, fromSequence: number): ResyncOutcome {
    const buffer = this.buffers.get(worldId) ?? [];
    const oldest = buffer[0]?.sequence ?? 0;
    if (buffer.length === 0 || fromSequence >= (buffer.at(-1)?.sequence ?? 0)) {
      return { mode: "delta", events: [] }; // já atualizado
    }
    if (fromSequence < oldest - 1) {
      return {
        mode: "snapshot",
        events: [],
        reason: "gap maior que o buffer — re-consulte a API oficial",
      };
    }
    return {
      mode: "delta",
      events: buffer.filter((event) => event.sequence > fromSequence),
    };
  }

  publish(
    worldId: string,
    correlationId: string,
    events: readonly Record<string, unknown>[],
  ): readonly RealtimeEvent[] {
    const emitted: RealtimeEvent[] = [];
    let sequence = this.sequences.get(worldId) ?? 0;
    const occurredAt = new Date().toISOString();
    const buffer = this.buffers.get(worldId) ?? [];
    for (const event of events) {
      sequence += 1;
      const envelope: RealtimeEvent = {
        eventId: randomUUID(),
        worldId,
        streamId: roomOf(worldId),
        sequence,
        eventType: String(event.type ?? event.eventType ?? "domain.event"),
        eventVersion: 1,
        occurredAt,
        correlationId,
        payload: event,
      };
      emitted.push(envelope);
      buffer.push(envelope);
      this.server?.to(roomOf(worldId)).emit("event", envelope);
    }
    while (buffer.length > BUFFER_LIMIT) buffer.shift();
    this.buffers.set(worldId, buffer);
    this.sequences.set(worldId, sequence);
    return emitted;
  }
}
