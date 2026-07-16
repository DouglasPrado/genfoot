"use client";

import { RefreshCw, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "@/lib/session";
import {
  buildUserDirectory,
  type UserRow,
  type WorldSlice,
} from "@/lib/user-directory";
import { useKnownWorlds } from "@/lib/worlds";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatBalance(minor: number | null): string {
  // null = o ledger não conhece o clube; diferente de saldo zero.
  return minor === null ? "—" : brl.format(minor / 100);
}

/**
 * A-IAM (L-A01): usuários por mundo, com clube controlado e saldo do clube.
 * Fontes oficiais: identity-detail, club e ledger. O identificador é o subject
 * do provedor (R-171) — e-mail/nome vivem no Clerk, fora da API do jogo.
 */
export default function UsersPage() {
  const { api } = useSession();
  const { worlds } = useKnownWorlds();
  const [rows, setRows] = useState<readonly UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const slices = await Promise.all(
        worlds.map(async (world): Promise<WorldSlice> => {
          // Mundo sem contexto inicializado responde 404: vira fatia nula em
          // vez de derrubar a listagem dos demais.
          const [identity, clubs, ledger] = await Promise.all([
            api
              .query<WorldSlice["identity"]>(world.id, "identity-detail")
              .then((env) => env.data)
              .catch(() => null),
            api
              .query<WorldSlice["clubs"]>(world.id, "club")
              .then((env) => env.data)
              .catch(() => null),
            api
              .query<WorldSlice["ledger"]>(world.id, "ledger")
              .then((env) => env.data)
              .catch(() => null),
          ]);
          return {
            worldId: world.id,
            worldSeed: world.seed,
            identity,
            clubs,
            ledger,
          };
        }),
      );
      setRows(buildUserDirectory(slices));
    } catch {
      setError("Falha ao consultar a API.");
    } finally {
      setBusy(false);
    }
  }, [api, worlds]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell>
      <PageHeader
        title="Usuários"
        hint="Contas por mundo, com o clube controlado e o saldo oficial do clube."
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={busy}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {busy ? "Atualizando…" : "Atualizar"}
          </Button>
        }
      />

      {error === null ? null : (
        <Card>
          <CardContent className="py-4 text-sm text-red-400">{error}</CardContent>
        </Card>
      )}

      {worlds.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Nenhum mundo conhecido neste console. Abra ou crie um em Mundos —
            a listagem de usuários varre os mundos conhecidos.
          </CardContent>
        </Card>
      ) : rows === null ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Carregando usuários…
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            Nenhuma conta registrada nos mundos conhecidos ainda.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Usuário (subject)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Mundo</th>
                  <th className="px-4 py-3">Clube</th>
                  <th className="px-4 py-3 text-right">Saldo do clube</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.worldId}:${row.accountId}`}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{row.subject}</td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={row.accountStatus === "ACTIVE" ? "ok" : "danger"}
                      >
                        {row.accountStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{row.worldSeed}</span>{" "}
                      <span className="font-mono text-xs text-muted-foreground">
                        {row.worldId.slice(0, 8)}…
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.clubName ?? (
                        <span className="text-muted-foreground">sem clube</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatBalance(row.balanceMinor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
