"use client";

import { Plus, Trophy } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import type { ClubRow } from "@/components/clubs-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/lib/session";

/**
 * Autoria de competições (C7, R-202): criar (num modal), configurar (modal em
 * tela cheia — janela, participantes, premiações, qualificação), travar (sorteio
 * + calendário) e iniciar. Depois do lock a config é imutável (R-52).
 *
 * Dado REAL: lê `competitions-list`/`competitions`/`top-scorers` e despacha
 * `competition:*` + `world:play-round`. Nada de mock aqui.
 */
interface CompetitionSummary {
  readonly competitionId: string;
  readonly name: string;
  readonly type: string;
  readonly format: string;
  readonly tier: number | null;
  readonly lifecycle: string;
  readonly clubCount: number;
  readonly matchCount: number;
  readonly startsOn: string | null;
  readonly endsOn: string | null;
}
interface StandingRow {
  readonly clubId: string;
  readonly clubName: string;
  readonly played: number;
  readonly points: number;
  readonly goalDifference: number;
}
interface StandingsView {
  readonly competitionName: string;
  readonly playedMatches: number;
  readonly totalMatches: number;
  readonly table: readonly StandingRow[];
}
interface TopScorer {
  readonly playerId: string;
  readonly name: string;
  readonly clubName: string;
  readonly goals: number;
}

const LIFECYCLE_LABEL: Record<
  string,
  { label: string; tone: "neutral" | "live" | "ok" | "danger" }
> = {
  DRAFT: { label: "rascunho", tone: "neutral" },
  SCHEDULED: { label: "agendada", tone: "neutral" },
  RUNNING: { label: "em andamento", tone: "live" },
  FINISHED: { label: "encerrada", tone: "ok" },
};

const COMPETITION_KIND: Record<
  string,
  { label: string; type: string; format: string; isLeague: boolean }
> = {
  LEAGUE: {
    label: "Liga · pontos corridos",
    type: "LEAGUE",
    format: "DOUBLE_ROUND_ROBIN",
    isLeague: true,
  },
  CUP_KO: {
    label: "Copa · mata-mata",
    type: "CUP",
    format: "KNOCKOUT",
    isLeague: false,
  },
  CUP_GROUPS: {
    label: "Copa · grupos + mata-mata",
    type: "CUP",
    format: "GROUPS_AND_KNOCKOUT",
    isLeague: false,
  },
};

const TIEBREAKERS = [
  "POINTS",
  "WINS",
  "GOAL_DIFFERENCE",
  "GOALS_FOR",
  "HEAD_TO_HEAD",
] as const;

function isLeagueFormat(format: string): boolean {
  return format === "DOUBLE_ROUND_ROBIN" || format === "ROUND_ROBIN";
}
function isGroupsFormat(format: string): boolean {
  return format === "GROUPS_AND_KNOCKOUT";
}

/** R$ (reais) → minor units em string. Vazio/NaN → "0". */
function toMinor(reais: string): string {
  const n = Number(reais);
  if (!Number.isFinite(n) || n < 0) return "0";
  return String(Math.round(n * 100));
}

export function CompetitionAuthoring({
  worldId,
  clubs,
}: {
  worldId: string;
  clubs: readonly ClubRow[];
}) {
  const { api, session } = useSession();
  const { error: showError } = useToast();
  const [items, setItems] = useState<readonly CompetitionSummary[]>([]);
  const [standings, setStandings] = useState<StandingsView | null>(null);
  const [scorers, setScorers] = useState<readonly TopScorer[]>([]);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [configuring, setConfiguring] = useState<CompetitionSummary | null>(
    null,
  );

  const load = useCallback(() => {
    if (session === null) return;
    api
      .query<{ competitions: readonly CompetitionSummary[] }>(
        worldId,
        "competitions-list",
      )
      .then((e) => setItems(e.data.competitions ?? []))
      .catch(() => {
        setItems([]);
        showError("Falha ao carregar competições.");
      });
    api
      .query<StandingsView | null>(worldId, "competitions")
      .then((e) => setStandings(e.data))
      .catch(() => setStandings(null));
    api
      .query<{ scorers: readonly TopScorer[] }>(worldId, "top-scorers")
      .then((e) => setScorers(e.data.scorers ?? []))
      .catch(() => setScorers([]));
  }, [api, session, worldId, showError]);

  useEffect(() => {
    load();
  }, [load]);

  const dispatch = useCallback(
    async (commandType: string, payload: Record<string, unknown>) => {
      setBusy(true);
      try {
        const response = await api.command({
          commandType,
          worldId,
          payload,
          idempotencyKey: crypto.randomUUID(),
        });
        if (response.status === "REJECTED") {
          showError(response.error?.code ?? "comando recusado");
          return false;
        }
        load();
        return true;
      } catch {
        showError("falha na API");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [api, worldId, load],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h3 className="font-heading text-sm">Competições do mundo</h3>
          <p className="text-[11px] text-muted-foreground">
            autoradas no admin · imutáveis ao iniciar (R-202)
          </p>
        </div>
        <Button
          size="sm"
          className="ml-auto gap-1.5"
          onClick={() => setCreating(true)}
        >
          <Plus className="size-4" />
          Criar competição
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-4 py-10 text-center">
          <Trophy className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhuma competição — este mundo nasce vazio (R-203).
          </p>
          <Button size="sm" className="mt-3" onClick={() => setCreating(true)}>
            Criar a primeira
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <CompetitionRow
              key={c.competitionId}
              competition={c}
              busy={busy}
              onConfigure={() => setConfiguring(c)}
              onLock={() =>
                dispatch("competition:lock", { competitionId: c.competitionId })
              }
              onStart={() =>
                dispatch("competition:start", {
                  competitionId: c.competitionId,
                })
              }
            />
          ))}
        </ul>
      )}

      <Acompanhamento
        standings={standings}
        scorers={scorers}
        busy={busy}
        onPlayRound={() => dispatch("world:play-round", {})}
      />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-lg">
          <CreateDialog
            busy={busy}
            onCreate={async (payload) => {
              const ok = await dispatch("competition:create", payload);
              if (ok) setCreating(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={configuring !== null}
        onOpenChange={(open) => {
          if (!open) setConfiguring(null);
        }}
      >
        <DialogContent className="left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0">
          {configuring ? (
            <ConfigureDialog
              competition={configuring}
              clubs={clubs}
              others={items.filter(
                (c) => c.competitionId !== configuring.competitionId,
              )}
              busy={busy}
              onCancel={() => setConfiguring(null)}
              onSave={async (payload) => {
                const ok = await dispatch("competition:configure", {
                  competitionId: configuring.competitionId,
                  ...payload,
                });
                if (ok) setConfiguring(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompetitionRow({
  competition,
  busy,
  onConfigure,
  onLock,
  onStart,
}: {
  competition: CompetitionSummary;
  busy: boolean;
  onConfigure: () => void;
  onLock: () => void;
  onStart: () => void;
}) {
  const lc = LIFECYCLE_LABEL[competition.lifecycle] ?? {
    label: competition.lifecycle,
    tone: "neutral" as const,
  };
  const isDraft = competition.lifecycle === "DRAFT";
  const isScheduled = competition.lifecycle === "SCHEDULED";
  const canLock =
    isDraft &&
    competition.clubCount >= 2 &&
    competition.startsOn !== null &&
    competition.endsOn !== null;
  const lockHint = !isDraft
    ? ""
    : competition.clubCount < 2
      ? "faltam clubes"
      : competition.startsOn === null || competition.endsOn === null
        ? "falta a janela"
        : "";

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-border bg-surface-2/40 px-3 py-2.5">
      <span className="font-heading text-sm">{competition.name}</span>
      <Badge tone={lc.tone}>{lc.label}</Badge>
      <span className="mono text-[11px] text-muted-foreground">
        {competition.type === "LEAGUE" ? "Liga" : "Copa"} ·{" "}
        {competition.clubCount} clubes · {competition.matchCount} jogos
        {competition.startsOn
          ? ` · ${competition.startsOn}${competition.endsOn ? `→${competition.endsOn}` : ""}`
          : ""}
      </span>
      <span className="ml-auto flex items-center gap-2">
        {lockHint ? (
          <span className="text-[10px] text-muted-foreground">{lockHint}</span>
        ) : null}
        {isDraft ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onConfigure}
            disabled={busy}
          >
            Configurar
          </Button>
        ) : null}
        {isDraft ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onLock}
            disabled={busy || !canLock}
          >
            Travar e sortear
          </Button>
        ) : null}
        {isScheduled ? (
          <Button variant="outline" size="sm" onClick={onStart} disabled={busy}>
            Iniciar
          </Button>
        ) : null}
      </span>
    </li>
  );
}

// ── Criação (modal compacto) ────────────────────────────────────────────────
function CreateDialog({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("LEAGUE");
  const [tier, setTier] = useState("1");
  const spec = COMPETITION_KIND[kind]!;

  return (
    <div className="space-y-4">
      <DialogTitle>Criar competição</DialogTitle>
      <div className="space-y-1.5">
        <Label htmlFor="new-comp-name">Nome</Label>
        <Input
          id="new-comp-name"
          placeholder="Série A"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label>Formato</Label>
        <div className="grid gap-1.5">
          {Object.entries(COMPETITION_KIND).map(([key, k]) => (
            <button
              key={key}
              type="button"
              onClick={() => setKind(key)}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                kind === key
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-surface-2 text-muted-foreground hover:border-border/80"
              }`}
            >
              {k.label}
              {kind === key ? (
                <span className="size-2 rounded-full bg-primary" />
              ) : null}
            </button>
          ))}
        </div>
      </div>
      {spec.isLeague ? (
        <div className="space-y-1.5">
          <Label htmlFor="new-comp-tier">Divisão (1 = topo)</Label>
          <Input
            id="new-comp-tier"
            type="number"
            min={1}
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="w-24"
          />
        </div>
      ) : null}
      <div className="flex justify-end pt-1">
        <Button
          disabled={busy || name.trim().length === 0}
          onClick={() =>
            void onCreate({
              name: name.trim(),
              type: spec.type,
              format: spec.format,
              tier: spec.isLeague ? Number(tier) : null,
            })
          }
        >
          Criar rascunho
        </Button>
      </div>
    </div>
  );
}

// ── Configuração (tela cheia) ───────────────────────────────────────────────
interface PrizeState {
  participation: string;
  winBonus: string;
  champion: string;
  runnerUp: string;
  third: string;
  topScorer: string;
  bestPlayer: string;
}
interface QualRule {
  targetCompetitionId: string;
  criteria: string;
  slots: string;
}

function ConfigureDialog({
  competition,
  clubs,
  others,
  busy,
  onCancel,
  onSave,
}: {
  competition: CompetitionSummary;
  clubs: readonly ClubRow[];
  others: readonly CompetitionSummary[];
  busy: boolean;
  onCancel: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const league = isLeagueFormat(competition.format);
  const groups = isGroupsFormat(competition.format);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [startsOn, setStartsOn] = useState(competition.startsOn ?? "");
  const [endsOn, setEndsOn] = useState(competition.endsOn ?? "");
  const [promotion, setPromotion] = useState("4");
  const [relegation, setRelegation] = useState("4");
  const [groupCount, setGroupCount] = useState("4");
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState("2");
  const [quals, setQuals] = useState<readonly QualRule[]>([]);
  const [prizes, setPrizes] = useState<PrizeState>({
    participation: "",
    winBonus: "",
    champion: "",
    runnerUp: "",
    third: "",
    topScorer: "",
    bestPlayer: "",
  });

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = selected.size === clubs.length && clubs.length > 0;
  const setPrize = (k: keyof PrizeState, v: string) =>
    setPrizes((p) => ({ ...p, [k]: v }));

  const datesOk = startsOn !== "" && endsOn !== "" && startsOn < endsOn;
  const canSave = selected.size >= 2 && datesOk;

  function build(): Record<string, unknown> {
    return {
      clubIds: [...selected],
      startsOn,
      endsOn,
      config: {
        rules: {
          pointsWin: 3,
          pointsDraw: 1,
          legs: league ? 2 : 1,
          promotionSlots: league ? Number(promotion) || 0 : 0,
          relegationSlots: league ? Number(relegation) || 0 : 0,
          tiebreakers: [...TIEBREAKERS],
          groupCount: groups ? Number(groupCount) || null : null,
          qualifiersPerGroup: groups ? Number(qualifiersPerGroup) || null : null,
        },
        prizes: {
          participationMinor: toMinor(prizes.participation),
          winBonusMinor: toMinor(prizes.winBonus),
          positionMinor: [prizes.champion, prizes.runnerUp, prizes.third].map(
            toMinor,
          ),
          topScorerMinor: toMinor(prizes.topScorer),
          bestPlayerMinor: toMinor(prizes.bestPlayer),
        },
        qualifications: quals
          .filter((q) => q.targetCompetitionId !== "")
          .map((q) => ({
            targetCompetitionId: q.targetCompetitionId,
            criteria: q.criteria,
            slots: Number(q.slots) || 1,
          })),
      },
    };
  }

  const kindLabel =
    competition.type === "LEAGUE"
      ? "Liga · pontos corridos"
      : groups
        ? "Copa · grupos + mata-mata"
        : "Copa · mata-mata";

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Cabeçalho */}
      <header className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div>
          <DialogTitle className="text-base">
            Configurar · {competition.name}
          </DialogTitle>
          <p className="mono text-[11px] text-muted-foreground">{kindLabel}</p>
        </div>
        <Badge tone="neutral" className="ml-1">
          rascunho
        </Badge>
      </header>

      {/* Corpo em duas colunas, cada uma rola por dentro se precisar */}
      <div className="grid min-h-0 flex-1 gap-px overflow-hidden bg-border lg:grid-cols-[1fr_360px]">
        {/* Coluna esquerda: regras + premiações */}
        <div className="space-y-6 overflow-y-auto bg-background px-6 py-5">
          <Section title="Janela" hint="obrigatória — sem ela não há sorteio">
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Início">
                <Input
                  type="date"
                  value={startsOn}
                  onChange={(e) => setStartsOn(e.target.value)}
                />
              </Field>
              <Field label="Término">
                <Input
                  type="date"
                  value={endsOn}
                  onChange={(e) => setEndsOn(e.target.value)}
                />
              </Field>
              {startsOn !== "" && endsOn !== "" && startsOn >= endsOn ? (
                <span className="pb-2 text-[11px] text-[color:var(--danger)]">
                  o término tem que ser depois do início
                </span>
              ) : null}
            </div>
          </Section>

          {league ? (
            <Section
              title="Acesso e rebaixamento"
              hint="topo não é promovido; fundo não é rebaixado (R-204)"
            >
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Sobem">
                  <Input
                    type="number"
                    min={0}
                    value={promotion}
                    onChange={(e) => setPromotion(e.target.value)}
                    className="w-20"
                  />
                </Field>
                <Field label="Descem">
                  <Input
                    type="number"
                    min={0}
                    value={relegation}
                    onChange={(e) => setRelegation(e.target.value)}
                    className="w-20"
                  />
                </Field>
              </div>
            </Section>
          ) : null}

          {groups ? (
            <Section
              title="Fase de grupos"
              hint="sorteio em potes; os classificados formam o mata-mata"
            >
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Nº de grupos">
                  <Input
                    type="number"
                    min={1}
                    value={groupCount}
                    onChange={(e) => setGroupCount(e.target.value)}
                    className="w-24"
                  />
                </Field>
                <Field label="Classificados / grupo">
                  <Input
                    type="number"
                    min={1}
                    value={qualifiersPerGroup}
                    onChange={(e) => setQualifiersPerGroup(e.target.value)}
                    className="w-24"
                  />
                </Field>
              </div>
            </Section>
          ) : null}

          <Section
            title="Premiações"
            hint="em R$ · pagas na homologação pelo razão (C9)"
          >
            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              Clube
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Money
                label="Participação"
                value={prizes.participation}
                onChange={(v) => setPrize("participation", v)}
              />
              <Money
                label="Bônus / vitória"
                value={prizes.winBonus}
                onChange={(v) => setPrize("winBonus", v)}
              />
              <Money
                label="Campeão"
                value={prizes.champion}
                onChange={(v) => setPrize("champion", v)}
              />
              <Money
                label="Vice"
                value={prizes.runnerUp}
                onChange={(v) => setPrize("runnerUp", v)}
              />
              <Money
                label="3º lugar"
                value={prizes.third}
                onChange={(v) => setPrize("third", v)}
              />
            </div>
            <div className="mb-1 mt-3 text-[10px] uppercase tracking-wide text-muted-foreground">
              Jogador (vai ao clube dele)
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Money
                label="Artilheiro"
                value={prizes.topScorer}
                onChange={(v) => setPrize("topScorer", v)}
              />
              <Money
                label="Melhor jogador"
                value={prizes.bestPlayer}
                onChange={(v) => setPrize("bestPlayer", v)}
              />
            </div>
          </Section>

          <Section
            title="Qualificação"
            hint="top-N desta → outra competição (R-207)"
          >
            <QualRules quals={quals} others={others} onChange={setQuals} />
          </Section>
        </div>

        {/* Coluna direita: participantes com switches */}
        <div className="flex min-h-0 flex-col bg-background">
          <div className="flex items-center justify-between px-5 pb-2 pt-5">
            <div>
              <div className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
                Participantes
              </div>
              <div className="mono text-lg tabular-nums">
                {selected.size}
                <span className="text-sm text-muted-foreground">
                  {" "}
                  / {clubs.length}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setSelected(
                  allSelected ? new Set() : new Set(clubs.map((c) => c.id)),
                )
              }
            >
              {allSelected ? "Limpar" : "Todos"}
            </Button>
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto px-5 pb-5">
            {clubs.map((club) => (
              <li
                key={club.id}
                className="flex items-center justify-between gap-2 py-2"
              >
                <span className="truncate text-sm">{club.name}</span>
                <Switch
                  checked={selected.has(club.id)}
                  onCheckedChange={() => toggle(club.id)}
                  aria-label={club.name}
                />
              </li>
            ))}
          </ul>
          <p className="border-t border-border px-5 py-2 text-[11px] text-muted-foreground">
            {league
              ? "Liga: nº par (padrão da divisão é 20)."
              : groups
                ? "Grupos: divisível pelo nº de grupos."
                : "Mata-mata: potência de 2 (4, 8, 16…)."}
          </p>
        </div>
      </div>

      {/* Rodapé fixo */}
      <footer className="flex items-center justify-end gap-3 border-t border-border px-6 py-3">
        {!canSave ? (
          <span className="mr-auto text-[11px] text-muted-foreground">
            escolha ≥ 2 clubes e uma janela válida
          </span>
        ) : null}
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          size="sm"
          disabled={busy || !canSave}
          onClick={() => void onSave(build())}
        >
          Salvar configuração
        </Button>
      </footer>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline gap-2">
        <h4 className="font-heading text-xs uppercase tracking-wide text-foreground">
          {title}
        </h4>
        {hint ? (
          <span className="text-[11px] text-muted-foreground">{hint}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px]">{label}</Label>
      {children}
    </div>
  );
}

function Money({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px]">{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
          R$
        </span>
        <Input
          type="number"
          min={0}
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-7 tabular-nums"
        />
      </div>
    </div>
  );
}

function QualRules({
  quals,
  others,
  onChange,
}: {
  quals: readonly QualRule[];
  others: readonly CompetitionSummary[];
  onChange: (next: readonly QualRule[]) => void;
}) {
  if (others.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground">
        Crie outra competição para ligar a classificação a ela.
      </p>
    );
  }
  const set = (i: number, patch: Partial<QualRule>) =>
    onChange(quals.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-2">
      {quals.map((q, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <select
            value={q.criteria}
            onChange={(e) => set(i, { criteria: e.target.value })}
            className="h-8 rounded-sm border border-border bg-surface-2 px-2 text-xs"
          >
            <option value="TOP_POSITIONS">Os primeiros</option>
            <option value="CHAMPION">O campeão</option>
            <option value="CUP_WINNER">O vencedor</option>
          </select>
          {q.criteria === "TOP_POSITIONS" ? (
            <Input
              type="number"
              min={1}
              value={q.slots}
              onChange={(e) => set(i, { slots: e.target.value })}
              className="w-16"
            />
          ) : null}
          <span className="text-xs text-muted-foreground">→</span>
          <select
            value={q.targetCompetitionId}
            onChange={(e) => set(i, { targetCompetitionId: e.target.value })}
            className="h-8 rounded-sm border border-border bg-surface-2 px-2 text-xs"
          >
            {others.map((o) => (
              <option key={o.competitionId} value={o.competitionId}>
                {o.name}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(quals.filter((_, j) => j !== i))}
          >
            remover
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          onChange([
            ...quals,
            {
              targetCompetitionId: others[0]?.competitionId ?? "",
              criteria: "TOP_POSITIONS",
              slots: "4",
            },
          ])
        }
      >
        + regra de qualificação
      </Button>
    </div>
  );
}

// ── Acompanhamento (tabela + artilharia reais) ──────────────────────────────
function Acompanhamento({
  standings,
  scorers,
  busy,
  onPlayRound,
}: {
  standings: StandingsView | null;
  scorers: readonly TopScorer[];
  busy: boolean;
  onPlayRound: () => void;
}) {
  return (
    <div className="space-y-3 border-t border-border pt-5">
      <div className="flex flex-wrap items-center gap-3">
        <h4 className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
          Acompanhamento
        </h4>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={onPlayRound}
        >
          Jogar próxima rodada
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <div className="text-[11px] text-muted-foreground">
            {standings
              ? `${standings.competitionName} · ${standings.playedMatches}/${standings.totalMatches} jogos`
              : "Tabela — sem competição em andamento"}
          </div>
          {standings && standings.table.length > 0 ? (
            <Mini
              rows={standings.table.slice(0, 8).map((r, i) => [
                `${i + 1}`,
                r.clubName,
                `${r.played}j`,
                `${r.goalDifference > 0 ? "+" : ""}${r.goalDifference}`,
                `${r.points}`,
              ])}
            />
          ) : null}
        </div>
        <div className="space-y-1.5">
          <div className="text-[11px] text-muted-foreground">
            Artilharia{scorers.length > 0 ? ` · ${scorers.length}` : ""}
          </div>
          {scorers.length > 0 ? (
            <Mini
              rows={scorers
                .slice(0, 8)
                .map((s, i) => [`${i + 1}`, s.name, s.clubName, `${s.goals}`])}
            />
          ) : (
            <div className="text-[11px] text-muted-foreground">
              Nenhum gol ainda — jogue uma rodada.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Mini({ rows }: { rows: readonly (readonly string[])[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-xs">
        <tbody>
          {rows.map((cells, r) => (
            <tr key={r} className="border-b border-border/50 last:border-0">
              {cells.map((cell, c) => (
                <td
                  key={c}
                  className={`px-2.5 py-1.5 ${c === 0 ? "w-6 text-muted-foreground" : ""} ${
                    c === cells.length - 1
                      ? "text-right font-semibold tabular-nums"
                      : c > 1
                        ? "text-right tabular-nums text-muted-foreground"
                        : ""
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
