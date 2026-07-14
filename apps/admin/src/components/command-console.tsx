"use client";

import { GrintaApiError } from "@grinta/api-client";
import { CornerDownLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/session";

interface LogLine {
  readonly id: number;
  readonly command: string;
  readonly ok: boolean;
  readonly text: string;
}

function newKey(): string {
  return `con-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Console de commands: terminal do operador. Digita commandType + payload JSON,
 * dispara pela API (idempotente) e registra ACCEPTED/REJECTED/erro no log mono.
 * Cliente não-autoritativo — a verdade fica no servidor.
 */
export function CommandConsole({
  worldId,
  commandTypes,
}: {
  worldId: string;
  commandTypes: readonly string[];
}) {
  const { api } = useSession();
  const [commandType, setCommandType] = useState("world:advance-days");
  const [payload, setPayload] = useState('{ "days": 1 }');
  const [expectedVersion, setExpectedVersion] = useState("");
  const [log, setLog] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const counter = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  function append(command: string, ok: boolean, text: string) {
    counter.current += 1;
    setLog((l) => [...l, { id: counter.current, command, ok, text }]);
  }

  async function run() {
    setBusy(true);
    let parsedPayload: Record<string, unknown> = {};
    try {
      parsedPayload = payload.trim()
        ? (JSON.parse(payload) as Record<string, unknown>)
        : {};
    } catch {
      append(commandType, false, "payload JSON inválido");
      setBusy(false);
      return;
    }
    try {
      const response = await api.command({
        commandType,
        worldId,
        payload: parsedPayload,
        idempotencyKey: newKey(),
        ...(expectedVersion
          ? { expectedVersion: Number(expectedVersion) }
          : {}),
      });
      append(
        commandType,
        response.status !== "REJECTED",
        JSON.stringify(response, null, 2),
      );
    } catch (err) {
      append(
        commandType,
        false,
        err instanceof GrintaApiError
          ? JSON.stringify(err.standard, null, 2)
          : "Falha na API",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-[220px] flex-1 overflow-auto rounded-sm border border-border bg-background p-3">
        {log.length === 0 ? (
          <p className="mono text-xs text-muted-foreground">
            $ pronto. Escolha um commandType e dispare — 136 comandos disponíveis.
          </p>
        ) : (
          log.map((line) => (
            <div key={line.id} className="mb-3">
              <div className="mono text-[11px] text-muted-foreground">
                <span className="text-primary">$</span> {line.command}
              </div>
              <pre
                className={`mono mt-1 whitespace-pre-wrap text-[11px] ${
                  line.ok ? "text-foreground" : "text-danger"
                }`}
              >
                {line.text}
              </pre>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-3 space-y-2">
        <Input
          list="command-types"
          value={commandType}
          onChange={(e) => setCommandType(e.target.value)}
          className="mono"
          placeholder="commandType"
        />
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
          />
          <Input
            value={expectedVersion}
            onChange={(e) => setExpectedVersion(e.target.value)}
            className="mono"
            placeholder="expVersion"
          />
        </div>
        <Button className="w-full" onClick={run} disabled={busy}>
          <CornerDownLeft className="size-4" />
          {busy ? "Executando…" : "Disparar command"}
        </Button>
      </div>
    </div>
  );
}
