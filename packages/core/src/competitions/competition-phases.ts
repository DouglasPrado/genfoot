import { buildStandings, type FinishedMatchInput, type StandingRow } from "./standings.js";

/**
 * As FASES de uma competição, derivadas das partidas (R-178) — grupos e
 * mata-mata, o que `standings.ts` não cobre porque ele só sabe de uma tabela
 * única.
 *
 * Puro e determinístico: mesma entrada, mesma saída. Nada de relógio, nada de
 * sorteio aqui — o sorteio já aconteceu em `competition-schedule.ts` e virou
 * `CompetitionClub.groupName`.
 */

/** Um clube da edição com o grupo que o sorteio lhe deu (`null` fora de grupos). */
export interface CompetitionClubGroup {
  readonly clubId: string;
  readonly group: string | null;
}

/** A tabela de UM grupo. `group` é `null` na liga (tabela única). */
export interface GroupTable {
  readonly group: string | null;
  readonly table: readonly StandingRow[];
}

/**
 * Uma tabela por grupo. O jogo só conta no grupo em que os DOIS clubes estão —
 * `buildStandings` já descarta o clube que não está na lista, então basta
 * chamá-lo por grupo.
 *
 * Grupos saem ordenados por nome (A, B, C…), não pela ordem em que os clubes
 * chegaram: a tela mostra "Grupo A" primeiro sempre.
 */
export function buildGroupTables(
  clubs: readonly CompetitionClubGroup[],
  finishedMatches: readonly FinishedMatchInput[],
): readonly GroupTable[] {
  const byGroup = new Map<string | null, string[]>();
  for (const club of clubs) {
    const members = byGroup.get(club.group) ?? [];
    members.push(club.clubId);
    byGroup.set(club.group, members);
  }

  return [...byGroup.entries()]
    .sort(([a], [b]) => (a ?? "").localeCompare(b ?? ""))
    .map(([group, clubIds]) => ({
      group,
      table: buildStandings(clubIds, finishedMatches),
    }));
}

/** Uma perna de um confronto de mata-mata. */
export interface BracketLegInput {
  readonly matchId: string;
  readonly round: number;
  readonly homeClubId: string;
  readonly awayClubId: string;
  /** `null` enquanto não jogou — não é 0. */
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
  readonly finished: boolean;
  readonly scheduledOn: string;
}

export interface BracketLeg {
  readonly matchId: string;
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
  readonly finished: boolean;
  readonly scheduledOn: string;
}

/**
 * Por que um confronto pode não ter vencedor:
 * - `PENDING_LEG`: ainda há perna por jogar.
 * - `AGGREGATE_TIE`: as pernas terminaram empatadas no agregado. Gol fora,
 *   prorrogação e pênaltis **não existem no domínio** (o doc da tela os prevê,
 *   o motor não os produz), então NÃO inventamos um vencedor aqui.
 */
export type TieUndecidedReason = "PENDING_LEG" | "AGGREGATE_TIE";

export interface BracketTie {
  /** Chave estável do confronto: rodada + o par de clubes, na ordem canônica. */
  readonly tieKey: string;
  readonly round: number;
  /** O mandante da PRIMEIRA perna — é assim que a chave se lê no chaveamento. */
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly homeAggregate: number;
  readonly awayAggregate: number;
  readonly legs: readonly BracketLeg[];
  readonly winnerClubId: string | null;
  readonly undecidedReason: TieUndecidedReason | null;
}

export interface BracketRound {
  readonly round: number;
  readonly name: string;
  readonly ties: readonly BracketTie[];
}

/**
 * O nome da fase pelo número de confrontos dela: 1 confronto é a Final, 2 é a
 * Semifinal, e por aí. Fora das potências de dois (chave incompleta, competição
 * com bye), cai num rótulo honesto em vez de mentir "Quartas".
 */
export function knockoutRoundName(tieCount: number): string {
  switch (tieCount) {
    case 1:
      return "Final";
    case 2:
      return "Semifinal";
    case 4:
      return "Quartas de final";
    case 8:
      return "Oitavas de final";
    case 16:
      return "16 avos de final";
    case 32:
      return "32 avos de final";
    default:
      return `Fase de ${tieCount} confrontos`;
  }
}

/**
 * O chaveamento a partir das partidas de mata-mata.
 *
 * Duas pernas do mesmo par (ida e volta, com mando trocado) são UM confronto: a
 * chave é a rodada mais o par de clubes ordenado, então "x×y" e "y×x" caem
 * juntos. O agregado soma as duas pernas do ponto de vista do mandante da ida.
 */
export function buildBracket(
  legs: readonly BracketLegInput[],
): readonly BracketRound[] {
  const ties = new Map<string, MutableTie>();

  // Ordem estável antes de agrupar: a ida é a perna de data menor (empate de
  // data desempata por matchId), e é ela que define o mando do confronto.
  const ordered = [...legs].sort(
    (a, b) =>
      a.round - b.round ||
      a.scheduledOn.localeCompare(b.scheduledOn) ||
      a.matchId.localeCompare(b.matchId),
  );

  for (const leg of ordered) {
    const pair = [leg.homeClubId, leg.awayClubId].sort();
    const tieKey = `${leg.round}:${pair[0]}:${pair[1]}`;
    let tie = ties.get(tieKey);
    if (tie === undefined) {
      tie = {
        tieKey,
        round: leg.round,
        homeClubId: leg.homeClubId,
        awayClubId: leg.awayClubId,
        homeAggregate: 0,
        awayAggregate: 0,
        legs: [],
        pending: false,
      };
      ties.set(tieKey, tie);
    }

    tie.legs.push({
      matchId: leg.matchId,
      homeClubId: leg.homeClubId,
      awayClubId: leg.awayClubId,
      homeGoals: leg.homeGoals,
      awayGoals: leg.awayGoals,
      finished: leg.finished,
      scheduledOn: leg.scheduledOn,
    });

    if (!leg.finished || leg.homeGoals === null || leg.awayGoals === null) {
      tie.pending = true;
      continue;
    }
    // O agregado é sempre do ponto de vista do mandante da IDA: na volta os
    // lados se invertem.
    const homeIsTieHome = leg.homeClubId === tie.homeClubId;
    tie.homeAggregate += homeIsTieHome ? leg.homeGoals : leg.awayGoals;
    tie.awayAggregate += homeIsTieHome ? leg.awayGoals : leg.homeGoals;
  }

  const byRound = new Map<number, BracketTie[]>();
  for (const tie of ties.values()) {
    const resolved = resolveTie(tie);
    const list = byRound.get(tie.round) ?? [];
    list.push(resolved);
    byRound.set(tie.round, list);
  }

  return [...byRound.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, list]) => ({
      round,
      name: knockoutRoundName(list.length),
      ties: [...list].sort((a, b) => a.tieKey.localeCompare(b.tieKey)),
    }));
}

interface MutableTie {
  tieKey: string;
  round: number;
  homeClubId: string;
  awayClubId: string;
  homeAggregate: number;
  awayAggregate: number;
  legs: BracketLeg[];
  pending: boolean;
}

function resolveTie(tie: MutableTie): BracketTie {
  const base = {
    tieKey: tie.tieKey,
    round: tie.round,
    homeClubId: tie.homeClubId,
    awayClubId: tie.awayClubId,
    homeAggregate: tie.homeAggregate,
    awayAggregate: tie.awayAggregate,
    legs: tie.legs,
  };
  if (tie.pending) {
    return { ...base, winnerClubId: null, undecidedReason: "PENDING_LEG" };
  }
  if (tie.homeAggregate === tie.awayAggregate) {
    return { ...base, winnerClubId: null, undecidedReason: "AGGREGATE_TIE" };
  }
  return {
    ...base,
    winnerClubId:
      tie.homeAggregate > tie.awayAggregate ? tie.homeClubId : tie.awayClubId,
    undecidedReason: null,
  };
}

/**
 * O movimento de um clube de uma rodada para a outra.
 *
 * `null` NÃO é "manteve": é "não há rodada anterior com que comparar" — antes da
 * segunda rodada, dizer que alguém manteve a posição afirmaria uma classificação
 * que nunca existiu.
 */
export type RankMovement = "up" | "down" | "same";

export interface StandingRowWithMovement extends StandingRow {
  /** A posição na rodada ANTERIOR; `null` quando não havia tabela ainda. */
  readonly previousRank: number | null;
  readonly movement: RankMovement | null;
}

export interface GroupTableWithMovement {
  readonly group: string | null;
  readonly table: readonly StandingRowWithMovement[];
}

/** Uma partida terminada, com a rodada em que ela caiu. */
export interface RoundedMatchInput extends FinishedMatchInput {
  /** `null` num jogo fora de rodada (mata-mata avulso, amistoso). */
  readonly round: number | null;
}

/**
 * As tabelas por grupo, com a variação de posição desde a rodada anterior.
 *
 * A tabela é projeção dos jogos (R-178) — então a "tabela da rodada anterior" é
 * a MESMA conta sem a última rodada. Não é preciso guardar histórico: ele se
 * reconstrói, e reconstruir é mais confiável do que um instantâneo que pode
 * ficar dessincronizado do resultado oficial.
 *
 * A rodada corrente é a maior rodada com jogo terminado — global à competição,
 * não por grupo: os grupos jogam a mesma rodada, e um grupo que ainda não jogou
 * simplesmente não se mexe.
 */
export function buildGroupTablesWithMovement(
  clubs: readonly CompetitionClubGroup[],
  matches: readonly RoundedMatchInput[],
): readonly GroupTableWithMovement[] {
  const rounds = matches
    .map((m) => m.round)
    .filter((r): r is number => r !== null);
  const currentRound = rounds.length > 0 ? Math.max(...rounds) : null;

  const current = buildGroupTables(clubs, matches);

  // Sem rodada corrente, ou estando na primeira, não existe tabela anterior.
  // Comparar com "todos zerados" produziria movimento a partir da ordem de
  // desempate — que não é classificação, é alfabeto.
  const hasPrevious =
    currentRound !== null &&
    matches.some((m) => m.round !== null && m.round < currentRound);

  if (!hasPrevious) {
    return current.map((group) => ({
      group: group.group,
      table: group.table.map((row) => ({
        ...row,
        previousRank: null,
        movement: null,
      })),
    }));
  }

  const before = buildGroupTables(
    clubs,
    matches.filter((m) => m.round !== null && m.round < currentRound),
  );
  const previousRankOf = new Map<string, number>();
  for (const group of before) {
    group.table.forEach((row, index) => {
      previousRankOf.set(row.clubId, index + 1);
    });
  }

  return current.map((group) => ({
    group: group.group,
    table: group.table.map((row, index) => {
      const rank = index + 1;
      const previousRank = previousRankOf.get(row.clubId) ?? null;
      if (previousRank === null) {
        return { ...row, previousRank: null, movement: null };
      }
      // Número MENOR é posição melhor: cair de 5º para 3º é subir.
      const movement: RankMovement =
        previousRank === rank ? "same" : previousRank > rank ? "up" : "down";
      return { ...row, previousRank, movement };
    }),
  }));
}
