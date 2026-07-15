"use client";

import { CommandForm } from "@/components/command-form";
import { ContextInspector } from "@/components/context-inspector";
import { QuickInit } from "@/components/panels/quick-init";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { specFor } from "@/lib/command-specs";

export function EconomyPanel({
  worldId,
  refreshKey,
  onDone,
}: {
  worldId: string;
  refreshKey: number;
  onDone: () => void;
}) {
  const openAccount = specFor("ledger:open-account");
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Ledger do mundo</CardTitle>
          <QuickInit
            worldId={worldId}
            commandType="ledger:initialize"
            onDone={onDone}
          />
        </CardHeader>
        <CardContent>
          <ContextInspector
            worldId={worldId}
            context="ledger"
            refreshKey={refreshKey}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Abrir conta</CardTitle>
        </CardHeader>
        <CardContent>
          {openAccount ? (
            <CommandForm worldId={worldId} spec={openAccount} onDone={onDone} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
