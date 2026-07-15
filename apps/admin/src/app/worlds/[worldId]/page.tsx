"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { CommandConsole } from "@/components/command-console";
import { ContextInspector } from "@/components/context-inspector";
import { ContextPulse, type ContextName } from "@/components/context-pulse";
import { CompetitionsPanel } from "@/components/panels/competitions-panel";
import { EconomyPanel } from "@/components/panels/economy-panel";
import { HealthPanel } from "@/components/panels/health-panel";
import { ModerationPanel } from "@/components/panels/moderation-panel";
import { QuickActions } from "@/components/quick-actions";
import { RealtimeFeed } from "@/components/realtime-feed";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const { api, session } = useSession();
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [commandTypes, setCommandTypes] = useState<readonly string[]>([]);
  const [selected, setSelected] = useState<ContextName>("club");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let alive = true;
    api
      .query<WorldSnapshot>(worldId)
      .then((envelope) => {
        if (alive) setSnapshot(envelope.data);
      })
      .catch(() => undefined);
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

  const isAdmin = session?.role === "admin";

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
      <div className="p-6">
        {snapshot ? (
          <Card className="mb-6">
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

        <Tabs defaultValue="painel">
          <TabsList>
            <TabsTrigger value="painel">Painel</TabsTrigger>
            <TabsTrigger value="economia">Economia</TabsTrigger>
            <TabsTrigger value="competicoes">Competições</TabsTrigger>
            {isAdmin ? <TabsTrigger value="moderacao">Moderação</TabsTrigger> : null}
            <TabsTrigger value="console">Console</TabsTrigger>
          </TabsList>

          <TabsContent value="painel">
            <div className="space-y-6">
              <HealthPanel worldId={worldId} refreshKey={refreshKey} />
              <Card>
                <CardHeader>
                  <CardTitle>Feed de tempo real</CardTitle>
                  <span className="mono text-[11px] text-muted-foreground">
                    Socket.IO · handshake
                  </span>
                </CardHeader>
                <CardContent>
                  <RealtimeFeed worldId={worldId} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="economia">
            <EconomyPanel
              worldId={worldId}
              refreshKey={refreshKey}
              onDone={refresh}
            />
          </TabsContent>

          <TabsContent value="competicoes">
            <CompetitionsPanel
              worldId={worldId}
              refreshKey={refreshKey}
              onDone={refresh}
            />
          </TabsContent>

          {isAdmin ? (
            <TabsContent value="moderacao">
              <ModerationPanel worldId={worldId} />
            </TabsContent>
          ) : null}

          <TabsContent value="console">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pulso dos contextos</CardTitle>
                  <span className="mono text-[11px] text-muted-foreground">
                    clique para inspecionar
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
                    {commandTypes.length} tipos · reauth em admin:*
                  </span>
                </CardHeader>
                <CardContent>
                  <CommandConsole
                    worldId={worldId}
                    commandTypes={commandTypes}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
