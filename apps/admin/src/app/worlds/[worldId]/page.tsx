"use client";

import { GrintaApiError } from "@grinta/api-client";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import {
  ClubsTable,
  type ClubRow,
  type ClubFinanceRow,
} from "@/components/clubs-table";
import { CommandConsole } from "@/components/command-console";
import { CompetitionAuthoring } from "@/components/competition-authoring";
import { CompetitionsPanel } from "@/components/competitions-panel";
import { DeleteWorldDialog } from "@/components/delete-world-dialog";
import { Mock, MockNotice } from "@/components/mock";
import { QuickActions } from "@/components/quick-actions";
import { SeasonHistory } from "@/components/season-history";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorldIdentityForm } from "@/components/world-identity-form";
import { WorldParametersTable } from "@/components/world-parameters-table";
import { WorldClockPanel } from "@/components/world-clock-panel";
import { WorldSettingsPanel } from "@/components/world-settings-panel";
import {
  mockCompeticoes,
  mockJogadores,
  mockTendencia,
} from "@/lib/mock-world";
import { useSession } from "@/lib/session";

/**
 * O que `GET /worlds/:worldId` serve: o `GameWorldSnapshot` inteiro, via
 * `InspectWorld` (queries.controller.ts:116). Esta interface declarava só quatro
 * campos — os que a tela usava — e a aba de Parâmetros precisa dos oito. Não é
 * campo novo na API: é campo que já vinha e ninguém tipava.
 */
interface WorldSnapshot {
  readonly status: string;
  readonly currentDate: string;
  readonly startDate: string;
  readonly seed: string;
  readonly name: string | null;
  readonly description: string | null;
  /** A chave é o que o command grava; a URL a API compõe do R2_CDN_URL. */
  readonly bannerKey: string | null;
  readonly bannerUrl: string | null;
  readonly squarePhotoKey: string | null;
  readonly squarePhotoUrl: string | null;
  readonly rulesetVersion: string;
  readonly worldSequence: number;
  readonly version: number;
}

/**
 * O que `finance-snapshot` (C9) serve por clube. A tela só lê caixa e a folha
 * (custo total de temporada) — o resto da view (linhas, saúde, proveniência)
 * é da tela M-FINANCE, não do dashboard.
 */
interface ClubFinanceSnapshot {
  readonly clubId: string;
  readonly cashMinor: number;
  readonly seasonCost: { readonly totalMinor: number };
}

function money(minor: number | bigint): string {
  return (Number(minor) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function Stat({
  label,
  value,
  hint,
  badge,
}: {
  label: string;
  value: string;
  hint?: string;
  badge?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          {badge}
        </div>
        <div className="mono text-2xl tabular-nums text-foreground">
          {value}
        </div>
        {hint ? (
          <div className="text-xs text-muted-foreground">{hint}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function WorldDetailPage() {
  const params = useParams<{ worldId: string }>();
  const worldId = params.worldId;
  const { api, session } = useSession();
  const { error: showError } = useToast();
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [clubs, setClubs] = useState<readonly ClubRow[]>([]);
  // `null` = ainda não carregou; `Map` com chave `null` = clube sem finanças.
  const [finances, setFinances] = useState<ReadonlyMap<
    string,
    ClubFinanceRow | null
  > | null>(null);
  const [commandTypes, setCommandTypes] = useState<readonly string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Nada dispara antes de a sessão existir: uma query sem token leva 401, e
    // 401 na janela de hidratação não é sessão expirada — é pergunta feita antes
    // da hora.
    if (session === null) return;
    let alive = true;
    api
      .query<WorldSnapshot>(worldId)
      .then((e) => {
        if (alive) setSnapshot(e.data);
      })
      /**
       * Falhar CALADO aqui fazia a tela mentir.
       *
       * Era `.catch(() => undefined)`: um 401 sumia, o `snapshot` ficava `null`, e
       * a página renderizava título "Mundo", datas "—" e "sem imagem" — a cara de
       * um mundo vazio, não a de uma sessão morta. O operador então via o upload
       * recusar com `invalidToken` e concluía, com toda a razão, que trocar imagem
       * não tinha nada a ver com login: o resto da tela parecia vivo.
       *
       * Mundo que não carregou e mundo sem dado são coisas diferentes, e agora a
       * tela diz qual das duas.
       */
      .catch((err: unknown) => {
        if (!alive) return;
        setSnapshot(null);
        const code =
          err instanceof GrintaApiError ? err.standard.code : "Falha na API";
        const expired =
          code.toLowerCase().includes("token") ||
          code.includes("UNAUTHENTICATED");
        showError(
          `Não consegui carregar o mundo (${code}). O que a tela mostra não é o estado dele.${
            expired ? " Sua sessão expirou — entre de novo." : ""
          }`,
        );
      });
    // Os clubes são o ÚNICO dado real desta tela. Se a query falhar, a tabela
    // fica vazia e diz isso — não cai em mock (CLAUDE.md §5).
    api
      .query<{ clubs: readonly ClubRow[] }>(worldId, "club-detail")
      .then((e) => {
        if (alive) setClubs(e.data.clubs ?? []);
      })
      .catch(() => {
        if (alive) setClubs([]);
      });
    api
      .catalog()
      .then((c) => {
        if (alive) setCommandTypes(c.commands);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [api, session, worldId, refreshKey, showError]);

  // Caixa e folha reais, uma query `finance-snapshot` por clube (C9). São N
  // chamadas, mas é dashboard de operador — e o dado é real, não estimado.
  useEffect(() => {
    if (session === null) return;
    if (clubs.length === 0) {
      setFinances(null);
      return;
    }
    let alive = true;
    setFinances(null);
    void Promise.all(
      clubs.map(async (club) => {
        try {
          const e = await api.query<ClubFinanceSnapshot | null>(
            worldId,
            "finance-snapshot",
            { params: { clubId: club.id } },
          );
          const row: ClubFinanceRow | null =
            e.data === null
              ? null
              : {
                  cashMinor: e.data.cashMinor,
                  seasonCostMinor: e.data.seasonCost.totalMinor,
                };
          return [club.id, row] as const;
        } catch {
          // Falha na query = "não sei", não R$ 0. A tabela mostra "—".
          return [club.id, null] as const;
        }
      }),
    ).then((entries) => {
      if (alive) setFinances(new Map(entries));
    });
    return () => {
      alive = false;
    };
  }, [api, session, worldId, clubs]);

  // Dinheiro circulante real = Σ do caixa de cada clube (o próprio hint da tela).
  // `null` até todas as snapshots voltarem — não some com mock nem afirma R$ 0.
  const dinheiroReal =
    finances === null
      ? null
      : [...finances.values()].reduce((sum, f) => sum + (f?.cashMinor ?? 0), 0);
  const jogadores = mockJogadores(worldId, clubs.length);
  const competicoes = mockCompeticoes(worldId);
  const tendencia = mockTendencia(worldId);
  const Trend = tendencia.crescente ? TrendingUp : TrendingDown;

  return (
    <AppShell>
      <PageHeader
        // O nome manda quando existe; sem ele, o seed — que é o que esta tela
        // sempre mostrou. "Mundo" só enquanto a query não voltou.
        title={snapshot === null ? "Mundo" : (snapshot.name ?? snapshot.seed)}
        hint={worldId}
        actions={
          snapshot ? (
            <Badge tone={snapshot.status === "ACTIVE" ? "live" : "neutral"}>
              {snapshot.status}
            </Badge>
          ) : null
        }
      />
      <div className="space-y-6 p-6">
        <MockNotice reais={2} total={6} />

        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-wrap gap-8">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Data lógica
                </div>
                <div className="mono mt-0.5 text-lg">
                  {snapshot?.currentDate ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Clubes
                </div>
                <div className="mono mt-0.5 text-lg">{clubs.length}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <QuickActions
                worldId={worldId}
                onDone={() => setRefreshKey((k) => k + 1)}
              />
              {snapshot === null ? null : (
                <DeleteWorldDialog
                  worldId={worldId}
                  seed={snapshot.seed}
                  clubCount={clubs.length}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Dinheiro circulante"
            value={dinheiroReal === null ? "…" : money(dinheiroReal)}
            hint="soma do caixa (razão) de todos os clubes"
          />
          <Stat
            label="Tendência do mundo"
            value={`${tendencia.crescente ? "+" : "−"}${tendencia.percentual.toFixed(1)}%`}
            hint={
              tendencia.crescente
                ? "economia crescente"
                : "economia decrescente"
            }
            badge={<Mock contexto="C9 razão" />}
          />
          {/* "Campeonatos rodando" de N: uma temporada tem VÁRIOS torneios —
              liga, copa, estadual, continental (`06-temporada-e-competicoes.md`).
              O cartão anterior dizia só quantos rodavam, como se o total fosse
              1. */}
          <Stat
            label="Torneios rodando"
            value={`${competicoes.rodando} de ${competicoes.total}`}
            hint={`temporada ${competicoes.temporada} · ${competicoes.torneios.map((t) => t.nome).join(" · ")}`}
            badge={<Mock contexto="C7 competições" />}
          />
          <Stat
            label="Jogadores em clubes"
            value={jogadores.emClubes.toLocaleString("pt-BR")}
            hint={`${jogadores.livres} livres · ${jogadores.base} na base`}
            badge={<Mock contexto="C4 jogadores" />}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                Tendência
                <Trend
                  className={
                    tendencia.crescente
                      ? "size-4 text-[color:var(--ok)]"
                      : "size-4 text-[color:var(--danger)]"
                  }
                />
              </span>
            </CardTitle>
            <Mock contexto="C9 razão + C10 torcida" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              O mundo está{" "}
              <span
                className={
                  tendencia.crescente
                    ? "font-semibold text-[color:var(--ok)]"
                    : "font-semibold text-[color:var(--danger)]"
                }
              >
                {tendencia.crescente ? "crescente" : "decrescente"}
              </span>{" "}
              ({tendencia.percentual.toFixed(1)}%). Crescente/decrescente é
              medida de economia — o razão diz se entra mais do que sai —
              cruzada com torcida. Sem C9 não há como saber, nem aproximar com
              honestidade.
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="clubes">
          <TabsList>
            <TabsTrigger value="clubes">Clubes</TabsTrigger>
            <TabsTrigger value="competicoes">Competições</TabsTrigger>
            <TabsTrigger value="temporadas">Temporadas</TabsTrigger>
            <TabsTrigger value="console">Console</TabsTrigger>
            <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
            <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="clubes">
            <Card>
              <CardHeader>
                <CardTitle>Clubes do mundo</CardTitle>
                <Badge tone="ok">dado real · Postgres</Badge>
              </CardHeader>
              <CardContent>
                <ClubsTable
                  worldId={worldId}
                  clubs={clubs}
                  finances={finances}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="competicoes">
            <Card>
              <CardHeader>
                <CardTitle>
                  Competições · temporada {competicoes.temporada}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Autoria REAL (C7, R-202): criar/configurar/travar/iniciar. */}
                <CompetitionAuthoring worldId={worldId} clubs={clubs} />
                {/* Acompanhamento (tabela/artilharia/chave) ainda mockado até V5. */}
                <Mock contexto="acompanhamento: C7-V5 + C5" />
                <CompetitionsPanel
                  worldId={worldId}
                  clubs={clubs}
                  temporada={competicoes.temporada}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="temporadas">
            <Card>
              <CardHeader>
                <CardTitle>Campanhas por temporada</CardTitle>
                <Mock contexto="C7 competições + C5 partidas" />
              </CardHeader>
              <CardContent>
                <SeasonHistory
                  worldId={worldId}
                  clubs={clubs}
                  ateTemporada={competicoes.temporada}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="console">
            <Card>
              <CardHeader>
                <CardTitle>Console de commands</CardTitle>
                <span className="mono text-[11px] text-muted-foreground">
                  {commandTypes.length} tipos
                </span>
              </CardHeader>
              <CardContent>
                <CommandConsole worldId={worldId} commandTypes={commandTypes} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parametros">
            <Card>
              <CardHeader>
                <CardTitle>Parâmetros do mundo</CardTitle>
                <Badge tone="ok">dado real · sem mock</Badge>
              </CardHeader>
              <CardContent>
                {/* `clubs` só é contagem confiável depois que a query volta.
                    Antes disso é `[]`, e `0` afirmaria "mundo sem clube". A
                    tabela recebe `null` e mostra "—" até saber. */}
                <WorldParametersTable
                  snapshot={snapshot}
                  observedClubCount={snapshot === null ? null : clubs.length}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="configuracoes">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Identidade</CardTitle>
                  <Badge tone="ok">dado real · sem mock</Badge>
                </CardHeader>
                <CardContent>
                  <WorldIdentityForm
                    worldId={worldId}
                    name={snapshot?.name ?? null}
                    description={snapshot?.description ?? null}
                    bannerKey={snapshot?.bannerKey ?? null}
                    bannerUrl={snapshot?.bannerUrl ?? null}
                    squarePhotoKey={snapshot?.squarePhotoKey ?? null}
                    squarePhotoUrl={snapshot?.squarePhotoUrl ?? null}
                    seed={snapshot?.seed ?? null}
                    expectedVersion={snapshot?.version ?? null}
                    onSaved={() => setRefreshKey((k) => k + 1)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ciclo de vida do mundo</CardTitle>
                  <Badge tone="ok">dado real · sem mock</Badge>
                </CardHeader>
                <CardContent>
                  <WorldSettingsPanel
                    worldId={worldId}
                    status={snapshot?.status ?? null}
                    currentDate={snapshot?.currentDate ?? null}
                    expectedVersion={snapshot?.version ?? null}
                    onChanged={() => setRefreshKey((k) => k + 1)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Relógio do mundo</CardTitle>
                  <Badge tone="ok">dado real · sem mock</Badge>
                </CardHeader>
                <CardContent>
                  {/* MUNDO-V4: o operador define quanto tempo real dura um dia
                      lógico e liga/desliga o relógio. O scheduler faz o resto. */}
                  <WorldClockPanel
                    worldId={worldId}
                    worldStatus={snapshot?.status ?? null}
                    onChanged={() => setRefreshKey((k) => k + 1)}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
