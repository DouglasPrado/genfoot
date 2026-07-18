"use client";

import { GrintaApiError, type GrintaClient } from "@grinta/api-client";
import { requiresConfirmation } from "@grinta/design-system";
import { useState } from "react";

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
import type { CommandSpec, FieldSpec } from "@/lib/command-specs";

type Value = string | boolean;

function initialValues(
  spec: CommandSpec,
  actor: string,
): Record<string, Value> {
  const values: Record<string, Value> = {};
  for (const field of spec.fields) {
    if (field.kind === "checkbox") values[field.name] = false;
    else if (field.actor) values[field.name] = actor;
    else
      values[field.name] =
        field.defaultValue !== undefined ? String(field.defaultValue) : "";
  }
  return values;
}

function buildPayload(
  spec: CommandSpec,
  values: Record<string, Value>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of spec.fields) {
    const raw = values[field.name];
    if (field.kind === "checkbox") {
      payload[field.name] = Boolean(raw);
      continue;
    }
    const str = String(raw ?? "").trim();
    if (str === "") {
      if (!field.optional) payload[field.name] = "";
      continue;
    }
    if (field.kind === "number") payload[field.name] = Number(str);
    else if (field.kind === "list")
      payload[field.name] = str
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    else payload[field.name] = str;
  }
  return payload;
}

function newKey(): string {
  return `form-${Math.random().toString(36).slice(2, 10)}`;
}

/** Formulário de command guiado por spec, com confirmação de risco + reauth. */
export function CommandForm({
  worldId,
  spec,
  onDone,
}: {
  worldId: string;
  spec: CommandSpec;
  onDone?: () => void;
}) {
  const { api, session, stepUp } = useSession();
  const { error: showError } = useToast();
  const [values, setValues] = useState<Record<string, Value>>(() =>
    initialValues(spec, session?.subject ?? "operador"),
  );
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reauthKey, setReauthKey] = useState("");

  function setField(name: string, value: Value) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  async function execute(client: GrintaClient) {
    setBusy(true);
    try {
      const response = await client.command({
        commandType: spec.commandType,
        worldId,
        payload: buildPayload(spec, values),
        idempotencyKey: newKey(),
      });
      if (response.status === "REJECTED") {
        showError(response.error?.code ?? "REJECTED");
        return;
      }
      setResult(
        `${response.status}${response.resource ? " · " + response.resource : ""}`,
      );
      onDone?.();
    } catch (err) {
      showError(
        err instanceof GrintaApiError ? err.standard.code : "Falha na API",
      );
    } finally {
      setBusy(false);
    }
  }

  const needsReauth =
    spec.commandType.startsWith("admin:") && session?.role === "admin";

  function run() {
    setResult(null);
    if (requiresConfirmation(spec.commandType)) {
      setReauthKey("");
      setConfirmOpen(true);
      return;
    }
    void execute(api);
  }

  async function confirmAndRun() {
    if (needsReauth) {
      if (!reauthKey) {
        showError("Digite a chave admin.");
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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {spec.fields.map((field: FieldSpec) => (
          <div
            key={field.name}
            className={
              field.kind === "checkbox"
                ? "col-span-2 flex items-center gap-2"
                : "space-y-1"
            }
          >
            {field.kind === "checkbox" ? (
              <>
                <input
                  id={`${spec.commandType}-${field.name}`}
                  type="checkbox"
                  checked={Boolean(values[field.name])}
                  onChange={(e) => setField(field.name, e.target.checked)}
                  className="accent-[color:var(--primary)]"
                />
                <Label htmlFor={`${spec.commandType}-${field.name}`}>
                  {field.label}
                </Label>
              </>
            ) : (
              <>
                <Label htmlFor={`${spec.commandType}-${field.name}`}>
                  {field.label}
                </Label>
                {field.kind === "select" ? (
                  <select
                    id={`${spec.commandType}-${field.name}`}
                    value={String(values[field.name] ?? "")}
                    onChange={(e) => setField(field.name, e.target.value)}
                    className="mono h-9 w-full rounded-sm border border-border bg-input px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">—</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={`${spec.commandType}-${field.name}`}
                    value={String(values[field.name] ?? "")}
                    onChange={(e) => setField(field.name, e.target.value)}
                    className="mono"
                    placeholder={field.placeholder}
                    inputMode={field.kind === "number" ? "numeric" : undefined}
                  />
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={run} disabled={busy}>
          {busy ? "Executando…" : spec.label}
        </Button>
        {result ? (
          <span className="mono text-xs text-[color:var(--ok)]">{result}</span>
        ) : null}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogTitle>Confirmar {spec.label}</DialogTitle>
          <DialogDescription>
            <span className="mono text-foreground">{spec.commandType}</span> é
            uma ação sensível. A autoridade é do backend.
          </DialogDescription>
          {needsReauth ? (
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="cf-reauth">Reautenticação — chave admin</Label>
              <Input
                id="cf-reauth"
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
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
