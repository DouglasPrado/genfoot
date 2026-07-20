/**
 * Modelo puro da tela de treino de sessão (R-221 Fase 2a, mobile). Decide o
 * ESTADO da sessão de um jogador e monta os payloads dos commands. O componente
 * só renderiza e despacha via submitTrackedCommand; nada de regra na view.
 *
 * Estados: DISPONÍVEL (pode iniciar), TREINANDO (indisponível, coletável), e o
 * jogador que não pode treinar (lesionado/suspenso) fica BLOQUEADO.
 */
export type SessionState = "IDLE" | "TRAINING" | "BLOCKED";

export interface PlayerSessionInput {
  readonly availability: string; // PlayerAvailability
  readonly hasActiveSession: boolean;
}

export function sessionStateOf(input: PlayerSessionInput): SessionState {
  if (input.hasActiveSession) return "TRAINING";
  if (input.availability === "AVAILABLE") return "IDLE";
  return "BLOCKED";
}

export const canStart = (s: SessionState): boolean => s === "IDLE";
export const canCollect = (s: SessionState): boolean => s === "TRAINING";

/** O mínimo que a linha lê do elenco (a query `roster` traz mais). */
export interface TrainingPlayerLike {
  readonly playerId: string;
  readonly name: string;
  readonly shirtNumber: number;
  readonly primaryPosition: string;
  readonly overall: number;
  readonly availability: string;
}

/** O mínimo que a linha lê da query `training-sessions`. */
export interface ActiveSessionLike {
  readonly playerId: string;
  readonly attributeCode: string;
  readonly startDate: string;
  readonly durationDays: number;
  /**
   * Projeção do ganho, computada no SERVIDOR (o cliente não computa regra de
   * domínio). Opcional para telas/testes que não a trazem.
   */
  readonly attributeCurrentValue?: number | null;
  readonly projectedGainPoints?: number;
  readonly projectedValue?: number | null;
}

export interface SessionProgress {
  readonly attributeCode: string;
  /** Dias treinados até a data do mundo, TETADO na duração. */
  readonly elapsedDays: number;
  readonly durationDays: number;
  readonly complete: boolean;
  /** Valor atual do atributo-foco; `null` quando o servidor não projetou. */
  readonly attributeCurrentValue: number | null;
  /** Ganho projetado pelo tempo já treinado (0 se não projetado). */
  readonly projectedGainPoints: number;
  /** Valor projetado (atual + ganho); `null` quando não há projeção. */
  readonly projectedValue: number | null;
}

export interface TrainingRow {
  readonly playerId: string;
  readonly name: string;
  readonly shirtNumber: number;
  readonly primaryPosition: string;
  readonly overall: number;
  /** Availability crua (`PlayerAvailability`) — a flag de lesão/suspensão lê dela. */
  readonly availability: string;
  readonly state: SessionState;
  /** `null` quando não há sessão ativa — a tela não inventa progresso. */
  readonly session: SessionProgress | null;
  /** Por que não pode treinar; `null` quando não está bloqueado. */
  readonly blockedLabel: string | null;
}

const BLOCKED_LABEL: Readonly<Record<string, string>> = {
  INJURED: "Lesionado",
  SUSPENDED: "Suspenso",
  CONVENED: "Convocado",
  UNAVAILABLE: "Indisponível",
};

function daysBetweenIso(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso.slice(0, 10)}T00:00:00.000Z`);
  const to = Date.parse(`${toIso.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.floor((to - from) / 86_400_000));
}

/**
 * Junta o elenco com as sessões ATIVAS numa lista pronta para a tela
 * (M-TRAINING). A data corrente vem do mundo (`asOf`), nunca de `Date.now()` —
 * o progresso tem que bater com o que a coleta vai render no servidor.
 *
 * Sessão de quem não está no elenco é IGNORADA: uma linha fantasma seria a tela
 * inventando jogador que a query de elenco não devolveu.
 */
export function buildTrainingRows(
  players: readonly TrainingPlayerLike[],
  sessions: readonly ActiveSessionLike[],
  worldDate: string,
): readonly TrainingRow[] {
  const byPlayer = new Map(sessions.map((s) => [s.playerId, s]));
  return players.map((p) => {
    const active = byPlayer.get(p.playerId) ?? null;
    const state = sessionStateOf({
      availability: p.availability,
      hasActiveSession: active !== null,
    });
    // Coletar antes do fim rende PARCIAL (o servidor teta na duração); passar do
    // fim não rende além dela. O progresso mostrado segue a mesma conta.
    const elapsedDays =
      active === null
        ? 0
        : Math.min(
            daysBetweenIso(active.startDate, worldDate),
            active.durationDays,
          );
    return {
      playerId: p.playerId,
      name: p.name,
      shirtNumber: p.shirtNumber,
      primaryPosition: p.primaryPosition,
      overall: p.overall,
      availability: p.availability,
      state,
      session:
        active === null
          ? null
          : {
              attributeCode: active.attributeCode,
              elapsedDays,
              durationDays: active.durationDays,
              complete: elapsedDays >= active.durationDays,
              // Projeção vem do servidor (pass-through); ausente = sem projeção.
              attributeCurrentValue: active.attributeCurrentValue ?? null,
              projectedGainPoints: active.projectedGainPoints ?? 0,
              projectedValue: active.projectedValue ?? null,
            },
      blockedLabel:
        state === "BLOCKED" ? (BLOCKED_LABEL[p.availability] ?? "Indisponível") : null,
    };
  });
}

export interface TrainingSummary {
  readonly training: number;
  readonly idle: number;
  readonly blocked: number;
  readonly collectable: number;
}

/** O cabeçalho da tela: quantos treinando, livres, bloqueados e coletáveis. */
/**
 * A largura (0..100) da barra de progresso da sessão.
 *
 * Guarda a divisão por zero: `durationDays` é sempre ≥1 no domínio, mas uma
 * linha corrompida com 0 renderizaria `NaN%` — largura quebrada na tela. E
 * prende em 0..100 para uma sessão que passou da duração não estourar a barra.
 */
export function sessionProgressPercent(input: {
  readonly elapsedDays: number;
  readonly durationDays: number;
}): number {
  if (input.durationDays <= 0) return 0;
  const pct = (input.elapsedDays / input.durationDays) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export function summarizeTraining(
  rows: readonly TrainingRow[],
): TrainingSummary {
  let training = 0;
  let idle = 0;
  let blocked = 0;
  for (const row of rows) {
    if (row.state === "TRAINING") training += 1;
    else if (row.state === "IDLE") idle += 1;
    else blocked += 1;
  }
  // Toda sessão ativa é coletável (parcial inclusive) — não se espera o fim.
  return { training, idle, blocked, collectable: training };
}

export interface StartSessionPayload {
  readonly clubId: string;
  readonly playerId: string;
  readonly attributeCode: string;
}

export function buildStartSessionPayload(input: {
  readonly clubId: string;
  readonly playerId: string;
  readonly attributeCode: string | null;
}): StartSessionPayload | { readonly error: "NO_ATTRIBUTE" } {
  if (input.attributeCode === null || input.attributeCode.trim() === "") {
    return { error: "NO_ATTRIBUTE" };
  }
  return {
    clubId: input.clubId,
    playerId: input.playerId,
    attributeCode: input.attributeCode,
  };
}
