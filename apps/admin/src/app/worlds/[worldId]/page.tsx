"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { CommandConsole } from "@/components/command-console";
import { ContextInspector } from "@/components/context-inspector";
import { ContextPulse, type ContextName } from "@/components/context-pulse";
import { QuickActions } from "@/components/quick-actions";
import { RealtimeFeed } from "@/components/realtime-feed";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/session";

interface WorldSnapshot {
  readonly status: string;
  readonly currentDate: string;
  readonly seed: string;
  readonly version: number;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mono mt-0.5 text-lg text-foreground">{value}</div>
    </div>
  );
}

export default function WorldDetailPage() {
  const params = useParams<{ worldId: string }>();
  const worldId = params.worldId;
  const { api } = useSession();
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [commandTypes, setCommandTypes] = useState<readonly string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContextName>("club");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let alive = true;
    api
      .query<WorldSnapshot>(worldId)
      .then((envelope) => {
        if (alive) setSnapshot(envelope.data);
      })
      .catch(() => {
        if (alive) setError("Mundo não encontrado ou API offline.");
      });
    api
      .catalog()
      .then((catalog) => {
        if (alive) setCommandTypes(catalog.commands);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [api, worldId, refreshKey]);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <AppShell>
      <PageHeader
        title={snapshot?.seed ?? "Mundo"}
        hint={worldId}
        actions={
          snapshot ? (
            <Badge tone={snapshot.status === "ACTIVE" ? "live" : "neutral"}>
              {snapshot.status}
            </Badge>
          ) : null
        }
      />
      <div className="space-y-6 p-6">
        {error ? (
          <p className="mono rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {snapshot ? (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex gap-8">
                <Stat label="Data lógica" value={snapshot.currentDate} />
                <Stat label="Status" value={snapshot.status} />
                <Stat label="Revisão" value={`v${snapshot.version}`} />
              </div>
              <QuickActions worldId={worldId} onDone={refresh} />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Feed de tempo real</CardTitle>
            <span className="mono text-[11px] text-muted-foreground">
              Socket.IO · gateway com handshake
            </span>
          </CardHeader>
          <CardContent>
            <RealtimeFeed worldId={worldId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pulso dos contextos</CardTitle>
            <span className="mono text-[11px] text-muted-foreground">
              clique para inspecionar · live = inicializado
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            <ContextPulse
              worldId={worldId}
              selected={selected}
              onSelect={setSelected}
              refreshKey={refreshKey}
            />
            <div className="rounded-sm border border-border bg-background p-4">
              <ContextInspector
                worldId={worldId}
                context={selected}
                refreshKey={refreshKey}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Console de commands</CardTitle>
            <span className="mono text-[11px] text-muted-foreground">
              {commandTypes.length} tipos · RBAC admin:* exige papel admin
            </span>
          </CardHeader>
          <CardContent>
            <CommandConsole worldId={worldId} commandTypes={commandTypes} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
