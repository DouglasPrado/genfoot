"use client";

import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { CommandConsole } from "@/components/command-console";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/session";
import { useKnownWorlds } from "@/lib/worlds";

const C12_COMMANDS = [
  "admin:initialize",
  "admin:record-risk",
  "admin:open-case",
  "admin:place-quarantine",
  "admin:propose-sanction",
  "admin:approve-sanction",
  "admin:request-correction",
  "admin:approve-correction",
  "admin:open-support",
  "admin:resolve-support",
];

export default function AntiAbusePage() {
  const { session } = useSession();
  const { worlds } = useKnownWorlds();
  const [worldId, setWorldId] = useState("");

  useEffect(() => {
    if (worldId === "" && worlds.length > 0) setWorldId(worlds[0]!.id);
  }, [worlds, worldId]);

  const isAdmin = session?.role === "admin";

  return (
    <AppShell>
      <PageHeader
        title="Anti-abuso"
        hint="Casos, quarentena, sanções e correções (C12)."
        actions={
          <Badge tone={isAdmin ? "live" : "danger"}>
            {isAdmin ? "admin" : "requer admin"}
          </Badge>
        }
      />
      <div className="space-y-4 p-6">
        {!isAdmin ? (
          <div className="flex items-start gap-3 rounded-sm border border-danger/40 bg-danger/10 p-4">
            <ShieldAlert className="mt-0.5 size-5 text-danger" />
            <div className="text-sm">
              <p className="font-medium text-foreground">
                Operações de anti-abuso exigem papel admin.
              </p>
              <p className="mono mt-1 text-xs text-muted-foreground">
                Saia e entre novamente com a chave de bootstrap para assumir o
                papel admin. Sem ele, os comandos admin:* retornam 403.
              </p>
            </div>
          </div>
        ) : null}

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
            <CardTitle>Console C12</CardTitle>
            <span className="mono text-[11px] text-muted-foreground">
              {C12_COMMANDS.length} comandos · SoD/quatro-olhos no domínio
            </span>
          </CardHeader>
          <CardContent>
            {worldId ? (
              <CommandConsole worldId={worldId} commandTypes={C12_COMMANDS} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Informe um mundo para habilitar o console.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
