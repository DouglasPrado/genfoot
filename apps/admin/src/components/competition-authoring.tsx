"use client";

import { useCallback, useEffect, useState } from "react";

import type { ClubRow } from "@/components/clubs-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/session";

/**
 * Autoria de competições (C7, R-202): o operador cria uma competição em
 * RASCUNHO, escolhe os clubes e a janela, TRAVA (sorteio + calendário) e INICIA.
 * Depois do lock a config é imutável (R-52) — o painel para de deixar editar.
 *
 * É dado REAL: lê a query `competitions-list` e despacha os commands
 * `competition:*`. Nada de mock aqui (o acompanhamento — tabela/artilharia —
 * segue mockado abaixo até C7-V5).
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

const LIFECYCLE_LABEL: Record<string, { label: string; tone: "neutral" | "live" | "ok" | "danger" }> = {
  DRAFT: { label: "rascunho", tone: "neutral" },
  SCHEDULED: { label: "agendada", tone: "neutral" },
  RUNNING: { label: "em andamento", tone: "live" },
  FINISHED: { label: "encerrada", tone: "ok" },
};

const FORMAT_OF_TYPE: Record<string, string> = {
  LEAGUE: "DOUBLE_ROUND_ROBIN",
  CUP: "KNOCKOUT",
};

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
  const [expanded, setExpanded] = useState<string | null>(null);

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
        } else {
          load();
        }
        return response.status !== "REJECTED";
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
              clubs={clubs}
              busy={busy}
              expanded={expanded === c.competitionId}
              onToggle={() =>
                setExpanded((prev) =>
                  prev === c.competitionId ? null : c.competitionId,
                )
              }
              onConfigure={(payload) =>
                dispatch("competition:configure", {
                  competitionId: c.competitionId,
                  ...payload,
                })
              }
              onLock={() =>
                dispatch("competition:lock", {
                  competitionId: c.competitionId,
                })
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

      <CreateCompetitionForm
        busy={busy}
        onCreate={(payload) => dispatch("competition:create", payload)}
      />
    </div>
  );
}

function CompetitionRow({
  competition,
  clubs,
  busy,
  expanded,
  onToggle,
  onConfigure,
  onLock,
  onStart,
}: {
  competition: CompetitionSummary;
  clubs: readonly ClubRow[];
  busy: boolean;
  expanded: boolean;
  onToggle: () => void;
  onConfigure: (payload: Record<string, unknown>) => Promise<boolean>;
  onLock: () => void;
  onStart: () => void;
}) {
  const lc = LIFECYCLE_LABEL[competition.lifecycle] ?? {
    label: competition.lifecycle,
    tone: "neutral" as const,
  };
  const isDraft = competition.lifecycle === "DRAFT";
  const isScheduled = competition.lifecycle === "SCHEDULED";

  return (
    <li className="rounded-sm border border-border bg-surface-2">
      <div className="flex flex-wrap items-center gap-3 px-3 py-2">
        <span className="font-heading text-sm">{competition.name}</span>
        <Badge tone="neutral">{competition.type}</Badge>
        <Badge tone={lc.tone}>{lc.label}</Badge>
        <span className="mono text-[11px] text-muted-foreground">
          {competition.clubCount} clubes · {competition.matchCount} jogos
          {competition.startsOn ? ` · ${competition.startsOn}` : ""}
        </span>
        <span className="ml-auto flex gap-2">
          {isDraft ? (
            <Button variant="ghost" size="sm" onClick={onToggle} disabled={busy}>
              {expanded ? "Fechar" : "Configurar"}
            </Button>
          ) : null}
          {isDraft ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onLock}
              disabled={busy || competition.clubCount < 2}
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

      {isDraft && expanded ? (
        <ConfigureForm
          competition={competition}
          clubs={clubs}
          busy={busy}
          onSave={onConfigure}
        />
      ) : null}
    </li>
  );
}

function ConfigureForm({
  competition,
  clubs,
  busy,
  onSave,
}: {
  competition: CompetitionSummary;
  clubs: readonly ClubRow[];
  busy: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [startsOn, setStartsOn] = useState(competition.startsOn ?? "");
  const [endsOn, setEndsOn] = useState(competition.endsOn ?? "");

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = selected.size === clubs.length && clubs.length > 0;

  return (
    <div className="space-y-3 border-t border-border px-3 py-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor={`start-${competition.competitionId}`}>Início</Label>
          <Input
            id={`start-${competition.competitionId}`}
            type="date"
            value={startsOn}
            onChange={(e) => setStartsOn(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`end-${competition.competitionId}`}>Término</Label>
          <Input
            id={`end-${competition.competitionId}`}
            type="date"
            value={endsOn}
            onChange={(e) => setEndsOn(e.target.value)}
          />
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
          {allSelected ? "Limpar" : "Selecionar todos"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-muted-foreground">
          {selected.size} de {clubs.length} clubes
        </span>
      </div>

      <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto rounded-sm border border-border p-2 sm:grid-cols-3">
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

      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() =>
          void onSave({
            clubIds: [...selected],
            ...(startsOn ? { startsOn } : {}),
            ...(endsOn ? { endsOn } : {}),
          })
        }
      >
        Salvar configuração
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Regras e prêmios usam o padrão do formato; ajuste fino virá adiante. Ao
        travar, o sorteio e as datas dos jogos são gerados e a config congela.
      </p>
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
