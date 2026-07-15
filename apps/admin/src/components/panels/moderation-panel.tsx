"use client";

import { CommandForm } from "@/components/command-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { specFor } from "@/lib/command-specs";

const GROUPS: { title: string; hint: string; commands: string[] }[] = [
  {
    title: "Detecção & contenção",
    hint: "AF-04 — sinal de risco, caso, quarentena",
    commands: ["admin:record-risk", "admin:open-case", "admin:place-quarantine"],
  },
  {
    title: "Sanções (quatro-olhos)",
    hint: "AF-05 — propor e aprovar por operadores distintos",
    commands: ["admin:propose-sanction", "admin:approve-sanction"],
  },
  {
    title: "Correções & reprocessamento",
    hint: "AF-03/07 — correção compensatória append-only",
    commands: [
      "admin:request-correction",
      "admin:approve-correction",
      "admin:request-reprocessing",
    ],
  },
  {
    title: "Recurso & suporte",
    hint: "AF-06 — recurso e atendimento",
    commands: [
      "admin:file-appeal",
      "admin:decide-appeal",
      "admin:open-support",
      "admin:resolve-support",
    ],
  },
];

export function ModerationPanel({ worldId }: { worldId: string }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {GROUPS.map((group) => (
        <Card key={group.title}>
          <CardHeader>
            <CardTitle>{group.title}</CardTitle>
            <span className="mono text-[11px] text-muted-foreground">
              {group.hint}
            </span>
          </CardHeader>
          <CardContent className="space-y-6">
            {group.commands.map((commandType) => {
              const spec = specFor(commandType);
              if (!spec) return null;
              return (
                <div key={commandType}>
                  <div className="mono mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {commandType}
                  </div>
                  <CommandForm worldId={worldId} spec={spec} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
