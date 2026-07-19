"use client";

import { GrintaApiError, type GrintaClient } from "@grinta/api-client";
import {
  commandRisk,
  requiresConfirmation,
  type CommandRisk,
} from "@grinta/design-system";
import { CornerDownLeft, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/lib/session";

interface LogLine {
  readonly id: number;
  readonly command: string;
  readonly text: string;
}

function newKey(): string {
  return `con-${Math.random().toString(36).slice(2, 10)}`;
}

const RISK_TONE: Record<CommandRisk, "neutral" | "warn" | "danger"> = {
  low: "neutral",
  medium: "neutral",
  high: "warn",
  irreversible: "danger",
};

/**
 * Console de commands: terminal do operador. Comandos de alto risco/irreversíveis
 * exigem confirmação proporcional (T017); comandos admin:* exigem reautenticação
 * (step-up com a chave, T016). Cliente não-autoritativo — a verdade fica no servidor.
 */
export function CommandConsole({
  worldId,
  commandTypes,
}: {
  worldId: string;
  commandTypes: readonly string[];
}) {
  const { api, session, stepUp } = useSession();
  const { error: showError } = useToast();
  const [commandType, setCommandType] = useState("world:advance-days");
  const [payload, setPayload] = useState('{ "days": 1 }');
  const [expectedVersion, setExpectedVersion] = useState("");
  const [log, setLog] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reauthKey, setReauthKey] = useState("");
  const counter = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  function append(command: string, text: string) {
    counter.current += 1;
    setLog((l) => [...l, { id: counter.current, command, text }]);
  }

  function parsePayload(): Record<string, unknown> | null {
    try {
      return payload.trim()
        ? (JSON.parse(payload) as Record<string, unknown>)
        : {};
    } catch {
      return null;
    }
  }

  async function execute(client: GrintaClient) {
    setBusy(true);
    const parsed = parsePayload();
    if (parsed === null) {
      showError("Payload JSON inválido.");
      setBusy(false);
      return;
    }
    try {
      const response = await client.command({
        commandType,
        worldId,
        payload: parsed,
        idempotencyKey: newKey(),
        ...(expectedVersion
          ? { expectedVersion: Number(expectedVersion) }
          : {}),
      });
      if (response.status === "REJECTED") {
        showError(response.error?.code ?? "REJECTED");
        return;
      }
      append(commandType, JSON.stringify(response, null, 2));
    } catch (err) {
      showError(
        err instanceof GrintaApiError ? err.standard.code : "Falha na API",
      );
    } finally {
      setBusy(false);
    }
  }

  function run() {
    if (parsePayload() === null) {
      showError("Payload JSON inválido.");
      return;
    }
    if (requiresConfirmation(commandType)) {
      setReauthKey("");
      setConfirmOpen(true);
      return;
    }
    void execute(api);
  }

  const needsReauth =
    commandType.startsWith("admin:") && session?.role === "admin";

  async function confirmAndRun() {
    if (needsReauth) {
      if (!reauthKey) {
        showError("Digite a chave admin para reautenticar.");
        return;
      }
      try {
        const stepped = await stepUp(reauthKey);
        setConfirmOpen(false);
        await execute(stepped);
        return;
      } catch (err) {
        showError(
          err instanceof GrintaApiError ? err.standard.code : "reauth falhou",
        );
        return;
      }
    }
    setConfirmOpen(false);
    await execute(api);
  }

  const risk = commandRisk(commandType);

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-[220px] flex-1 overflow-auto rounded-sm border border-border bg-background p-3">
        {log.length === 0 ? (
          <p className="mono text-xs text-muted-foreground">
            $ pronto. Escolha um commandType e dispare — 136 comandos
            disponíveis.
          </p>
        ) : (
          log.map((line) => (
            <div key={line.id} className="mb-3">
              <div className="mono text-[11px] text-muted-foreground">
                <span className="text-primary">$</span> {line.command}
              </div>
              <pre className="mono mt-1 whitespace-pre-wrap text-[11px] text-foreground">
                {line.text}
              </pre>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2">
          <Input
            list="command-types"
            value={commandType}
            onChange={(e) => setCommandType(e.target.value)}
            className="mono"
            placeholder="commandType"
            aria-label="Tipo de command"
          />
          {risk !== "low" && risk !== "medium" ? (
            <Badge tone={RISK_TONE[risk]}>{risk}</Badge>
          ) : null}
        </div>
        <datalist id="command-types">
          {commandTypes.map((type) => (
            <option key={type} value={type} />
          ))}
        </datalist>
        <div className="grid grid-cols-[1fr_120px] gap-2">
          <Input
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            className="mono"
            placeholder='{ "days": 1 }'
            aria-label="Payload JSON"
          />
          <Input
            value={expectedVersion}
            onChange={(e) => setExpectedVersion(e.target.value)}
            className="mono"
            placeholder="expVersion"
            aria-label="expectedVersion"
          />
        </div>
        <Button className="w-full" onClick={run} disabled={busy}>
          <CornerDownLeft className="size-4" />
          {busy ? "Executando…" : "Disparar command"}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="size-5 text-danger" />
            <DialogTitle>Confirmar comando {risk}</DialogTitle>
          </div>
          <DialogDescription>
            <span className="mono text-foreground">{commandType}</span> é{" "}
            {risk === "irreversible" ? "irreversível" : "de alto risco"}. A
            autoridade é do backend; confirme para prosseguir.
          </DialogDescription>

          {needsReauth ? (
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="reauth">Reautenticação — chave admin</Label>
              <Input
                id="reauth"
                type="password"
                value={reauthKey}
                onChange={(e) => setReauthKey(e.target.value)}
                className="mono"
                autoFocus
              />
            </div>
          ) : null}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmAndRun} disabled={busy}>
              Confirmar e disparar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
