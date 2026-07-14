"use client";

import { GrintaApiError } from "@grinta/api-client";
import { CalendarClock, Loader2, Zap } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";

const INIT_CONTEXTS = [
  "market",
  "ledger",
  "competition",
  "match",
  "staff",
  "narrative",
  "inbox",
  "admin",
  "automation",
  "identity",
  "eventing",
];

function key(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function QuickActions({
  worldId,
  onDone,
}: {
  worldId: string;
  onDone: () => void;
}) {
  const { api } = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function advanceDay() {
    setBusy("advance");
    setNote(null);
    try {
      const r = await api.command({
        commandType: "world:advance-days",
        worldId,
        payload: { days: 1 },
        idempotencyKey: key("adv"),
      });
      setNote(
        r.status === "REJECTED"
          ? `avançar dia: ${r.error?.code}`
          : "avançou 1 dia",
      );
      onDone();
    } catch (err) {
      setNote(err instanceof GrintaApiError ? err.standard.code : "falha");
    } finally {
      setBusy(null);
    }
  }

  async function initContexts() {
    setBusy("init");
    setNote(null);
    let ok = 0;
    for (const context of INIT_CONTEXTS) {
      try {
        const r = await api.command({
          commandType: `${context}:initialize`,
          worldId,
          idempotencyKey: key(`init-${context}`),
        });
        if (r.status !== "REJECTED") ok += 1;
      } catch {
        /* segue */
      }
    }
    setNote(`inicializados ${ok}/${INIT_CONTEXTS.length} contextos`);
    onDone();
    setBusy(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={advanceDay} disabled={busy !== null}>
        {busy === "advance" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CalendarClock className="size-4" />
        )}
        Avançar 1 dia
      </Button>
      <Button variant="outline" size="sm" onClick={initContexts} disabled={busy !== null}>
        {busy === "init" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Zap className="size-4" />
        )}
        Inicializar contextos
      </Button>
      {note ? (
        <span className="mono text-xs text-muted-foreground">{note}</span>
      ) : null}
    </div>
  );
}
