"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { ClubsTable, type ClubRow } from "@/components/clubs-table";
import { CommandConsole } from "@/components/command-console";
import { Mock, MockNotice } from "@/components/mock";
import { QuickActions } from "@/components/quick-actions";
import { SeasonHistory } from "@/components/season-history";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  mockCompeticoes,
  mockDinheiroCirculante,
  mockJogadores,
  mockTendencia,
} from "@/lib/mock-world";
import { useSession } from "@/lib/session";

interface WorldSnapshot {
  readonly status: string;
  readonly currentDate: string;
  readonly seed: string;
  readonly version: number;
}

function money(minor: bigint): string {
  return (Number(minor) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function Stat({
  label,
  value,
  hint,
  badge,
}: {
  label: string;
  value: string;
  hint?: string;
  badge?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          {badge}
        </div>
        <div className="mono text-2xl tabular-nums text-foreground">{value}</div>
        {hint ? (
          <div className="text-xs text-muted-foreground">{hint}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function WorldDetailPage() {
  const params = useParams<{ worldId: string }>();
  const worldId = params.worldId;
  const { api } = useSession();
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [clubs, setClubs] = useState<readonly ClubRow[]>([]);
  const [commandTypes, setCommandTypes] = useState<readonly string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let alive = true;
    api
      .query<WorldSnapshot>(worldId)
      .then((e) => {
        if (alive) setSnapshot(e.data);
      })
      .catch(() => undefined);
    // Os clubes são o ÚNICO dado real desta tela. Se a query falhar, a tabela
    // fica vazia e diz isso — não cai em mock (CLAUDE.md §5).
    api
      .query<{ clubs: readonly ClubRow[] }>(worldId, "club-detail")
      .then((e) => {
        if (alive) setClubs(e.data.clubs ?? []);
      })
      .catch(() => {
        if (alive) setClubs([]);
      });
    api
      .catalog()
      .then((c) => {
        if (alive) setCommandTypes(c.commands);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [api, worldId, refreshKey]);

  const dinheiro = mockDinheiroCirculante(worldId, clubs.length);
  const jogadores = mockJogadores(worldId, clubs.length);
  const competicoes = mockCompeticoes(worldId);
  const tendencia = mockTendencia(worldId);
  const Trend = tendencia.crescente ? TrendingUp : TrendingDown;

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
        <MockNotice reais={1} total={6} />

        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-wrap gap-8">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Data lógica
                </div>
                <div className="mono mt-0.5 text-lg">
                  {snapshot?.currentDate ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Clubes
                </div>
                <div className="mono mt-0.5 text-lg">{clubs.length}</div>
              </div>
            </div>
            <QuickActions worldId={worldId} onDone={() => setRefreshKey((k) => k + 1)} />
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Dinheiro circulante"
            value={money(dinheiro)}
            hint="soma do razão de todos os clubes"
            badge={<Mock contexto="C9 razão" />}
          />
          <Stat
            label="Tendência do mundo"
            value={`${tendencia.crescente ? "+" : "−"}${tendencia.percentual.toFixed(1)}%`}
            hint={tendencia.crescente ? "economia crescente" : "economia decrescente"}
            badge={<Mock contexto="C9 razão" />}
          />
          <Stat
            label="Campeonatos rodando"
            value={String(competicoes.rodando)}
            hint={`temporada ${competicoes.temporada} · rodada ${competicoes.rodada}/${competicoes.totalRodadas}`}
            badge={<Mock contexto="C7 competições" />}
          />
          <Stat
            label="Jogadores em clubes"
            value={jogadores.emClubes.toLocaleString("pt-BR")}
            hint={`${jogadores.livres} livres · ${jogadores.base} na base`}
            badge={<Mock contexto="C4 jogadores" />}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                Tendência
                <Trend
                  className={
                    tendencia.crescente
                      ? "size-4 text-[color:var(--ok)]"
                      : "size-4 text-[color:var(--danger)]"
                  }
                />
              </span>
            </CardTitle>
            <Mock contexto="C9 razão + C10 torcida" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              O mundo está{" "}
              <span
                className={
                  tendencia.crescente
                    ? "font-semibold text-[color:var(--ok)]"
                    : "font-semibold text-[color:var(--danger)]"
                }
              >
                {tendencia.crescente ? "crescente" : "decrescente"}
              </span>{" "}
              ({tendencia.percentual.toFixed(1)}%). Crescente/decrescente é
              medida de economia — o razão diz se entra mais do que sai —
              cruzada com torcida. Sem C9 não há como saber, nem aproximar com
              honestidade.
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="clubes">
          <TabsList>
            <TabsTrigger value="clubes">Clubes</TabsTrigger>
            <TabsTrigger value="temporadas">Temporadas</TabsTrigger>
            <TabsTrigger value="console">Console</TabsTrigger>
          </TabsList>

          <TabsContent value="clubes">
            <Card>
              <CardHeader>
                <CardTitle>Clubes do mundo</CardTitle>
                <Badge tone="ok">dado real · Postgres</Badge>
              </CardHeader>
              <CardContent>
                <ClubsTable clubs={clubs} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="temporadas">
            <Card>
              <CardHeader>
                <CardTitle>Resultado por temporada</CardTitle>
                <Mock contexto="C7 competições + C5 partidas" />
              </CardHeader>
              <CardContent>
                <SeasonHistory
                  worldId={worldId}
                  clubs={clubs}
                  ateTemporada={competicoes.temporada}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="console">
            <Card>
              <CardHeader>
                <CardTitle>Console de commands</CardTitle>
                <span className="mono text-[11px] text-muted-foreground">
                  {commandTypes.length} tipos
                </span>
              </CardHeader>
              <CardContent>
                <CommandConsole worldId={worldId} commandTypes={commandTypes} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
