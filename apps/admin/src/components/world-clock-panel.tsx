"use client";

import { GrintaApiError } from "@grinta/api-client";
import { Clock, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/lib/session";
import {
  UNIT_LABEL,
  type ClockUnit,
  type ClockView,
  describeCadence,
  fromSeconds,
  timeUntilTick,
  toSeconds,
  validateSecondsPerDay,
} from "@/lib/world-clock-model";

/**
 * MUNDO-V4 — o operador configura o tempo do mundo: quanto tempo real dura um
 * dia lógico, e se o relógio anda ou fica parado. Grava por `world:set-clock`;
 * quem faz o mundo andar sozinho é o scheduler (MUNDO-V3), lendo esta config.
 *
 * Cliente não-autoritativo: o painel mostra o que a query `world-clock` serve e
 * dispara o command — nunca simula o efeito. Uma recusa aparece com o código.
 */

const UNITS: readonly ClockUnit[] = ["seconds", "minutes", "hours"];

function key(): string {
  return `clock-${Math.random().toString(36).slice(2, 10)}`;
}

export function WorldClockPanel({
  worldId,
  worldStatus,
  onChanged,
}: {
  worldId: string;
  worldStatus: string | null;
  onChanged: () => void;
}) {
  const { api, session } = useSession();
  const { error: showError } = useToast();

  const [clock, setClock] = useState<ClockView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [value, setValue] = useState<string>("4");
  const [unit, setUnit] = useState<ClockUnit>("hours");
  const [running, setRunning] = useState<boolean>(true);
  const [busy, setBusy] = useState(false);
  // Um "agora" que anda de segundo em segundo, só para a contagem regressiva do
  // próximo tick ficar viva. É presentação, não domínio.
  const [nowIso, setNowIso] = useState<string>(() => new Date().toISOString());

  useEffect(() => {
    const t = setInterval(() => setNowIso(new Date().toISOString()), 1_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (session === null) return;
    let alive = true;
    setLoadError(null);
    api
      .query<ClockView | null>(worldId, "world-clock")
      .then((e) => {
        if (!alive) return;
        const data = e.data;
        setClock(data);
        // Semeia o formulário com a config gravada — ou o padrão (4h) se nunca
        // foi configurada (relógio nulo).
        if (data && data.realSecondsPerDay !== null) {
          const seed = fromSeconds(data.realSecondsPerDay);
          setValue(String(seed.value));
          setUnit(seed.unit);
          setRunning(data.clockRunning);
        }
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setClock(null);
        const code =
          err instanceof GrintaApiError ? err.standard.code : "Falha na API";
        setLoadError(code);
      });
    return () => {
      alive = false;
    };
  }, [api, session, worldId]);

  const parsedValue = Number(value.replace(",", "."));
  const seconds = Number.isFinite(parsedValue)
    ? toSeconds(parsedValue, unit)
    : Number.NaN;
  const validation = validateSecondsPerDay(seconds);
  const canSave = validation === null && !busy;

  // O relógio só faz sentido num mundo ATIVO: parado/em breve, o scheduler não o
  // pega (dueWorlds filtra status ACTIVE). Avisamos, mas não travamos a config —
  // dá para deixar tudo pronto antes de ativar.
  const inactiveWorld = worldStatus !== null && worldStatus !== "ACTIVE";

  async function save() {
    if (validation !== null) return;
    setBusy(true);
    try {
      const response = await api.command({
        commandType: "world:set-clock",
        worldId,
        payload: { realSecondsPerDay: seconds, running },
        idempotencyKey: key(),
      });
      if (response.status === "REJECTED") {
        showError(response.error?.code ?? "REJECTED");
        return;
      }
      onChanged();
      // Relê para refletir o efeito REAL: a config gravada e o próximo tick
      // recém-agendado. É a confirmação honesta — não um "salvo!" otimista.
      const e = await api.query<ClockView | null>(worldId, "world-clock");
      setClock(e.data);
    } catch (err) {
      showError(
        err instanceof GrintaApiError ? err.standard.code : "Falha na API",
      );
    } finally {
      setBusy(false);
    }
  }

  const current = clock?.realSecondsPerDay ?? null;
  const until = timeUntilTick(clock?.nextTickAt ?? null, nowIso);

  return (
    <div className="space-y-5">
      {/* Estado atual: o que está gravado e o efeito observável (próximo tick). */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-sm border border-border bg-surface-2/40 p-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {current === null ? (
                "Relógio nunca configurado"
              ) : (
                <span className="mono">{describeCadence(current)}</span>
              )}
            </span>
          </div>
          <p className="max-w-[64ch] text-xs text-muted-foreground">
            O scheduler avança o mundo um dia lógico a cada intervalo. Ele só
            pega mundos <span className="font-semibold">ativos</span> com o
            relógio andando.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 text-xs text-muted-foreground">
          <Badge tone={clock?.clockRunning ? "ok" : "neutral"}>
            {clock?.clockRunning ? (
              <>
                <Play className="size-3" />
                andando
              </>
            ) : (
              <>
                <Pause className="size-3" />
                parado
              </>
            )}
          </Badge>
          {until ? (
            <span className="mono">próximo dia {until}</span>
          ) : clock?.clockRunning ? (
            <span className="mono">sem tick agendado</span>
          ) : null}
        </div>
      </div>

      {loadError ? (
        <p className="text-sm text-danger">
          Não consegui ler o relógio ({loadError}). O formulário abaixo mostra o
          padrão, não o estado gravado.
        </p>
      ) : null}

      {inactiveWorld ? (
        <p className="rounded-sm border border-border bg-surface-2/40 p-3 text-xs text-muted-foreground">
          O mundo está <span className="mono">{worldStatus}</span>. Você pode
          deixar o relógio pronto, mas ele só passa a andar quando o mundo for{" "}
          <span className="font-semibold">ativado</span> (aba Ciclo de vida).
        </p>
      ) : null}

      {/* Configuração: quanto tempo real dura um dia lógico + andar/parar. */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="clock-value">Duração de um dia lógico</Label>
          <div className="flex items-center gap-2">
            <Input
              id="clock-value"
              type="number"
              inputMode="decimal"
              min={0}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-28"
            />
            <div className="flex overflow-hidden rounded-sm border border-border">
              {UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={
                    "px-3 py-1.5 text-xs transition-colors " +
                    (unit === u
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-2 text-muted-foreground hover:text-foreground")
                  }
                >
                  {UNIT_LABEL[u]}
                </button>
              ))}
            </div>
          </div>
          {validation ? (
            <p className="text-[11px] text-danger">{validation}</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              {describeCadence(seconds)} (
              <span className="mono">{seconds.toLocaleString("pt-BR")}s</span>)
            </p>
          )}
        </div>

        <div className="flex items-center justify-between rounded-sm border border-border bg-surface-2/40 p-3">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Relógio andando</div>
            <p className="text-[11px] text-muted-foreground">
              Ligado, o mundo avança sozinho. Desligado, ele congela no dia atual
              até você retomar.
            </p>
          </div>
          <Switch
            checked={running}
            onCheckedChange={setRunning}
            aria-label="Relógio andando"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={() => void save()} disabled={!canSave}>
            {busy ? "Gravando…" : "Gravar relógio"}
          </Button>
        </div>
      </div>
    </div>
  );
}
