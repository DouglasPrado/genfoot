"use client";

import { Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/session";

const REALTIME_URL =
  process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:3000";

interface FeedEvent {
  readonly sequence: number;
  readonly eventType: string;
  readonly occurredAt: string;
  readonly correlationId: string;
}

type Status = "connecting" | "live" | "offline";

/**
 * Feed de tempo real (Socket.IO) — a cara de mission-control. Conecta ao gateway
 * com o token de sessão (handshake), assina o mundo e transmite os eventos que os
 * commands publicam. Deduplica por sequence. Não é fonte de verdade.
 */
export function RealtimeFeed({ worldId }: { worldId: string }) {
  const { session } = useSession();
  const [status, setStatus] = useState<Status>("connecting");
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (session === null) return;
    setStatus("connecting");
    setEvents([]);
    const socket = io(`${REALTIME_URL}/realtime`, {
      auth: { token: session.token },
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("live");
      socket.emit("subscribe", { worldId });
    });
    socket.on("disconnect", () => setStatus("offline"));
    socket.on("unauthorized", () => setStatus("offline"));
    socket.on("event", (event: FeedEvent) => {
      setEvents((current) => {
        if (current.some((e) => e.sequence === event.sequence)) return current;
        return [event, ...current].slice(0, 60);
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session, worldId]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Radio className="size-4 text-muted-foreground" />
        <Badge tone={status === "live" ? "live" : status === "offline" ? "danger" : "warn"}>
          {status === "live" ? (
            <>
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" />
              ao vivo
            </>
          ) : status === "connecting" ? (
            "conectando…"
          ) : (
            "offline"
          )}
        </Badge>
        <span className="mono text-[11px] text-muted-foreground">
          {events.length} eventos · dispare um command p/ ver
        </span>
      </div>
      <div className="max-h-64 overflow-auto rounded-sm border border-border bg-background">
        {events.length === 0 ? (
          <p className="mono p-3 text-xs text-muted-foreground">
            aguardando eventos do mundo…
          </p>
        ) : (
          <ul>
            {events.map((event) => (
              <li
                key={`${event.sequence}-${event.correlationId}`}
                className="flex items-center gap-3 border-b border-border/60 px-3 py-2 last:border-0"
              >
                <span className="mono text-[11px] text-primary">
                  #{event.sequence}
                </span>
                <span className="font-medium text-sm text-foreground">
                  {event.eventType}
                </span>
                <span className="mono ml-auto text-[11px] text-muted-foreground">
                  {event.occurredAt.slice(11, 19)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
