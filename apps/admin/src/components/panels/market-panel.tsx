"use client";

import { ContextInspector } from "@/components/context-inspector";
import { QuickInit } from "@/components/panels/quick-init";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MarketPanel({
  worldId,
  refreshKey,
  onDone,
}: {
  worldId: string;
  refreshKey: number;
  onDone: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mercado</CardTitle>
        <QuickInit
          worldId={worldId}
          commandType="market:initialize"
          onDone={onDone}
        />
      </CardHeader>
      <CardContent>
        <ContextInspector
          worldId={worldId}
          context="market"
          refreshKey={refreshKey}
        />
        <p className="mono mt-3 text-[11px] text-muted-foreground">
          Transferências (SAGA-01), empréstimos, listings e negociação estão no
          Console (13 comandos market:*); refs de jogador/clube via query.
        </p>
      </CardContent>
    </Card>
  );
}
