/**
 * A lógica de `M-POSTMATCH` (doc `04-ui-ux/06`) fora do componente.
 *
 * Monta a linha do tempo da partida a partir do feed oficial, acumula o placar
 * lance a lance e — o ponto que mais importa — nomeia o que o motor NÃO
 * registrou, para um feed curto não passar por partida sem história.
 *
 * Puro: sem relógio, sem rede.
 */

export interface MatchFeedEventSource {
  readonly sequence: number;
  readonly minute: number;
  readonly type: string;
  /** `null` em evento sem dono (apito, VAR). */
  readonly clubId: string | null;
  readonly playerId: string | null;
  readonly playerName: string | null;
  readonly description: string;
}

export interface MatchFeedCoverageSource {
  readonly goals: boolean;
  readonly assists: boolean;
  readonly cards: boolean;
  readonly substitutions: boolean;
  readonly shots: boolean;
  readonly teamStats: boolean;
  readonly ratings: boolean;
  readonly passingAndDefending: boolean;
}

export type EventSide = "home" | "away" | null;

export interface TimelineEvent extends MatchFeedEventSource {
  readonly side: EventSide;
  readonly label: string;
}

export interface TimelineHalf {
  readonly half: 1 | 2;
  readonly events: readonly TimelineEvent[];
}

/**
 * O feed dividido em primeiro e segundo tempo.
 *
 * O corte é o minuto 45 INCLUSIVE no primeiro tempo — o gol aos 45 é do
 * primeiro tempo, não do segundo. Um tempo sem evento simplesmente não aparece:
 * um bloco "1º TEMPO" vazio afirmaria que nada aconteceu, quando o que houve
 * foi o motor não registrar.
 *
 * A ordem é a `sequence` (ordem TOTAL oficial do feed, `@@unique(matchId,
 * eventSequence)`), não o minuto: dois lances no mesmo minuto têm ordem
 * definida no servidor, e reordenar por minuto a perderia.
 */
export function buildTimeline(
  events: readonly MatchFeedEventSource[],
  homeClubId: string,
): readonly TimelineHalf[] {
  const ordered = [...events].sort((a, b) => a.sequence - b.sequence);
  const decorated: TimelineEvent[] = ordered.map((event) => ({
    ...event,
    side:
      event.clubId === null ? null : event.clubId === homeClubId ? "home" : "away",
    label: eventLabel(event.type),
  }));

  const halves: TimelineHalf[] = [];
  const first = decorated.filter((e) => e.minute <= 45);
  const second = decorated.filter((e) => e.minute > 45);
  if (first.length > 0) halves.push({ half: 1, events: first });
  if (second.length > 0) halves.push({ half: 2, events: second });
  return halves;
}

/** O tipo de evento que soma gol, e para quem. */
const GOAL_TYPES = new Set([
  "GOAL",
  "PENALTY_SCORED",
]);

export interface Scoreline {
  readonly home: number;
  readonly away: number;
}

/**
 * O placar DEPOIS do evento de sequência `upToSequence` — é o número que a
 * linha do tempo mostra ao lado de cada gol ("1–0", "1–1").
 *
 * Gol contra conta para o adversário de quem o marcou: `OWN_GOAL` do clube da
 * casa é gol do visitante. Tratar `OWN_GOAL` como gol normal inverteria o
 * placar da tela em relação ao resultado oficial.
 */
export function scoreAfterEvent(
  events: readonly MatchFeedEventSource[],
  upToSequence: number,
  homeClubId: string,
): Scoreline {
  let home = 0;
  let away = 0;
  for (const event of [...events].sort((a, b) => a.sequence - b.sequence)) {
    if (event.sequence > upToSequence) break;
    const isHome = event.clubId === homeClubId;
    if (GOAL_TYPES.has(event.type)) {
      if (isHome) home += 1;
      else away += 1;
    } else if (event.type === "OWN_GOAL") {
      if (isHome) away += 1;
      else home += 1;
    }
  }
  return { home, away };
}

const EVENT_LABELS: Record<string, string> = {
  GOAL: "Gol",
  OWN_GOAL: "Gol contra",
  ASSIST: "Assistência",
  YELLOW_CARD: "Cartão amarelo",
  RED_CARD: "Cartão vermelho",
  INJURY: "Lesão",
  SUBSTITUTION: "Substituição",
  TACTICAL_CHANGE: "Mudança tática",
  PENALTY_AWARDED: "Pênalti marcado",
  PENALTY_MISSED: "Pênalti perdido",
  PENALTY_SCORED: "Pênalti convertido",
  FREE_KICK: "Falta",
  SHOT: "Finalização",
  SHOT_ON_TARGET: "Finalização no alvo",
  SAVE: "Defesa",
  FOUL: "Falta cometida",
  OFFSIDE: "Impedimento",
  VAR_CHECK: "Revisão do VAR",
  MOMENTUM_SHIFT: "Virada de momento",
  FATIGUE_ALERT: "Alerta de fadiga",
  AI_DECISION: "Decisão da comissão",
};

/** Tipo desconhecido devolve o próprio código — melhor que uma linha muda. */
export function eventLabel(type: string): string {
  return EVENT_LABELS[type] ?? type;
}

/**
 * As famílias de lance que o motor NÃO produz, em português, para a tela
 * declarar o buraco.
 *
 * Sem isto, uma partida 3×1 com três linhas no feed se lê como "jogo morno":
 * o feed está curto porque cartão, substituição, finalização e estatística de
 * time não são gravados — não porque não aconteceram.
 */
export function missingFeedFamilies(
  coverage: MatchFeedCoverageSource,
): readonly string[] {
  const missing: string[] = [];
  if (!coverage.goals) missing.push("gols");
  if (!coverage.assists) missing.push("assistências");
  if (!coverage.cards) missing.push("cartões");
  if (!coverage.substitutions) missing.push("substituições");
  if (!coverage.shots) missing.push("finalizações lance a lance");
  if (!coverage.teamStats) missing.push("estatísticas de time");
  if (!coverage.ratings) missing.push("notas dos jogadores");
  if (!coverage.passingAndDefending) {
    missing.push("passe certo, desarme e interceptação");
  }
  return missing;
}
