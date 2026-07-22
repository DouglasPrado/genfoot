/**
 * Modelo puro do plano de treino COLETIVO (M-TRAINING, R-214/R-221).
 *
 * O plano é um objeto do clube na temporada: um foco e uma carga para o grupo,
 * materializados numa entrada por jogador. A tela escolhe foco e carga; este
 * módulo monta as entradas e recusa, ANTES de sair do aparelho, o que o domínio
 * recusaria depois.
 *
 * `seasonId` NÃO entra no payload de propósito: o servidor resolve a temporada
 * corrente (e a materializa se faltar). O mobile não conhece o season.
 */

/** Os focos do domínio (`TrainingFocus`), com rótulo para a tela. */
export const FOCUS_OPTIONS = [
  { focus: "TECHNICAL", label: "Técnico" },
  { focus: "PHYSICAL", label: "Físico" },
  { focus: "TACTICAL", label: "Tático" },
  { focus: "MENTAL", label: "Mental" },
  { focus: "DEFENSIVE", label: "Defensivo" },
  { focus: "OFFENSIVE", label: "Ofensivo" },
  { focus: "SET_PIECES", label: "Bola parada" },
  { focus: "RECOVERY", label: "Recuperação" },
  { focus: "INDIVIDUAL_ROLE", label: "Função individual" },
] as const;

export type PlanFocus = (typeof FOCUS_OPTIONS)[number]["focus"];

/** O intervalo do domínio (`MIN_INTENSITY`/`MAX_INTENSITY`). */
const MIN_INTENSITY = 0;
const MAX_INTENSITY = 100;

/** Prende a carga no intervalo do domínio e arredonda — ele exige inteiro. */
export function clampIntensity(value: number): number {
  if (!Number.isFinite(value)) return MIN_INTENSITY;
  return Math.max(MIN_INTENSITY, Math.min(MAX_INTENSITY, Math.round(value)));
}

/**
 * A carga em palavras. Um número de 0 a 100 não diz ao treinador se está
 * exagerando; o rótulo diz.
 */
export function intensityLabel(intensity: number): string {
  const v = clampIntensity(intensity);
  if (v === 0) return "Poupando";
  if (v < 40) return "Leve";
  if (v < 75) return "Firme";
  return "Pesado";
}

export interface PlanPlayerLike {
  readonly playerId: string;
  readonly availability: string;
}

/**
 * As disponibilidades que o departamento médico restringe. **Suspensão não
 * entra**: o suspenso não pode JOGAR, mas treina normalmente — tratá-lo como
 * lesionado o poria em recuperação sem motivo.
 */
const MEDICALLY_RESTRICTED = new Set(["INJURED"]);

/**
 * O foco de UM jogador dentro do plano coletivo.
 *
 * Dois caminhos levam à RECUPERAÇÃO em vez do foco do grupo:
 *  1. **Restrição médica** (lesionado) — automático e obrigatório. O domínio
 *     recusaria o contrário (`PLAYER_UNDER_MEDICAL_RESTRICTION`), e a razão é
 *     explícita: a restrição é contra CARGA, não contra recuperação — bloquear
 *     a recuperação deixaria o lesionado sem plano nenhum.
 *  2. **Recuperação agendada** (`recoveryIds`) — a ação do doc "agendar
 *     recuperação": o gestor escolhe poupar um jogador APTO (fatigado, pós-jogo)
 *     mesmo sem lesão. Ele descansa em vez de treinar o foco do grupo.
 */
export function entryFocusFor(
  player: PlanPlayerLike,
  collectiveFocus: PlanFocus,
  recoveryIds?: ReadonlySet<string>,
): PlanFocus {
  if (MEDICALLY_RESTRICTED.has(player.availability)) return "RECOVERY";
  if (recoveryIds?.has(player.playerId) === true) return "RECOVERY";
  return collectiveFocus;
}

export interface RecoveryRosterEntry {
  readonly playerId: string;
  readonly availability: string;
  /** Está de recuperação (por lesão OU por escolha do gestor). */
  readonly onRecovery: boolean;
  /** Travado em recuperação: o lesionado não pode ser tirado (o domínio obriga). */
  readonly locked: boolean;
}

/**
 * O roster da recuperação para a tela: quem está descansando e quem está
 * travado nisso. O lesionado aparece sempre `onRecovery` e `locked` — o gestor
 * não o tira; os demais ele liga/desliga à vontade (`recoveryIds`).
 */
export function recoveryRoster(
  players: readonly PlanPlayerLike[],
  recoveryIds: ReadonlySet<string>,
): readonly RecoveryRosterEntry[] {
  return players.map((p) => {
    const locked = MEDICALLY_RESTRICTED.has(p.availability);
    return {
      playerId: p.playerId,
      availability: p.availability,
      onRecovery: locked || recoveryIds.has(p.playerId),
      locked,
    };
  });
}

export interface SetPlanPayload {
  readonly clubId: string;
  readonly name: string;
  readonly focus: PlanFocus;
  readonly intensity: number;
  readonly entries: readonly {
    readonly playerId: string;
    readonly focus: PlanFocus;
    readonly workload: number;
  }[];
  readonly expectedVersion: number | null;
}

export type SetPlanResult =
  | SetPlanPayload
  | { readonly error: "NO_PLAYERS" | "NO_NAME" };

export function buildSetPlanPayload(input: {
  readonly clubId: string;
  readonly name: string;
  readonly focus: PlanFocus;
  readonly intensity: number;
  readonly players: readonly PlanPlayerLike[];
  /** Jogadores APTOS agendados para recuperação (a ação "agendar recuperação"). */
  readonly recoveryPlayerIds?: readonly string[];
  readonly expectedVersion: number | null;
}): SetPlanResult {
  if (input.name.trim() === "") return { error: "NO_NAME" };
  // "Um plano sem jogador não treina ninguém" — a recusa do domínio, antecipada.
  if (input.players.length === 0) return { error: "NO_PLAYERS" };
  const workload = clampIntensity(input.intensity);
  const recoveryIds = new Set(input.recoveryPlayerIds ?? []);
  return {
    clubId: input.clubId,
    name: input.name.trim(),
    focus: input.focus,
    intensity: workload,
    entries: input.players.map((p) => ({
      playerId: p.playerId,
      focus: entryFocusFor(p, input.focus, recoveryIds),
      workload,
    })),
    expectedVersion: input.expectedVersion,
  };
}
