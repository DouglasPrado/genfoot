"use client";

import { RefreshCw, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { ClubName } from "@/components/club-crest";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/lib/session";
import {
  buildUserDirectory,
  type UserRow,
  type WorldSlice,
} from "@/lib/user-directory";
import { useKnownWorlds } from "@/lib/worlds";

/**
 * A-IAM (L-A01): usuários por mundo, com o clube controlado.
 *
 * Fontes oficiais: `identity-detail` e `club-detail`, ambas Postgres. O
 * identificador é o `accountId` (conta global, R-172) — nome e e-mail vivem no
 * Clerk e não passam pela API do jogo.
 *
 * O SALDO SAIU da tabela. Ele vinha da query `ledger`, e C9 foi apagado com os
 * mega-agregados (R-175); balanço é projeção do razão (Decisão 19.10) e não há
 * de onde tirar. Mostrar "—" em toda linha seria uma coluna que não informa
 * nada; mockar um número que o operador poderia levar a sério seria pior. Volta
 * com C9.
 */
export default function UsersPage() {
  const { api } = useSession();
  const { error: showError } = useToast();
  const { worlds, failed: worldsFailed } = useKnownWorlds();
  const [rows, setRows] = useState<readonly UserRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const slices = await Promise.all(
        worlds.map(async (world): Promise<WorldSlice> => {
          // Mundo sem contexto inicializado responde 404: vira fatia nula em
          // vez de derrubar a listagem dos demais.
          const [identity, clubs] = await Promise.all([
            api
              .query<WorldSlice["identity"]>(world.id, "identity-detail")
              .then((env) => env.data)
              .catch(() => null),
            api
              .query<WorldSlice["clubs"]>(world.id, "club-detail")
              .then((env) => env.data)
              .catch(() => null),
          ]);
          return { worldId: world.id, worldSeed: world.seed, identity, clubs };
        }),
      );
      setRows(buildUserDirectory(slices));
    } catch {
      showError("Falha ao consultar a API.");
    } finally {
      setBusy(false);
    }
  }, [api, worlds, showError]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell>
      <PageHeader
        title="Usuários"
        hint="Contas por mundo, com o clube controlado. Dado real — Postgres."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={busy}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {busy ? "Atualizando…" : "Atualizar"}
          </Button>
        }
      />

      {worldsFailed ? null : worlds.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Nenhum mundo conhecido neste console. Abra ou crie um em Mundos — a
            listagem de usuários varre os mundos conhecidos.
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
                  <th className="px-4 py-3">Conta</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Mundo</th>
                  <th className="px-4 py-3">Clube</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.worldId}:${row.accountId}`}
                    className="border-b border-border/50 even:bg-surface-2/40 last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.accountId.slice(0, 8)}…
                    </td>
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
                      {row.club === null ? (
                        <span className="text-muted-foreground">sem clube</span>
                      ) : (
                        <ClubName club={row.club} size="md" />
                      )}
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
