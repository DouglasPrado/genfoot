"use client";

import { Zap } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";

/** Botão que roda um `<ctx>:initialize` (ou outro command sem payload). */
export function QuickInit({
  worldId,
  commandType,
  label = "Inicializar",
  onDone,
}: {
  worldId: string;
  commandType: string;
  label?: string;
  onDone: () => void;
}) {
  const { api } = useSession();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    try {
      const r = await api.command({
        commandType,
        worldId,
        idempotencyKey: `qi-${Math.random().toString(36).slice(2, 10)}`,
      });
      setNote(r.status === "REJECTED" ? (r.error?.code ?? "REJECTED") : "ok");
      onDone();
    } catch {
      setNote("falha");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={run} disabled={busy}>
        <Zap className="size-3.5" />
        {busy ? "…" : label}
      </Button>
      {note ? (
        <span className="mono text-[11px] text-muted-foreground">{note}</span>
      ) : null}
    </div>
  );
}
