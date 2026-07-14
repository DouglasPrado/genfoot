"use client";

import { useEffect, useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { CommandConsole } from "@/components/command-console";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/session";
import { useKnownWorlds } from "@/lib/worlds";

export default function ConsolePage() {
  const { api } = useSession();
  const { worlds } = useKnownWorlds();
  const [worldId, setWorldId] = useState("");
  const [commandTypes, setCommandTypes] = useState<readonly string[]>([]);

  useEffect(() => {
    if (worldId === "" && worlds.length > 0) setWorldId(worlds[0]!.id);
  }, [worlds, worldId]);

  useEffect(() => {
    api
      .catalog()
      .then((catalog) => setCommandTypes(catalog.commands))
      .catch(() => undefined);
  }, [api]);

  return (
    <AppShell>
      <PageHeader
        title="Console"
        hint="Terminal de commands sobre qualquer mundo."
      />
      <div className="space-y-4 p-6">
        <div className="max-w-md space-y-1.5">
          <Label htmlFor="worldId">Mundo alvo</Label>
          <Input
            id="worldId"
            value={worldId}
            onChange={(e) => setWorldId(e.target.value)}
            className="mono"
            placeholder="worldId (uuid)"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Terminal</CardTitle>
            <span className="mono text-[11px] text-muted-foreground">
              {commandTypes.length} tipos
            </span>
          </CardHeader>
          <CardContent>
            {worldId ? (
              <CommandConsole worldId={worldId} commandTypes={commandTypes} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Informe um mundo para habilitar o terminal.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
