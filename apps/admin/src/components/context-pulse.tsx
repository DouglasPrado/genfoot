"use client";

import { useEffect, useState } from "react";

import { useSession } from "@/lib/session";

export const CONTEXTS = [
  "club",
  "competitions",
  "matches",
  "market",
  "ledger",
  "players",
  "staff",
  "narrative",
  "inbox",
  "admin",
  "automation",
  "eventing",
  "identity",
  "scheduler",
] as const;

export type ContextName = (typeof CONTEXTS)[number];

type Status = "live" | "dormant" | "checking";

/**
 * Pulso do mundo: um por contexto, LIVE (inicializado) ou DORMANT (ainda não
 * criado). É a leitura de sala de controle — de relance, o operador vê a saúde
 * dos 14 bounded contexts.
 */
export function ContextPulse({
  worldId,
  selected,
  onSelect,
  refreshKey = 0,
}: {
  worldId: string;
  selected?: ContextName;
  onSelect?: (context: ContextName) => void;
  refreshKey?: number;
}) {
  const { api } = useSession();
  const [status, setStatus] = useState<Record<string, Status>>({});

  useEffect(() => {
    let alive = true;
    setStatus(Object.fromEntries(CONTEXTS.map((c) => [c, "checking"])));
    for (const context of CONTEXTS) {
      api
        .query(worldId, context)
        .then(() => {
          if (alive) setStatus((s) => ({ ...s, [context]: "live" }));
        })
        .catch(() => {
          if (alive) setStatus((s) => ({ ...s, [context]: "dormant" }));
        });
    }
    return () => {
      alive = false;
    };
  }, [api, worldId, refreshKey]);

  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
      {CONTEXTS.map((context) => {
        const state = status[context] ?? "checking";
        const live = state === "live";
        const isSelected = selected === context;
        return (
          <button
            key={context}
            type="button"
            onClick={() => onSelect?.(context)}
            className={`flex items-center gap-2 rounded-sm border px-2.5 py-2 text-left transition-colors ${
              isSelected
                ? "border-primary bg-primary/15"
                : live
                  ? "border-primary/30 bg-primary/5 hover:border-primary/60"
                  : "border-border bg-surface-2 hover:border-muted-foreground/40"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                live
                  ? "live-dot bg-primary"
                  : state === "dormant"
                    ? "bg-muted-foreground/40"
                    : "bg-warn"
              }`}
            />
            <span
              className={`mono truncate text-[11px] uppercase tracking-wide ${
                live ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {context}
            </span>
          </button>
        );
      })}
    </div>
  );
}
