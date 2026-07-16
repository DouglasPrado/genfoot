"use client";

import { GrintaApiError } from "@grinta/api-client";
import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/session";
import { useKnownWorlds } from "@/lib/worlds";

function newKey(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function WorldsPage() {
  const { api } = useSession();
  const { worlds, remember } = useKnownWorlds();
  const [seed, setSeed] = useState("mundo-alpha");
  const [startDate, setStartDate] = useState("2026-01-01");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState("");
  const [openError, setOpenError] = useState<string | null>(null);

  async function createWorld() {
    setBusy(true);
    setError(null);
    try {
      const created = await api.command({
        commandType: "world:create",
        payload: { seed, startDate },
        idempotencyKey: newKey("create"),
      });
      if (created.status !== "ACCEPTED" || !created.resource) {
        setError(created.error?.code ?? "REJECTED");
        return;
      }
      const id = created.resource.slice("world:".length);
      await api.command({
        commandType: "world:genesis",
        worldId: id,
        idempotencyKey: newKey("genesis"),
      });
      await api.command({
        commandType: "world:activate",
        worldId: id,
        idempotencyKey: newKey("activate"),
      });
      remember({ id, seed });
      setSeed(newKey("mundo"));
    } catch (err) {
      setError(
        err instanceof GrintaApiError ? err.standard.code : "Falha na API.",
      );
    } finally {
      setBusy(false);
    }
  }

  // Registra um mundo que já existe na API mas este navegador não conhece —
  // ex.: o mundo demo criado pelo seed. Valida antes de lembrar.
  async function openExisting() {
    const id = openId.trim();
    if (id === "") return;
    setOpenError(null);
    try {
      const env = await api.query<{ seed?: string }>(id);
      remember({ id, seed: env.data?.seed ?? "externo" });
      setOpenId("");
    } catch {
      setOpenError("Mundo não encontrado na API.");
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Mundos"
        hint="Criar, ativar e inspecionar mundos persistentes."
      />
      <div className="grid grid-cols-[1fr_340px] gap-6 p-6">
        <section>
          <h2 className="font-heading mb-3 text-sm text-muted-foreground">
            Conhecidos pelo console ({worlds.length})
          </h2>
          {worlds.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhum mundo ainda. Crie o primeiro ao lado — ele nasce, recebe
                a gênese (16 clubes, 240 jogos) e é ativado.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {worlds.map((world) => (
                <Link key={world.id} href={`/worlds/${world.id}`}>
                  <Card className="transition-colors hover:border-primary/40">
                    <CardContent className="flex items-center justify-between py-3">
                      <div>
                        <div className="font-heading text-base">
                          {world.seed}
                        </div>
                        <div className="mono text-xs text-muted-foreground">
                          {world.id}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge tone="live">
                          <span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" />
                          ativo
                        </Badge>
                        <ArrowRight className="size-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-3">
              <h2 className="font-heading text-sm">Abrir mundo existente</h2>
              <div className="space-y-1.5">
                <Label htmlFor="openId">World ID</Label>
                <Input
                  id="openId"
                  value={openId}
                  onChange={(e) => setOpenId(e.target.value)}
                  placeholder="019f6bc4-…"
                  className="mono"
                />
              </div>
              {openError === null ? null : (
                <p className="text-xs text-red-400">{openError}</p>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => void openExisting()}
              >
                Abrir
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4">
              <h2 className="font-heading text-sm">Novo mundo</h2>
              <div className="space-y-1.5">
                <Label htmlFor="seed">Seed</Label>
                <Input
                  id="seed"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  className="mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Data inicial</Label>
                <Input
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mono"
                />
              </div>
              {error ? (
                <p className="mono rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              ) : null}
              <Button
                className="w-full"
                onClick={createWorld}
                disabled={busy}
              >
                <Plus className="size-4" />
                {busy ? "Provisionando…" : "Criar + gênese + ativar"}
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
