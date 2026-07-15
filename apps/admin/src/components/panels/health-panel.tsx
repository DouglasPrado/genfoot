"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/session";

interface Metric {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
}

function Stat({ metric }: { metric: Metric }) {
  return (
    <div className="rounded-sm border border-border bg-surface-2 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {metric.label}
      </div>
      <div className="mono mt-1 text-xl text-foreground">{metric.value}</div>
      {metric.hint ? (
        <div className="mono mt-0.5 text-[10px] text-muted-foreground">
          {metric.hint}
        </div>
      ) : null}
    </div>
  );
}

export function HealthPanel({
  worldId,
  refreshKey,
}: {
  worldId: string;
  refreshKey: number;
}) {
  const { api } = useSession();
  const [metrics, setMetrics] = useState<Record<string, Metric[]>>({});

  useEffect(() => {
    let alive = true;
    async function grab(context: string): Promise<Record<string, unknown> | null> {
      try {
        const env = await api.query<Record<string, unknown>>(worldId, context);
        return env.data;
      } catch {
        return null;
      }
    }
    void (async () => {
      const [players, competitions, market, staff] = await Promise.all([
        grab("players"),
        grab("competitions"),
        grab("market"),
        grab("staff"),
      ]);
      if (!alive) return;
      const num = (o: Record<string, unknown> | null, k: string) =>
        o && typeof o[k] === "number" ? String(o[k]) : "—";
      setMetrics({
        Demografia: [
          { label: "Jogadores", value: num(players, "playerCount") },
          { label: "Pessoas", value: num(players, "personCount") },
          { label: "Aposentados", value: num(players, "retiredPlayerCount") },
          {
            label: "Casos médicos",
            value: num(players, "openMedicalCaseCount"),
          },
        ],
        Estrutura: [
          {
            label: "Competições",
            value: competitions ? "ativo" : "—",
            hint: competitions ? "inicializado" : "dormant",
          },
          { label: "Mercado", value: market ? "ativo" : "—" },
          { label: "Staff", value: staff ? "ativo" : "—" },
        ],
      });
    })();
    return () => {
      alive = false;
    };
  }, [api, worldId, refreshKey]);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {Object.entries(metrics).map(([group, list]) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle>{group}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {list.map((metric) => (
                <Stat key={metric.label} metric={metric} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      {Object.keys(metrics).length === 0 ? (
        <p className="mono text-xs text-muted-foreground">carregando saúde…</p>
      ) : null}
    </div>
  );
}
