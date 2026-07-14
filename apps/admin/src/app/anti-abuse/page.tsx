"use client";

import { ShieldAlert, ShieldCheck, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
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
  const { session, hydrated } = useSession();
  const { worlds } = useKnownWorlds();
  const router = useRouter();
  const [worldId, setWorldId] = useState("");

  const isAdmin = session?.role === "admin";

  // RBAC: bloqueia a UX para quem não é admin (backend também nega — US3/cenário 2).
  useEffect(() => {
    if (hydrated && session !== null && !isAdmin) router.replace("/worlds");
  }, [hydrated, session, isAdmin, router]);

  useEffect(() => {
    if (worldId === "" && worlds.length > 0) setWorldId(worlds[0]!.id);
  }, [worlds, worldId]);

  if (!hydrated || session === null) return null;
  if (!isAdmin) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <ShieldAlert className="size-5 text-danger" />
            <span>Acesso restrito a operadores admin. Redirecionando…</span>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Anti-abuso"
        hint="Casos, quarentena, sanções e correções (C12) — quatro-olhos."
        actions={<Badge tone="live">admin</Badge>}
      />
      <div className="space-y-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Fluxo quatro-olhos (SoD)</CardTitle>
            <span className="mono text-[11px] text-muted-foreground">
              autoridade no backend
            </span>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 sm:grid-cols-3">
              <li className="rounded-sm border border-border bg-surface-2 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="mono text-primary">1</span>
                  <UserCheck className="size-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Propor</span>
                </div>
                <p className="mono text-[11px] text-muted-foreground">
                  admin:propose-sanction / request-correction — operador A.
                </p>
              </li>
              <li className="rounded-sm border border-border bg-surface-2 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="mono text-primary">2</span>
                  <ShieldCheck className="size-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Aprovar</span>
                </div>
                <p className="mono text-[11px] text-muted-foreground">
                  admin:approve-sanction / approve-correction — operador B ≠ A.
                </p>
              </li>
              <li className="rounded-sm border border-border bg-surface-2 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="mono text-primary">3</span>
                  <ShieldAlert className="size-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Auditar</span>
                </div>
                <p className="mono text-[11px] text-muted-foreground">
                  hash-chain append-only; o backend recusa o mesmo ator nos dois
                  passos.
                </p>
              </li>
            </ol>
          </CardContent>
        </Card>

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
              {C12_COMMANDS.length} comandos · reauth exigido em admin:*
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
