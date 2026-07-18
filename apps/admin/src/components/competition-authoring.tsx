"use client";

import { useCallback, useEffect, useState } from "react";

import type { ClubRow } from "@/components/clubs-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/session";

/**
 * Autoria de competições (C7, R-202): o operador cria uma competição em
 * RASCUNHO, configura num MODAL (clubes, janela, premiações), TRAVA (sorteio +
 * calendário) e INICIA. Depois do lock a config é imutável (R-52).
 *
 * Dado REAL: lê `competitions-list` e despacha `competition:*`. O acompanhamento
 * (tabela/artilharia) segue mock abaixo até C7-V5.
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

const LIFECYCLE_LABEL: Record<
  string,
  { label: string; tone: "neutral" | "live" | "ok" | "danger" }
> = {
  DRAFT: { label: "rascunho", tone: "neutral" },
  SCHEDULED: { label: "agendada", tone: "neutral" },
  RUNNING: { label: "em andamento", tone: "live" },
  FINISHED: { label: "encerrada", tone: "ok" },
};

const FORMAT_OF_TYPE: Record<string, string> = {
  LEAGUE: "DOUBLE_ROUND_ROBIN",
  CUP: "KNOCKOUT",
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

/** R$ (reais, com casas) → minor units em string. Vazio/NaN → "0". */
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
  const [items, setItems] = useState<readonly CompetitionSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      .catch(() => setItems([]));
  }, [api, session, worldId]);

  useEffect(() => {
    load();
  }, [load]);

  const dispatch = useCallback(
    async (commandType: string, payload: Record<string, unknown>) => {
      setBusy(true);
      setError(null);
      try {
        const response = await api.command({
          commandType,
          worldId,
          payload,
          idempotencyKey: crypto.randomUUID(),
        });
        if (response.status === "REJECTED") {
          setError(response.error?.code ?? "comando recusado");
          return false;
        }
        load();
        return true;
      } catch {
        setError("falha na API");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [api, worldId, load],
  );

  return (
    <div className="mb-6 space-y-4 rounded-sm border border-border bg-surface-2/40 p-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 className="font-heading text-sm">Competições do mundo</h3>
        <span className="mono text-[11px] text-muted-foreground">
          autoradas no admin · R-202
        </span>
      </div>

      {error ? (
        <p className="text-[11px] text-[color:var(--danger)]">Erro: {error}</p>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma competição ainda — este mundo nasce vazio (R-203). Crie uma
          abaixo.
        </p>
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
                dispatch("competition:start", { competitionId: c.competitionId })
              }
            />
          ))}
        </ul>
      )}

      <CreateCompetitionForm
        busy={busy}
        onCreate={(payload) => dispatch("competition:create", payload)}
      />

      <Dialog
        open={configuring !== null}
        onOpenChange={(open) => {
          if (!open) setConfiguring(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          {configuring ? (
            <ConfigureDialog
              competition={configuring}
              clubs={clubs}
              busy={busy}
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
  // Só dá para sortear quando a config está completa: clubes E janela. É isso
  // que impede o INVALID_COMPETITION_WINDOW de acontecer pela UI.
  const canLock =
    isDraft &&
    competition.clubCount >= 2 &&
    competition.startsOn !== null &&
    competition.endsOn !== null;
  const lockHint = !isDraft
    ? ""
    : competition.clubCount < 2
      ? "configure os clubes primeiro"
      : competition.startsOn === null || competition.endsOn === null
        ? "configure a janela (início e término) primeiro"
        : "";

  return (
    <li className="rounded-sm border border-border bg-surface-2">
      <div className="flex flex-wrap items-center gap-3 px-3 py-2">
        <span className="font-heading text-sm">{competition.name}</span>
        <Badge tone="neutral">{competition.type}</Badge>
        <Badge tone={lc.tone}>{lc.label}</Badge>
        <span className="mono text-[11px] text-muted-foreground">
          {competition.clubCount} clubes · {competition.matchCount} jogos
          {competition.startsOn
            ? ` · ${competition.startsOn}${competition.endsOn ? `–${competition.endsOn}` : ""}`
            : " · sem janela"}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {lockHint ? (
            <span className="text-[10px] text-muted-foreground">
              {lockHint}
            </span>
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
              Travar (sortear)
            </Button>
          ) : null}
          {isScheduled ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onStart}
              disabled={busy}
            >
              Iniciar
            </Button>
          ) : null}
        </span>
      </div>
    </li>
  );
}

interface PrizeState {
  participation: string;
  winBonus: string;
  champion: string;
  runnerUp: string;
  third: string;
  topScorer: string;
  bestPlayer: string;
}

function ConfigureDialog({
  competition,
  clubs,
  busy,
  onSave,
}: {
  competition: CompetitionSummary;
  clubs: readonly ClubRow[];
  busy: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const league = isLeagueFormat(competition.format);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [startsOn, setStartsOn] = useState(competition.startsOn ?? "");
  const [endsOn, setEndsOn] = useState(competition.endsOn ?? "");
  const [promotion, setPromotion] = useState("4");
  const [relegation, setRelegation] = useState("4");
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
    const config = {
      rules: {
        pointsWin: 3,
        pointsDraw: 1,
        legs: league ? 2 : 1,
        promotionSlots: league ? Number(promotion) || 0 : 0,
        relegationSlots: league ? Number(relegation) || 0 : 0,
        tiebreakers: [...TIEBREAKERS],
        groupCount: null,
        qualifiersPerGroup: null,
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
      qualifications: [],
    };
    return { clubIds: [...selected], startsOn, endsOn, config };
  }

  return (
    <>
      <DialogTitle className="mb-1">
        Configurar · {competition.name}
      </DialogTitle>

      <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        {/* Janela — obrigatória. Sem ela não há sorteio. */}
        <section className="space-y-2">
          <h4 className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
            Janela
          </h4>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="cfg-start">Início *</Label>
              <Input
                id="cfg-start"
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cfg-end">Término *</Label>
              <Input
                id="cfg-end"
                type="date"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
              />
            </div>
            {startsOn !== "" && endsOn !== "" && startsOn >= endsOn ? (
              <span className="text-[11px] text-[color:var(--danger)]">
                o término tem que ser depois do início
              </span>
            ) : null}
          </div>
        </section>

        {/* Participantes */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
              Participantes — {selected.size} de {clubs.length}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setSelected(
                  allSelected ? new Set() : new Set(clubs.map((c) => c.id)),
                )
              }
            >
              {allSelected ? "Limpar" : "Selecionar todos"}
            </Button>
          </div>
          <div className="grid max-h-44 grid-cols-2 gap-1 overflow-y-auto rounded-sm border border-border p-2 sm:grid-cols-3">
            {clubs.map((club) => (
              <label
                key={club.id}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-xs hover:bg-surface-2"
              >
                <input
                  type="checkbox"
                  checked={selected.has(club.id)}
                  onChange={() => toggle(club.id)}
                />
                <span className="truncate">{club.name}</span>
              </label>
            ))}
          </div>
          {league ? (
            <p className="text-[11px] text-muted-foreground">
              Liga precisa de nº par de clubes (o padrão da divisão é 20).
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Mata-mata precisa de potência de 2 (4, 8, 16, 32…).
            </p>
          )}
        </section>

        {/* Acesso/rebaixamento (só liga) */}
        {league ? (
          <section className="space-y-2">
            <h4 className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
              Acesso e rebaixamento
            </h4>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="cfg-prom">Sobem</Label>
                <Input
                  id="cfg-prom"
                  type="number"
                  min={0}
                  value={promotion}
                  onChange={(e) => setPromotion(e.target.value)}
                  className="w-20"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-rel">Descem</Label>
                <Input
                  id="cfg-rel"
                  type="number"
                  min={0}
                  value={relegation}
                  onChange={(e) => setRelegation(e.target.value)}
                  className="w-20"
                />
              </div>
              <span className="text-[11px] text-muted-foreground">
                topo não é promovido; fundo não é rebaixado (R-204)
              </span>
            </div>
          </section>
        ) : null}

        {/* Premiações — clubes e jogadores (R-205) */}
        <section className="space-y-3">
          <h4 className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
            Premiações (R$)
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <PrizeInput
              label="Cota participação"
              value={prizes.participation}
              onChange={(v) => setPrize("participation", v)}
            />
            <PrizeInput
              label="Bônus por vitória"
              value={prizes.winBonus}
              onChange={(v) => setPrize("winBonus", v)}
            />
            <PrizeInput
              label="Campeão"
              value={prizes.champion}
              onChange={(v) => setPrize("champion", v)}
            />
            <PrizeInput
              label="Vice"
              value={prizes.runnerUp}
              onChange={(v) => setPrize("runnerUp", v)}
            />
            <PrizeInput
              label="3º lugar"
              value={prizes.third}
              onChange={(v) => setPrize("third", v)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <PrizeInput
              label="Artilheiro"
              value={prizes.topScorer}
              onChange={(v) => setPrize("topScorer", v)}
            />
            <PrizeInput
              label="Melhor jogador"
              value={prizes.bestPlayer}
              onChange={(v) => setPrize("bestPlayer", v)}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Pagas na homologação, via faucet do razão (C9). Prêmios de jogador
            vão para o clube dele.
          </p>
        </section>
      </div>

      <div className="mt-2 flex items-center justify-end gap-3 border-t border-border pt-3">
        {!canSave ? (
          <span className="text-[11px] text-muted-foreground">
            escolha ≥ 2 clubes e uma janela válida
          </span>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          disabled={busy || !canSave}
          onClick={() => void onSave(build())}
        >
          Salvar configuração
        </Button>
      </div>
    </>
  );
}

function PrizeInput({
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
      <Input
        type="number"
        min={0}
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function CreateCompetitionForm({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("LEAGUE");
  const [tier, setTier] = useState("1");

  return (
    <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
      <div className="space-y-1">
        <Label htmlFor="new-comp-name">Nova competição</Label>
        <Input
          id="new-comp-name"
          placeholder="Série A"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-48"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="new-comp-type">Tipo</Label>
        <select
          id="new-comp-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-9 rounded-sm border border-border bg-surface-2 px-2 text-sm"
        >
          <option value="LEAGUE">Liga (pontos corridos)</option>
          <option value="CUP">Copa (mata-mata)</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="new-comp-tier">Divisão</Label>
        <Input
          id="new-comp-tier"
          type="number"
          min={1}
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="w-20"
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={busy || name.trim().length === 0}
        onClick={() => {
          void onCreate({
            name: name.trim(),
            type,
            format: FORMAT_OF_TYPE[type] ?? "DOUBLE_ROUND_ROBIN",
            tier: type === "LEAGUE" ? Number(tier) : null,
          }).then((ok) => {
            if (ok) setName("");
          });
        }}
      >
        Criar rascunho
      </Button>
    </div>
  );
}
