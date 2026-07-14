import { randomUUID } from "node:crypto";

import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";

import type {
  RealtimeEvent,
  RealtimePublisher,
} from "./realtime-publisher.js";

function roomOf(worldId: string): string {
  return `world:${worldId}`;
}

/**
 * Gateway de tempo real (Socket.IO). Salas por mundo, `sequence` monotônica por
 * stream para o cliente deduplicar e detectar gap (reusa a semântica do kernel
 * `classifyRealtimeEvent`). Não é fonte de verdade — só acelera a entrega dos
 * eventos que os commands já persistiram (docs §08).
 */
@WebSocketGateway({ namespace: "/realtime", cors: true })
export class RealtimeGateway implements RealtimePublisher {
  @WebSocketServer() private readonly server?: Server;

  private readonly sequences = new Map<string, number>();

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

  publish(
    worldId: string,
    correlationId: string,
    events: readonly Record<string, unknown>[],
  ): readonly RealtimeEvent[] {
    const emitted: RealtimeEvent[] = [];
    let sequence = this.sequences.get(worldId) ?? 0;
    const occurredAt = new Date().toISOString();
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
      this.server?.to(roomOf(worldId)).emit("event", envelope);
    }
    this.sequences.set(worldId, sequence);
    return emitted;
  }
}
