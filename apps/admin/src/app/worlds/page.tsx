"use client";

import { GrintaApiError } from "@grinta/api-client";
import { ArrowRight, Plus, RefreshCw } from "lucide-react";
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
  const { worlds, loading, error: listError, refresh } = useKnownWorlds();
  const [seed, setSeed] = useState("mundo-alpha");
  const [startDate, setStartDate] = useState("2026-01-01");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // `genesis` materializa os clubes como linhas; `activate` abre o mundo e
      // EXIGE a gênese materializada — ele pergunta ao efeito dela (R-185).
      const genesis = await api.command({
        commandType: "world:genesis",
        worldId: id,
        idempotencyKey: newKey("genesis"),
      });
      if (genesis.status !== "ACCEPTED") {
        setError(`gênese: ${genesis.error?.code ?? "REJECTED"}`);
        return;
      }
      const activated = await api.command({
        commandType: "world:activate",
        worldId: id,
        idempotencyKey: newKey("activate"),
      });
      if (activated.status !== "ACCEPTED") {
        setError(`ativar: ${activated.error?.code ?? "REJECTED"}`);
        return;
      }
      setSeed(newKey("mundo"));
      // A lista vem do servidor: nada de "lembrar" localmente o que acabou de
      // ser criado — pergunta-se de novo a quem sabe.
      refresh();
    } catch (err) {
      setError(
        err instanceof GrintaApiError ? err.standard.code : "Falha na API.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Mundos"
        hint="Criar, ativar e inspecionar mundos persistentes."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className="size-4" />
            {loading ? "Carregando…" : "Atualizar"}
          </Button>
        }
      />
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_340px]">
        <section>
          <h2 className="font-heading mb-3 text-sm text-muted-foreground">
            {/* "Conhecidos pelo console" era o nome do defeito: a lista vinha do
                localStorage e mostrava mundos que já não existiam. Agora ela é o
                que o servidor tem. */}
            No servidor ({worlds.length})
          </h2>

          {listError === null ? null : (
            <Card className="mb-2">
              <CardContent className="py-3 text-sm text-danger">
                {listError}
              </CardContent>
            </Card>
          )}

          {loading && worlds.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Carregando mundos…
              </CardContent>
            </Card>
          ) : worlds.length === 0 && listError === null ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhum mundo no servidor. Crie o primeiro ao lado — ele nasce,
                recebe a gênese (16 clubes) e é ativado.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {worlds.map((world) => {
                // Nome quando o mundo tem identidade; senão o seed — nunca some
                // o que já existia. As iniciais só entram quando não há foto.
                const title = world.name ?? world.seed;
                const initials = title.trim().slice(0, 2).toUpperCase();
                return (
                  <Link key={world.id} href={`/worlds/${world.id}`}>
                    <Card className="overflow-hidden transition-colors hover:border-primary/40">
                      {/* Capa (banner). Sem ela, um degradê discreto no lugar. */}
                      {world.bannerUrl ? (
                        <div
                          className="h-24 w-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${world.bannerUrl})` }}
                        />
                      ) : (
                        <div className="h-24 w-full bg-gradient-to-br from-primary/15 to-transparent" />
                      )}
                      <CardContent className="flex items-start gap-3 py-3">
                        {/* Foto quadrada sobreposta na capa. Placeholder com
                            iniciais quando o mundo ainda não tem foto. */}
                        {world.squarePhotoUrl ? (
                          <div
                            className="-mt-10 size-12 shrink-0 rounded-md border-2 border-background bg-cover bg-center"
                            style={{
                              backgroundImage: `url(${world.squarePhotoUrl})`,
                            }}
                          />
                        ) : (
                          <div className="font-heading -mt-10 flex size-12 shrink-0 items-center justify-center rounded-md border-2 border-background bg-primary/10 text-sm text-muted-foreground">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-heading truncate text-base">
                              {title}
                            </span>
                            {/* O status REAL. Antes este selo dizia "ativo"
                                fixo, em qualquer mundo. */}
                            <Badge
                              tone={
                                world.status === "ACTIVE" ? "live" : "neutral"
                              }
                            >
                              {world.status === "ACTIVE" ? (
                                <span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" />
                              ) : null}
                              {world.status}
                            </Badge>
                          </div>
                          {world.description ? (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {world.description}
                            </p>
                          ) : null}
                          <div className="mono mt-1 truncate text-xs text-muted-foreground">
                            {world.seed} · {world.id}
                          </div>
                          <div className="mono mt-0.5 text-xs text-muted-foreground">
                            {world.clubCount} clubes
                          </div>
                        </div>
                        <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <aside>
          {/* "Abrir mundo existente" saiu: ele existia porque a lista era local e
              não enxergava o que o servidor tinha. Agora enxerga. */}
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
                <p className="mono rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {error}
                </p>
              ) : null}
              <Button className="w-full" onClick={createWorld} disabled={busy}>
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
