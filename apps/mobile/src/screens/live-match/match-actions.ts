export interface MatchActionInput {
  readonly status: "CREATED" | "IN_PROGRESS" | "FINAL";
  readonly kickoffOn: string;
  readonly worldDate: string;
  readonly currentTick?: number;
  readonly totalTicks?: number;
}

export type MatchAction =
  | { readonly kind: "NONE" | "BLOCKED"; readonly label: string }
  | {
      readonly kind: "COMMAND";
      readonly label: string;
      readonly commandType:
        "match:start" | "match:advance-ticks" | "match:finalize";
      readonly payload: Readonly<Record<string, number>>;
      readonly irreversible: boolean;
    };

/**
 * Ações rápidas de treinador durante a partida (doc 06 M-LIVE). Cada uma vira
 * um `match:submit-command` com `delta` de ímpeto ofensivo (±8 no motor): o
 * kernel soma o delta à força do lado a partir do tick corrente — mais delta,
 * mais chances convertidas; menos delta, jogo mais cadenciado.
 */
export interface CoachAction {
  readonly key: string;
  readonly label: string;
  readonly delta: number;
  readonly note: string;
}

export const COACH_ACTIONS: readonly CoachAction[] = [
  { key: "all-out", label: "ATACAR", delta: 6, note: "Tudo para o ataque" },
  { key: "press", label: "PRESSIONAR", delta: 3, note: "Pressão alta" },
  { key: "contain", label: "CADENCIAR", delta: -3, note: "Tirar ritmo do jogo" },
  { key: "drop", label: "RECUAR", delta: -6, note: "Fechar o time atrás" },
];

/** Lado do clube gerenciado na partida — null se a partida não é dele. */
export function coachSide(
  match: Readonly<{ homeClubId: string; awayClubId: string }>,
  managedClubId: string | null,
): "HOME" | "AWAY" | null {
  if (managedClubId === null) return null;
  if (match.homeClubId === managedClubId) return "HOME";
  if (match.awayClubId === managedClubId) return "AWAY";
  return null;
}

/** Payload oficial do match:submit-command para uma ação de treinador. */
export function buildCoachCommand(input: {
  readonly matchId: string;
  readonly side: "HOME" | "AWAY";
  readonly action: CoachAction;
  readonly nextSequence: number;
  readonly actor: string;
}): Readonly<Record<string, unknown>> {
  return {
    matchId: input.matchId,
    actor: input.actor,
    commandType: `TACTIC_${input.action.key.toUpperCase().replace(/-/g, "_")}`,
    side: input.side,
    delta: input.action.delta,
    payloadHash: `${input.action.key}:${input.action.delta}`,
    expectedSequence: input.nextSequence,
    commandId: `coach:${input.matchId}:${input.nextSequence}`,
  };
}

/** Decide somente a ação de UI; o resultado continua pertencendo ao backend. */
export function nextMatchAction(input: MatchActionInput): MatchAction {
  if (input.status === "FINAL") {
    return { kind: "NONE", label: "RESULTADO OFICIAL" };
  }
  if (input.status === "CREATED") {
    if (input.worldDate < input.kickoffOn) {
      return {
        kind: "BLOCKED",
        label: `DISPONÍVEL EM ${input.kickoffOn}`,
      };
    }
    return {
      kind: "COMMAND",
      label: "INICIAR PARTIDA",
      commandType: "match:start",
      payload: {},
      irreversible: true,
    };
  }
  const currentTick = input.currentTick ?? 0;
  const totalTicks = input.totalTicks ?? 90;
  if (currentTick >= totalTicks) {
    return {
      kind: "COMMAND",
      label: "FINALIZAR PARTIDA",
      commandType: "match:finalize",
      payload: {},
      irreversible: true,
    };
  }
  return {
    kind: "COMMAND",
    label: "AVANÇAR PARTIDA",
    commandType: "match:advance-ticks",
    payload: { ticks: Math.min(15, totalTicks - currentTick) },
    irreversible: false,
  };
}
