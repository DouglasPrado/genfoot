import type { GameWorldId } from "@grinta/shared";

import type { ClubId, CompetitionId } from "../genesis/genesis-types.js";
import {
  SeasonStatus,
  type SeasonSnapshot,
} from "../scheduling/scheduling-types.js";

// A temporada é conceito compartilhado (C2/scheduling), não de C7 — reusamos o
// canônico em vez de criar um terceiro. `SeasonStatus` é idêntico; o
// `SeasonSnapshot` do scheduling é mais rico (ciclo de vida) e o cobre.
export { SeasonStatus, type SeasonSnapshot };

/**
 * C7 — competições. A liga inicial que a gênese já gerava, agora persistida.
 *
 * O `Competition` é o torneio (a Liga Inicial); a `Season` é a temporada do
 * mundo; a `CompetitionSeason` é a EDIÇÃO daquele torneio naquela temporada. Um
 * `Match` é uma partida agendada — o ciclo de vida dela (simular, homologar) é
 * C5; aqui ela nasce SCHEDULED/PENDING.
 */

export const CompetitionType = {
  LEAGUE: "LEAGUE",
  CUP: "CUP",
  SUPER_CUP: "SUPER_CUP",
  INTERNATIONAL_CUP: "INTERNATIONAL_CUP",
  FRIENDLY: "FRIENDLY",
} as const;

export type CompetitionType =
  (typeof CompetitionType)[keyof typeof CompetitionType];

export const CompetitionFormat = {
  ROUND_ROBIN: "ROUND_ROBIN",
  DOUBLE_ROUND_ROBIN: "DOUBLE_ROUND_ROBIN",
  KNOCKOUT: "KNOCKOUT",
  GROUPS_AND_KNOCKOUT: "GROUPS_AND_KNOCKOUT",
  SWISS: "SWISS",
} as const;

export type CompetitionFormat =
  (typeof CompetitionFormat)[keyof typeof CompetitionFormat];

export const MatchRuntimeStatus = {
  SCHEDULED: "SCHEDULED",
  PRE_MATCH: "PRE_MATCH",
  LIVE: "LIVE",
  PAUSED_FOR_DECISION: "PAUSED_FOR_DECISION",
  FINISHED: "FINISHED",
  PROCESSED: "PROCESSED",
} as const;

export type MatchRuntimeStatus =
  (typeof MatchRuntimeStatus)[keyof typeof MatchRuntimeStatus];

export const MatchResultStatus = {
  PENDING: "PENDING",
  NORMAL: "NORMAL",
  WALKOVER: "WALKOVER",
  CANCELLED: "CANCELLED",
  ABANDONED: "ABANDONED",
} as const;

export type MatchResultStatus =
  (typeof MatchResultStatus)[keyof typeof MatchResultStatus];

export interface CompetitionSnapshot {
  readonly id: CompetitionId;
  readonly gameWorldId: GameWorldId;
  readonly name: string;
  readonly type: CompetitionType;
  readonly format: CompetitionFormat;
  readonly tier: number;
  readonly reputation: number;
  readonly version: number;
}

export interface CompetitionSeasonSnapshot {
  readonly id: string;
  readonly competitionId: CompetitionId;
  readonly seasonId: string;
  readonly name: string;
  readonly status: SeasonStatus;
  readonly startsOn: string;
  readonly clubIds: readonly ClubId[];
  readonly version: number;
}

/**
 * Uma partida agendada. O RESULTADO nasce PENDING e o placar 0×0 — não porque
 * empataram, mas porque não jogaram. Quem os preenche é C5, ao simular.
 */
export interface ScheduledMatchSnapshot {
  readonly id: string;
  readonly gameWorldId: GameWorldId;
  readonly competitionSeasonId: string;
  readonly homeClubId: ClubId;
  readonly awayClubId: ClubId;
  readonly seasonNumber: number;
  readonly roundNumber: number;
  readonly scheduledOn: string;
  readonly runtimeStatus: MatchRuntimeStatus;
  readonly resultStatus: MatchResultStatus;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly version: number;
}

export interface CompetitionGenesis {
  readonly competition: CompetitionSnapshot;
  readonly season: SeasonSnapshot;
  readonly edition: CompetitionSeasonSnapshot;
  readonly matches: readonly ScheduledMatchSnapshot[];
}
