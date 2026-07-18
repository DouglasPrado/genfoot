import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import type { WorldGenesisSnapshot } from "../genesis/genesis-types.js";
import type { GameWorldSnapshot } from "../world/world-types.js";

import { SeasonLifecycleState } from "../scheduling/scheduling-types.js";

import {
  CompetitionFormat,
  CompetitionType,
  MatchResultStatus,
  MatchRuntimeStatus,
  SeasonStatus,
  type CompetitionGenesis,
} from "./competition-types.js";

/**
 * A Liga Inicial e o seu calendário, a partir da gênese — C7.
 *
 * A gênese já GERAVA a competição e as 240 partidas (pontos-corridos, ida e
 * volta, 16 clubes, 30 rodadas); elas eram dado inerte, validadas e jogadas
 * fora. Aqui viram linhas.
 *
 * Puro e determinístico (R-182): todo id sai do seed. A temporada e a edição
 * nascem ACTIVE — o mundo já está rodando; as partidas nascem SCHEDULED/PENDING,
 * placar 0×0 porque ninguém jogou ainda (é C5 quem preenche).
 */
export function buildCompetitionGenesis(
  world: GameWorldSnapshot,
  genesis: WorldGenesisSnapshot,
): CompetitionGenesis {
  const timestampMilliseconds = Date.parse(`${world.startDate}T00:00:00.000Z`);
  const uuid = (context: string) =>
    deterministicUuidV7({ worldSeed: world.seed, context, timestampMilliseconds });

  const seasonId = uuid(`${world.id}:season:1`);
  const editionId = uuid(`${world.id}:competition-season:${genesis.competition.id}`);
  // A temporada termina na última rodada agendada — não um prazo inventado.
  const endsOn = genesis.fixtures.reduce(
    (latest, fixture) =>
      fixture.scheduledWorldDate > latest ? fixture.scheduledWorldDate : latest,
    world.startDate,
  );

  return {
    competition: {
      id: genesis.competition.id,
      gameWorldId: world.id,
      name: genesis.competition.name,
      type: CompetitionType.LEAGUE,
      // 16 clubes, ida e volta, 30 rodadas = todos contra todos duas vezes.
      format: CompetitionFormat.DOUBLE_ROUND_ROBIN,
      tier: 1,
      reputation: 1,
      version: 1,
    },
    season: {
      id: seasonId,
      gameWorldId: world.id,
      number: genesis.competition.seasonNumber,
      name: `Temporada ${genesis.competition.seasonNumber}`,
      status: SeasonStatus.ACTIVE,
      lifecycleState: SeasonLifecycleState.IN_PROGRESS,
      startsOn: world.startDate,
      endsOn,
      version: 1,
    },
    edition: {
      id: editionId,
      competitionId: genesis.competition.id,
      seasonId,
      name: `${genesis.competition.name} · Temporada ${genesis.competition.seasonNumber}`,
      status: SeasonStatus.ACTIVE,
      startsOn: world.startDate,
      clubIds: genesis.competition.clubIds,
      version: 1,
    },
    matches: genesis.fixtures.map((fixture) => ({
      id: fixture.id,
      gameWorldId: world.id,
      competitionSeasonId: editionId,
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
      seasonNumber: genesis.competition.seasonNumber,
      roundNumber: fixture.round,
      scheduledOn: fixture.scheduledWorldDate,
      runtimeStatus: MatchRuntimeStatus.SCHEDULED,
      resultStatus: MatchResultStatus.PENDING,
      homeGoals: 0,
      awayGoals: 0,
      version: 1,
    })),
  };
}
