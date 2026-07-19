import { WorldDate } from "@grinta/shared";

import { CompetitionFormat } from "./competition-types.js";

/**
 * Sorteio + calendário de uma competição (C7, R-206), puro e determinístico:
 * as mesmas entradas dão sempre as mesmas partidas nas mesmas datas. Sem
 * `Math.random()` — a "sorte" vem da ORDEM dos clubes (a semente já fixada na
 * config). Materializado no `lock` (R-202).
 *
 * - Liga (round-robin): método do círculo, turno (e returno, se DOUBLE).
 * - Mata-mata: a 1ª rodada (as demais dependem de quem passa — vêm ao jogar).
 * - Grupos+mata-mata: sorteio em potes → fase de grupos (round-robin por grupo).
 *   O mata-mata pós-grupos depende dos classificados — vem quando os grupos
 *   terminarem (C7-V5/V6).
 * - Suíço: adiado (retorna vazio).
 */
export interface ScheduledMatchDraw {
  readonly round: number;
  readonly leg: number;
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly scheduledOn: string;
  /** Grupo (A, B, …) na fase de grupos; `null` fora dela. */
  readonly group: string | null;
}

export interface GenerateScheduleInput {
  readonly format: CompetitionFormat;
  readonly clubIds: readonly string[];
  readonly startsOn: string;
  readonly endsOn: string;
  /** Ida-e-volta (2) ou jogo único (1). Padrão: liga=2, resto=1. */
  readonly legs?: number;
  /** Só GROUPS_AND_KNOCKOUT: nº de grupos. */
  readonly groupCount?: number | null;
}

export function generateSchedule(
  input: GenerateScheduleInput,
): ScheduledMatchDraw[] {
  const { format, clubIds, startsOn, endsOn } = input;
  if (
    format === CompetitionFormat.ROUND_ROBIN ||
    format === CompetitionFormat.DOUBLE_ROUND_ROBIN
  ) {
    const double =
      input.legs === undefined
        ? format === CompetitionFormat.DOUBLE_ROUND_ROBIN
        : input.legs === 2;
    return leagueSchedule(clubIds, startsOn, endsOn, double);
  }
  if (format === CompetitionFormat.KNOCKOUT) {
    return knockoutFirstRound(clubIds, startsOn);
  }
  if (format === CompetitionFormat.GROUPS_AND_KNOCKOUT) {
    const groupCount = input.groupCount ?? null;
    if (groupCount === null || groupCount < 1) return [];
    return groupStageSchedule(
      clubIds,
      startsOn,
      endsOn,
      groupCount,
      input.legs === 2,
    );
  }
  return [];
}

/** Assinala clubes a grupos em POTES: o clube i vai ao grupo (i mod nGrupos). */
export function assignGroups(
  clubIds: readonly string[],
  groupCount: number,
): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  clubIds.forEach((id, index) => {
    const letter = String.fromCharCode(65 + (index % groupCount));
    const members = groups.get(letter) ?? [];
    members.push(id);
    groups.set(letter, members);
  });
  return groups;
}

type Pair = { readonly home: string; readonly away: string };

/**
 * Rodadas de um round-robin (turno único) pelo método do círculo. Nº ímpar
 * ganha um "bye" — o clube que folga naquela rodada não entra em nenhum par.
 */
function roundRobinRounds(clubIds: readonly string[]): Pair[][] {
  const teams = [...clubIds];
  const BYE = "__BYE__";
  if (teams.length % 2 !== 0) teams.push(BYE);
  const n = teams.length;
  const half = n / 2;
  const rotation = [...teams];
  const rounds: Pair[][] = [];

  for (let roundIndex = 0; roundIndex < n - 1; roundIndex += 1) {
    const pairs: Pair[] = [];
    for (let pairIndex = 0; pairIndex < half; pairIndex += 1) {
      const first = rotation[pairIndex]!;
      const second = rotation[n - 1 - pairIndex]!;
      if (first === BYE || second === BYE) continue;
      const firstIsHome = (roundIndex + pairIndex) % 2 === 0;
      pairs.push({
        home: firstIsHome ? first : second,
        away: firstIsHome ? second : first,
      });
    }
    rounds.push(pairs);
    rotation.splice(1, 0, rotation.pop()!);
  }
  return rounds;
}

/** Achata as rodadas em draws sem data. `mirror` troca o mando (returno). */
function flatten(
  rounds: readonly Pair[][],
  baseRound: number,
  mirror: boolean,
  group: string | null,
): Omit<ScheduledMatchDraw, "scheduledOn">[] {
  const draws: Omit<ScheduledMatchDraw, "scheduledOn">[] = [];
  rounds.forEach((pairs, roundIndex) => {
    for (const pair of pairs) {
      draws.push({
        round: baseRound + roundIndex,
        leg: mirror ? 2 : 1,
        homeClubId: mirror ? pair.away : pair.home,
        awayClubId: mirror ? pair.home : pair.away,
        group,
      });
    }
  });
  return draws;
}

function leagueSchedule(
  clubIds: readonly string[],
  startsOn: string,
  endsOn: string,
  double: boolean,
): ScheduledMatchDraw[] {
  if (clubIds.length < 2) return [];
  const rounds = roundRobinRounds(clubIds);
  const draws = flatten(rounds, 1, false, null);
  let total = rounds.length;
  if (double) {
    draws.push(...flatten(rounds, rounds.length + 1, true, null));
    total = rounds.length * 2;
  }
  return withDates(draws, startsOn, endsOn, total);
}

/** Cada grupo joga seu round-robin; a rodada `r` cai no mesmo dia em todos. */
function groupStageSchedule(
  clubIds: readonly string[],
  startsOn: string,
  endsOn: string,
  groupCount: number,
  double: boolean,
): ScheduledMatchDraw[] {
  const groups = assignGroups(clubIds, groupCount);
  const draws: Omit<ScheduledMatchDraw, "scheduledOn">[] = [];
  let maxRounds = 0;
  for (const [group, members] of groups) {
    if (members.length < 2) continue;
    const rounds = roundRobinRounds(members);
    draws.push(...flatten(rounds, 1, false, group));
    let total = rounds.length;
    if (double) {
      draws.push(...flatten(rounds, rounds.length + 1, true, group));
      total = rounds.length * 2;
    }
    maxRounds = Math.max(maxRounds, total);
  }
  return withDates(draws, startsOn, endsOn, maxRounds);
}

/** Mata-mata: rodada 1 semeada — clube i contra clube (N−1−i). Potência de 2. */
function knockoutFirstRound(
  clubIds: readonly string[],
  startsOn: string,
): ScheduledMatchDraw[] {
  const n = clubIds.length;
  if (n < 2 || (n & (n - 1)) !== 0) return [];
  const draws: ScheduledMatchDraw[] = [];
  for (let i = 0; i < n / 2; i += 1) {
    draws.push({
      round: 1,
      leg: 1,
      homeClubId: clubIds[i]!,
      awayClubId: clubIds[n - 1 - i]!,
      scheduledOn: startsOn,
      group: null,
    });
  }
  return draws;
}

/**
 * Espalha as rodadas na janela: a rodada `r` cai em `início + (r−1)·passo`, onde
 * o passo enche a janela sem estourá-la (mínimo 1 dia entre rodadas).
 */
function withDates(
  draws: readonly Omit<ScheduledMatchDraw, "scheduledOn">[],
  startsOn: string,
  endsOn: string,
  totalRounds: number,
): ScheduledMatchDraw[] {
  const start = WorldDate.parse(startsOn);
  const end = WorldDate.parse(endsOn);
  if (!start.ok || !end.ok) return [];
  const span = start.value.differenceInDays(end.value);
  const step = totalRounds > 1 ? Math.max(1, Math.floor(span / totalRounds)) : 0;
  return draws.map((draw) => ({
    ...draw,
    scheduledOn: start.value.addDays((draw.round - 1) * step).toString(),
  }));
}
