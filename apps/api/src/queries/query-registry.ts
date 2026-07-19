import type {
  ClubReadModel,
  ClubFinanceReadModel,
  IdentityReadModel,
  SquadReadModel,
  LedgerReadModel,
  CompetitionReadModel,
  MatchesReadModel,
  WorldClockRepository,
  MarketReadModel,
  FanbaseReadModel,
  NarrativeReadModel,
  StaffReadModel,
  InboxReadModel,
  TrainingPlanRepository,
} from "@grinta/core";
import type { PlayerDevelopmentReadModel } from "@grinta/persistence";
import { DomainError, fail, succeed, type GameWorldId, type Result } from "@grinta/shared";

/**
 * Registry de queries, depois do extermínio da arquitetura morta (R-175).
 * Somente leitura: nunca muta estado.
 *
 * Eram 15 queries, 13 delas lendo o adapter JSON — competições, partidas,
 * mercado, razão, jogadores, staff, narrativa, inbox, admin, automação,
 * eventing, scheduler. Todas morreram com os contextos que as serviam, e voltam
 * quando uma tela precisar delas.
 *
 * **Há UM caminho de leitura: o Postgres.** Os read models são separados das
 * portas de escrita de propósito (R-175): a escrita carrega UM agregado por id;
 * a tela quer a lista do mundo. Ler pela porta de escrita traria de volta o
 * "carregue o mundo inteiro" que a R-175 matou.
 */
export interface QueryContext {
  readonly identityReadModel: IdentityReadModel;
  readonly clubReadModel: ClubReadModel;
  readonly squadReadModel: SquadReadModel;
  readonly ledgerReadModel: LedgerReadModel;
  readonly clubFinanceReadModel: ClubFinanceReadModel;
  readonly competitionReadModel: CompetitionReadModel;
  readonly matchesReadModel: MatchesReadModel;
  readonly marketReadModel: MarketReadModel;
  readonly fanbaseReadModel: FanbaseReadModel;
  readonly narrativeReadModel: NarrativeReadModel;
  readonly staffReadModel: StaffReadModel;
  readonly inboxReadModel: InboxReadModel;
  /** MUNDO-V4 — o relógio do mundo, para o admin ler a config e o próximo tick. */
  readonly worldClock: WorldClockRepository;
  /** Treino — o plano do clube na temporada (M-TRAINING, doc 23 §9). */
  readonly trainingPlanRepository: TrainingPlanRepository;
  readonly playerDevelopmentReadModel: PlayerDevelopmentReadModel;
}

/**
 * `params` são os query-string da requisição. A maioria das queries é
 * world-scoped e os ignora; algumas — como `roster` — precisam de um recorte
 * fino (o clube), e é por aqui que ele chega. É o primeiro passo da
 * granularidade que o doc 23 pede (#37).
 */
export type QueryHandler = (
  context: QueryContext,
  worldId: GameWorldId,
  params: Record<string, unknown>,
) => Promise<Result<unknown, DomainError>>;

const handlers: Record<string, QueryHandler> = {
  club: async ({ clubReadModel }, worldId) =>
    succeed(await clubReadModel.summary(worldId)),
  "club-detail": async ({ clubReadModel }, worldId) =>
    succeed(await clubReadModel.worldView(worldId)),
  identity: async ({ identityReadModel }, worldId) =>
    succeed(await identityReadModel.summary(worldId)),
  "identity-detail": async ({ identityReadModel }, worldId) =>
    succeed(await identityReadModel.worldView(worldId)),
  ledger: async ({ ledgerReadModel }, worldId) =>
    succeed(await ledgerReadModel.summary(worldId)),
  competitions: async ({ competitionReadModel }, worldId) =>
    succeed(await competitionReadModel.leagueStandings(worldId)),
  "competitions-list": async ({ competitionReadModel }, worldId) =>
    succeed({ competitions: await competitionReadModel.listCompetitions(worldId) }),
  "competition-outcome": async ({ competitionReadModel }, worldId) =>
    succeed(await competitionReadModel.competitionOutcome(worldId)),
  "top-scorers": async ({ competitionReadModel }, worldId) =>
    succeed({ scorers: await competitionReadModel.topScorers(worldId) }),
  matches: async ({ matchesReadModel }, worldId, params) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    return succeed(await matchesReadModel.recentAndUpcoming(worldId, clubId));
  },
  "world-clock": async ({ worldClock }, worldId) =>
    succeed(await worldClock.getClock(worldId)),
  "training-plan": async ({ trainingPlanRepository }, worldId, params) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    const seasonId = typeof params.seasonId === "string" ? params.seasonId : null;
    if (clubId === null || seasonId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "training-plan exige os parâmetros clubId e seasonId.",
          { params: ["clubId", "seasonId"] },
        ),
      );
    }
    // `null` é resposta legítima: clube sem plano na temporada. A tela cai no
    // estado vazio (M-TRAINING sem foco definido), não em erro.
    const plan = await trainingPlanRepository.findByClubSeason(
      worldId,
      clubId,
      seasonId,
    );
    return succeed({ plan });
  },
  "player-development": async ({ playerDevelopmentReadModel }, worldId, params) => {
    const playerId = typeof params.playerId === "string" ? params.playerId : null;
    const seasonId = typeof params.seasonId === "string" ? params.seasonId : null;
    if (playerId === null || seasonId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "player-development exige os parâmetros playerId e seasonId.",
          { params: ["playerId", "seasonId"] },
        ),
      );
    }
    // `null` = jogador inexistente no mundo; a tela cai no estado vazio.
    return succeed({
      development: await playerDevelopmentReadModel.view(worldId, playerId, seasonId),
    });
  },
  "match-detail": async ({ matchesReadModel }, worldId, params) => {
    const matchId = typeof params.matchId === "string" ? params.matchId : null;
    if (matchId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "match-detail exige o parâmetro matchId.",
          { param: "matchId" },
        ),
      );
    }
    return succeed(await matchesReadModel.matchDetail(worldId, matchId));
  },
  market: async ({ marketReadModel }, worldId, params) => {
    const excludeClubId = typeof params.clubId === "string" ? params.clubId : null;
    return succeed(await marketReadModel.scoutablePlayers(worldId, excludeClubId));
  },
  roster: async ({ squadReadModel }, worldId, params) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    if (clubId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "roster exige o parâmetro clubId.",
          { param: "clubId" },
        ),
      );
    }
    return succeed(await squadReadModel.roster(worldId, clubId));
  },
  "finance-snapshot": async ({ clubFinanceReadModel }, worldId, params) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    if (clubId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "finance-snapshot exige o parâmetro clubId.",
          { param: "clubId" },
        ),
      );
    }
    return succeed(await clubFinanceReadModel.snapshot(worldId, clubId));
  },
  fanbase: async ({ fanbaseReadModel }, worldId, params) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    if (clubId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "fanbase exige o parâmetro clubId.",
          { param: "clubId" },
        ),
      );
    }
    return succeed(await fanbaseReadModel.fanbaseForClub(worldId, clubId));
  },
  staff: async ({ staffReadModel }, worldId, params) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    if (clubId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "staff exige o parâmetro clubId.",
          { param: "clubId" },
        ),
      );
    }
    return succeed(await staffReadModel.staffForClub(worldId, clubId));
  },
  inbox: async ({ inboxReadModel }, worldId, params) => {
    // clubId opcional: com ele, o inbox do clube; sem ele, zeros (degradação
    // segura — a home ainda chama sem recorte enquanto a tela não é atualizada).
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    return succeed(
      await inboxReadModel.summaryForClubs(worldId, clubId === null ? [] : [clubId]),
    );
  },
  youth: async ({ squadReadModel }, worldId, params) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    if (clubId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "youth exige o parâmetro clubId.",
          { param: "clubId" },
        ),
      );
    }
    return succeed(await squadReadModel.youthRoster(worldId, clubId));
  },
  narrative: async ({ narrativeReadModel }, worldId, params) => {
    const limit =
      typeof params.limit === "string" ? Number(params.limit) : 30;
    return succeed(
      await narrativeReadModel.recentForWorld(
        worldId,
        Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 30,
      ),
    );
  },
};

export function resolveQueryHandler(name: string): QueryHandler | undefined {
  return handlers[name];
}

export function registeredQueryNames(): readonly string[] {
  return Object.keys(handlers);
}
