"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { CommandConsole } from "@/components/command-console";
import { ContextPulse } from "@/components/context-pulse";
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
  }, [api, worldId]);

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
            <CardContent className="grid grid-cols-3 gap-6">
              <Stat label="Data lógica" value={snapshot.currentDate} />
              <Stat label="Status" value={snapshot.status} />
              <Stat label="Revisão" value={`v${snapshot.version}`} />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Pulso dos contextos</CardTitle>
            <span className="mono text-[11px] text-muted-foreground">
              live = inicializado · dormant = ainda não criado
            </span>
          </CardHeader>
          <CardContent>
            <ContextPulse worldId={worldId} />
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
