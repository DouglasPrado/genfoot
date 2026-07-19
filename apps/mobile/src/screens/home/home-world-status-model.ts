export interface HomeWorldProjection {
  readonly id: string;
  readonly currentDate: string;
}

export interface HomeWorldStatus {
  readonly dateLabel: string;
  readonly weekdayLabel: string;
  readonly worldReference: string;
}

export interface HomeMatchProjection {
  readonly matchId: string;
  readonly roundNumber: number;
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly homeClubName: string;
  readonly awayClubName: string;
  readonly homeClubPrimaryColor?: string | null;
  readonly homeClubSecondaryColor?: string | null;
  readonly homeClubCrestTemplateId?: string | null;
  readonly awayClubPrimaryColor?: string | null;
  readonly awayClubSecondaryColor?: string | null;
  readonly awayClubCrestTemplateId?: string | null;
  readonly scheduledOn: string;
}

export interface HomeNextMatch {
  readonly matchId: string;
  readonly dateLabel: string;
  readonly roundLabel: string;
  readonly competitionLabel: string;
  readonly homeClubName: string;
  readonly awayClubName: string;
  readonly homeClubPrimaryColor: string | null;
  readonly homeClubSecondaryColor: string | null;
  readonly homeClubCrestTemplateId: string | null;
  readonly awayClubPrimaryColor: string | null;
  readonly awayClubSecondaryColor: string | null;
  readonly awayClubCrestTemplateId: string | null;
  readonly venueLabel: "EM CASA" | "FORA DE CASA";
}

export interface HomeWorldClockProjection {
  readonly realSecondsPerDay: number | null;
  readonly clockRunning: boolean;
  readonly nextTickAt: string | null;
}

export interface HomeWorldClockProgress {
  readonly remainingLabel: string;
  readonly remainingFraction: number;
}

const MONTHS = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
] as const;

const WEEKDAYS = [
  "DOMINGO",
  "SEGUNDA",
  "TERÇA",
  "QUARTA",
  "QUINTA",
  "SEXTA",
  "SÁBADO",
] as const;

/**
 * Prepara o contexto temporal da home sem passar pelo fuso do aparelho.
 * `currentDate` é um dia lógico (`DATE`), não um instante UTC a converter.
 */
export function deriveHomeWorldStatus(
  world: HomeWorldProjection,
): HomeWorldStatus {
  const worldReference = world.id.slice(0, 8).toUpperCase() || "SEM-ID";
  return { ...formatGameDate(world.currentDate), worldReference };
}

export function deriveHomeNextMatch(
  match: HomeMatchProjection | null,
  managedClubId: string,
  competitionName: string | null,
): HomeNextMatch | null {
  if (match === null) return null;
  const date = formatGameDate(match.scheduledOn);
  return {
    matchId: match.matchId,
    dateLabel: date.dateLabel,
    roundLabel: `RODADA ${match.roundNumber}`,
    competitionLabel: competitionName?.trim() || "COMPETIÇÃO",
    homeClubName: match.homeClubName,
    awayClubName: match.awayClubName,
    homeClubPrimaryColor: match.homeClubPrimaryColor ?? null,
    homeClubSecondaryColor: match.homeClubSecondaryColor ?? null,
    homeClubCrestTemplateId: match.homeClubCrestTemplateId ?? null,
    awayClubPrimaryColor: match.awayClubPrimaryColor ?? null,
    awayClubSecondaryColor: match.awayClubSecondaryColor ?? null,
    awayClubCrestTemplateId: match.awayClubCrestTemplateId ?? null,
    venueLabel: match.homeClubId === managedClubId ? "EM CASA" : "FORA DE CASA",
  };
}

export function deriveHomeWorldClockProgress(
  clock: HomeWorldClockProjection | null,
  nowMs: number,
): HomeWorldClockProgress | null {
  if (
    clock === null ||
    !clock.clockRunning ||
    clock.realSecondsPerDay === null ||
    clock.realSecondsPerDay <= 0 ||
    clock.nextTickAt === null
  ) {
    return null;
  }
  const nextTickMs = Date.parse(clock.nextTickAt);
  if (!Number.isFinite(nowMs) || Number.isNaN(nextTickMs)) return null;

  const remainingSeconds = Math.max(0, Math.ceil((nextTickMs - nowMs) / 1000));
  const remainingFraction = Math.max(
    0,
    Math.min(1, remainingSeconds / clock.realSecondsPerDay),
  );
  return {
    remainingLabel: formatRemainingTime(remainingSeconds),
    remainingFraction,
  };
}

function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return "AGORA";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3_600) return `${Math.ceil(seconds / 60)}min`;
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.ceil((seconds % 3_600) / 60);
  return minutes === 0
    ? `${hours}h`
    : `${hours}h${String(minutes).padStart(2, "0")}`;
}

function formatGameDate(value: string): {
  readonly dateLabel: string;
  readonly weekdayLabel: string;
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) {
    return { dateLabel: "DATA INDISPONÍVEL", weekdayLabel: "TEMPO DO JOGO" };
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    MONTHS[month - 1] !== undefined;
  if (!valid) {
    return { dateLabel: "DATA INDISPONÍVEL", weekdayLabel: "TEMPO DO JOGO" };
  }
  return {
    dateLabel: `${String(day).padStart(2, "0")} ${MONTHS[month - 1]} ${year}`,
    weekdayLabel: WEEKDAYS[date.getUTCDay()] ?? "TEMPO DO JOGO",
  };
}
