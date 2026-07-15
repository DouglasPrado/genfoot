"use client";

import { CommandForm } from "@/components/command-form";
import { ContextInspector } from "@/components/context-inspector";
import { QuickInit } from "@/components/panels/quick-init";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { specFor } from "@/lib/command-specs";

export function CompetitionsPanel({
  worldId,
  refreshKey,
  onDone,
}: {
  worldId: string;
  refreshKey: number;
  onDone: () => void;
}) {
  const record = specFor("competition:record-result");
  const homologate = specFor("competition:homologate");
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Competições</CardTitle>
          <QuickInit
            worldId={worldId}
            commandType="competition:initialize"
            onDone={onDone}
          />
        </CardHeader>
        <CardContent>
          <ContextInspector
            worldId={worldId}
            context="competitions"
            refreshKey={refreshKey}
          />
        </CardContent>
      </Card>
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Registrar resultado</CardTitle>
          </CardHeader>
          <CardContent>
            {record ? (
              <CommandForm worldId={worldId} spec={record} onDone={onDone} />
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Homologar (fim de temporada)</CardTitle>
            <span className="mono text-[11px] text-muted-foreground">
              AF-08
            </span>
          </CardHeader>
          <CardContent>
            {homologate ? (
              <CommandForm worldId={worldId} spec={homologate} onDone={onDone} />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
