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
 * - Grupos+mata-mata / suíço: adiados para uma vertical futura (retorna vazio).
 */
export interface ScheduledMatchDraw {
  readonly round: number;
  readonly leg: number;
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly scheduledOn: string;
}

export interface GenerateScheduleInput {
  readonly format: CompetitionFormat;
  readonly clubIds: readonly string[];
  readonly startsOn: string;
  readonly endsOn: string;
}

export function generateSchedule(
  input: GenerateScheduleInput,
): ScheduledMatchDraw[] {
  const { format, clubIds, startsOn, endsOn } = input;
  if (
    format === CompetitionFormat.ROUND_ROBIN ||
    format === CompetitionFormat.DOUBLE_ROUND_ROBIN
  ) {
    return leagueSchedule(
      clubIds,
      startsOn,
      endsOn,
      format === CompetitionFormat.DOUBLE_ROUND_ROBIN,
    );
  }
  if (format === CompetitionFormat.KNOCKOUT) {
    return knockoutFirstRound(clubIds, startsOn);
  }
  return [];
}

/** Método do círculo: N par → N−1 rodadas de N/2 jogos. Returno espelha o mando. */
function leagueSchedule(
  clubIds: readonly string[],
  startsOn: string,
  endsOn: string,
  double: boolean,
): ScheduledMatchDraw[] {
  const n = clubIds.length;
  if (n < 2 || n % 2 !== 0) return [];
  const rotation = [...clubIds];
  const half = n / 2;
  const firstLeg: Omit<ScheduledMatchDraw, "scheduledOn">[] = [];

  for (let roundIndex = 0; roundIndex < n - 1; roundIndex += 1) {
    for (let pairIndex = 0; pairIndex < half; pairIndex += 1) {
      const first = rotation[pairIndex]!;
      const second = rotation[n - 1 - pairIndex]!;
      const firstIsHome = (roundIndex + pairIndex) % 2 === 0;
      firstLeg.push({
        round: roundIndex + 1,
        leg: 1,
        homeClubId: firstIsHome ? first : second,
        awayClubId: firstIsHome ? second : first,
      });
    }
    // Fixa o primeiro e roda os demais — o passo do círculo.
    rotation.splice(1, 0, rotation.pop()!);
  }

  const rounds = n - 1;
  const draws = [...firstLeg];
  if (double) {
    for (const fixture of firstLeg) {
      draws.push({
        round: fixture.round + rounds,
        leg: 2,
        homeClubId: fixture.awayClubId,
        awayClubId: fixture.homeClubId,
      });
    }
  }

  const totalRounds = double ? rounds * 2 : rounds;
  return withDates(draws, startsOn, endsOn, totalRounds);
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
