"use client";

import { GrintaApiError, type ValidationReport } from "@grinta/api-client";
import { FlaskConical, Play } from "lucide-react";
import { useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/session";

export default function LaboratorioPage() {
  const { api } = useSession();
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      setReport(await api.validation());
    } catch (err) {
      setError(err instanceof GrintaApiError ? err.standard.code : "falha");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Laboratório"
        hint="Calibração e testes de equilíbrio (VAL-001, AF-09)."
        actions={
          <Button onClick={run} disabled={busy}>
            <Play className="size-4" />
            {busy ? "Rodando…" : "Rodar smoke"}
          </Button>
        }
      />
      <div className="space-y-6 p-6">
        {error ? (
          <p className="mono rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {report === null ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <FlaskConical className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Rode o smoke manifest para ver bandas BS/BE/BD e o gate G1–G8.
                Determinístico: o mesmo manifesto reproduz o mesmo reportHash.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Relatório</CardTitle>
                <Badge tone={report.gateResult === "PASS" ? "ok" : "danger"}>
                  gate {report.gateResult}
                </Badge>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="Partidas" value={String(report.matchesExecuted)} />
                <Stat label="Cenários" value={String(report.runsExecuted)} />
                <Stat
                  label="Violações INV"
                  value={String(report.invariantViolationCount)}
                />
                <Stat label="Ruleset" value={report.rulesetVersion} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bandas vs oráculo</CardTitle>
                <span className="mono text-[11px] text-muted-foreground">
                  {report.reportHash}
                </span>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-sm border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Banda</th>
                        <th className="px-3 py-2 font-medium">Métrica</th>
                        <th className="px-3 py-2 font-medium">Observado</th>
                        <th className="px-3 py-2 font-medium">Faixa</th>
                        <th className="px-3 py-2 font-medium">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.bandEvaluations.map((band) => (
                        <tr
                          key={band.bandId}
                          className="border-b border-border/60 last:border-0"
                        >
                          <td className="mono px-3 py-2">{band.bandId}</td>
                          <td className="mono px-3 py-2 text-muted-foreground">
                            {band.metric}
                          </td>
                          <td className="mono px-3 py-2">
                            {band.observed.toFixed(3)}
                          </td>
                          <td className="mono px-3 py-2 text-muted-foreground">
                            {band.lo} – {band.hi}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              tone={band.result === "PASS" ? "ok" : "danger"}
                            >
                              {band.result}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-surface-2 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mono mt-1 text-lg text-foreground">{value}</div>
    </div>
  );
}
