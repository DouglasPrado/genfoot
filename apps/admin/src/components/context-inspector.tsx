"use client";

import { GrintaApiError } from "@grinta/api-client";
import { useEffect, useState } from "react";

import type { ContextName } from "@/components/context-pulse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";

interface ClubData {
  clubs?: { id: string; identity?: { name?: string; shortCode?: string } }[];
}

function isScalar(value: unknown): boolean {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function ScalarGrid({ data }: { data: Record<string, unknown> }) {
  const scalars = Object.entries(data).filter(([, v]) => isScalar(v));
  const collections = Object.entries(data).filter(
    ([, v]) => Array.isArray(v),
  ) as [string, unknown[]][];

  return (
    <div className="space-y-4">
      {scalars.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {scalars.map(([key, value]) => (
            <div key={key} className="rounded-sm border border-border bg-surface-2 p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {key}
              </div>
              <div className="mono mt-0.5 truncate text-sm text-foreground">
                {String(value)}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {collections.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {collections.map(([key, arr]) => (
            <Badge key={key} tone="neutral">
              {key}: {arr.length}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ClubsTable({ data }: { data: ClubData }) {
  const clubs = data.clubs ?? [];
  return (
    <div className="overflow-x-auto rounded-sm border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Clube</th>
            <th className="px-3 py-2 font-medium">Código</th>
            <th className="px-3 py-2 font-medium">ID</th>
          </tr>
        </thead>
        <tbody>
          {clubs.map((club) => (
            <tr key={club.id} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-2 font-medium">
                {club.identity?.name ?? "—"}
              </td>
              <td className="mono px-3 py-2 text-muted-foreground">
                {club.identity?.shortCode ?? "—"}
              </td>
              <td className="mono px-3 py-2 text-xs text-muted-foreground">
                {club.id.slice(0, 8)}…
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ContextInspector({
  worldId,
  context,
  refreshKey = 0,
}: {
  worldId: string;
  context: ContextName;
  refreshKey?: number;
}) {
  const { api } = useSession();
  const [data, setData] = useState<unknown>(null);
  const [state, setState] = useState<"loading" | "ok" | "dormant" | "error">(
    "loading",
  );
  const [raw, setRaw] = useState(false);

  useEffect(() => {
    let alive = true;
    setState("loading");
    api
      .query(worldId, context)
      .then((envelope) => {
        if (!alive) return;
        setData(envelope.data);
        setState("ok");
      })
      .catch((err) => {
        if (!alive) return;
        setState(err instanceof GrintaApiError && err.status === 404 ? "dormant" : "error");
      });
    return () => {
      alive = false;
    };
  }, [api, worldId, context, refreshKey]);

  if (state === "loading") {
    return <p className="mono text-xs text-muted-foreground">carregando {context}…</p>;
  }
  if (state === "dormant") {
    return (
      <p className="text-sm text-muted-foreground">
        Contexto <span className="mono text-foreground">{context}</span> ainda
        não inicializado. Rode{" "}
        <span className="mono text-primary">{context}:initialize</span> no
        console.
      </p>
    );
  }
  if (state === "error") {
    return <p className="mono text-xs text-danger">falha ao consultar {context}</p>;
  }

  const record =
    typeof data === "object" && data !== null
      ? (data as Record<string, unknown>)
      : {};

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-heading text-sm text-foreground">{context}</span>
        <Button variant="ghost" size="sm" onClick={() => setRaw((r) => !r)}>
          {raw ? "Ver resumo" : "Ver JSON"}
        </Button>
      </div>
      {raw ? (
        <pre className="mono max-h-96 overflow-auto rounded-sm border border-border bg-background p-3 text-[11px] text-foreground">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : context === "club" ? (
        <ClubsTable data={record as ClubData} />
      ) : (
        <ScalarGrid data={record} />
      )}
    </div>
  );
}
