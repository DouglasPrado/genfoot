import { useEffect, useRef, useState } from "react";
import {
  RealtimeApply,
  RealtimeRecoveryCursor,
  type RealtimeRecoveryStatus,
} from "@grinta/core";
import { io, type Socket } from "socket.io-client";

import { API_BASE_URL } from "@/lib/config";
import { useSession } from "@/lib/session";

export interface MobileRealtimeEvent {
  readonly eventId: string;
  readonly worldId: string;
  readonly streamId: string;
  readonly sequence: number;
  readonly resumeToken: string;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly occurredAt: string;
  readonly correlationId: string;
  readonly payload: Record<string, unknown>;
}

interface SubscribeOutcome {
  readonly subscribed: string | null;
  readonly lastSequence: number;
  readonly resumeToken: string | null;
}

interface ResyncOutcome {
  readonly mode: "delta" | "snapshot";
  readonly events: readonly MobileRealtimeEvent[];
  readonly lastSequence: number;
  readonly resumeToken: string;
  readonly reason?: string;
}

export interface MobileRealtimeState {
  readonly status: RealtimeRecoveryStatus;
  readonly lastSequence: number;
  readonly events: readonly MobileRealtimeEvent[];
  readonly snapshotRevision: number;
}

const EMPTY_STATE: MobileRealtimeState = {
  status: "CONNECTING",
  lastSequence: 0,
  events: [],
  snapshotRevision: 0,
};

/**
 * Transporte realtime oficial do mobile. O socket nunca é fonte de verdade:
 * eventos contíguos aceleram a UI; duplicatas são ignoradas; gaps pausam a
 * aplicação e pedem delta. Se o buffer não cobre o gap, uma query oficial é
 * feita antes de o cursor retomar do snapshot informado pelo gateway.
 */
export function useMobileRealtime(worldId: string): MobileRealtimeState {
  const { client, session } = useSession();
  const [state, setState] = useState<MobileRealtimeState>(EMPTY_STATE);
  const cursorRef = useRef(new RealtimeRecoveryCursor());
  const resumeTokenRef = useRef<string | null>(null);
  const recoveringRef = useRef(false);

  useEffect(() => {
    if (client === null || session === null) return;

    const cursor = cursorRef.current;
    let active = true;
    const socket: Socket = io(`${API_BASE_URL}/realtime`, {
      auth: { token: session.token },
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    const publishCursor = (
      events?: readonly MobileRealtimeEvent[],
      snapshot = false,
    ) => {
      if (!active) return;
      const current = cursor.snapshot();
      setState((previous) => ({
        status: current.status,
        lastSequence: current.lastSequence,
        events:
          events === undefined
            ? previous.events
            : [...events.slice().reverse(), ...previous.events]
                .filter(
                  (event, index, all) =>
                    all.findIndex(
                      (candidate) => candidate.eventId === event.eventId,
                    ) === index,
                )
                .slice(0, 60),
        snapshotRevision: previous.snapshotRevision + (snapshot ? 1 : 0),
      }));
    };

    const recover = () => {
      if (recoveringRef.current || !active) return;
      recoveringRef.current = true;
      const before = cursor.startRecovery();
      publishCursor();
      socket.emit(
        "resync",
        {
          worldId,
          fromSequence: before.lastSequence,
          ...(resumeTokenRef.current === null
            ? {}
            : { resumeToken: resumeTokenRef.current }),
        },
        (outcome: ResyncOutcome) => {
          void (async () => {
            try {
              if (!active) return;
              if (outcome.mode === "delta") {
                const next = cursor.applyDelta(
                  outcome.events.map((event) => event.sequence),
                );
                resumeTokenRef.current = outcome.resumeToken;
                publishCursor(outcome.events);
                // Um delta descontínuo continua em GAP e precisa do snapshot.
                if (next.status === "GAP") {
                  await client.query(worldId);
                  cursor.replaceFromSnapshot(outcome.lastSequence);
                  publishCursor(undefined, true);
                }
              } else {
                await client.query(worldId);
                cursor.replaceFromSnapshot(outcome.lastSequence);
                resumeTokenRef.current = outcome.resumeToken;
                publishCursor(undefined, true);
              }
            } catch {
              cursor.markOffline();
              publishCursor();
            } finally {
              recoveringRef.current = false;
            }
          })();
        },
      );
    };

    socket.on("connect", () => {
      socket.emit("subscribe", { worldId }, (outcome: SubscribeOutcome) => {
        if (!active || outcome.subscribed !== worldId) return;
        const local = cursor.snapshot().lastSequence;
        if (outcome.lastSequence > local) {
          recover();
          return;
        }
        cursor.replaceFromSnapshot(local);
        resumeTokenRef.current = outcome.resumeToken;
        publishCursor();
      });
    });

    socket.on("event", (event: MobileRealtimeEvent) => {
      if (!active || event.worldId !== worldId) return;
      const result = cursor.receive(event.sequence);
      if (result.result === RealtimeApply.APPLIED) {
        resumeTokenRef.current = event.resumeToken;
        publishCursor([event]);
      } else if (result.result === RealtimeApply.GAP) {
        publishCursor();
        recover();
      }
    });
    socket.on("disconnect", () => {
      cursor.markOffline();
      publishCursor();
    });
    socket.on("unauthorized", () => {
      cursor.markOffline();
      publishCursor();
    });

    return () => {
      active = false;
      recoveringRef.current = false;
      socket.disconnect();
    };
  }, [client, session, worldId]);

  return state;
}
