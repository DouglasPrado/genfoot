"use client";

import { GrintaApiError } from "@grinta/api-client";
import { Clock, Pause, Play, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/session";
import {
  lifecycleActions,
  lifecycleState,
  type LifecycleAction,
} from "@/lib/world-lifecycle-model";

/**
 * Ciclo de vida do mundo: em breve → ativo → (congelado ⇄ ativo | inativo ⇄ ativo).
 *
 * Cliente não-autoritativo: os botões refletem o que o domínio aceita, mas quem
 * decide é o servidor. Uma transição recusada aparece com o código do erro — não
 * como "algo deu errado", e nunca como sucesso otimista.
 */

function key(action: string): string {
  return `lc-${action}-${Math.random().toString(36).slice(2, 10)}`;
}

export function WorldSettingsPanel({
  worldId,
  status,
  currentDate,
  expectedVersion,
  onChanged,
}: {
  worldId: string;
  status: string | null;
  currentDate: string | null;
  expectedVersion: number | null;
  onChanged: () => void;
}) {
  const { api } = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<LifecycleAction | null>(null);
  const [reason, setReason] = useState("");

  // Sem status não há o que oferecer. Um painel de ações sobre estado
  // desconhecido convida o operador a agir às cegas.
  if (status === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Carregando o estado do mundo…
      </p>
    );
  }

  const state = lifecycleState(status);
  const actions = lifecycleActions(status);

  async function run(action: LifecycleAction, withReason: string) {
    setBusy(action.key);
    setError(null);
    try {
      const response = await api.command({
        commandType: action.commandType,
        worldId,
        payload:
          action.reason && withReason.trim() !== ""
            ? { reason: withReason.trim() }
            : {},
        idempotencyKey: key(action.key),
        // O lock otimista vai junto: se alguém mexeu no mundo entre a leitura
        // desta tela e o clique, o servidor recusa em vez de sobrescrever.
        ...(expectedVersion === null ? {} : { expectedVersion }),
      });
      if (response.status === "REJECTED") {
        setError(response.error?.code ?? "REJECTED");
        return;
      }
      onChanged();
    } catch (err) {
      setError(
        err instanceof GrintaApiError ? err.standard.code : "Falha na API",
      );
    } finally {
      setBusy(null);
      setPending(null);
      setReason("");
    }
  }

  function click(action: LifecycleAction) {
    setError(null);
    if (action.confirm || action.reason) {
      setReason("");
      setPending(action);
      return;
    }
    void run(action, "");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-sm border border-border bg-surface-2/40 p-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge tone={state.tone}>{state.label}</Badge>
            {!state.known ? (
              <span className="mono text-[11px] text-muted-foreground">
                status não mapeado
              </span>
            ) : null}
          </div>
          <p className="max-w-[64ch] text-sm text-muted-foreground">
            {state.description}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          {/* O relógio é o efeito observável do estado: é o que muda entre ativo
              e congelado. Mostrar a data lógica junto torna o efeito visível. */}
          <span className="mono">{currentDate ?? "—"}</span>
          <Badge tone={state.clockRunning ? "ok" : "neutral"}>
            {state.clockRunning ? (
              <>
                <Play className="size-3" />
                andando
              </>
            ) : (
              <>
                <Pause className="size-3" />
                parado
              </>
            )}
          </Badge>
        </div>
      </div>

      {actions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma transição possível a partir de{" "}
          <span className="mono">{status}</span>.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <div key={action.key} className="flex flex-col gap-1">
              <Button
                variant={action.tone === "primary" ? undefined : action.tone}
                onClick={() => click(action)}
                disabled={busy !== null}
              >
                {busy === action.key ? "Executando…" : action.label}
              </Button>
              <span className="max-w-[30ch] text-[11px] leading-snug text-muted-foreground">
                {action.hint}
              </span>
            </div>
          ))}
        </div>
      )}

      {error !== null ? (
        // Erro NOMEADO, com o código do domínio. "Não foi possível" não diz ao
        // operador se ele errou o estado, perdeu a corrida ou perdeu a sessão.
        <p className="mono rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-semibold">Inativar não é apagar.</span> R-56 define
        o arquivamento como read-only reversível, preservando histórico, títulos e
        recordes — quem apaga é <span className="mono">world:delete</span>, na aba
        do mundo, e não tem volta. O gatilho de R-56 (≥ 2 temporadas ociosas,
        aviso de 30 dias) <span className="font-semibold">não é verificado</span>:
        não há temporada ligada nem medida de atividade para conferir. Quem julga
        o ócio é você.
      </p>

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <DialogContent>
          {pending === null ? null : (
            <>
              <div className="mb-3 flex items-center gap-2">
                {pending.confirm ? (
                  <ShieldAlert className="size-5 text-danger" />
                ) : null}
                <DialogTitle>{pending.label}</DialogTitle>
              </div>
              <DialogDescription>
                {pending.hint}{" "}
                <span className="mono text-foreground">
                  {pending.commandType}
                </span>
              </DialogDescription>

              {pending.reason ? (
                <div className="mt-4 space-y-1.5">
                  <Label htmlFor="reason">Motivo (opcional)</Label>
                  <Input
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="manutenção, incidente, 2 temporadas ociosas…"
                    autoFocus
                    maxLength={280}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Vai junto no evento e fica no histórico do mundo.
                  </p>
                </div>
              ) : null}

              <div className="mt-5 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setPending(null)}>
                  Cancelar
                </Button>
                <Button
                  variant={pending.confirm ? "danger" : undefined}
                  onClick={() => void run(pending, reason)}
                  disabled={busy !== null}
                >
                  {busy !== null ? "Executando…" : pending.label}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
