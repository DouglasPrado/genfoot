"use client";

import { GrintaApiError } from "@grinta/api-client";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";

function key(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * As ações rápidas do mundo.
 *
 * O que saiu, e por quê: "Avançar 1 dia" (`world:advance-days`) morreu com o
 * `WorldScheduler`, e "Inicializar contextos" disparava onze `<ctx>:initialize`
 * que não existem mais — eram os mega-agregados (R-175). Um botão que chama
 * command inexistente não é atalho, é armadilha: ele responde REJECTED e o
 * operador fica achando que o mundo é que está errado.
 *
 * O que ficou é a vertical viva: gerar os clubes e ativar o mundo.
 */
export function QuickActions({
  worldId,
  onDone,
}: {
  worldId: string;
  onDone: () => void;
}) {
  const { api } = useSession();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  /**
   * `world:genesis` materializa os 16 clubes como linhas; `world:activate` abre
   * o mundo. Em sequência porque `activate` EXIGE a gênese materializada — ele
   * pergunta ao efeito dela, não a um blob (R-185).
   */
  async function provision() {
    setBusy(true);
    setNote(null);
    try {
      const genesis = await api.command({
        commandType: "world:genesis",
        worldId,
        idempotencyKey: key("genesis"),
      });
      if (genesis.status === "REJECTED") {
        setNote(`gênese: ${genesis.error?.code}`);
        return;
      }
      const activated = await api.command({
        commandType: "world:activate",
        worldId,
        idempotencyKey: key("activate"),
      });
      setNote(
        activated.status === "REJECTED"
          ? `ativar: ${activated.error?.code}`
          : "clubes gerados · mundo ativo",
      );
    } catch (err) {
      setNote(err instanceof GrintaApiError ? err.standard.code : "falha");
    } finally {
      setBusy(false);
      onDone();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={provision} disabled={busy}>
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        Gerar clubes e ativar
      </Button>
      {note ? (
        <span className="mono text-xs text-muted-foreground">{note}</span>
      ) : null}
    </div>
  );
}
