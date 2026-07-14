"use client";

import { GrintaApiError } from "@grinta/api-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/session";

export default function LoginPage() {
  const { login } = useSession();
  const router = useRouter();
  const [subject, setSubject] = useState("operador");
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login({
        subject,
        role: adminKey ? "admin" : "user",
        ...(adminKey ? { adminKey } : {}),
      });
      router.replace("/worlds");
    } catch (err) {
      setError(
        err instanceof GrintaApiError
          ? err.standard.code
          : "Falha ao conectar à API.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2">
            <span className="live-dot h-2 w-2 rounded-full bg-primary" />
            <span className="mono text-[11px] uppercase tracking-widest text-muted-foreground">
              System online · /api/v1
            </span>
          </div>
          <h1 className="font-heading text-4xl leading-none text-foreground">
            Grinta
            <span className="text-primary">.</span>Control
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Console de operação dos mundos. Autentique-se para monitorar e
            intervir.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-md border border-border bg-card p-5"
        >
          <div className="space-y-1.5">
            <Label htmlFor="subject">Operador</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adminKey">Chave admin (opcional)</Label>
            <Input
              id="adminKey"
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="deixe vazio para acesso de usuário"
              className="mono"
            />
          </div>

          {error ? (
            <p className="mono rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Conectando…" : "Entrar no console"}
          </Button>
        </form>

        <p className="mono mt-4 text-center text-[11px] text-muted-foreground">
          admin exige chave de bootstrap · cliente não-autoritativo
        </p>
      </div>
    </main>
  );
}
