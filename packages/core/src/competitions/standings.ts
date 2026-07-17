/**
 * A classificação — derivada das partidas, nunca armazenada (a tabela é sempre
 * reconstruível do resultado dos jogos).
 *
 * Pontuação canônica: vitória 3, empate 1, derrota 0. O desempate é
 * pontos → saldo de gols → gols pró → nome (estável e determinístico; critérios
 * mais finos entram quando o regulamento os pedir).
 */
export interface StandingRow {
  readonly clubId: string;
  readonly played: number;
  readonly won: number;
  readonly drawn: number;
  readonly lost: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly goalDifference: number;
  readonly points: number;
}

export interface FinishedMatchInput {
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
}

const WIN = 3;
const DRAW = 1;

/**
 * Monta a tabela de um conjunto de clubes a partir das partidas TERMINADAS.
 *
 * Todo clube aparece, mesmo sem ter jogado — uma tabela no início da temporada
 * tem 16 clubes zerados, não uma lista vazia. Partidas não terminadas não
 * contam: o placar 0×0 de uma partida agendada não é um empate.
 */
export function buildStandings(
  clubIds: readonly string[],
  finishedMatches: readonly FinishedMatchInput[],
): readonly StandingRow[] {
  const table = new Map<string, StandingRow>();
  for (const clubId of clubIds) {
    table.set(clubId, {
      clubId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  }

  for (const match of finishedMatches) {
    const home = table.get(match.homeClubId);
    const away = table.get(match.awayClubId);
    if (home === undefined || away === undefined) continue;
    table.set(match.homeClubId, applyResult(home, match.homeGoals, match.awayGoals));
    table.set(match.awayClubId, applyResult(away, match.awayGoals, match.homeGoals));
  }

  return [...table.values()].sort(compareRows);
}

function applyResult(row: StandingRow, scored: number, conceded: number): StandingRow {
  const won = scored > conceded ? 1 : 0;
  const drawn = scored === conceded ? 1 : 0;
  const lost = scored < conceded ? 1 : 0;
  const goalsFor = row.goalsFor + scored;
  const goalsAgainst = row.goalsAgainst + conceded;
  return {
    ...row,
    played: row.played + 1,
    won: row.won + won,
    drawn: row.drawn + drawn,
    lost: row.lost + lost,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    points: row.points + won * WIN + drawn * DRAW,
  };
}

function compareRows(a: StandingRow, b: StandingRow): number {
  if (a.points !== b.points) return b.points - a.points;
  if (a.goalDifference !== b.goalDifference)
    return b.goalDifference - a.goalDifference;
  if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
  return a.clubId.localeCompare(b.clubId);
}
